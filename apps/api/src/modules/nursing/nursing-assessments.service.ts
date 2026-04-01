import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PainAssessmentDto,
  PainScale,
  PainTrendPeriod,
  EliminationRecordDto,
  EliminationType,
  PositionChangeDto,
  FugulinAssessmentDto,
  FugulinClassification,
  StaffingCalculationDto,
  StaffingComplianceStatus,
  type PainTrendResultDto,
  type PainTrendPointDto,
  type FluidBalanceResultDto,
  type DecubitusScheduleResultDto,
  type PositionChangeRecord,
  type FugulinResultDto,
  type StaffingResultDto,
} from './dto/nursing-assessments.dto';

// ============================================================================
// Constants
// ============================================================================

const DOCUMENT_PREFIX = {
  PAIN: '[PAIN_ASSESSMENT]',
  ELIMINATION: '[ELIMINATION_RECORD]',
  POSITION: '[POSITION_CHANGE]',
  FUGULIN: '[FUGULIN_ASSESSMENT]',
} as const;

/** COFEN 543/2017 nursing hours per patient per day by classification */
const COFEN_HOURS_PER_PATIENT: Record<FugulinClassification, number> = {
  [FugulinClassification.MINIMAL]: 4.0,
  [FugulinClassification.INTERMEDIATE]: 5.6,
  [FugulinClassification.SEMI_INTENSIVE]: 9.4,
  [FugulinClassification.INTENSIVE]: 17.9,
};

/** COFEN 543/2017 minimum nurse percentage by classification */
const COFEN_NURSE_PERCENTAGE: Record<FugulinClassification, number> = {
  [FugulinClassification.MINIMAL]: 0.33,
  [FugulinClassification.INTERMEDIATE]: 0.33,
  [FugulinClassification.SEMI_INTENSIVE]: 0.42,
  [FugulinClassification.INTENSIVE]: 0.52,
};

/** COFEN 543/2017 nurse-to-patient ratio by classification */
const COFEN_NURSE_RATIO: Record<FugulinClassification, number> = {
  [FugulinClassification.MINIMAL]: 6,
  [FugulinClassification.INTERMEDIATE]: 4,
  [FugulinClassification.SEMI_INTENSIVE]: 2.4,
  [FugulinClassification.INTENSIVE]: 1.3,
};

