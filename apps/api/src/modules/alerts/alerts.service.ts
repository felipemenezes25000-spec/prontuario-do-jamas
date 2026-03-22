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
        details: (dto.details as any) ?? undefined,
        source: dto.source,
        triggeredAt: new Date(),
      },
    });
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
