import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PainScaleDto,
  EliminationControlDto,
  DecubitusChangeDto,
  AdmissionChecklistDto,
  WoundEvolutionDto,
  IndividualCarePlanDto,
  FugulinScaleDto,
  StaffDimensioningDto,
  NursingScheduleDto,
  CatheterBundleDto,
  CvcBundleDto,
  PainScaleType,
  FugulinScaleClass,
  WoundHealingTrend,
  type PainScaleResult,
  type PainTrendPoint,
  type EliminationResult,
  type DecubitusScheduleResult,
  type WoundEvolutionResult,
  type StaffDimensioningResult,
  type FugulinResult,
  type CatheterBundleResult,
  type CvcBundleResult,
} from './dto/nursing-scales.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — COFEN 543/2017
// ─────────────────────────────────────────────────────────────────────────────

const COFEN_HOURS: Record<FugulinScaleClass, number> = {
  [FugulinScaleClass.MINIMAL]: 4.0,
  [FugulinScaleClass.INTERMEDIATE]: 5.6,
  [FugulinScaleClass.SEMI_INTENSIVE]: 9.4,
  [FugulinScaleClass.INTENSIVE]: 17.9,
};

const COFEN_NURSE_RATIO: Record<FugulinScaleClass, number> = {
  [FugulinScaleClass.MINIMAL]: 0.33,
  [FugulinScaleClass.INTERMEDIATE]: 0.33,
  [FugulinScaleClass.SEMI_INTENSIVE]: 0.42,
  [FugulinScaleClass.INTENSIVE]: 0.52,
};

/** Maximum score limits per scale */
const PAIN_MAX_SCORE: Record<PainScaleType, number> = {
  [PainScaleType.EVA]: 10,
  [PainScaleType.FLACC]: 10,
  [PainScaleType.BPS]: 12,
};

