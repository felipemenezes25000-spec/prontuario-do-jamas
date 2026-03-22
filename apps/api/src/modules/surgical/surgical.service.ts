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
