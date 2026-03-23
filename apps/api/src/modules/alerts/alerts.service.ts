import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAlertDto) {
    return this.prisma.clinicalAlert.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        details: dto.details ? (dto.details as Record<string, unknown>) : undefined,
        source: dto.source,
        triggeredAt: new Date(),
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: { isActive?: boolean; patientId?: string; encounterId?: string; severity?: string; page?: number; limit?: number },
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.encounterId) where.encounterId = filters.encounterId;
    if (filters.severity) where.severity = filters.severity;

    const limit = filters.limit ?? 20;
    const page = filters.page ?? 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.clinicalAlert.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.clinicalAlert.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActive(tenantId: string) {
    return this.prisma.clinicalAlert.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.clinicalAlert.findMany({
      where: { patientId },
      orderBy: { triggeredAt: 'desc' },
      include: {
        acknowledgedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    const alert = await this.prisma.clinicalAlert.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        acknowledgedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID "${id}" not found`);
    }

    return alert;
  }

  async acknowledge(id: string, userId: string, actionTaken?: string) {
    await this.findById(id);

    return this.prisma.clinicalAlert.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        actionTaken,
      },
    });
  }

  async resolve(id: string, userId: string) {
    await this.findById(id);

    return this.prisma.clinicalAlert.update({
      where: { id },
      data: {
        isActive: false,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });
  }
}
