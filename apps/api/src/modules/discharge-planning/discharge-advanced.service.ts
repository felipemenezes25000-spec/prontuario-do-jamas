import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  RegulationRequestStatus,
  BarrierToDischargeType,
  type SafeDischargeChecklistAdvancedDto,
  type CreateBedRegulationDto,
  type BarrierToDischargeDto,
  type BarrierItemDto,
  type MultidisciplinaryRoundDto,
} from './dto/discharge-advanced.dto';
import {
  type DischargeInstructionsDto,
  type DischargePrescriptionDto,
} from './dto/discharge-enhanced.dto';

// ─── In-memory stores (production: Prisma models) ─────────────────────────────

export interface StoredSafeChecklist extends SafeDischargeChecklistAdvancedDto {
  tenantId: string;
  checklistId: string;
  completedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBedRegulation {
  tenantId: string;
  requestId: string;
  patientId: string;
  encounterId: string;
  complexity: number;
  urgency: string;
  requestedBy: string;
  status: RegulationRequestStatus;
  transferDetails?: string;
  regulationProtocol?: string;
  destinationFacility?: string;
  clinicalSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBarrierRecord {
  tenantId: string;
  recordId: string;
  patientId: string;
  encounterId: string;
  barriers: BarrierItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredRound extends MultidisciplinaryRoundDto {
  tenantId: string;
  roundId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDischargeInstructions {
  tenantId: string;
  instructionsId: string;
  encounterId: string;
  patientId: string;
  language: string;
  sections: unknown;
  printableUrl?: string;
  sentViaApp: boolean;
  createdAt: string;
}

export interface StoredDischargePrescription {
  tenantId: string;
  prescriptionId: string;
  encounterId: string;
  patientId: string;
  medications: unknown[];
  reconciliationNotes?: string;
  createdAt: string;
}

@Injectable()
export class DischargeAdvancedService {
  private readonly logger = new Logger(DischargeAdvancedService.name);

  private readonly safeChecklists: StoredSafeChecklist[] = [];
  private readonly bedRegulations: StoredBedRegulation[] = [];
  private readonly barrierRecords: StoredBarrierRecord[] = [];
  private readonly rounds: StoredRound[] = [];
  private readonly dischargeInstructions: StoredDischargeInstructions[] = [];
  private readonly dischargePrescriptions: StoredDischargePrescription[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DISCHARGE INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async createDischargeInstructions(
    tenantId: string,
    userId: string,
    dto: DischargeInstructionsDto,
  ): Promise<StoredDischargeInstructions> {
    this.logger.log(
      `Creating discharge instructions for encounter=${dto.encounterId}`,
    );

    // Verify patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const instructionsId = randomUUID();
    const instructions: StoredDischargeInstructions = {
      tenantId,
      instructionsId,
      encounterId: dto.encounterId,
      patientId: dto.patientId,
      language: dto.language,
      sections: dto.sections,
      printableUrl: `https://api.voxpep.com/discharge/instructions/${instructionsId}/pdf`,
      sentViaApp: false,
      createdAt: new Date().toISOString(),
    };

    this.dischargeInstructions.push(instructions);
    return instructions;
  }

  async getDischargeInstructions(
    tenantId: string,
    encounterId: string,
  ): Promise<StoredDischargeInstructions[]> {
    return this.dischargeInstructions.filter(
      (i) => i.tenantId === tenantId && i.encounterId === encounterId,
    );
  }

  async sendInstructionsViaApp(
    tenantId: string,
    instructionsId: string,
  ): Promise<StoredDischargeInstructions> {
    const instructions = this.dischargeInstructions.find(
      (i) => i.tenantId === tenantId && i.instructionsId === instructionsId,
    );
    if (!instructions) {
      throw new NotFoundException(`Instructions ${instructionsId} not found`);
    }

    instructions.sentViaApp = true;
    this.logger.log(`Discharge instructions ${instructionsId} sent via patient app`);
    return instructions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DISCHARGE PRESCRIPTION (HOME MEDICATIONS)
  // ═══════════════════════════════════════════════════════════════════════════

  async createDischargePrescription(
    tenantId: string,
    dto: DischargePrescriptionDto,
  ): Promise<StoredDischargePrescription> {
    this.logger.log(
      `Creating discharge prescription for encounter=${dto.encounterId}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const prescriptionId = randomUUID();
    const prescription: StoredDischargePrescription = {
      tenantId,
      prescriptionId,
      encounterId: dto.encounterId,
      patientId: dto.patientId,
      medications: dto.medications,
      reconciliationNotes: dto.reconciliationNotes,
      createdAt: new Date().toISOString(),
    };

    this.dischargePrescriptions.push(prescription);
    return prescription;
  }

  async getDischargePrescription(
    tenantId: string,
    encounterId: string,
  ): Promise<StoredDischargePrescription | null> {
    return (
      this.dischargePrescriptions
        .filter((p) => p.tenantId === tenantId && p.encounterId === encounterId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0] ?? null
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SAFE DISCHARGE CHECKLIST
  // ═══════════════════════════════════════════════════════════════════════════

  async createSafeDischargeChecklist(
    tenantId: string,
    userId: string,
    dto: SafeDischargeChecklistAdvancedDto,
  ): Promise<StoredSafeChecklist> {
    this.logger.log(
      `Safe discharge checklist for encounter=${dto.encounterId}`,
    );

    const items = [
      dto.reconciliationDone,
      dto.instructionsGiven,
      dto.followUpScheduled,
      dto.referralsMade,
      dto.examsReviewed,
      dto.companionPresent,
    ];

    const completedCount = items.filter(Boolean).length;
    if (completedCount < 4) {
      this.logger.warn(
        `Safe discharge checklist incomplete: only ${completedCount}/6 mandatory items done`,
      );
    }

    const checklist: StoredSafeChecklist = {
      tenantId,
      checklistId: randomUUID(),
      completedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };

    this.safeChecklists.push(checklist);
    return checklist;
  }

  async getSafeDischargeChecklist(
    tenantId: string,
    encounterId: string,
  ): Promise<StoredSafeChecklist | null> {
    return (
      this.safeChecklists
        .filter(
          (c) => c.tenantId === tenantId && c.encounterId === encounterId,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0] ?? null
    );
  }

  async isReadyForDischarge(
    tenantId: string,
    encounterId: string,
  ): Promise<{
    ready: boolean;
    checklistComplete: boolean;
    missingItems: string[];
    checklist: StoredSafeChecklist | null;
  }> {
    const checklist = await this.getSafeDischargeChecklist(tenantId, encounterId);
    if (!checklist) {
      return {
        ready: false,
        checklistComplete: false,
        missingItems: ['Checklist de alta segura não preenchido'],
        checklist: null,
      };
    }

    const missingItems: string[] = [];
    if (!checklist.reconciliationDone) missingItems.push('Reconciliação medicamentosa');
    if (!checklist.instructionsGiven) missingItems.push('Orientações de alta fornecidas');
    if (!checklist.followUpScheduled) missingItems.push('Retorno agendado');
    if (!checklist.examsReviewed) missingItems.push('Exames pendentes revisados');

    const checklistComplete = missingItems.length === 0;

    return {
      ready: checklistComplete,
      checklistComplete,
      missingItems,
      checklist,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BED REGULATION CENTER
  // ═══════════════════════════════════════════════════════════════════════════

  async createBedRegulationRequest(
    tenantId: string,
    dto: CreateBedRegulationDto,
  ): Promise<StoredBedRegulation> {
    this.logger.log(
      `Bed regulation request: patient=${dto.patientId} complexity=${dto.complexity}`,
    );

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }

    const requestId = randomUUID();
    const now = new Date().toISOString();

    const regulation: StoredBedRegulation = {
      tenantId,
      requestId,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      complexity: dto.complexity,
      urgency: dto.urgency,
      requestedBy: dto.requestedBy,
      status: RegulationRequestStatus.PENDING,
      destinationFacility: dto.destinationFacility,
      clinicalSummary: dto.clinicalSummary,
      createdAt: now,
      updatedAt: now,
    };

    this.bedRegulations.push(regulation);
    return regulation;
  }

  async updateBedRegulationStatus(
    tenantId: string,
    requestId: string,
    status: RegulationRequestStatus,
    details?: { transferDetails?: string; regulationProtocol?: string },
  ): Promise<StoredBedRegulation> {
    const regulation = this.bedRegulations.find(
      (r) => r.tenantId === tenantId && r.requestId === requestId,
    );
    if (!regulation) {
      throw new NotFoundException(`Bed regulation request ${requestId} not found`);
    }

    regulation.status = status;
    regulation.updatedAt = new Date().toISOString();

    if (details?.transferDetails) regulation.transferDetails = details.transferDetails;
    if (details?.regulationProtocol) regulation.regulationProtocol = details.regulationProtocol;

    this.logger.log(`Bed regulation ${requestId} status updated to ${status}`);
    return regulation;
  }

  async listBedRegulations(
    tenantId: string,
    status?: RegulationRequestStatus,
  ): Promise<StoredBedRegulation[]> {
    return this.bedRegulations.filter(
      (r) =>
        r.tenantId === tenantId &&
        (status === undefined || r.status === status),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BARRIER TO DISCHARGE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  async addBarriersToDischarge(
    tenantId: string,
    dto: BarrierToDischargeDto,
  ): Promise<StoredBarrierRecord> {
    this.logger.log(
      `Recording ${dto.barriers.length} discharge barrier(s) for patient=${dto.patientId}`,
    );

    const now = new Date().toISOString();
    const record: StoredBarrierRecord = {
      tenantId,
      recordId: randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      barriers: dto.barriers,
      createdAt: now,
      updatedAt: now,
    };

    this.barrierRecords.push(record);
    return record;
  }

  async getBarriersForEncounter(
    tenantId: string,
    encounterId: string,
  ): Promise<{
    barriers: BarrierItemDto[];
    openCount: number;
    resolvedCount: number;
    estimatedDischargeDelay: string;
  }> {
    const records = this.barrierRecords.filter(
      (r) => r.tenantId === tenantId && r.encounterId === encounterId,
    );

    const allBarriers = records.flatMap((r) => r.barriers);
    const openBarriers = allBarriers.filter((b) => !b.resolved);
    const resolvedBarriers = allBarriers.filter((b) => b.resolved);

    // Estimate delay from barriers
    let estimatedDelayDays = 0;
    for (const barrier of openBarriers) {
      if (barrier.estimatedResolution) {
        const diffMs =
          new Date(barrier.estimatedResolution).getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays > estimatedDelayDays) estimatedDelayDays = diffDays;
      } else {
        estimatedDelayDays = Math.max(estimatedDelayDays, 1);
      }
    }

    return {
      barriers: allBarriers,
      openCount: openBarriers.length,
      resolvedCount: resolvedBarriers.length,
      estimatedDischargeDelay:
        openBarriers.length === 0
          ? 'Sem barreiras pendentes'
          : `~${estimatedDelayDays} dia(s)`,
    };
  }

  async resolveBarrier(
    tenantId: string,
    encounterId: string,
    barrierIndex: number,
  ): Promise<StoredBarrierRecord> {
    const record = this.barrierRecords.find(
      (r) => r.tenantId === tenantId && r.encounterId === encounterId,
    );
    if (!record) {
      throw new NotFoundException(
        `Barrier record not found for encounter ${encounterId}`,
      );
    }

    if (barrierIndex < 0 || barrierIndex >= record.barriers.length) {
      throw new BadRequestException(`Invalid barrier index ${barrierIndex}`);
    }

    record.barriers[barrierIndex].resolved = true;
    record.barriers[barrierIndex].resolvedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    return record;
  }

  async getBarrierStats(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalEncountersWithBarriers: number;
    mostCommonBarrierType: BarrierToDischargeType | null;
    barrierTypeCounts: Record<string, number>;
    averageResolutionDays: number;
  }> {
    let records = this.barrierRecords.filter((r) => r.tenantId === tenantId);

    if (startDate) {
      records = records.filter(
        (r) => new Date(r.createdAt) >= new Date(startDate),
      );
    }
    if (endDate) {
      records = records.filter(
        (r) => new Date(r.createdAt) <= new Date(endDate),
      );
    }

    const typeCounts: Record<string, number> = {};
    for (const record of records) {
      for (const barrier of record.barriers) {
        typeCounts[barrier.type] = (typeCounts[barrier.type] ?? 0) + 1;
      }
    }

    const mostCommonBarrierType =
      Object.keys(typeCounts).length > 0
        ? (Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0][0] as BarrierToDischargeType)
        : null;

    return {
      totalEncountersWithBarriers: records.length,
      mostCommonBarrierType,
      barrierTypeCounts: typeCounts,
      averageResolutionDays: 1.8, // stub
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. MULTIDISCIPLINARY ROUNDING
  // ═══════════════════════════════════════════════════════════════════════════

  async createRound(
    tenantId: string,
    dto: MultidisciplinaryRoundDto,
  ): Promise<StoredRound> {
    this.logger.log(
      `MDT round for patient=${dto.patientId} date=${dto.date} participants=${dto.participants.length}`,
    );

    const now = new Date().toISOString();
    const round: StoredRound = {
      tenantId,
      roundId: randomUUID(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    this.rounds.push(round);
    return round;
  }

  async listRoundsForEncounter(
    tenantId: string,
    encounterId: string,
  ): Promise<StoredRound[]> {
    return this.rounds
      .filter(
        (r) => r.tenantId === tenantId && r.encounterId === encounterId,
      )
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }

  async getLatestRound(
    tenantId: string,
    encounterId: string,
  ): Promise<StoredRound | null> {
    const rounds = await this.listRoundsForEncounter(tenantId, encounterId);
    return rounds[0] ?? null;
  }

  async completePendingTask(
    tenantId: string,
    roundId: string,
    taskIndex: number,
  ): Promise<StoredRound> {
    const round = this.rounds.find(
      (r) => r.tenantId === tenantId && r.roundId === roundId,
    );
    if (!round) throw new NotFoundException(`Round ${roundId} not found`);

    if (taskIndex < 0 || taskIndex >= round.pendingTasks.length) {
      throw new BadRequestException(`Invalid task index ${taskIndex}`);
    }

    round.pendingTasks[taskIndex].completed = true;
    round.updatedAt = new Date().toISOString();

    return round;
  }
}
