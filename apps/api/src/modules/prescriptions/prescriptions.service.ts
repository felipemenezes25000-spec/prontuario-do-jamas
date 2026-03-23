import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { PrescriptionStatus, MedCheckStatus } from '@prisma/client';

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

    return this.prisma.prescription.update({
      where: { id },
      data: {
        signedAt: new Date(),
        status: 'ACTIVE',
      },
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
