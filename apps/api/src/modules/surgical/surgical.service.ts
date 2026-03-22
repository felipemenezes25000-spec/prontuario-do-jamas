import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSurgicalProcedureDto } from './dto/create-surgical-procedure.dto';
import { SurgicalStatus } from '@prisma/client';

@Injectable()
export class SurgicalService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(tenantId: string, dto: CreateSurgicalProcedureDto) {
    return this.prisma.surgicalProcedure.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        tenantId,
        surgeonId: dto.surgeonId,
        firstAssistantId: dto.firstAssistantId,
        anesthesiologistId: dto.anesthesiologistId,
        scrubNurseId: dto.scrubNurseId,
        circulatingNurseId: dto.circulatingNurseId,
        procedureName: dto.procedureName,
        procedureCode: dto.procedureCode,
        laterality: dto.laterality,
        anesthesiaType: dto.anesthesiaType,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async findById(id: string) {
    const procedure = await this.prisma.surgicalProcedure.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        surgeon: { select: { id: true, name: true } },
        firstAssistant: { select: { id: true, name: true } },
        anesthesiologist: { select: { id: true, name: true } },
        scrubNurse: { select: { id: true, name: true } },
        circulatingNurse: { select: { id: true, name: true } },
      },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure with ID "${id}" not found`);
    }

    return procedure;
  }

  async updateStatus(id: string, status: SurgicalStatus) {
    await this.findById(id);

    const data: Record<string, unknown> = { status };

    if (status === 'IN_PROGRESS') {
      data.patientInAt = new Date();
    }
    if (status === 'COMPLETED') {
      data.patientOutAt = new Date();
    }

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data,
    });
  }

  async updateChecklist(
    id: string,
    phase: 'before' | 'during' | 'after',
    checklist: Record<string, unknown>,
  ) {
    await this.findById(id);

    const fieldMap = {
      before: 'safetyChecklistBefore',
      during: 'safetyChecklistDuring',
      after: 'safetyChecklistAfter',
    };

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data: { [fieldMap[phase]]: checklist },
    });
  }

  async complete(
    id: string,
    data: {
      surgicalDescription?: string;
      complications?: string;
      bloodLoss?: number;
    },
  ) {
    await this.findById(id);

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        patientOutAt: new Date(),
        surgicalDescription: data.surgicalDescription,
        complications: data.complications,
        bloodLoss: data.bloodLoss,
      },
    });
  }

  async findAll(
    tenantId: string,
    options: {
      patientId?: string;
      surgeonId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };

    if (options.patientId) where.patientId = options.patientId;
    if (options.surgeonId) where.surgeonId = options.surgeonId;
    if (options.status) where.status = options.status;
    if (options.startDate || options.endDate) {
      const scheduledAt: Record<string, Date> = {};
      if (options.startDate) scheduledAt.gte = new Date(options.startDate);
      if (options.endDate) scheduledAt.lte = new Date(options.endDate);
      where.scheduledAt = scheduledAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.surgicalProcedure.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scheduledAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          surgeon: { select: { id: true, name: true } },
        },
      }),
      this.prisma.surgicalProcedure.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByDate(tenantId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.surgicalProcedure.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        surgeon: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
