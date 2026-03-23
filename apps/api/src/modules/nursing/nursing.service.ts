import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNursingProcessDto } from './dto/create-nursing-process.dto';
import {
  CreateNursingDiagnosisDto,
  CreateNursingOutcomeDto,
  CreateNursingInterventionDto,
} from './dto/create-nursing-diagnosis.dto';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto';
import { CreateFluidBalanceDto } from './dto/create-fluid-balance.dto';
import {
  AdministerMedicationDto,
  SkipMedicationDto,
  SuspendMedicationDto,
} from './dto/administer-medication.dto';
import { CreateHandoffDto } from './dto/create-handoff.dto';
import type { Prisma } from '@prisma/client';

// ============================================================================
// Interfaces for schedule response
// ============================================================================

interface ScheduleSlot {
  scheduledAt: string;
  status: 'PENDING' | 'DONE' | 'LATE' | 'SKIPPED' | 'SUSPENDED';
  checkId: string | null;
  administeredBy: { id: string; name: string } | null;
  lot: string | null;
  observations: string | null;
  checkedAt: string | null;
}

interface ScheduleRow {
  prescriptionItem: {
    id: string;
    name: string;
    dose: string | null;
    route: string | null;
    frequency: string | null;
    frequencyHours: number | null;
    isHighAlert: boolean;
    isControlled: boolean;
  };
  schedule: ScheduleSlot[];
}

// ============================================================================
// Frequency-to-hours mapping
// ============================================================================

function computeScheduleHours(frequencyHours: number | null, frequency: string | null): number[] {
  if (frequencyHours) {
    const hours: number[] = [];
    const interval = frequencyHours;
    // Standard starting hours based on interval
    let start = 6; // default start 06:00
    if (interval === 6) {
      return [0, 6, 12, 18];
    }
    if (interval === 8) {
      return [6, 14, 22];
    }
    if (interval === 12) {
      return [6, 18];
    }
    if (interval === 24) {
      return [6];
    }
    if (interval === 4) {
      return [0, 4, 8, 12, 16, 20];
    }
    // Generic: generate from start
    for (let h = start; h < 24 + start; h += interval) {
      hours.push(h % 24);
    }
    return hours.sort((a, b) => a - b);
  }

  // Try to parse frequency string
  const freq = (frequency ?? '').toLowerCase();
  if (freq.includes('6/6') || freq.includes('6h')) return [0, 6, 12, 18];
  if (freq.includes('8/8') || freq.includes('8h')) return [6, 14, 22];
  if (freq.includes('12/12') || freq.includes('12h')) return [6, 18];
  if (freq.includes('4/4') || freq.includes('4h')) return [0, 4, 8, 12, 16, 20];
  if (freq.includes('1x') || freq.includes('24/24') || freq.includes('24h') || freq.includes('dia')) return [6];
  if (freq.includes('2x')) return [6, 18];
  if (freq.includes('3x')) return [6, 14, 22];
  if (freq.includes('4x')) return [6, 12, 18, 22];

  // Default: once daily at 06:00
  return [6];
}

function mapPrismaStatusToSchedule(status: string): ScheduleSlot['status'] {
  switch (status) {
    case 'ADMINISTERED':
      return 'DONE';
    case 'DELAYED':
    case 'MISSED':
      return 'LATE';
    case 'REFUSED':
    case 'HELD':
    case 'CANCELLED':
      return 'SKIPPED';
    default:
      return 'PENDING';
  }
}

@Injectable()
export class NursingService {
  constructor(private readonly prisma: PrismaService) {}

  // === SCHEDULE (A3) ===

