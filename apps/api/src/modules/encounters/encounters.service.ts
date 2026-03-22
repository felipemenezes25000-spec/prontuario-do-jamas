import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { QueryEncounterDto } from './dto/query-encounter.dto';
import { EncounterStatus } from '@prisma/client';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEncounterDto) {
    return this.prisma.encounter.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        type: dto.type,
        priority: dto.priority ?? 'NORMAL',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        location: dto.location,
        room: dto.room,
        chiefComplaint: dto.chiefComplaint,
        isFollowUp: dto.isFollowUp ?? false,
        previousEncounterId: dto.previousEncounterId,
        primaryDoctorId: dto.primaryDoctorId,
        primaryNurseId: dto.primaryNurseId,
      },
    });
  }

  async findAll(tenantId: string, query: QueryEncounterDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.doctorId) {
      where.primaryDoctorId = query.doctorId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          priority: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          chiefComplaint: true,
          triageLevel: true,
          location: true,
          room: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true, mrn: true } },
          primaryDoctor: { select: { id: true, name: true } },
          primaryNurse: { select: { id: true, name: true } },
        },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findById(id: string, tenantId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        primaryDoctor: { select: { id: true, name: true, email: true, role: true } },
        primaryNurse: { select: { id: true, name: true, email: true, role: true } },
        clinicalNotes: { orderBy: { createdAt: 'desc' } },
        prescriptions: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        triageAssessment: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter with ID "${id}" not found`);
    }

    return encounter;
  }

  async update(id: string, tenantId: string, dto: UpdateEncounterDto) {
    await this.findById(id, tenantId);

    const data: Record<string, unknown> = { ...dto };
    if (dto.scheduledAt) {
      data.scheduledAt = new Date(dto.scheduledAt);
    }

    return this.prisma.encounter.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, tenantId: string, status: EncounterStatus) {
    const encounter = await this.findById(id, tenantId);

    const data: Record<string, unknown> = { status };

    if (status === 'IN_PROGRESS' && !encounter.startedAt) {
      data.startedAt = new Date();
    }
    if (status === 'COMPLETED') {
      data.completedAt = new Date();
      if (encounter.startedAt) {
        data.duration = Math.round(
          (Date.now() - new Date(encounter.startedAt).getTime()) / 60000,
        );
      }
    }

    return this.prisma.encounter.update({
      where: { id },
      data,
    });
  }

  async complete(id: string, tenantId: string) {
    return this.updateStatus(id, tenantId, 'COMPLETED');
  }

  async findActive(tenantId: string) {
    return this.prisma.encounter.findMany({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
      },
      orderBy: { startedAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        primaryDoctor: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.encounter.delete({ where: { id } });
  }
}
