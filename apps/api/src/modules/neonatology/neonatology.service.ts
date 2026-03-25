import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNicuAdmissionDto,
  RecordNeonatalWeightDto,
  RecordPhototherapyDto,
} from './dto/create-neonatology.dto';

@Injectable()
export class NeonatologyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[NEONATOLOGY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAdmission(tenantId: string, dto: CreateNicuAdmissionDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ADMISSION',
        `Admissão UTIN - Apgar ${dto.apgar1 ?? '?'}/${dto.apgar5 ?? '?'}`,
        {
          gestationalAge: dto.gestationalAge,
          birthWeight: dto.birthWeight,
          apgar1: dto.apgar1,
          apgar5: dto.apgar5,
          apgar10: dto.apgar10,
          capurroScore: dto.capurroScore,
          deliveryType: dto.deliveryType,
          resuscitationMeasures: dto.resuscitationMeasures,
          maternalHistory: dto.maternalHistory,
          admissionReason: dto.admissionReason,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordWeight(tenantId: string, id: string, dto: RecordNeonatalWeightDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[NEONATOLOGY:' } },
    });
    if (!doc) throw new NotFoundException(`Neonatology record "${id}" not found`);

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        doc.patientId,
        dto.authorId,
        'WEIGHT',
        `Peso Diário - ${dto.weight}g`,
        {
          parentRecordId: id,
          weight: dto.weight,
          notes: dto.notes,
          recordedAt: new Date().toISOString(),
        },
        doc.encounterId ?? undefined,
      ),
    });
  }

  async recordPhototherapy(tenantId: string, id: string, dto: RecordPhototherapyDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[NEONATOLOGY:' } },
    });
    if (!doc) throw new NotFoundException(`Neonatology record "${id}" not found`);

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        doc.patientId,
        dto.authorId,
        'PHOTOTHERAPY',
        `Fototerapia - Bilirrubina ${dto.bilirubinLevel ?? 'N/A'} mg/dL`,
        {
          parentRecordId: id,
          bilirubinLevel: dto.bilirubinLevel,
          phototherapyType: dto.phototherapyType,
          irradiance: dto.irradiance,
          startTime: dto.startTime,
          endTime: dto.endTime,
          notes: dto.notes,
          recordedAt: new Date().toISOString(),
        },
        doc.encounterId ?? undefined,
      ),
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[NEONATOLOGY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
