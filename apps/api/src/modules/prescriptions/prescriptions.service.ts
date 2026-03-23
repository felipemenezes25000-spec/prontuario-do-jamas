import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { PrescriptionStatus, MedCheckStatus, type Prisma } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: PrescriptionSafetyService,
  ) {}

  async create(tenantId: string, doctorId: string, dto: CreatePrescriptionDto) {
    const { items, ...prescriptionData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          tenantId,
          doctorId,
          encounterId: prescriptionData.encounterId,
          patientId: prescriptionData.patientId,
          type: prescriptionData.type,
          voiceTranscriptionId: prescriptionData.voiceTranscriptionId,
          wasGeneratedByAI: prescriptionData.wasGeneratedByAI ?? false,
          validFrom: prescriptionData.validFrom
            ? new Date(prescriptionData.validFrom)
            : undefined,
          validUntil: prescriptionData.validUntil
            ? new Date(prescriptionData.validUntil)
            : undefined,
          isOneTime: prescriptionData.isOneTime ?? false,
          isContinuous: prescriptionData.isContinuous ?? false,
          isPRN: prescriptionData.isPRN ?? false,
          requiresDoubleCheck: prescriptionData.requiresDoubleCheck ?? false,
          items: {
            create: items.map((item, index) => ({
              ...item,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return prescription;
    });
  }

  async findAll(
    tenantId: string,
    options: { page?: number; pageSize?: number; status?: string; patientId?: string },
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (options.status) {
      where.status = options.status;
    }
    if (options.patientId) {
      where.patientId = options.patientId;
    }

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          doctor: { select: { id: true, name: true } },
          patient: { select: { id: true, fullName: true, mrn: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.prescription.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async findByPatient(patientId: string, activeOnly = true) {
    const where: Record<string, unknown> = { patientId };
    if (activeOnly) {
      where.status = 'ACTIVE';
    }

    return this.prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            medicationChecks: { orderBy: { scheduledAt: 'desc' }, take: 10 },
          },
        },
        doctor: { select: { id: true, name: true, email: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
        doubleCheckedBy: { select: { id: true, name: true } },
        dispensedBy: { select: { id: true, name: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID "${id}" not found`);
    }

    return prescription;
  }

  async updateStatus(id: string, status: PrescriptionStatus) {
    await this.findById(id);
    return this.prisma.prescription.update({
      where: { id },
      data: { status },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // B9 — Automatic Schedule Generation
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generates schedule times for the next 24h based on frequency.
   *
   * Frequency mapping:
   *   "6/6h"   → [00:00, 06:00, 12:00, 18:00]
   *   "8/8h"   → [06:00, 14:00, 22:00]
   *   "12/12h" → [06:00, 18:00]
   *   "1x/dia" → [06:00]
   *   "2x/dia" → [06:00, 18:00]
   *   "3x/dia" → [06:00, 14:00, 22:00]
   *   "4x/dia" → [06:00, 12:00, 18:00, 00:00]
   *   "SOS"    → [] (as needed)
   *   "ACM"    → [] (at doctor's discretion)
   */
  generateSchedule(frequency: string, startDate: Date): Date[] {
    const trimmed = frequency.trim().toLowerCase();

    // SOS / ACM — no fixed schedule
    if (trimmed === 'sos' || trimmed === 'acm' || trimmed === 'se necessário') {
      return [];
    }

    const defaultTimes = this.getDefaultTimesForFrequency(trimmed);
    if (!defaultTimes) return [];

    const baseDate = new Date(startDate);
    baseDate.setHours(0, 0, 0, 0);

    return defaultTimes.map(([h, m]) => {
      const dt = new Date(baseDate);
      dt.setHours(h, m, 0, 0);
      return dt;
    });
  }

  /**
   * Returns default hour:minute pairs for a given frequency.
   */
  private getDefaultTimesForFrequency(frequency: string): Array<[number, number]> | null {
    // Exact matches for named frequencies
    const namedFrequencies: Record<string, Array<[number, number]>> = {
      '6/6h': [[0, 0], [6, 0], [12, 0], [18, 0]],
      '8/8h': [[6, 0], [14, 0], [22, 0]],
      '12/12h': [[6, 0], [18, 0]],
      '1x/dia': [[6, 0]],
      '2x/dia': [[6, 0], [18, 0]],
      '3x/dia': [[6, 0], [14, 0], [22, 0]],
      '4x/dia': [[6, 0], [12, 0], [18, 0], [0, 0]],
    };

    if (namedFrequencies[frequency]) {
      return namedFrequencies[frequency];
    }

    // Pattern: N/Nh — calculate from interval
    const intervalMatch = frequency.match(/^(\d+)\/\d+\s*h$/);
    if (intervalMatch) {
      const hours = parseInt(intervalMatch[1], 10);
      if (hours > 0 && hours <= 24) {
        const times: Array<[number, number]> = [];
        const startHour = hours <= 6 ? 0 : 6;
        for (let h = startHour; h < startHour + 24; h += hours) {
          times.push([h % 24, 0]);
        }
        return times;
      }
    }

    // Pattern: Nx/dia
    const timesPerDayMatch = frequency.match(/^(\d+)\s*x\s*\/?\s*dia$/);
    if (timesPerDayMatch) {
      const count = parseInt(timesPerDayMatch[1], 10);
      const defaultSchedules: Record<number, Array<[number, number]>> = {
        1: [[6, 0]],
        2: [[6, 0], [18, 0]],
        3: [[6, 0], [14, 0], [22, 0]],
        4: [[6, 0], [12, 0], [18, 0], [0, 0]],
        5: [[6, 0], [10, 0], [14, 0], [18, 0], [22, 0]],
        6: [[0, 0], [4, 0], [8, 0], [12, 0], [16, 0], [20, 0]],
      };
      return defaultSchedules[count] ?? null;
    }

    // Pattern: "de N em N horas"
    const deEmMatch = frequency.match(/^de\s+(\d+)\s+em\s+\d+\s+hora/);
    if (deEmMatch) {
      const hours = parseInt(deEmMatch[1], 10);
      if (hours > 0 && hours <= 24) {
        const times: Array<[number, number]> = [];
        for (let h = 6; h < 6 + 24; h += hours) {
          times.push([h % 24, 0]);
        }
        return times;
      }
    }

    return null;
  }

  /**
   * Creates MedicationCheck entries (PENDING) for the next 24h for all items in a prescription.
   */
  private async generateMedicationChecksForPrescription(
    tx: Prisma.TransactionClient,
    prescriptionId: string,
  ): Promise<number> {
    const prescription = await tx.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) return 0;

    const now = new Date();
    let totalCreated = 0;

    for (const item of prescription.items) {
      if (!item.frequency) continue;

      // Use custom schedule if provided
      let customScheduleTimes: Array<{ hour: number; minute: number }> | null = null;
      if (item.customSchedule && Array.isArray(item.customSchedule)) {
        customScheduleTimes = item.customSchedule as Array<{ hour: number; minute: number }>;
      }

      let scheduleDates: Date[];

      if (customScheduleTimes && customScheduleTimes.length > 0) {
        // Use custom times
        const baseDate = new Date(now);
        baseDate.setHours(0, 0, 0, 0);
        scheduleDates = customScheduleTimes.map((t) => {
          const dt = new Date(baseDate);
          dt.setHours(t.hour, t.minute, 0, 0);
          return dt;
        });
      } else {
        scheduleDates = this.generateSchedule(item.frequency, now);
      }

      if (scheduleDates.length === 0) continue;

      // Create PENDING MedicationCheck for each scheduled time
      for (const scheduledAt of scheduleDates) {
        // Skip times that are already past by more than 1 hour
        if (scheduledAt.getTime() < now.getTime() - 60 * 60 * 1000) continue;

        await tx.medicationCheck.create({
          data: {
            prescriptionItemId: item.id,
            nurseId: prescription.doctorId, // Placeholder — nurse will check later
            scheduledAt,
            status: MedCheckStatus.SCHEDULED,
          },
        });
        totalCreated++;
      }
    }

    return totalCreated;
  }

  async sign(id: string, _doctorId: string) {
    const prescription = await this.findById(id);

    if (prescription.signedAt) {
      throw new BadRequestException('Prescription is already signed');
    }

    // Validate safety for each medication item before signing
    const safetyErrors: string[] = [];
    for (const item of prescription.items) {
      if (item.medicationName) {
        const result = this.safetyService.validateSafety({
          medicationName: item.medicationName!,
          activeIngredient: item.activeIngredient ?? undefined,
          concentration: item.concentration ?? undefined,
          route: item.route ?? undefined,
          frequency: item.frequency ?? undefined,
        });
        safetyErrors.push(...result.errors);
      }
    }

    if (safetyErrors.length > 0) {
      throw new BadRequestException({
        message: 'Prescription has safety validation errors that must be resolved before signing',
        errors: safetyErrors,
      });
    }

    // Check if double-check is required but not yet done
    if (prescription.requiresDoubleCheck && !prescription.doubleCheckedAt) {
      throw new BadRequestException(
        'This prescription requires double-check before signing. A nurse or pharmacist must complete the double-check first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.prescription.update({
        where: { id },
        data: {
          signedAt: new Date(),
          status: 'ACTIVE',
        },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // B9: Auto-generate medication check schedule for the next 24h
      await this.generateMedicationChecksForPrescription(tx, id);

      return updated;
    });
  }

  async addItem(prescriptionId: string, dto: CreatePrescriptionItemDto) {
    await this.findById(prescriptionId);

    return this.prisma.prescriptionItem.create({
      data: {
        ...dto,
        prescriptionId,
      },
    });
  }

  async removeItem(prescriptionId: string, itemId: string) {
    await this.findById(prescriptionId);

    const item = await this.prisma.prescriptionItem.findFirst({
      where: { id: itemId, prescriptionId },
    });

    if (!item) {
      throw new NotFoundException(`Prescription item with ID "${itemId}" not found`);
    }

    return this.prisma.prescriptionItem.delete({
      where: { id: itemId },
    });
  }

  async findMedicationChecks(
    tenantId: string,
    options: {
      status?: string;
      wardId?: string;
      nurseId?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      prescriptionItem: {
        prescription: { tenantId },
      },
    };

    if (options.status) {
      where.status = options.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.medicationCheck.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scheduledAt: 'asc' },
        include: {
          prescriptionItem: {
            select: {
              id: true,
              medicationName: true,
              dose: true,
              route: true,
              frequency: true,
              prescription: {
                select: {
                  id: true,
                  patientId: true,
                  patient: { select: { id: true, fullName: true, mrn: true } },
                },
              },
            },
          },
          nurse: { select: { id: true, name: true } },
        },
      }),
      this.prisma.medicationCheck.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async duplicate(id: string, tenantId: string, doctorId: string) {
    const original = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!original) {
      throw new NotFoundException(`Prescription with ID "${id}" not found`);
    }

    return this.prisma.prescription.create({
      data: {
        tenantId,
        doctorId,
        encounterId: original.encounterId,
        patientId: original.patientId,
        type: original.type,
        wasGeneratedByAI: false,
        validFrom: original.validFrom,
        validUntil: original.validUntil,
        isOneTime: original.isOneTime,
        isContinuous: original.isContinuous,
        isPRN: original.isPRN,
        requiresDoubleCheck: original.requiresDoubleCheck,
        status: 'DRAFT',
        items: {
          create: original.items.map((item, index) => ({
            medicationName: item.medicationName,
            activeIngredient: item.activeIngredient,
            concentration: item.concentration,
            pharmaceuticalForm: item.pharmaceuticalForm,
            dose: item.dose,
            doseUnit: item.doseUnit,
            route: item.route,
            frequency: item.frequency,
            frequencyHours: item.frequencyHours,
            duration: item.duration,
            durationUnit: item.durationUnit,
            infusionRate: item.infusionRate,
            infusionRateUnit: item.infusionRateUnit,
            dilution: item.dilution,
            dilutionVolume: item.dilutionVolume,
            dilutionSolution: item.dilutionSolution,
            maxDailyDose: item.maxDailyDose,
            prnCondition: item.prnCondition,
            specialInstructions: item.specialInstructions,
            examName: item.examName,
            examCode: item.examCode,
            examType: item.examType,
            examUrgency: item.examUrgency,
            examInstructions: item.examInstructions,
            examJustification: item.examJustification,
            procedureName: item.procedureName,
            procedureCode: item.procedureCode,
            dietType: item.dietType,
            caloricTarget: item.caloricTarget,
            restrictions: item.restrictions,
            supplements: item.supplements,
            isControlled: item.isControlled,
            controlledSchedule: item.controlledSchedule,
            isAntibiotic: item.isAntibiotic,
            antibioticJustification: item.antibioticJustification,
            isHighAlert: item.isHighAlert,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });
  }

  async checkMedication(
    itemId: string,
    nurseId: string,
    data: {
      scheduledAt: string;
      status: MedCheckStatus;
      reason?: string;
      observations?: string;
      lotNumber?: string;
      expirationDate?: string;
    },
  ) {
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Prescription item with ID "${itemId}" not found`);
    }

    return this.prisma.medicationCheck.create({
      data: {
        prescriptionItemId: itemId,
        nurseId,
        scheduledAt: new Date(data.scheduledAt),
        checkedAt: new Date(),
        status: data.status,
        reason: data.reason,
        observations: data.observations,
        lotNumber: data.lotNumber,
        expirationDate: data.expirationDate
          ? new Date(data.expirationDate)
          : undefined,
      },
    });
  }
}