/** Document title prefixes for ClinicalDocument storage */
const DOC_PREFIX = {
  PAIN: '[NURSING_SCALES:PAIN]',
  ELIMINATION: '[NURSING_SCALES:ELIMINATION]',
  DECUBITUS: '[NURSING_SCALES:DECUBITUS]',
  ADMISSION_CHECKLIST: '[NURSING_SCALES:ADMISSION]',
  WOUND: '[NURSING_SCALES:WOUND]',
  CARE_PLAN: '[NURSING_SCALES:CARE_PLAN]',
  FUGULIN: '[NURSING_SCALES:FUGULIN]',
  STAFF_DIMENSIONING: '[NURSING_SCALES:STAFFING]',
  SCHEDULE: '[NURSING_SCALES:SCHEDULE]',
  CATHETER_BUNDLE: '[NURSING_SCALES:CATHETER]',
  CVC_BUNDLE: '[NURSING_SCALES:CVC]',
} as const;

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class NursingScalesService {
  private readonly logger = new Logger(NursingScalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // A) PAIN SCALES
  // ===========================================================================

  async recordPainAssessment(
    tenantId: string,
    nurseId: string,
    dto: PainScaleDto,
  ): Promise<PainScaleResult> {
    const maxScore = PAIN_MAX_SCORE[dto.scaleType];
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score ${dto.score} inválido para escala ${dto.scaleType} (máximo: ${maxScore})`,
      );
    }
    if (dto.postAnalgesiaReassessment !== undefined && dto.postAnalgesiaReassessment > maxScore) {
      throw new BadRequestException(
        `Score de reavaliação ${dto.postAnalgesiaReassessment} inválido para escala ${dto.scaleType}`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.PAIN} ${dto.scaleType} Score:${dto.score}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          scaleType: dto.scaleType,
          score: dto.score,
          location: dto.location ?? null,
          characteristics: dto.characteristics ?? null,
          interventionGiven: dto.interventionGiven ?? null,
          postAnalgesiaReassessment: dto.postAnalgesiaReassessment ?? null,
          assessedAt: dto.assessedAt ?? new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      scaleType: dto.scaleType,
      score: dto.score,
      postAnalgesiaReassessment: dto.postAnalgesiaReassessment ?? null,
      createdAt: doc.createdAt,
    };
  }

  async getPainTrend(
    tenantId: string,
    patientId: string,
    hoursBack = 24,
  ): Promise<PainTrendPoint[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursBack);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOC_PREFIX.PAIN },
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as {
        scaleType: PainScaleType;
        score: number;
        assessedAt: string;
        interventionGiven: string | null;
        postAnalgesiaReassessment: number | null;
      };
      return {
        timestamp: p.assessedAt,
        score: p.score,
        scaleType: p.scaleType,
        intervention: p.interventionGiven,
        postScore: p.postAnalgesiaReassessment,
      };
    });
  }

  // ===========================================================================
  // B) ELIMINATION CONTROL
  // ===========================================================================

  async recordElimination(
    tenantId: string,
    nurseId: string,
    dto: EliminationControlDto,
  ): Promise<EliminationResult> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.ELIMINATION} Patient:${dto.patientId}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          urineVolume: dto.urineVolume ?? null,
          urineAspect: dto.urineAspect ?? null,
          bowelBristol: dto.bowelBristol ?? null,
          ostomy: dto.ostomy ?? null,
          catheter: dto.catheter ?? null,
          notes: dto.notes ?? null,
          recordedAt: dto.recordedAt ?? new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      urineVolume: dto.urineVolume ?? null,
      bowelBristol: dto.bowelBristol ?? null,
      createdAt: doc.createdAt,
    };
  }

  async getFluidBalance(
    tenantId: string,
    patientId: string,
    hoursBack = 24,
  ): Promise<{ totalUrineOutput: number; recordCount: number }> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursBack);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOC_PREFIX.ELIMINATION },
        createdAt: { gte: cutoff },
      },
    });

    let totalUrineOutput = 0;
    for (const d of docs) {
      const p = JSON.parse(d.content ?? '{}') as { urineVolume: number | null };
      if (p.urineVolume) totalUrineOutput += p.urineVolume;
    }

    return { totalUrineOutput, recordCount: docs.length };
  }

  // ===========================================================================
  // C) DECUBITUS CHANGE SCHEDULE
  // ===========================================================================

  async recordDecubitusChange(
    tenantId: string,
    nurseId: string,
    dto: DecubitusChangeDto,
  ): Promise<{ id: string; patientId: string; position: string; delayAlert: boolean; createdAt: Date }> {
    const scheduled = new Date(dto.scheduledTime);
    const actual = dto.actualTime ? new Date(dto.actualTime) : new Date();
    const delayMinutes = (actual.getTime() - scheduled.getTime()) / 60000;
    const delayAlert = dto.delayAlert ?? delayMinutes > 30;

    if (delayAlert) {
      this.logger.warn(
        `DECUBITUS DELAY — patient=${dto.patientId} scheduled=${dto.scheduledTime} actual=${dto.actualTime ?? 'now'} delay=${Math.round(delayMinutes)}min`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.DECUBITUS} Patient:${dto.patientId} Pos:${dto.position}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          scheduledTime: dto.scheduledTime,
          actualTime: dto.actualTime ?? actual.toISOString(),
          position: dto.position,
          delayAlert,
          performedBy: dto.performedBy ?? nurseId,
          skinObservations: dto.skinObservations ?? null,
          delayMinutes: Math.round(delayMinutes),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      position: dto.position,
      delayAlert,
      createdAt: doc.createdAt,
    };
  }

  async getDecubitusSchedule(
    tenantId: string,
    patientId: string,
  ): Promise<DecubitusScheduleResult> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOC_PREFIX.DECUBITUS },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const last = docs[0];
    const lastTime = last?.createdAt ?? null;
    const nextScheduled = lastTime
      ? new Date(lastTime.getTime() + 2 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString();

    const now = new Date();
    const delayAlert = lastTime
      ? now.getTime() > new Date(nextScheduled).getTime() + 30 * 60 * 1000
      : false;

    let currentPosition = null;
    if (last) {
      const p = JSON.parse(last.content ?? '{}') as { position: string };
      currentPosition = p.position as DecubitusScheduleResult['currentPosition'];
    }

    return {
      patientId,
      lastChange: lastTime?.toISOString() ?? null,
      nextScheduled,
      currentPosition,
      delayAlert,
    };
  }

  // ===========================================================================
  // D) NURSING ADMISSION CHECKLIST
  // ===========================================================================

  async createAdmissionChecklist(
    tenantId: string,
    nurseId: string,
    dto: AdmissionChecklistDto,
  ): Promise<{ id: string; patientId: string; createdAt: Date }> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.ADMISSION_CHECKLIST} Patient:${dto.patientId}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          allergies: dto.allergies ?? [],
          medications: dto.medications ?? [],
          consciousness: dto.consciousness ?? null,
          skin: dto.skin ?? null,
          pain: dto.pain ?? null,
          fallRisk: dto.fallRisk ?? null,
          orientations: dto.orientations ?? [],
          admittedBy: dto.admittedBy ?? nurseId,
          completedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return { id: doc.id, patientId: dto.patientId, createdAt: doc.createdAt };
  }

  // ===========================================================================
  // E) WOUND PHOTOGRAPHIC EVOLUTION
  // ===========================================================================

  async recordWoundEvolution(
    tenantId: string,
    nurseId: string,
    dto: WoundEvolutionDto,
  ): Promise<WoundEvolutionResult> {
    const patientId = dto.patientId ?? nurseId; // fallback — caller should always provide patientId

    // Derive healing trend from area comparison if not provided
    let healingTrend = dto.healingTrend ?? null;
    let percentageChange: number | null = null;

    if (dto.aiMeasurement !== undefined && dto.previousArea !== undefined && dto.previousArea > 0) {
      percentageChange = Math.round(((dto.aiMeasurement - dto.previousArea) / dto.previousArea) * 100 * 100) / 100;
      if (!healingTrend) {
        if (percentageChange <= -10) healingTrend = WoundHealingTrend.IMPROVING;
        else if (percentageChange >= 10) healingTrend = WoundHealingTrend.WORSENING;
        else healingTrend = WoundHealingTrend.STABLE;
      }
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.WOUND} Wound:${dto.woundId}`,
        content: JSON.stringify({
          woundId: dto.woundId,
          photo: dto.photo ?? null,
          aiMeasurement: dto.aiMeasurement ?? null,
          previousArea: dto.previousArea ?? null,
          percentageChange,
          healingTrend,
          coveringApplied: dto.coveringApplied ?? null,
          notes: dto.notes ?? null,
          assessedAt: dto.assessedAt ?? new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      woundId: dto.woundId,
      aiMeasurement: dto.aiMeasurement ?? null,
      previousArea: dto.previousArea ?? null,
      percentageChange,
      healingTrend,
      createdAt: doc.createdAt,
    };
  }

  async getWoundHistory(
    tenantId: string,
    woundId: string,
  ): Promise<WoundEvolutionResult[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.WOUND} Wound:${woundId}` },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as {
        aiMeasurement: number | null;
        previousArea: number | null;
        percentageChange: number | null;
        healingTrend: WoundHealingTrend | null;
      };
      return {
        id: d.id,
        woundId,
        aiMeasurement: p.aiMeasurement,
        previousArea: p.previousArea,
        percentageChange: p.percentageChange,
        healingTrend: p.healingTrend,
        createdAt: d.createdAt,
      };
    });
  }

  // ===========================================================================
  // F) INDIVIDUAL CARE PLANS
  // ===========================================================================

  async createCarePlan(
    tenantId: string,
    nurseId: string,
    dto: IndividualCarePlanDto,
  ): Promise<{ id: string; patientId: string; diagnosesCount: number; createdAt: Date }> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.CARE_PLAN} Patient:${dto.patientId}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          nursingDiagnoses: dto.nursingDiagnoses ?? [],
          interventions: dto.interventions ?? [],
          responsible: dto.responsible ?? nurseId,
          outcomeEvaluation: dto.outcomeEvaluation ?? null,
          reviewDate: dto.reviewDate ?? null,
          createdAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      diagnosesCount: (dto.nursingDiagnoses ?? []).length,
      createdAt: doc.createdAt,
    };
  }

  // ===========================================================================
  // G) FUGULIN SCALE (patient classification)
  // ===========================================================================

  async recordFugulin(
    tenantId: string,
    nurseId: string,
    dto: FugulinScaleDto,
  ): Promise<FugulinResult> {
    if (dto.score < 7 || dto.score > 48) {
      throw new BadRequestException('Pontuação Fugulin deve estar entre 7 e 48');
    }

    const nursingHoursRequired = COFEN_HOURS[dto.classification];

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.FUGULIN} ${dto.classification} Score:${dto.score}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          classification: dto.classification,
          score: dto.score,
          criteria: dto.criteria ?? [],
          assessedBy: dto.assessedBy ?? nurseId,
          nursingHoursRequired,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      classification: dto.classification,
      score: dto.score,
      nursingHoursRequired,
      createdAt: doc.createdAt,
    };
  }

  // ===========================================================================
  // H) STAFF DIMENSIONING (COFEN 543/2017)
  // ===========================================================================

  calculateStaffDimensioning(dto: StaffDimensioningDto): StaffDimensioningResult {
    const { minimal, intermediate, semiIntensive, intensive } = dto.patientsByClassification;
    const totalPatients = minimal + intermediate + semiIntensive + intensive;

    if (totalPatients === 0) {
      throw new BadRequestException('Total de pacientes deve ser maior que zero');
    }

    // Calculate total nursing hours per day required
    const totalHoursPerDay =
      minimal * COFEN_HOURS[FugulinScaleClass.MINIMAL] +
      intermediate * COFEN_HOURS[FugulinScaleClass.INTERMEDIATE] +
      semiIntensive * COFEN_HOURS[FugulinScaleClass.SEMI_INTENSIVE] +
      intensive * COFEN_HOURS[FugulinScaleClass.INTENSIVE];

    // COFEN assumes 6h productive hours per shift per staff member
    const PRODUCTIVE_HOURS_PER_SHIFT = 6;
    const SHIFTS_PER_DAY = 4; // 4 shifts of 6h or equivalent

    const totalStaffRequired = Math.ceil(totalHoursPerDay / PRODUCTIVE_HOURS_PER_SHIFT);

    // Nurse percentage — weighted average across classifications
    const nursePercentageWeighted =
      (minimal * COFEN_NURSE_RATIO[FugulinScaleClass.MINIMAL] +
        intermediate * COFEN_NURSE_RATIO[FugulinScaleClass.INTERMEDIATE] +
        semiIntensive * COFEN_NURSE_RATIO[FugulinScaleClass.SEMI_INTENSIVE] +
        intensive * COFEN_NURSE_RATIO[FugulinScaleClass.INTENSIVE]) /
      totalPatients;

    const requiredNurses = Math.ceil(totalStaffRequired * nursePercentageWeighted);
    const requiredTechnicians = totalStaffRequired - requiredNurses;

    const hoursPerPatientDay = totalHoursPerDay / totalPatients;

    // Compliance: each unit must have at least 1 nurse per shift (COFEN min)
    const cofen543Compliant = requiredNurses >= SHIFTS_PER_DAY;

    this.logger.log(
      `COFEN 543 — unit=${dto.unit} patients=${totalPatients} nurses=${requiredNurses} technicians=${requiredTechnicians} compliant=${cofen543Compliant}`,
    );

    return {
      unit: dto.unit,
      totalPatients,
      requiredNurses,
      requiredTechnicians,
      totalStaffRequired,
      cofen543Compliant,
      hoursPerPatientDay: Math.round(hoursPerPatientDay * 100) / 100,
    };
  }

  // ===========================================================================
  // I) NURSING WORK SCHEDULE
  // ===========================================================================

  async saveNursingSchedule(
    tenantId: string,
    managerId: string,
    dto: NursingScheduleDto,
  ): Promise<{ id: string; unit: string; staffCount: number; createdAt: Date }> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: managerId,
        authorId: managerId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.SCHEDULE} Unit:${dto.unit} Period:${dto.periodStart ?? 'open'}`,
        content: JSON.stringify({
          unit: dto.unit,
          shifts: dto.shifts,
          staff: dto.staff ?? [],
          periodStart: dto.periodStart ?? null,
          periodEnd: dto.periodEnd ?? null,
          createdAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      unit: dto.unit,
      staffCount: (dto.staff ?? []).length,
      createdAt: doc.createdAt,
    };
  }

  // ===========================================================================
  // J) CATHETER BUNDLE (CAUTI prevention)
  // ===========================================================================

  async recordCatheterBundle(
    tenantId: string,
    nurseId: string,
    dto: CatheterBundleDto,
  ): Promise<CatheterBundleResult> {
    const daysInPlace = dto.daysInPlace ?? 0;
    // Alert if no daily reassessment or catheter >7 days
    const alert = dto.alert ?? (!dto.dailyReassessment || daysInPlace > 7);

    if (alert) {
      this.logger.warn(
        `CAUTI BUNDLE ALERT — patient=${dto.patientId} catheter=${dto.catheterType} days=${daysInPlace} reassessment=${dto.dailyReassessment ?? false}`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.CATHETER_BUNDLE} ${dto.catheterType} Patient:${dto.patientId}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          catheterType: dto.catheterType,
          indication: dto.indication,
          dailyReassessment: dto.dailyReassessment ?? false,
          daysInPlace,
          care: dto.care ?? [],
          alert,
          insertedAt: dto.insertedAt ?? null,
          recordedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      catheterType: dto.catheterType,
      daysInPlace,
      alert,
      createdAt: doc.createdAt,
    };
  }

  // ===========================================================================
  // K) CVC BUNDLE (CLABSI prevention)
  // ===========================================================================

  async recordCvcBundle(
    tenantId: string,
    nurseId: string,
    dto: CvcBundleDto,
  ): Promise<CvcBundleResult> {
    const daysInPlace = dto.daysInPlace ?? 0;

    const checklistItems = dto.checklist ?? [];
    const totalItems = checklistItems.length || 5; // default 5-item checklist
    const completedItems = checklistItems.filter((item) => item.trim().length > 0).length;

    // Alert if daily maintenance not done or line >14 days
    const alert = dto.alert ?? (!dto.dailyMaintenance || daysInPlace > 14);

    if (alert) {
      this.logger.warn(
        `CLABSI BUNDLE ALERT — patient=${dto.patientId} days=${daysInPlace} dailyMaintenance=${dto.dailyMaintenance ?? false}`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.CVC_BUNDLE} Patient:${dto.patientId} Day:${daysInPlace}`,
        content: JSON.stringify({
          patientId: dto.patientId,
          maxBarrier: dto.maxBarrier ?? false,
          chlorhexidine: dto.chlorhexidine ?? false,
          ultrasoundGuided: dto.ultrasoundGuided ?? false,
          dailyMaintenance: dto.dailyMaintenance ?? false,
          daysInPlace,
          checklist: checklistItems,
          completedItems,
          totalItems,
          alert,
          insertedAt: dto.insertedAt ?? null,
          insertedBy: dto.insertedBy ?? null,
          recordedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      daysInPlace,
      completedItems,
      totalItems,
      alert,
      createdAt: doc.createdAt,
    };
  }

  async getCvcBundleHistory(
    tenantId: string,
    patientId: string,
  ): Promise<CvcBundleResult[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOC_PREFIX.CVC_BUNDLE },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as {
        daysInPlace: number;
        completedItems: number;
        totalItems: number;
        alert: boolean;
      };
      return {
        id: d.id,
        patientId,
        daysInPlace: p.daysInPlace,
        completedItems: p.completedItems,
        totalItems: p.totalItems,
        alert: p.alert,
        createdAt: d.createdAt,
      };
    });
  }
}