  async getSchedule(encounterId: string): Promise<ScheduleRow[]> {
    // 1. Get all active prescriptions for this encounter
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        encounterId,
        status: 'ACTIVE',
      },
      include: {
        items: {
          where: {
            status: 'ACTIVE',
            medicationName: { not: null },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const allItems = prescriptions.flatMap((p) => p.items);

    if (allItems.length === 0) {
      return [];
    }

    // 2. Get all MedicationChecks for these items today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemIds = allItems.map((item) => item.id);
    const existingChecks = await this.prisma.medicationCheck.findMany({
      where: {
        prescriptionItemId: { in: itemIds },
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        nurse: { select: { id: true, name: true } },
      },
    });

    // Index checks by itemId + hour
    const checkMap = new Map<string, typeof existingChecks[number]>();
    for (const check of existingChecks) {
      const hour = new Date(check.scheduledAt).getHours();
      checkMap.set(`${check.prescriptionItemId}:${hour}`, check);
    }

    const now = new Date();

    // 3. Build schedule rows
    const rows: ScheduleRow[] = allItems.map((item) => {
      const hours = computeScheduleHours(item.frequencyHours, item.frequency);

      const schedule: ScheduleSlot[] = hours.map((hour) => {
        const scheduledAt = new Date(today);
        scheduledAt.setHours(hour, 0, 0, 0);

        const check = checkMap.get(`${item.id}:${hour}`);

        let status: ScheduleSlot['status'] = 'PENDING';
        if (check) {
          status = mapPrismaStatusToSchedule(check.status);
        } else {
          // Check if this time is past and should be LATE
          const timeDiffMinutes = (now.getTime() - scheduledAt.getTime()) / 60000;
          if (timeDiffMinutes > 15) {
            status = 'LATE';
          }
        }

        return {
          scheduledAt: scheduledAt.toISOString(),
          status,
          checkId: check?.id ?? null,
          administeredBy: check?.nurse ?? null,
          lot: check?.lotNumber ?? null,
          observations: check?.observations ?? null,
          checkedAt: check?.checkedAt?.toISOString() ?? null,
        };
      });

      return {
        prescriptionItem: {
          id: item.id,
          name: item.medicationName ?? 'Medicamento',
          dose: item.dose,
          route: item.route,
          frequency: item.frequency,
          frequencyHours: item.frequencyHours,
          isHighAlert: item.isHighAlert ?? false,
          isControlled: item.isControlled ?? false,
        },
        schedule,
      };
    });

    return rows;
  }

  // === ADMINISTER (A3/A6) ===

  async administerMedication(nurseId: string, dto: AdministerMedicationDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    const checkedAt = dto.checkedAt ? new Date(dto.checkedAt) : new Date();

    // Upsert: create or update check for this item + scheduledAt
    const existing = await this.prisma.medicationCheck.findFirst({
      where: {
        prescriptionItemId: dto.prescriptionItemId,
        scheduledAt,
      },
    });

    if (existing) {
      return this.prisma.medicationCheck.update({
        where: { id: existing.id },
        data: {
          status: 'ADMINISTERED',
          checkedAt,
          nurseId,
          lotNumber: dto.lot,
          observations: dto.observations,
        },
        include: {
          nurse: { select: { id: true, name: true } },
          prescriptionItem: true,
        },
      });
    }

    return this.prisma.medicationCheck.create({
      data: {
        prescriptionItemId: dto.prescriptionItemId,
        nurseId,
        scheduledAt,
        checkedAt,
        status: 'ADMINISTERED',
        lotNumber: dto.lot,
        observations: dto.observations,
      },
      include: {
        nurse: { select: { id: true, name: true } },
        prescriptionItem: true,
      },
    });
  }

  // === SKIP ===

  async skipMedication(nurseId: string, dto: SkipMedicationDto) {
    const scheduledAt = new Date(dto.scheduledAt);

    const existing = await this.prisma.medicationCheck.findFirst({
      where: {
        prescriptionItemId: dto.prescriptionItemId,
        scheduledAt,
      },
    });

    if (existing) {
      return this.prisma.medicationCheck.update({
        where: { id: existing.id },
        data: {
          status: 'REFUSED',
          nurseId,
          observations: dto.observations,
          checkedAt: new Date(),
        },
        include: {
          nurse: { select: { id: true, name: true } },
          prescriptionItem: true,
        },
      });
    }

    return this.prisma.medicationCheck.create({
      data: {
        prescriptionItemId: dto.prescriptionItemId,
        nurseId,
        scheduledAt,
        checkedAt: new Date(),
        status: 'REFUSED',
        observations: dto.observations,
      },
      include: {
        nurse: { select: { id: true, name: true } },
        prescriptionItem: true,
      },
    });
  }

  // === SUSPEND ===

  async suspendMedication(nurseId: string, dto: SuspendMedicationDto) {
    // Get all future pending checks for this item today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mark all future checks as HELD
    await this.prisma.medicationCheck.updateMany({
      where: {
        prescriptionItemId: dto.prescriptionItemId,
        scheduledAt: { gte: new Date(), lt: tomorrow },
        status: 'SCHEDULED',
      },
      data: {
        status: 'HELD',
        observations: dto.observations,
        nurseId,
      },
    });

    return { success: true, message: 'Medication suspended for remaining schedule today' };
  }

  // --- Nursing Process ---

  async createProcess(nurseId: string, dto: CreateNursingProcessDto) {
    return this.prisma.nursingProcess.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        nurseId,
        dataCollectionNotes: dto.dataCollectionNotes,
        dataCollectionVoiceId: dto.dataCollectionVoiceId,
      },
    });
  }

  async findProcessById(id: string) {
    const process = await this.prisma.nursingProcess.findUnique({
      where: { id },
      include: {
        nurse: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
        diagnoses: {
          include: {
            outcomes: true,
            interventions: true,
          },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Nursing process with ID "${id}" not found`);
    }

    return process;
  }

  async addDiagnosis(processId: string, dto: CreateNursingDiagnosisDto) {
    await this.findProcessById(processId);

    return this.prisma.nursingDiagnosis.create({
      data: {
        nursingProcessId: processId,
        nandaCode: dto.nandaCode,
        nandaDomain: dto.nandaDomain,
        nandaClass: dto.nandaClass,
        nandaTitle: dto.nandaTitle,
        relatedFactors: dto.relatedFactors ?? [],
        riskFactors: dto.riskFactors ?? [],
        definingCharacteristics: dto.definingCharacteristics ?? [],
        status: dto.status ?? 'ACTIVE',
        priority: dto.priority,
        aiSuggested: dto.aiSuggested ?? false,
        aiConfidence: dto.aiConfidence,
      },
    });
  }

  async addOutcome(diagnosisId: string, dto: CreateNursingOutcomeDto) {
    const diagnosis = await this.prisma.nursingDiagnosis.findUnique({
      where: { id: diagnosisId },
    });
    if (!diagnosis) {
      throw new NotFoundException(`Nursing diagnosis with ID "${diagnosisId}" not found`);
    }

    return this.prisma.nursingOutcome.create({
      data: {
        nursingDiagnosisId: diagnosisId,
        nocCode: dto.nocCode,
        nocTitle: dto.nocTitle,
        baselineScore: dto.baselineScore,
        targetScore: dto.targetScore,
        currentScore: dto.currentScore,
        evaluationFrequency: dto.evaluationFrequency,
      },
    });
  }

  async addIntervention(diagnosisId: string, dto: CreateNursingInterventionDto) {
    const diagnosis = await this.prisma.nursingDiagnosis.findUnique({
      where: { id: diagnosisId },
    });
    if (!diagnosis) {
      throw new NotFoundException(`Nursing diagnosis with ID "${diagnosisId}" not found`);
    }

    return this.prisma.nursingIntervention.create({
      data: {
        nursingDiagnosisId: diagnosisId,
        nicCode: dto.nicCode,
        nicTitle: dto.nicTitle,
        notes: dto.notes,
        voiceTranscriptionId: dto.voiceTranscriptionId,
      },
    });
  }

  // --- Nursing Notes ---

  async createNote(nurseId: string, dto: CreateNursingNoteDto) {
    return this.prisma.nursingNote.create({
      data: {
        encounterId: dto.encounterId,
        nurseId,
        type: dto.type,
        content: dto.content,
        shift: dto.shift,
        voiceTranscriptionId: dto.voiceTranscriptionId,
      },
    });
  }

  // --- Fluid Balance ---

  async createFluidBalance(nurseId: string, dto: CreateFluidBalanceDto) {
    const intakeOral = dto.intakeOral ?? 0;
    const intakeIV = dto.intakeIV ?? 0;
    const intakeOther = dto.intakeOther ?? 0;
    const intakeTotal = intakeOral + intakeIV + intakeOther;

    const outputUrine = dto.outputUrine ?? 0;
    const outputDrain = dto.outputDrain ?? 0;
    const outputEmesis = dto.outputEmesis ?? 0;
    const outputStool = dto.outputStool ?? 0;
    const outputOther = dto.outputOther ?? 0;
    const outputTotal = outputUrine + outputDrain + outputEmesis + outputStool + outputOther;

    const balance = intakeTotal - outputTotal;

    return this.prisma.fluidBalance.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        nurseId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        period: dto.period,
        intakeOral,
        intakeIV,
        intakeOther,
        intakeTotal,
        outputUrine,
        outputDrain,
        outputEmesis,
        outputStool,
        outputOther,
        outputTotal,
        balance,
      },
    });
  }

  async getFluidBalance(encounterId: string) {
    return this.prisma.fluidBalance.findMany({
      where: { encounterId },
      include: { nurse: { select: { id: true, name: true } } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getFluidBalanceSummary(encounterId: string) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const records = await this.prisma.fluidBalance.findMany({
      where: {
        encounterId,
        recordedAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const totalInput = records.reduce((sum: number, r: { intakeTotal: number }) => sum + r.intakeTotal, 0);
    const totalOutput = records.reduce((sum: number, r: { outputTotal: number }) => sum + r.outputTotal, 0);
    const balance = totalInput - totalOutput;

    // Group by shift
    const shifts = {
      morning: { input: 0, output: 0, balance: 0 },
      afternoon: { input: 0, output: 0, balance: 0 },
      night: { input: 0, output: 0, balance: 0 },
    };

    for (const record of records) {
      const hour = record.recordedAt.getHours();
      let shift: 'morning' | 'afternoon' | 'night';
      if (hour >= 7 && hour < 13) shift = 'morning';
      else if (hour >= 13 && hour < 19) shift = 'afternoon';
      else shift = 'night';

      shifts[shift].input += record.intakeTotal;
      shifts[shift].output += record.outputTotal;
      shifts[shift].balance += record.balance;
    }

    return {
      totalInput,
      totalOutput,
      balance,
      shifts,
      records,
    };
  }

  // --- Queries ---

  async findByEncounter(encounterId: string) {
    const [processes, notes, fluidBalances] = await Promise.all([
      this.prisma.nursingProcess.findMany({
        where: { encounterId },
        include: {
          nurse: { select: { id: true, name: true } },
          diagnoses: {
            include: { outcomes: true, interventions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.nursingNote.findMany({
        where: { encounterId },
        include: { nurse: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fluidBalance.findMany({
        where: { encounterId },
        include: { nurse: { select: { id: true, name: true } } },
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    return { processes, notes, fluidBalances };
  }

  async findByPatient(patientId: string) {
    return this.prisma.nursingProcess.findMany({
      where: { patientId },
      include: {
        nurse: { select: { id: true, name: true } },
        diagnoses: {
          include: { outcomes: true, interventions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveProcesses(patientId: string) {
    return this.prisma.nursingProcess.findMany({
      where: { patientId, status: 'IN_PROGRESS' },
      include: {
        nurse: { select: { id: true, name: true } },
        diagnoses: {
          where: { status: 'ACTIVE' },
          include: { outcomes: true, interventions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================================
  // HANDOFF (Passagem de Plantao)
  // =========================================================================

  async createHandoff(tenantId: string, dto: CreateHandoffDto) {
    return this.prisma.nursingHandoff.create({
      data: {
        tenantId,
        sectorId: dto.sectorId,
        fromNurseId: dto.fromNurseId,
        toNurseId: dto.toNurseId,
        patients: dto.patients as unknown as Prisma.InputJsonValue,
        shift: dto.shift,
      },
      include: {
        fromNurse: { select: { id: true, name: true } },
        toNurse: { select: { id: true, name: true } },
      },
    });
  }

  async getHandoffHistory(
    tenantId: string,
    filters: { sectorId?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (filters.sectorId) where.sectorId = filters.sectorId;

    const [data, total] = await Promise.all([
      this.prisma.nursingHandoff.findMany({
        where,
        include: {
          fromNurse: { select: { id: true, name: true } },
          toNurse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.nursingHandoff.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
