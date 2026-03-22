import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { PrescriptionStatus, MedCheckStatus } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async sign(id: string, doctorId: string) {
    const prescription = await this.findById(id);

    if (prescription.signedAt) {
      throw new BadRequestException('Prescription is already signed');
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
