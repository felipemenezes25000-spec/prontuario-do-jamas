import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProblemDto,
  UpdateProblemDto,
  ProblemListItemDto,
  ProblemStatus,
} from './dto/problem-list.dto';

@Injectable()
export class ProblemListService {
  private readonly logger = new Logger(ProblemListService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly DOC_PREFIX = '[PROBLEM_LIST]';

  // =========================================================================
  // Helpers
  // =========================================================================

  private async assertPatient(tenantId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!p) throw new NotFoundException(`Patient "${patientId}" not found`);
    return p;
  }

  private parse(doc: { id: string; patientId: string; content: string | null; authorId: string; createdAt: Date; updatedAt: Date }): ProblemListItemDto {
    const data = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      patientId: doc.patientId,
      tenantId: data.tenantId ?? '',
      icd10Code: data.icd10Code ?? '',
      description: data.description ?? '',
      status: data.status ?? ProblemStatus.ACTIVE,
      type: data.type,
      severity: data.severity ?? null,
      onsetDate: data.onsetDate ?? null,
      resolutionDate: data.resolutionDate ?? null,
      notes: data.notes ?? null,
      isPriority: data.isPriority ?? false,
      authorId: doc.authorId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // =========================================================================
  // CRUD
  // =========================================================================

  async create(
    tenantId: string,
    patientId: string,
    dto: CreateProblemDto,
    authorId: string,
  ): Promise<ProblemListItemDto> {
    await this.assertPatient(tenantId, patientId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `${this.DOC_PREFIX} ${dto.icd10Code} — ${dto.description.slice(0, 80)}`,
        content: JSON.stringify({ tenantId, ...dto }),
        status: 'FINAL',
      },
    });

    this.logger.log(`Problem created: ${dto.icd10Code} patient=${patientId}`);
    return this.parse(doc);
  }

  async findAll(
    tenantId: string,
    patientId: string,
    status?: ProblemStatus,
  ): Promise<ProblemListItemDto[]> {
    await this.assertPatient(tenantId, patientId);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: this.DOC_PREFIX },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = docs.map((d) => this.parse(d));
    if (status) return items.filter((i) => i.status === status);
    return items;
  }

  async findOne(
    tenantId: string,
    patientId: string,
    problemId: string,
  ): Promise<ProblemListItemDto> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: problemId,
        patientId,
        tenantId,
        title: { startsWith: this.DOC_PREFIX },
      },
    });
    if (!doc) throw new NotFoundException(`Problem "${problemId}" not found`);
    return this.parse(doc);
  }

  async update(
    tenantId: string,
    patientId: string,
    problemId: string,
    dto: UpdateProblemDto,
  ): Promise<ProblemListItemDto> {
    const existing = await this.findOne(tenantId, patientId, problemId);
    const merged = { ...JSON.parse('{}'), ...existing, ...dto };

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: problemId },
      data: {
        title: `${this.DOC_PREFIX} ${merged.icd10Code} — ${merged.description.slice(0, 80)}`,
        content: JSON.stringify(merged),
      },
    });

    return this.parse(updated);
  }

  async remove(
    tenantId: string,
    patientId: string,
    problemId: string,
  ): Promise<{ deleted: boolean; problemId: string }> {
    await this.findOne(tenantId, patientId, problemId);
    await this.prisma.clinicalDocument.delete({ where: { id: problemId } });
    return { deleted: true, problemId };
  }
}
