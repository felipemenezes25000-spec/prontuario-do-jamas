import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { NEWSScoreService } from './news-score.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class VitalSignsService {
  private readonly logger = new Logger(VitalSignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly newsScoreService: NEWSScoreService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(recordedById: string, dto: CreateVitalSignsDto) {
    // Auto-calculate BMI
    let bmi: number | undefined;
    if (dto.weight && dto.height) {
      const heightInMeters = dto.height / 100;
      bmi = parseFloat((dto.weight / (heightInMeters * heightInMeters)).toFixed(2));
    }

    // Auto-calculate MAP (Mean Arterial Pressure)
    let meanArterialPressure: number | undefined;
    if (dto.systolicBP && dto.diastolicBP) {
      meanArterialPressure = parseFloat(
        ((dto.diastolicBP * 2 + dto.systolicBP) / 3).toFixed(1),
      );
    }

    // Auto-calculate GCS total
    let gcs: number | undefined;
    if (dto.gcsEye && dto.gcsVerbal && dto.gcsMotor) {
      gcs = dto.gcsEye + dto.gcsVerbal + dto.gcsMotor;
    }

    // Calculate NEWS score
    const newsResult = this.newsScoreService.calculateNEWS({
      respiratoryRate: dto.respiratoryRate,
      oxygenSaturation: dto.oxygenSaturation,
      oxygenSupplementation: dto.oxygenSupplementation,
      temperature: dto.temperature,
      systolicBP: dto.systolicBP,
      heartRate: dto.heartRate,
      gcs,
    });

    const vitalSigns = await this.prisma.vitalSigns.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        recordedById,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        systolicBP: dto.systolicBP,
        diastolicBP: dto.diastolicBP,
        meanArterialPressure,
        heartRate: dto.heartRate,
        heartRhythm: dto.heartRhythm,
        respiratoryRate: dto.respiratoryRate,
        respiratoryPattern: dto.respiratoryPattern,
        temperature: dto.temperature,
        temperatureMethod: dto.temperatureMethod,
        oxygenSaturation: dto.oxygenSaturation,
        oxygenSupplementation: dto.oxygenSupplementation,
        fiO2: dto.fiO2,
        painScale: dto.painScale,
        painLocation: dto.painLocation,
        painType: dto.painType,
        weight: dto.weight,
        height: dto.height,
        bmi,
        headCircumference: dto.headCircumference,
        abdominalCircumference: dto.abdominalCircumference,
        glucoseLevel: dto.glucoseLevel,
        glucoseContext: dto.glucoseContext,
        gcs,
        gcsEye: dto.gcsEye,
        gcsVerbal: dto.gcsVerbal,
        gcsMotor: dto.gcsMotor,
        pupilLeft: dto.pupilLeft,
        pupilRight: dto.pupilRight,
        pupilReactivity: dto.pupilReactivity,
        capillaryRefill: dto.capillaryRefill,
        edema: dto.edema,
        edemaLocation: dto.edemaLocation,
        diuresis24h: dto.diuresis24h,
        newsScore: newsResult.totalScore,
        newsClassification: newsResult.classification,
        source: dto.source ?? 'MANUAL',
        deviceId: dto.deviceId,
      },
    });

    // If NEWS >= 7 — create ClinicalAlert and emit Socket.IO event
    if (newsResult.totalScore >= 7) {
      await this.createHighNEWSAlert(dto.patientId, dto.encounterId, newsResult.totalScore);
    }

    return { ...vitalSigns, newsResult };
  }

  private async createHighNEWSAlert(
    patientId: string,
    encounterId: string | undefined,
    newsScore: number,
  ) {
    try {
      // Find patient to get tenantId
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { tenantId: true, fullName: true },
      });

      if (!patient) return;

      const alert = await this.prisma.clinicalAlert.create({
        data: {
          tenantId: patient.tenantId,
          patientId,
          encounterId,
          type: 'DETERIORATION',
          severity: 'CRITICAL',
          title: `NEWS Score Crítico: ${newsScore}`,
          message: `Acionar Time de Resposta Rápida (TRR) — Paciente ${patient.fullName} com NEWS = ${newsScore}`,
          source: 'CLINICAL_RULE',
          triggeredAt: new Date(),
        },
      });

      // Emit real-time alert
      this.realtimeGateway.emitAlert(patient.tenantId, patientId, alert);

      this.logger.warn(
        `HIGH NEWS alert created for patient ${patientId}: score=${newsScore}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create NEWS alert for patient ${patientId}`, error);
    }
  }

  async findByPatient(patientId: string, pagination: PaginationQueryDto) {
    const where = { patientId };

    const [data, total] = await Promise.all([
      this.prisma.vitalSigns.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { recordedAt: 'desc' },
        include: {
          recordedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.vitalSigns.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.vitalSigns.findMany({
      where: { encounterId },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    const vitalSigns = await this.prisma.vitalSigns.findUnique({
      where: { id },
      include: {
        recordedBy: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });

    if (!vitalSigns) {
      throw new NotFoundException(`Vital signs with ID "${id}" not found`);
    }

    return vitalSigns;
  }

  async getLatest(patientId: string) {
    const latest = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return latest ?? null;
  }

  async getTrends(patientId: string, count = 20) {
    return this.prisma.vitalSigns.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: count,
      select: {
        id: true,
        recordedAt: true,
        systolicBP: true,
        diastolicBP: true,
        meanArterialPressure: true,
        heartRate: true,
        respiratoryRate: true,
        temperature: true,
        oxygenSaturation: true,
        painScale: true,
        weight: true,
        bmi: true,
        glucoseLevel: true,
        gcs: true,
        newsScore: true,
        newsClassification: true,
      },
    });
  }

  // ─── Enhanced Vitals: RASS Scale ────────────────────────────────────────

  async createRassAssessment(
    tenantId: string,
    authorId: string,
    dto: { patientId: string; encounterId?: string; rass: number; observations?: string },
  ) {
    const descriptions: Record<number, string> = {
      [-5]: 'Irresponsivo',
      [-4]: 'Sedacao profunda',
      [-3]: 'Sedacao moderada',
      [-2]: 'Sedacao leve',
      [-1]: 'Sonolento',
      [0]: 'Alerta e calmo',
      [1]: 'Inquieto',
      [2]: 'Agitado',
      [3]: 'Muito agitado',
      [4]: 'Combativo',
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:RASS] RASS Assessment',
        content: JSON.stringify({
          assessmentType: 'RASS',
          score: dto.rass,
          description: descriptions[dto.rass] ?? `RASS ${dto.rass}`,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, rass: dto.rass, description: descriptions[dto.rass], createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: CAM-ICU Delirium Assessment ───────────────────────

  async createCamIcuAssessment(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      rassScore: number;
      feature1AcuteOnset: boolean;
      feature1Fluctuating: boolean;
      feature2Inattention: boolean;
      feature2Score?: number;
      feature3AlteredConsciousness: boolean;
      feature4DisorganizedThinking: boolean;
      observations?: string;
    },
  ) {
    // CAM-ICU is positive if Feature 1 + Feature 2 + (Feature 3 OR Feature 4)
    const feature1 = dto.feature1AcuteOnset || dto.feature1Fluctuating;
    const feature2 = dto.feature2Inattention;
    const feature3 = dto.feature3AlteredConsciousness;
    const feature4 = dto.feature4DisorganizedThinking;
    const deliriumPositive = feature1 && feature2 && (feature3 || feature4);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:CAM_ICU] CAM-ICU Delirium Assessment',
        content: JSON.stringify({
          assessmentType: 'CAM_ICU',
          rassScore: dto.rassScore,
          feature1AcuteOnset: dto.feature1AcuteOnset,
          feature1Fluctuating: dto.feature1Fluctuating,
          feature2Inattention: dto.feature2Inattention,
          feature2Score: dto.feature2Score,
          feature3AlteredConsciousness: dto.feature3AlteredConsciousness,
          feature4DisorganizedThinking: dto.feature4DisorganizedThinking,
          deliriumPositive,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (deliriumPositive) {
      this.logger.warn(`CAM-ICU POSITIVE for patient ${dto.patientId}`);
    }

    return { id: doc.id, deliriumPositive, createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: BIS (Bispectral Index) ───────────────────────────

  async createBisRecord(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      bisValue: number;
      emg?: number;
      sr?: number;
      observations?: string;
    },
  ) {
    const level =
      dto.bisValue >= 80 ? 'AWAKE' :
      dto.bisValue >= 60 ? 'LIGHT_SEDATION' :
      dto.bisValue >= 40 ? 'GENERAL_ANESTHESIA' :
      dto.bisValue >= 20 ? 'DEEP_ANESTHESIA' : 'BURST_SUPPRESSION';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:BIS] Bispectral Index',
        content: JSON.stringify({
          recordType: 'BIS',
          bisValue: dto.bisValue,
          level,
          emg: dto.emg,
          sr: dto.sr,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, bisValue: dto.bisValue, level, createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: ICP (Intracranial Pressure) ───────────────────────

  async createIcpRecord(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      icp: number;
      meanArterialPressure: number;
      observations?: string;
    },
  ) {
    const cpp = dto.meanArterialPressure - dto.icp;
    const icpElevated = dto.icp > 20;
    const cppLow = cpp < 60;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:ICP] Intracranial Pressure',
        content: JSON.stringify({
          recordType: 'ICP',
          icp: dto.icp,
          meanArterialPressure: dto.meanArterialPressure,
          cpp,
          icpElevated,
          cppLow,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (icpElevated) {
      this.logger.warn(`HIGH ICP alert for patient ${dto.patientId}: ICP=${dto.icp}, CPP=${cpp}`);
    }

    return { id: doc.id, icp: dto.icp, cpp, icpElevated, cppLow, createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: Invasive Hemodynamics ─────────────────────────────

  async createInvasiveHemodynamics(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      pam: number;
      pvc?: number;
      poap?: number;
      cardiacOutput?: number;
      cardiacIndex?: number;
      svr?: number;
      svri?: number;
      pvr?: number;
      svo2?: number;
      observations?: string;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:HEMODYNAMICS] Invasive Hemodynamics',
        content: JSON.stringify({
          recordType: 'INVASIVE_HEMODYNAMICS',
          pam: dto.pam,
          pvc: dto.pvc,
          poap: dto.poap,
          cardiacOutput: dto.cardiacOutput,
          cardiacIndex: dto.cardiacIndex,
          svr: dto.svr,
          svri: dto.svri,
          pvr: dto.pvr,
          svo2: dto.svo2,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: Ventilator Parameters ─────────────────────────────

  async createVentilatorParams(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      mode: string;
      tidalVolume?: number;
      respiratoryRate?: number;
      fio2?: number;
      peep?: number;
      pressureSupport?: number;
      plateauPressure?: number;
      peakPressure?: number;
      meanAirwayPressure?: number;
      compliance?: number;
      resistance?: number;
      autopeep?: number;
      ieRatio?: string;
      observations?: string;
    },
  ) {
    let drivingPressure: number | undefined;
    if (dto.plateauPressure !== undefined && dto.peep !== undefined) {
      drivingPressure = dto.plateauPressure - dto.peep;
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[VITALS:VENTILATOR] Ventilator Parameters',
        content: JSON.stringify({
          recordType: 'VENTILATOR_PARAMS',
          mode: dto.mode,
          tidalVolume: dto.tidalVolume,
          respiratoryRate: dto.respiratoryRate,
          fio2: dto.fio2,
          peep: dto.peep,
          pressureSupport: dto.pressureSupport,
          plateauPressure: dto.plateauPressure,
          peakPressure: dto.peakPressure,
          meanAirwayPressure: dto.meanAirwayPressure,
          drivingPressure,
          compliance: dto.compliance,
          resistance: dto.resistance,
          autopeep: dto.autopeep,
          ieRatio: dto.ieRatio,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, mode: dto.mode, drivingPressure, createdAt: doc.createdAt };
  }

  // ─── Enhanced Vitals: Trend Charts Data ─────────────────────────────────

  async getTrendCharts(patientId: string, period: '24h' | '7d' | '30d') {
    const now = new Date();
    let from: Date;
    switch (period) {
      case '24h': from = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    }

    const vitals = await this.prisma.vitalSigns.findMany({
      where: {
        patientId,
        recordedAt: { gte: from, lte: now },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        systolicBP: true,
        diastolicBP: true,
        meanArterialPressure: true,
        heartRate: true,
        respiratoryRate: true,
        temperature: true,
        oxygenSaturation: true,
        gcs: true,
        newsScore: true,
        glucoseLevel: true,
        diuresis24h: true,
      },
    });

    // Also fetch special vitals from clinical documents
    const specialDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        patientId,
        title: { startsWith: '[VITALS:' },
        createdAt: { gte: from, lte: now },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rassHistory = specialDocs
      .filter((d) => d.title.includes('[VITALS:RASS]'))
      .map((d) => { const c = JSON.parse(d.content as string); return { timestamp: d.createdAt, value: c.score }; });

    const bisHistory = specialDocs
      .filter((d) => d.title.includes('[VITALS:BIS]'))
      .map((d) => { const c = JSON.parse(d.content as string); return { timestamp: d.createdAt, value: c.bisValue }; });

    const icpHistory = specialDocs
      .filter((d) => d.title.includes('[VITALS:ICP]'))
      .map((d) => { const c = JSON.parse(d.content as string); return { timestamp: d.createdAt, icp: c.icp, cpp: c.cpp }; });

    return {
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      totalPoints: vitals.length,
      vitals,
      rass: rassHistory,
      bis: bisHistory,
      icp: icpHistory,
    };
  }

  // ─── Enhanced Vitals: Cardiac Arrest Prediction Risk Score ──────────────

  // ─── Pediatric Growth Records (WHO/CDC z-scores) ─────────────────────

  async recordPediatricGrowth(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId?: string;
      ageMonths: number;
      weight?: number;
      height?: number;
      headCircumference?: number;
      bmi?: number;
      gender: string;
      standard?: string;
      measuredAt?: string;
      observations?: string;
    },
  ) {
    const standard = dto.standard ?? 'WHO';
    const genderKey = dto.gender.toUpperCase().startsWith('M') ? 'M' : 'F';

    // Auto-calculate BMI if weight and height provided
    let bmi = dto.bmi;
    if (!bmi && dto.weight && dto.height) {
      const heightM = dto.height / 100;
      bmi = parseFloat((dto.weight / (heightM * heightM)).toFixed(2));
    }

    // Calculate z-scores using WHO/CDC reference data approximations
    const weightForAgeZ = dto.weight != null
      ? this.calculateWeightForAgeZScore(dto.ageMonths, dto.weight, genderKey, standard)
      : null;

    const heightForAgeZ = dto.height != null
      ? this.calculateHeightForAgeZScore(dto.ageMonths, dto.height, genderKey, standard)
      : null;

    const bmiForAgeZ = bmi != null && dto.ageMonths >= 24
      ? this.calculateBmiForAgeZScore(dto.ageMonths, bmi, genderKey, standard)
      : null;

    const headCircForAgeZ = dto.headCircumference != null && dto.ageMonths <= 60
      ? this.calculateHeadCircForAgeZScore(dto.ageMonths, dto.headCircumference, genderKey, standard)
      : null;

    const weightForHeightZ = dto.weight != null && dto.height != null
      ? this.calculateWeightForHeightZScore(dto.height, dto.weight, genderKey, standard)
      : null;

    // Determine nutritional status based on weight-for-age z-score
    let nutritionalStatus = 'ADEQUATE';
    if (weightForAgeZ != null) {
      if (weightForAgeZ < -3) nutritionalStatus = 'SEVERE_MALNUTRITION';
      else if (weightForAgeZ < -2) nutritionalStatus = 'MODERATE_MALNUTRITION';
      else if (weightForAgeZ < -1) nutritionalStatus = 'MILD_MALNUTRITION';
      else if (weightForAgeZ > 2) nutritionalStatus = 'OVERWEIGHT';
      else if (weightForAgeZ > 3) nutritionalStatus = 'OBESITY';
    }

    // Determine height status
    let heightStatus = 'ADEQUATE';
    if (heightForAgeZ != null) {
      if (heightForAgeZ < -3) heightStatus = 'SEVERE_STUNTING';
      else if (heightForAgeZ < -2) heightStatus = 'MODERATE_STUNTING';
      else if (heightForAgeZ > 3) heightStatus = 'TALL_STATURE';
    }

    const growthData = {
      ageMonths: dto.ageMonths,
      weight: dto.weight,
      height: dto.height,
      headCircumference: dto.headCircumference,
      bmi,
      gender: genderKey,
      standard,
      zScores: {
        weightForAge: weightForAgeZ != null ? parseFloat(weightForAgeZ.toFixed(2)) : null,
        heightForAge: heightForAgeZ != null ? parseFloat(heightForAgeZ.toFixed(2)) : null,
        bmiForAge: bmiForAgeZ != null ? parseFloat(bmiForAgeZ.toFixed(2)) : null,
        headCircumferenceForAge: headCircForAgeZ != null ? parseFloat(headCircForAgeZ.toFixed(2)) : null,
        weightForHeight: weightForHeightZ != null ? parseFloat(weightForHeightZ.toFixed(2)) : null,
      },
      percentiles: {
        weightForAge: weightForAgeZ != null ? this.zScoreToPercentile(weightForAgeZ) : null,
        heightForAge: heightForAgeZ != null ? this.zScoreToPercentile(heightForAgeZ) : null,
        bmiForAge: bmiForAgeZ != null ? this.zScoreToPercentile(bmiForAgeZ) : null,
        headCircumferenceForAge: headCircForAgeZ != null ? this.zScoreToPercentile(headCircForAgeZ) : null,
        weightForHeight: weightForHeightZ != null ? this.zScoreToPercentile(weightForHeightZ) : null,
      },
      nutritionalStatus,
      heightStatus,
      observations: dto.observations,
      measuredAt: dto.measuredAt ?? new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[VITALS:PEDIATRIC_GROWTH] Age ${dto.ageMonths}m`,
        content: JSON.stringify(growthData),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      ...growthData,
      createdAt: doc.createdAt,
    };
  }

  // ─── Pediatric Growth Curve Data ────────────────────────────────────────

  async getPediatricGrowthCurve(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, birthDate: true, gender: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        patientId,
        tenantId,
        title: { startsWith: '[VITALS:PEDIATRIC_GROWTH]' },
      },
      orderBy: { createdAt: 'asc' },
    });

    const measurements = docs.map((doc) => {
      const data = JSON.parse(doc.content ?? '{}');
      return {
        id: doc.id,
        ageMonths: data.ageMonths,
        weight: data.weight,
        height: data.height,
        headCircumference: data.headCircumference,
        bmi: data.bmi,
        zScores: data.zScores,
        percentiles: data.percentiles,
        nutritionalStatus: data.nutritionalStatus,
        heightStatus: data.heightStatus,
        measuredAt: data.measuredAt ?? doc.createdAt.toISOString(),
      };
    });

    // Generate reference curves for chart overlay (WHO approximation)
    const gender = patient.gender === 'M' ? 'M' : 'F';
    const maxAge = measurements.length > 0
      ? Math.max(...measurements.map((m) => m.ageMonths ?? 0), 24)
      : 24;

    const referenceCurves = this.generateReferenceCurves(gender, maxAge);

    return {
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        birthDate: patient.birthDate,
        gender: patient.gender,
      },
      measurements,
      totalMeasurements: measurements.length,
      referenceCurves,
    };
  }

  // ─── Z-Score calculation helpers (WHO simplified LMS approximation) ────

  /**
   * Weight-for-age z-score using simplified WHO LMS parameters.
   * These are median (M), coefficient of variation (S), and power (L)
   * values approximated from WHO Child Growth Standards.
   */
  private calculateWeightForAgeZScore(
    ageMonths: number,
    weight: number,
    gender: string,
    _standard: string,
  ): number {
    // Simplified WHO median weight-for-age (birth to 60 months)
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        0: { m: 3.3, s: 0.14 }, 1: { m: 4.5, s: 0.13 }, 2: { m: 5.6, s: 0.13 },
        3: { m: 6.4, s: 0.13 }, 4: { m: 7.0, s: 0.13 }, 5: { m: 7.5, s: 0.13 },
        6: { m: 7.9, s: 0.13 }, 9: { m: 8.9, s: 0.12 }, 12: { m: 9.6, s: 0.12 },
        18: { m: 10.9, s: 0.12 }, 24: { m: 12.2, s: 0.12 }, 36: { m: 14.3, s: 0.13 },
        48: { m: 16.3, s: 0.13 }, 60: { m: 18.3, s: 0.14 },
      },
      F: {
        0: { m: 3.2, s: 0.14 }, 1: { m: 4.2, s: 0.13 }, 2: { m: 5.1, s: 0.13 },
        3: { m: 5.8, s: 0.13 }, 4: { m: 6.4, s: 0.13 }, 5: { m: 6.9, s: 0.13 },
        6: { m: 7.3, s: 0.13 }, 9: { m: 8.2, s: 0.13 }, 12: { m: 8.9, s: 0.13 },
        18: { m: 10.2, s: 0.13 }, 24: { m: 11.5, s: 0.13 }, 36: { m: 13.9, s: 0.13 },
        48: { m: 16.1, s: 0.14 }, 60: { m: 18.2, s: 0.14 },
      },
    };

    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return (weight - ref.m) / (ref.m * ref.s);
  }

  private calculateHeightForAgeZScore(
    ageMonths: number,
    height: number,
    gender: string,
    _standard: string,
  ): number {
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        0: { m: 49.9, s: 0.04 }, 1: { m: 54.7, s: 0.04 }, 2: { m: 58.4, s: 0.04 },
        3: { m: 61.4, s: 0.04 }, 6: { m: 67.6, s: 0.03 }, 9: { m: 72.0, s: 0.03 },
        12: { m: 75.7, s: 0.03 }, 18: { m: 82.3, s: 0.03 }, 24: { m: 87.8, s: 0.04 },
        36: { m: 96.1, s: 0.04 }, 48: { m: 103.3, s: 0.04 }, 60: { m: 110.0, s: 0.04 },
      },
      F: {
        0: { m: 49.1, s: 0.04 }, 1: { m: 53.7, s: 0.04 }, 2: { m: 57.1, s: 0.04 },
        3: { m: 59.8, s: 0.04 }, 6: { m: 65.7, s: 0.03 }, 9: { m: 70.1, s: 0.03 },
        12: { m: 74.0, s: 0.03 }, 18: { m: 80.7, s: 0.04 }, 24: { m: 86.4, s: 0.04 },
        36: { m: 95.1, s: 0.04 }, 48: { m: 102.7, s: 0.04 }, 60: { m: 109.4, s: 0.04 },
      },
    };

    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return (height - ref.m) / (ref.m * ref.s);
  }

  private calculateBmiForAgeZScore(
    ageMonths: number,
    bmi: number,
    gender: string,
    _standard: string,
  ): number {
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        24: { m: 16.0, s: 0.08 }, 36: { m: 15.5, s: 0.08 },
        48: { m: 15.3, s: 0.08 }, 60: { m: 15.2, s: 0.09 },
      },
      F: {
        24: { m: 15.7, s: 0.08 }, 36: { m: 15.4, s: 0.08 },
        48: { m: 15.2, s: 0.09 }, 60: { m: 15.2, s: 0.09 },
      },
    };

    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return (bmi - ref.m) / (ref.m * ref.s);
  }

  private calculateHeadCircForAgeZScore(
    ageMonths: number,
    headCirc: number,
    gender: string,
    _standard: string,
  ): number {
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        0: { m: 34.5, s: 0.03 }, 1: { m: 37.3, s: 0.03 }, 2: { m: 39.1, s: 0.03 },
        3: { m: 40.5, s: 0.03 }, 6: { m: 43.3, s: 0.03 }, 9: { m: 45.0, s: 0.03 },
        12: { m: 46.1, s: 0.03 }, 18: { m: 47.4, s: 0.03 }, 24: { m: 48.3, s: 0.03 },
        36: { m: 49.5, s: 0.03 }, 48: { m: 50.2, s: 0.03 }, 60: { m: 50.7, s: 0.03 },
      },
      F: {
        0: { m: 33.9, s: 0.03 }, 1: { m: 36.5, s: 0.03 }, 2: { m: 38.3, s: 0.03 },
        3: { m: 39.5, s: 0.03 }, 6: { m: 42.2, s: 0.03 }, 9: { m: 43.8, s: 0.03 },
        12: { m: 44.9, s: 0.03 }, 18: { m: 46.2, s: 0.03 }, 24: { m: 47.2, s: 0.03 },
        36: { m: 48.3, s: 0.03 }, 48: { m: 49.0, s: 0.03 }, 60: { m: 49.5, s: 0.03 },
      },
    };

    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return (headCirc - ref.m) / (ref.m * ref.s);
  }

  private calculateWeightForHeightZScore(
    height: number,
    weight: number,
    gender: string,
    _standard: string,
  ): number {
    // Simplified WHO weight-for-height medians (height in cm -> weight in kg)
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        45: { m: 2.4, s: 0.09 }, 50: { m: 3.3, s: 0.09 }, 55: { m: 4.6, s: 0.09 },
        60: { m: 5.9, s: 0.09 }, 65: { m: 7.0, s: 0.09 }, 70: { m: 8.0, s: 0.09 },
        75: { m: 9.0, s: 0.09 }, 80: { m: 10.0, s: 0.09 }, 85: { m: 11.0, s: 0.09 },
        90: { m: 12.2, s: 0.09 }, 95: { m: 13.5, s: 0.09 }, 100: { m: 14.8, s: 0.10 },
        105: { m: 16.2, s: 0.10 }, 110: { m: 17.7, s: 0.10 },
      },
      F: {
        45: { m: 2.5, s: 0.09 }, 50: { m: 3.2, s: 0.09 }, 55: { m: 4.4, s: 0.09 },
        60: { m: 5.6, s: 0.09 }, 65: { m: 6.7, s: 0.09 }, 70: { m: 7.6, s: 0.09 },
        75: { m: 8.5, s: 0.09 }, 80: { m: 9.5, s: 0.09 }, 85: { m: 10.6, s: 0.09 },
        90: { m: 11.8, s: 0.10 }, 95: { m: 13.1, s: 0.10 }, 100: { m: 14.4, s: 0.10 },
        105: { m: 15.9, s: 0.10 }, 110: { m: 17.4, s: 0.10 },
      },
    };

    const ref = this.interpolateReference(medians[gender] ?? medians.M, height);
    return (weight - ref.m) / (ref.m * ref.s);
  }

  /**
   * Interpolate between reference data points for a given input value.
   */
  private interpolateReference(
    data: Record<number, { m: number; s: number }>,
    value: number,
  ): { m: number; s: number } {
    const keys = Object.keys(data).map(Number).sort((a, b) => a - b);

    if (keys.length === 0) return { m: 1, s: 0.1 };

    // Below minimum
    if (value <= keys[0]) return data[keys[0]];

    // Above maximum
    if (value >= keys[keys.length - 1]) return data[keys[keys.length - 1]];

    // Find surrounding keys and interpolate
    for (let i = 0; i < keys.length - 1; i++) {
      if (value >= keys[i] && value <= keys[i + 1]) {
        const fraction = (value - keys[i]) / (keys[i + 1] - keys[i]);
        const lower = data[keys[i]];
        const upper = data[keys[i + 1]];
        return {
          m: lower.m + fraction * (upper.m - lower.m),
          s: lower.s + fraction * (upper.s - lower.s),
        };
      }
    }

    return data[keys[0]];
  }

  /**
   * Convert z-score to approximate percentile using the standard normal CDF.
   */
  private zScoreToPercentile(z: number): number {
    // Abramowitz and Stegun approximation of the normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const absZ = Math.abs(z);
    const t = 1.0 / (1.0 + p * absZ);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);
    const cdf = 0.5 * (1.0 + sign * y);
    return parseFloat((cdf * 100).toFixed(1));
  }

  /**
   * Generate reference curves for chart overlay.
   */
  private generateReferenceCurves(gender: string, maxAgeMonths: number) {
    const ages: number[] = [];
    for (let a = 0; a <= maxAgeMonths; a += (a < 12 ? 1 : 3)) {
      ages.push(a);
    }

    const curves = {
      weightForAge: {
        p3: ages.map((a) => ({ age: a, value: this.getPercentileWeight(a, gender, -1.88) })),
        p15: ages.map((a) => ({ age: a, value: this.getPercentileWeight(a, gender, -1.04) })),
        p50: ages.map((a) => ({ age: a, value: this.getPercentileWeight(a, gender, 0) })),
        p85: ages.map((a) => ({ age: a, value: this.getPercentileWeight(a, gender, 1.04) })),
        p97: ages.map((a) => ({ age: a, value: this.getPercentileWeight(a, gender, 1.88) })),
      },
      heightForAge: {
        p3: ages.map((a) => ({ age: a, value: this.getPercentileHeight(a, gender, -1.88) })),
        p50: ages.map((a) => ({ age: a, value: this.getPercentileHeight(a, gender, 0) })),
        p97: ages.map((a) => ({ age: a, value: this.getPercentileHeight(a, gender, 1.88) })),
      },
    };

    return curves;
  }

  private getPercentileWeight(ageMonths: number, gender: string, z: number): number {
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        0: { m: 3.3, s: 0.14 }, 3: { m: 6.4, s: 0.13 }, 6: { m: 7.9, s: 0.13 },
        12: { m: 9.6, s: 0.12 }, 24: { m: 12.2, s: 0.12 }, 36: { m: 14.3, s: 0.13 },
        48: { m: 16.3, s: 0.13 }, 60: { m: 18.3, s: 0.14 },
      },
      F: {
        0: { m: 3.2, s: 0.14 }, 3: { m: 5.8, s: 0.13 }, 6: { m: 7.3, s: 0.13 },
        12: { m: 8.9, s: 0.13 }, 24: { m: 11.5, s: 0.13 }, 36: { m: 13.9, s: 0.13 },
        48: { m: 16.1, s: 0.14 }, 60: { m: 18.2, s: 0.14 },
      },
    };
    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return parseFloat((ref.m + z * ref.m * ref.s).toFixed(1));
  }

  private getPercentileHeight(ageMonths: number, gender: string, z: number): number {
    const medians: Record<string, Record<number, { m: number; s: number }>> = {
      M: {
        0: { m: 49.9, s: 0.04 }, 3: { m: 61.4, s: 0.04 }, 6: { m: 67.6, s: 0.03 },
        12: { m: 75.7, s: 0.03 }, 24: { m: 87.8, s: 0.04 }, 36: { m: 96.1, s: 0.04 },
        48: { m: 103.3, s: 0.04 }, 60: { m: 110.0, s: 0.04 },
      },
      F: {
        0: { m: 49.1, s: 0.04 }, 3: { m: 59.8, s: 0.04 }, 6: { m: 65.7, s: 0.03 },
        12: { m: 74.0, s: 0.03 }, 24: { m: 86.4, s: 0.04 }, 36: { m: 95.1, s: 0.04 },
        48: { m: 102.7, s: 0.04 }, 60: { m: 109.4, s: 0.04 },
      },
    };
    const ref = this.interpolateReference(medians[gender] ?? medians.M, ageMonths);
    return parseFloat((ref.m + z * ref.m * ref.s).toFixed(1));
  }

  // ─── Enhanced Vitals: Cardiac Arrest Prediction Risk Score ──────────────

  async calculateCardiacArrestRisk(patientId: string) {
    const latest = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latest) {
      return { patientId, riskScore: null, riskLevel: null, message: 'No vital signs available' };
    }

    let riskScore = 0;

    // Heart rate
    if (latest.heartRate !== null) {
      if (latest.heartRate > 130 || latest.heartRate < 40) riskScore += 3;
      else if (latest.heartRate > 110 || latest.heartRate < 50) riskScore += 2;
      else if (latest.heartRate > 100 || latest.heartRate < 60) riskScore += 1;
    }

    // Blood pressure
    if (latest.systolicBP !== null) {
      if (latest.systolicBP < 70) riskScore += 3;
      else if (latest.systolicBP < 90) riskScore += 2;
      else if (latest.systolicBP > 200) riskScore += 2;
    }

    // Respiratory rate
    if (latest.respiratoryRate !== null) {
      if (latest.respiratoryRate > 35 || latest.respiratoryRate < 8) riskScore += 3;
      else if (latest.respiratoryRate > 25 || latest.respiratoryRate < 10) riskScore += 2;
    }

    // SpO2
    if (latest.oxygenSaturation !== null) {
      if (latest.oxygenSaturation < 85) riskScore += 3;
      else if (latest.oxygenSaturation < 90) riskScore += 2;
      else if (latest.oxygenSaturation < 94) riskScore += 1;
    }

    // Temperature
    if (latest.temperature !== null) {
      if (latest.temperature > 40 || latest.temperature < 34) riskScore += 2;
      else if (latest.temperature > 38.5 || latest.temperature < 35) riskScore += 1;
    }

    // GCS
    if (latest.gcs !== null) {
      if (latest.gcs <= 8) riskScore += 3;
      else if (latest.gcs <= 12) riskScore += 2;
      else if (latest.gcs <= 14) riskScore += 1;
    }

    // NEWS score integration
    if (latest.newsScore !== null) {
      if (latest.newsScore >= 7) riskScore += 3;
      else if (latest.newsScore >= 5) riskScore += 2;
    }

    const riskLevel =
      riskScore >= 12 ? 'CRITICAL' :
      riskScore >= 8 ? 'HIGH' :
      riskScore >= 4 ? 'MODERATE' : 'LOW';

    return {
      patientId,
      riskScore,
      riskLevel,
      latestVitalsAt: latest.recordedAt,
      factors: {
        heartRate: latest.heartRate,
        systolicBP: latest.systolicBP,
        respiratoryRate: latest.respiratoryRate,
        oxygenSaturation: latest.oxygenSaturation,
        temperature: latest.temperature,
        gcs: latest.gcs,
        newsScore: latest.newsScore,
      },
    };
  }
}
