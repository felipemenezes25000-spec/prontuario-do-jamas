import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateObstetricHistoryDto,
  UpdateObstetricHistoryDto,
  ObstetricHistoryDto,
} from './dto/obstetric-history.dto';

@Injectable()
export class ObstetricHistoryService {
  private readonly logger = new Logger(ObstetricHistoryService.name);
  private readonly DOC_PREFIX = '[OB_HISTORY]';

  constructor(private readonly prisma: PrismaService) {}

  private async assertPatient(tenantId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!p) throw new NotFoundException(`Patient "${patientId}" not found`);
    return p;
  }

  private parse(doc: {
    id: string;
    patientId: string;
    content: string | null;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
  }): ObstetricHistoryDto {
    const d = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      patientId: doc.patientId,
      gpac: d.gpac ?? { gravida: 0, para: 0, aborta: 0, cesarean: 0 },
      lastMenstrualPeriod: d.lastMenstrualPeriod ?? null,
      estimatedDueDate: d.estimatedDueDate ?? null,
      currentGestationalWeek: d.currentGestationalWeek ?? null,
      deliveries: d.deliveries ?? [],
      historyPreeclampsia: d.historyPreeclampsia ?? false,
      historyGestationalDiabetes: d.historyGestationalDiabetes ?? false,
      historyPostpartumHemorrhage: d.historyPostpartumHemorrhage ?? false,
      notes: d.notes ?? null,
      authorId: doc.authorId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    tenantId: string,
    patientId: string,
    dto: CreateObstetricHistoryDto,
    authorId: string,
  ): Promise<ObstetricHistoryDto> {
    await this.assertPatient(tenantId, patientId);

    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
    });
    if (existing) {
      throw new ConflictException(
        'Obstetric history already exists — use PATCH to update',
      );
    }

    const gpacLabel = `G${dto.gpac.gravida}P${dto.gpac.para}A${dto.gpac.aborta}C${dto.gpac.cesarean}`;
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `${this.DOC_PREFIX} ${gpacLabel}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    this.logger.log(`Obstetric history created: ${gpacLabel} patient=${patientId}`);
    return this.parse(doc);
  }

  async findOne(tenantId: string, patientId: string): Promise<ObstetricHistoryDto> {
    await this.assertPatient(tenantId, patientId);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException(`No obstetric history found for patient "${patientId}"`);
    }

    return this.parse(doc);
  }

  async update(
    tenantId: string,
    patientId: string,
    dto: UpdateObstetricHistoryDto,
  ): Promise<ObstetricHistoryDto> {
    const existing = await this.findOne(tenantId, patientId);
    const merged = { ...existing, ...dto };
    const gpac = merged.gpac;
    const gpacLabel = `G${gpac.gravida}P${gpac.para}A${gpac.aborta}C${gpac.cesarean}`;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: existing.id },
      data: {
        title: `${this.DOC_PREFIX} ${gpacLabel}`,
        content: JSON.stringify(merged),
      },
    });

    return this.parse(updated);
  }

  async remove(
    tenantId: string,
    patientId: string,
  ): Promise<{ deleted: boolean; patientId: string }> {
    const existing = await this.findOne(tenantId, patientId);
    await this.prisma.clinicalDocument.delete({ where: { id: existing.id } });
    return { deleted: true, patientId };
  }
}
