import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHomeVisitDto, UpdateHomeVisitDto } from './dto/create-home-care.dto';

@Injectable()
export class HomeCareService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[HOME_CARE:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createVisit(tenantId: string, dto: CreateHomeVisitDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'VISIT',
        `Visita Domiciliar - ${dto.scheduledDate}`,
        {
          scheduledDate: dto.scheduledDate,
          address: dto.address,
          visitType: dto.visitType,
          objectives: dto.objectives,
          procedures: dto.procedures,
          vitalSigns: dto.vitalSigns,
          evolution: dto.evolution,
          notes: dto.notes,
          visitStatus: 'SCHEDULED',
        },
        dto.encounterId,
      ),
    });
  }

  async listVisits(tenantId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[HOME_CARE:VISIT]' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async updateVisit(tenantId: string, id: string, dto: UpdateHomeVisitDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[HOME_CARE:' } },
    });
    if (!doc) throw new NotFoundException(`Home care visit "${id}" not found`);

    const content = doc.content ? JSON.parse(doc.content) : {};
    const updated = {
      ...content,
      ...(dto.status && { visitStatus: dto.status }),
      ...(dto.procedures && { procedures: dto.procedures }),
      ...(dto.vitalSigns && { vitalSigns: dto.vitalSigns }),
      ...(dto.evolution && { evolution: dto.evolution }),
      ...(dto.notes && { notes: dto.notes }),
    };

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(updated) },
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[HOME_CARE:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
