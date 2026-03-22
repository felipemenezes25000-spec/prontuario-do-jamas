import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeDto } from './dto/discharge.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
