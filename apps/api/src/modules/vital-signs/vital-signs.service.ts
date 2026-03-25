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
