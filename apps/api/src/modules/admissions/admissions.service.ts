import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeDto } from './dto/discharge.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';

export interface FindAllAdmissionsOptions {
  patientId?: string;
  status?: string;
  ward?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, options: FindAllAdmissionsOptions = {}) {
    const { patientId, status, ward, page = 1, pageSize = 20 } = options;
    const where: Record<string, unknown> = { tenantId };

    if (patientId) where.patientId = patientId;
    // status maps to whether discharged or not
    if (status === 'ACTIVE') {
      where.actualDischargeDate = null;
    } else if (status === 'DISCHARGED') {
      where.actualDischargeDate = { not: null };
    }
    if (ward) {
      where.currentBed = { ward };
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { admissionDate: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          admittingDoctor: { select: { id: true, name: true } },
          attendingDoctor: { select: { id: true, name: true } },
          currentBed: true,
        },
      }),
      this.prisma.admission.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async admit(tenantId: string, dto: CreateAdmissionDto) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: {
          encounterId: dto.encounterId,
          patientId: dto.patientId,
          tenantId,
          admittingDoctorId: dto.admittingDoctorId,
          attendingDoctorId: dto.attendingDoctorId,
          admissionDate: dto.admissionDate
            ? new Date(dto.admissionDate)
            : new Date(),
          expectedDischargeDate: dto.expectedDischargeDate
            ? new Date(dto.expectedDischargeDate)
            : undefined,
          admissionType: dto.admissionType,
          currentBedId: dto.bedId,
          admissionBedId: dto.bedId,
          isolationRequired: dto.isolationRequired ?? false,
          isolationType: dto.isolationType,
          aihNumber: dto.aihNumber,
          diagnosisAtAdmission: dto.diagnosisAtAdmission,
        },
      });

      // Update bed status if assigned
      if (dto.bedId) {
        await tx.bed.update({
          where: { id: dto.bedId },
          data: {
            status: 'OCCUPIED',
            currentPatientId: dto.patientId,
          },
        });
      }

      // Update encounter status
      await tx.encounter.update({
        where: { id: dto.encounterId },
        data: { status: 'IN_PROGRESS' },
      });

      return admission;
    });
  }

  async discharge(id: string, dto: DischargeDto) {
    const admission = await this.findById(id);

    if (admission.actualDischargeDate) {
      throw new BadRequestException('Patient is already discharged');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id },
        data: {
          actualDischargeDate: new Date(),
          dischargeType: dto.dischargeType,
          diagnosisAtDischarge: dto.diagnosisAtDischarge,
          procedurePerformed: dto.procedurePerformed,
          dischargeNotes: dto.dischargeNotes,
          dischargePrescription: dto.dischargePrescription,
          dischargeInstructions: dto.dischargeInstructions,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
        },
      });

      // Free the bed
      if (admission.currentBedId) {
        await tx.bed.update({
          where: { id: admission.currentBedId },
          data: {
            status: 'CLEANING',
            currentPatientId: null,
          },
        });
      }

      // Complete the encounter
      await tx.encounter.update({
        where: { id: admission.encounterId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return updated;
    });
  }

  async transfer(id: string, requestedById: string, dto: TransferBedDto) {
    const admission = await this.findById(id);

    if (!admission.currentBedId) {
      throw new BadRequestException('Patient does not have a current bed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.bedTransfer.create({
        data: {
          admissionId: id,
          fromBedId: admission.currentBedId!,
          toBedId: dto.toBedId,
          requestedById,
          requestedAt: new Date(),
          executedAt: new Date(),
          status: 'EXECUTED',
          reason: dto.reason,
          executedById: requestedById,
        },
      });

      // Free old bed
      await tx.bed.update({
        where: { id: admission.currentBedId! },
        data: {
          status: 'CLEANING',
          currentPatientId: null,
        },
      });

      // Occupy new bed
      await tx.bed.update({
        where: { id: dto.toBedId },
        data: {
          status: 'OCCUPIED',
          currentPatientId: admission.patientId,
        },
      });

      // Update admission current bed
      await tx.admission.update({
        where: { id },
        data: { currentBedId: dto.toBedId },
      });

      return transfer;
    });
  }

  async findById(id: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        admittingDoctor: { select: { id: true, name: true } },
        attendingDoctor: { select: { id: true, name: true } },
        currentBed: true,
        bedTransfers: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!admission) {
      throw new NotFoundException(`Admission with ID "${id}" not found`);
    }

    return admission;
  }

  async findActive(tenantId: string) {
    return this.prisma.admission.findMany({
      where: {
        tenantId,
        actualDischargeDate: null,
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        admittingDoctor: { select: { id: true, name: true } },
        attendingDoctor: { select: { id: true, name: true } },
        currentBed: true,
      },
      orderBy: { admissionDate: 'desc' },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.admission.findMany({
      where: { patientId },
      include: {
        admittingDoctor: { select: { id: true, name: true } },
        currentBed: true,
      },
      orderBy: { admissionDate: 'desc' },
    });
  }

  /**
   * Reverses a discharge if it occurred within the last 2 hours.
   * Restores the admission to active status, re-occupies the bed,
   * and re-opens the encounter.
   */
  async reverseDischarge(
    tenantId: string,
    admissionId: string,
    reason: string,
  ) {
    const admission = await this.prisma.admission.findFirst({
      where: { id: admissionId, tenantId },
      include: {
        currentBed: true,
      },
    });

    if (!admission) {
      throw new NotFoundException(
        `Admission with ID "${admissionId}" not found`,
      );
    }

    if (!admission.actualDischargeDate) {
      throw new BadRequestException('This admission has not been discharged');
    }

    // Check 2-hour window
    const now = new Date();
    const dischargeTime = new Date(admission.actualDischargeDate);
    const diffMs = now.getTime() - dischargeTime.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (diffMs > twoHoursMs) {
      const hoursAgo = (diffMs / (60 * 60 * 1000)).toFixed(1);
      throw new BadRequestException(
        `Discharge reversal window expired. Discharge occurred ${hoursAgo}h ago (limit: 2h).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Build audit note with timestamp
      const auditNote = `[REVERSAO DE ALTA] ${now.toISOString()} — Motivo: ${reason}. Alta original em: ${dischargeTime.toISOString()}.`;
      const existingNotes = admission.dischargeNotes ?? '';
      const combinedNotes = existingNotes
        ? `${existingNotes}\n\n${auditNote}`
        : auditNote;

      // Reverse the discharge fields
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: {
          actualDischargeDate: null,
          dischargeType: null,
          dischargeNotes: combinedNotes,
        },
      });

      // Re-occupy the bed if it is still available (CLEANING status)
      if (admission.currentBedId) {
        const bed = await tx.bed.findUnique({
          where: { id: admission.currentBedId },
        });

        if (bed && (bed.status === 'CLEANING' || bed.status === 'AVAILABLE')) {
          await tx.bed.update({
            where: { id: admission.currentBedId },
            data: {
              status: 'OCCUPIED',
              currentPatientId: admission.patientId,
            },
          });
        }
      }

      // Re-open the encounter
      await tx.encounter.update({
        where: { id: admission.encounterId },
        data: {
          status: 'IN_PROGRESS',
          completedAt: null,
        },
      });

      return updated;
    });
  }
}
