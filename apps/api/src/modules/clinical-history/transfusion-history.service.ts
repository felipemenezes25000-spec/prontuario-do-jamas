import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTransfusionHistoryDto,
  UpdateTransfusionHistoryDto,
  TransfusionHistoryDto,
  TransfusionReactionType,
} from './dto/transfusion-history.dto';

@Injectable()
export class TransfusionHistoryService {
  private readonly logger = new Logger(TransfusionHistoryService.name);
  private readonly DOC_PREFIX = '[TRANSFUSION]';

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
  }): TransfusionHistoryDto {
    const d = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      patientId: doc.patientId,
      transfusionDate: d.transfusionDate ?? '',
      productType: d.productType,
      volumeMl: d.volumeMl ?? null,
      units: d.units ?? null,
      donorBloodGroup: d.donorBloodGroup ?? null,
      reactionType: d.reactionType ?? TransfusionReactionType.NONE,
      reactionDescription: d.reactionDescription ?? null,
      irregularAntibodies: d.irregularAntibodies ?? [],
      indication: d.indication ?? null,
      facility: d.facility ?? null,
      crossMatchRequired: d.crossMatchRequired ?? false,
      notes: d.notes ?? null,
      authorId: doc.authorId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    tenantId: string,
    patientId: string,
    dto: CreateTransfusionHistoryDto,
    authorId: string,
  ): Promise<TransfusionHistoryDto> {
    await this.assertPatient(tenantId, patientId);

    const reactionFlag =
      dto.reactionType && dto.reactionType !== TransfusionReactionType.NONE
        ? ` [REACTION: ${dto.reactionType}]`
        : '';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `${this.DOC_PREFIX} ${dto.productType} ${dto.transfusionDate}${reactionFlag}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    this.logger.log(`Transfusion recorded: ${dto.productType} patient=${patientId}`);
    return this.parse(doc);
  }

  async findAll(tenantId: string, patientId: string): Promise<TransfusionHistoryDto[]> {
    await this.assertPatient(tenantId, patientId);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => this.parse(d));
  }

  async findOne(
    tenantId: string,
    patientId: string,
    transfusionId: string,
  ): Promise<TransfusionHistoryDto> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: transfusionId, patientId, tenantId, title: { startsWith: this.DOC_PREFIX } },
    });
    if (!doc) throw new NotFoundException(`Transfusion record "${transfusionId}" not found`);
    return this.parse(doc);
  }

  async update(
    tenantId: string,
    patientId: string,
    transfusionId: string,
    dto: UpdateTransfusionHistoryDto,
  ): Promise<TransfusionHistoryDto> {
    const existing = await this.findOne(tenantId, patientId, transfusionId);
    const merged = { ...existing, ...dto };

    const reactionFlag =
      merged.reactionType && merged.reactionType !== TransfusionReactionType.NONE
        ? ` [REACTION: ${merged.reactionType}]`
        : '';

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: transfusionId },
      data: {
        title: `${this.DOC_PREFIX} ${merged.productType} ${merged.transfusionDate}${reactionFlag}`,
        content: JSON.stringify(merged),
      },
    });

    return this.parse(updated);
  }

  async remove(
    tenantId: string,
    patientId: string,
    transfusionId: string,
  ): Promise<{ deleted: boolean; transfusionId: string }> {
    await this.findOne(tenantId, patientId, transfusionId);
    await this.prisma.clinicalDocument.delete({ where: { id: transfusionId } });
    return { deleted: true, transfusionId };
  }

  // =========================================================================
  // getIrregularAntibodies — Aggregate all known antibodies for a patient
  // =========================================================================

  async getIrregularAntibodies(
    tenantId: string,
    patientId: string,
  ): Promise<{ antibodies: string[]; patientId: string }> {
    const all = await this.findAll(tenantId, patientId);
    const antibodySet = new Set<string>();
    for (const t of all) {
      for (const ab of t.irregularAntibodies) {
        antibodySet.add(ab);
      }
    }
    return { antibodies: Array.from(antibodySet), patientId };
  }
}