@Injectable()
export class NursingAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Pain Assessment
  // =========================================================================

  async recordPainAssessment(
    tenantId: string,
    nurseId: string,
    dto: PainAssessmentDto,
  ) {
    this.validatePainScore(dto);

    const timestamp = dto.onset ?? new Date().toISOString();

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOCUMENT_PREFIX.PAIN} ${dto.scale} Score:${dto.score}`,
        content: JSON.stringify({
          scale: dto.scale,
          score: dto.score,
          location: dto.location,
          character: dto.character ?? null,
          onset: dto.onset ?? null,
          duration: dto.duration ?? null,
          aggravatingFactors: dto.aggravatingFactors ?? [],
          relievingFactors: dto.relievingFactors ?? [],
          interventionGiven: dto.interventionGiven ?? null,
          reassessmentTime: dto.reassessmentTime ?? null,
          postInterventionScore: dto.postInterventionScore ?? null,
          flaccDetails: dto.flaccDetails ?? null,
          bpsDetails: dto.bpsDetails ?? null,
          assessedAt: timestamp,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });

    const parsed: Record<string, unknown> = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      ...parsed,
      author: doc.author,
      createdAt: doc.createdAt,
    };
  }

  async getPainTrend(
    tenantId: string,
    encounterId: string,
    period: PainTrendPeriod = PainTrendPeriod.H24,
  ): Promise<PainTrendResultDto> {
    const cutoff = new Date();
    if (period === PainTrendPeriod.H24) {
      cutoff.setHours(cutoff.getHours() - 24);
    } else {
      cutoff.setDate(cutoff.getDate() - 7);
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: DOCUMENT_PREFIX.PAIN },
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dataPoints: PainTrendPointDto[] = docs.map((doc) => {
      const data = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        timestamp: (data.assessedAt as string) ?? doc.createdAt.toISOString(),
        scale: data.scale as PainScale,
        score: data.score as number,
        postInterventionScore: (data.postInterventionScore as number) ?? null,
        location: data.location as string,
        interventionGiven: (data.interventionGiven as string) ?? null,
      };
    });

    const scores = dataPoints.map((p) => p.score);
    const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;
    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
    const maxScore = scores.length > 0 ? Math.max(...scores) : null;
    const minScore = scores.length > 0 ? Math.min(...scores) : null;

    let trendDirection: PainTrendResultDto['trendDirection'] = 'INSUFFICIENT_DATA';
    if (scores.length >= 2) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = avgSecond - avgFirst;

      if (diff < -0.5) trendDirection = 'IMPROVING';
      else if (diff > 0.5) trendDirection = 'WORSENING';
      else trendDirection = 'STABLE';
    }

    return {
      encounterId,
      period,
      dataPoints,
      latestScore,
      averageScore,
      maxScore,
      minScore,
      trendDirection,
    };
  }

  async getLatestPain(tenantId: string, encounterId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: DOCUMENT_PREFIX.PAIN },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!doc) return null;

    const data: Record<string, unknown> = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      ...data,
      author: doc.author,
      createdAt: doc.createdAt,
    };
  }

  // =========================================================================
  // Elimination
  // =========================================================================

  async recordElimination(
    tenantId: string,
    nurseId: string,
    dto: EliminationRecordDto,
  ) {
    this.validateEliminationRecord(dto);

    const timestamp = dto.timestamp ?? new Date().toISOString();

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOCUMENT_PREFIX.ELIMINATION} ${dto.type}`,
        content: JSON.stringify({
          type: dto.type,
          timestamp,
          urinaryOutput: dto.urinaryOutput ?? null,
          bowelRecord: dto.bowelRecord ?? null,
          notes: dto.notes ?? null,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });

    const parsed: Record<string, unknown> = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      ...parsed,
      author: doc.author,
      createdAt: doc.createdAt,
    };
  }

  async getFluidBalance(
    tenantId: string,
    encounterId: string,
  ): Promise<FluidBalanceResultDto> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(periodStart.getHours() - 24);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: DOCUMENT_PREFIX.ELIMINATION },
        createdAt: { gte: periodStart },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalUrinaryOutput = 0;
    const records: FluidBalanceResultDto['records'] = [];

    for (const doc of docs) {
      const data = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      const type = data.type as EliminationType;
      let volume = 0;

      if (type === EliminationType.URINARY && data.urinaryOutput) {
        const urinary = data.urinaryOutput as Record<string, unknown>;
        volume = (urinary.volume as number) ?? 0;
        totalUrinaryOutput += volume;
      } else if (
        (type === EliminationType.BOWEL || type === EliminationType.OSTOMY) &&
        data.bowelRecord
      ) {
        const bowel = data.bowelRecord as Record<string, unknown>;
        volume = (bowel.ostomyOutput as number) ?? 0;
      }

      records.push({
        id: doc.id,
        type,
        volume,
        timestamp: (data.timestamp as string) ?? doc.createdAt.toISOString(),
      });
    }

    // Intake comes from separate fluid balance records (existing module)
    // Here we report output side; intake is fetched from the fluid-balance endpoint
    const totalIntake = 0; // Placeholder: integrate with existing fluid balance module
    const balance = totalIntake - totalUrinaryOutput;

    return {
      encounterId,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totalUrinaryOutput,
      totalIntake,
      balance,
      records,
    };
  }

  async getBowelHistory(tenantId: string, encounterId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: `${DOCUMENT_PREFIX.ELIMINATION} BOWEL` },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return docs.map((doc) => {
      const data = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        id: doc.id,
        ...(data.bowelRecord as Record<string, unknown> | null),
        timestamp: (data.timestamp as string) ?? doc.createdAt.toISOString(),
        notes: data.notes as string | null,
      };
    });
  }

  // =========================================================================
  // Position Change / Decubitus
  // =========================================================================

  async recordPositionChange(
    tenantId: string,
    nurseId: string,
    dto: PositionChangeDto,
  ) {
    const timestamp = dto.timestamp ?? new Date().toISOString();

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOCUMENT_PREFIX.POSITION} ${dto.position}`,
        content: JSON.stringify({
          position: dto.position,
          skinAssessment: dto.skinAssessment,
          pressurePoints: dto.pressurePoints ?? [],
          nextDueAt: dto.nextDueAt ?? null,
          nurseName: dto.nurseName ?? null,
          timestamp,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });

    const parsed: Record<string, unknown> = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      ...parsed,
      author: doc.author,
      createdAt: doc.createdAt,
    };
  }

  async getDecubitusSchedule(
    tenantId: string,
    patientId: string,
    intervalMinutes: number = 120,
  ): Promise<DecubitusScheduleResultDto> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOCUMENT_PREFIX.POSITION },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const records: PositionChangeRecord[] = docs.map((doc) => {
      const data = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        id: doc.id,
        position: data.position as PositionChangeRecord['position'],
        skinAssessment: data.skinAssessment as PositionChangeRecord['skinAssessment'],
        pressurePoints: (data.pressurePoints as string[]) ?? [],
        nurseName: (data.nurseName as string) ?? null,
        timestamp: (data.timestamp as string) ?? doc.createdAt.toISOString(),
      };
    });

    const lastChange = records[0] ?? null;
    const lastTimestamp = lastChange ? new Date(lastChange.timestamp).getTime() : 0;
    const intervalMs = intervalMinutes * 60 * 1000;
    const nextDueMs = lastTimestamp > 0 ? lastTimestamp + intervalMs : 0;
    const now = Date.now();

    const overdueAlert = lastTimestamp > 0 ? now > nextDueMs : true;
    const overdueMinutes = overdueAlert
      ? Math.max(0, Math.floor((now - nextDueMs) / 60000))
      : 0;

    return {
      patientId,
      intervalMinutes,
      isActive: true,
      lastChange: lastChange ? lastChange.timestamp : null,
      lastPosition: lastChange ? lastChange.position : null,
      nextDue: nextDueMs > 0 ? new Date(nextDueMs).toISOString() : null,
      overdueAlert,
      overdueMinutes,
      records,
    };
  }

  async checkOverduePositionChanges(
    tenantId: string,
    patientIds: string[],
    intervalMinutes: number = 120,
  ) {
    const results: Array<{
      patientId: string;
      overdueAlert: boolean;
      overdueMinutes: number;
      lastChange: string | null;
    }> = [];

    for (const patientId of patientIds) {
      const schedule = await this.getDecubitusSchedule(
        tenantId,
        patientId,
        intervalMinutes,
      );
      results.push({
        patientId,
        overdueAlert: schedule.overdueAlert,
        overdueMinutes: schedule.overdueMinutes,
        lastChange: schedule.lastChange,
      });
    }

    return {
      checkedAt: new Date().toISOString(),
      intervalMinutes,
      patients: results,
      overdueCount: results.filter((r) => r.overdueAlert).length,
    };
  }

  // =========================================================================
  // Fugulin Scale
  // =========================================================================

  async calculateFugulin(
    tenantId: string,
    nurseId: string,
    dto: FugulinAssessmentDto,
  ): Promise<FugulinResultDto> {
    const totalScore =
      dto.mentalState +
      dto.oxygenation +
      dto.vitalSigns +
      dto.nutrition +
      dto.motility +
      dto.locomotion +
      dto.bodyCare +
      dto.elimination +
      dto.therapeutics +
      dto.skinIntegrity +
      dto.drainage +
      dto.curatives;

    // 12 items, each 1-4: range 12-48
    // Classification per spec: MINIMAL 9-14, INTERMEDIATE 15-20, SEMI_INTENSIVE 21-26, INTENSIVE 27+
    let classification: FugulinClassification;
    if (totalScore >= 27) {
      classification = FugulinClassification.INTENSIVE;
    } else if (totalScore >= 21) {
      classification = FugulinClassification.SEMI_INTENSIVE;
    } else if (totalScore >= 15) {
      classification = FugulinClassification.INTERMEDIATE;
    } else {
      classification = FugulinClassification.MINIMAL;
    }

    const assessedAt = new Date().toISOString();

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `${DOCUMENT_PREFIX.FUGULIN} Score:${totalScore} ${classification}`,
        content: JSON.stringify({
          mentalState: dto.mentalState,
          oxygenation: dto.oxygenation,
          vitalSigns: dto.vitalSigns,
          nutrition: dto.nutrition,
          motility: dto.motility,
          locomotion: dto.locomotion,
          bodyCare: dto.bodyCare,
          elimination: dto.elimination,
          therapeutics: dto.therapeutics,
          skinIntegrity: dto.skinIntegrity,
          drainage: dto.drainage,
          curatives: dto.curatives,
          totalScore,
          classification,
          assessedAt,
        }),
        status: 'FINAL',
      },
    });

    return {
      encounterId: dto.encounterId,
      patientId: dto.patientId,
      items: {
        mentalState: dto.mentalState,
        oxygenation: dto.oxygenation,
        vitalSigns: dto.vitalSigns,
        nutrition: dto.nutrition,
        motility: dto.motility,
        locomotion: dto.locomotion,
        bodyCare: dto.bodyCare,
        elimination: dto.elimination,
        therapeutics: dto.therapeutics,
        skinIntegrity: dto.skinIntegrity,
        drainage: dto.drainage,
        curatives: dto.curatives,
      },
      totalScore,
      classification,
      assessedAt,
    };
  }

  async getPatientClassification(tenantId: string, encounterId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: DOCUMENT_PREFIX.FUGULIN },
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!doc) return null;

    const data: Record<string, unknown> = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      ...data,
      author: doc.author,
      createdAt: doc.createdAt,
    };
  }

  // =========================================================================
  // Staffing Calculation (COFEN 543/2017)
  // =========================================================================

  calculateStaffing(dto: StaffingCalculationDto): StaffingResultDto {
    const counts: Record<FugulinClassification, number> = {
      [FugulinClassification.MINIMAL]: 0,
      [FugulinClassification.INTERMEDIATE]: 0,
      [FugulinClassification.SEMI_INTENSIVE]: 0,
      [FugulinClassification.INTENSIVE]: 0,
    };

    for (const patient of dto.patients) {
      counts[patient.classification]++;
    }

    const totalPatients = dto.patients.length;

    // Calculate total nursing hours needed per day
    let totalHoursNeeded = 0;
    for (const classification of Object.values(FugulinClassification)) {
      totalHoursNeeded += counts[classification] * COFEN_HOURS_PER_PATIENT[classification];
    }

    // Staff needed based on shift hours
    const staffPerShift = Math.ceil(totalHoursNeeded / dto.shiftHours);

    // Calculate staffing per classification tier
    const details = {
      minimalStaff: this.calculateTierStaff(
        counts[FugulinClassification.MINIMAL],
        FugulinClassification.MINIMAL,
        dto.shiftHours,
      ),
      intermediateStaff: this.calculateTierStaff(
        counts[FugulinClassification.INTERMEDIATE],
        FugulinClassification.INTERMEDIATE,
        dto.shiftHours,
      ),
      semiIntensiveStaff: this.calculateTierStaff(
        counts[FugulinClassification.SEMI_INTENSIVE],
        FugulinClassification.SEMI_INTENSIVE,
        dto.shiftHours,
      ),
      intensiveStaff: this.calculateTierStaff(
        counts[FugulinClassification.INTENSIVE],
        FugulinClassification.INTENSIVE,
        dto.shiftHours,
      ),
    };

    const requiredNurses =
      details.minimalStaff.nurses +
      details.intermediateStaff.nurses +
      details.semiIntensiveStaff.nurses +
      details.intensiveStaff.nurses;

    const requiredTechs =
      details.minimalStaff.techs +
      details.intermediateStaff.techs +
      details.semiIntensiveStaff.techs +
      details.intensiveStaff.techs;

    const totalStaff = requiredNurses + requiredTechs;

    // Determine overall nurse-to-patient ratio
    const ratio =
      requiredNurses > 0
        ? `1:${Math.round((totalPatients / requiredNurses) * 10) / 10}`
        : 'N/A';

    // Determine compliance: check if worst-tier ratio is met
    let complianceStatus: StaffingComplianceStatus = StaffingComplianceStatus.ADEQUATE;
    if (totalStaff < staffPerShift) {
      complianceStatus = StaffingComplianceStatus.BELOW_MINIMUM;
    }

    // Check intensive ratio specifically
    if (counts[FugulinClassification.INTENSIVE] > 0) {
      const intensiveRatio =
        counts[FugulinClassification.INTENSIVE] /
        Math.max(details.intensiveStaff.nurses, 1);
      if (intensiveRatio > COFEN_NURSE_RATIO[FugulinClassification.INTENSIVE]) {
        complianceStatus = StaffingComplianceStatus.CRITICAL;
      }
    }

    return {
      unitId: dto.unitId,
      minimalPatients: counts[FugulinClassification.MINIMAL],
      intermediatePatients: counts[FugulinClassification.INTERMEDIATE],
      semiIntensivePatients: counts[FugulinClassification.SEMI_INTENSIVE],
      intensivePatients: counts[FugulinClassification.INTENSIVE],
      totalPatients,
      totalHoursNeeded: Math.round(totalHoursNeeded * 10) / 10,
      requiredNurses,
      requiredTechs,
      totalStaff,
      nurseToPatientRatio: ratio,
      complianceStatus,
      details,
      reference: 'COFEN Resolucao 543/2017',
    };
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private calculateTierStaff(
    patientCount: number,
    classification: FugulinClassification,
    shiftHours: number,
  ): { nurses: number; techs: number } {
    if (patientCount === 0) return { nurses: 0, techs: 0 };

    const totalHours = patientCount * COFEN_HOURS_PER_PATIENT[classification];
    const totalStaff = Math.ceil(totalHours / shiftHours);
    const nursePercentage = COFEN_NURSE_PERCENTAGE[classification];

    const nurses = Math.max(1, Math.ceil(totalStaff * nursePercentage));
    const techs = Math.max(0, totalStaff - nurses);

    return { nurses, techs };
  }

  private validatePainScore(dto: PainAssessmentDto): void {
    switch (dto.scale) {
      case PainScale.EVA:
      case PainScale.WONG_BAKER:
      case PainScale.NIPS:
        if (dto.score < 0 || dto.score > 10) {
          throw new BadRequestException(
            `${dto.scale} score must be between 0 and 10`,
          );
        }
        break;
      case PainScale.FLACC:
        if (dto.score < 0 || dto.score > 10) {
          throw new BadRequestException('FLACC score must be between 0 and 10');
        }
        if (dto.flaccDetails) {
          const total =
            dto.flaccDetails.face +
            dto.flaccDetails.legs +
            dto.flaccDetails.activity +
            dto.flaccDetails.cry +
            dto.flaccDetails.consolability;
          if (total !== dto.score) {
            throw new BadRequestException(
              `FLACC subscale total (${total}) does not match provided score (${dto.score})`,
            );
          }
        }
        break;
      case PainScale.BPS:
        if (dto.score < 3 || dto.score > 12) {
          throw new BadRequestException('BPS score must be between 3 and 12');
        }
        if (dto.bpsDetails) {
          const total =
            dto.bpsDetails.facialExpression +
            dto.bpsDetails.upperLimbs +
            dto.bpsDetails.complianceWithVentilation;
          if (total !== dto.score) {
            throw new BadRequestException(
              `BPS subscale total (${total}) does not match provided score (${dto.score})`,
            );
          }
        }
        break;
    }
  }

  private validateEliminationRecord(dto: EliminationRecordDto): void {
    if (dto.type === EliminationType.URINARY && !dto.urinaryOutput) {
      throw new BadRequestException(
        'urinaryOutput is required when type is URINARY',
      );
    }
    if (
      (dto.type === EliminationType.BOWEL || dto.type === EliminationType.OSTOMY) &&
      !dto.bowelRecord
    ) {
      throw new BadRequestException(
        'bowelRecord is required when type is BOWEL or OSTOMY',
      );
    }
  }
}
