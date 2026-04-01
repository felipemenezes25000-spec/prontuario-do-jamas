import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateHomeMedicationDto,
  UpdateHomeMedicationDto,
  HomeMedicationDto,
  HomeMedStatus,
} from './dto/home-medications.dto';

@Injectable()
export class HomeMedicationsService {
  private readonly logger = new Logger(HomeMedicationsService.name);
  private readonly DOC_PREFIX = '[HOME_MED]';

  constructor(private readonly prisma: PrismaService) {}

  private async assertPatient(tenantId: string, patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
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
  }): HomeMedicationDto {
    const d = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      patientId: doc.patientId,
      medicationName: d.medicationName ?? '',
      genericName: d.genericName ?? null,
      dose: d.dose ?? '',
      frequency: d.frequency ?? '',
      route: d.route,
      status: d.status ?? HomeMedStatus.ACTIVE,
      startDate: d.startDate ?? null,
      prescriberName: d.prescriberName ?? null,
      prescriberCrm: d.prescriberCrm ?? null,
      indication: d.indication ?? null,
      reconciliationNeeded: d.reconciliationNeeded ?? false,
      notes: d.notes ?? null,
      authorId: doc.authorId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    tenantId: string,
    patientId: string,
    dto: CreateHomeMedicationDto,
    authorId: string,
  ): Promise<HomeMedicationDto> {
    await this.assertPatient(tenantId, patientId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `${this.DOC_PREFIX} ${dto.medicationName} ${dto.dose}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    this.logger.log(`Home med created: ${dto.medicationName} patient=${patientId}`);
    return this.parse(doc);
  }

  async findAll(
    tenantId: string,
    patientId: string,
    status?: HomeMedStatus,
  ): Promise<HomeMedicationDto[]> {
    await this.assertPatient(tenantId, patientId);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
      orderBy: { createdAt: 'desc' },
    });

    const items = docs.map((d) => this.parse(d));
    return status ? items.filter((i) => i.status === status) : items;
  }

  async findOne(
    tenantId: string,
    patientId: string,
    medId: string,
  ): Promise<HomeMedicationDto> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: medId, patientId, tenantId, title: { startsWith: this.DOC_PREFIX } },
    });
    if (!doc) throw new NotFoundException(`Home medication "${medId}" not found`);
    return this.parse(doc);
  }

  async update(
    tenantId: string,
    patientId: string,
    medId: string,
    dto: UpdateHomeMedicationDto,
  ): Promise<HomeMedicationDto> {
    const existing = await this.findOne(tenantId, patientId, medId);
    const merged = { ...existing, ...dto };

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: medId },
      data: {
        title: `${this.DOC_PREFIX} ${merged.medicationName} ${merged.dose}`,
        content: JSON.stringify(merged),
      },
    });

    return this.parse(updated);
  }

  async remove(
    tenantId: string,
    patientId: string,
    medId: string,
  ): Promise<{ deleted: boolean; medId: string }> {
    await this.findOne(tenantId, patientId, medId);
    await this.prisma.clinicalDocument.delete({ where: { id: medId } });
    return { deleted: true, medId };
  }

  // =========================================================================
  // reconcile — Mark all active home meds as reviewed/reconciled
  // =========================================================================

  async reconcile(
    tenantId: string,
    patientId: string,
    authorId: string,
  ): Promise<{ reconciled: number; patientId: string }> {
    await this.assertPatient(tenantId, patientId);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
    });

    let count = 0;
    for (const doc of docs) {
      const data = JSON.parse(doc.content ?? '{}');
      if (data.reconciliationNeeded) {
        await this.prisma.clinicalDocument.update({
          where: { id: doc.id },
          data: {
            content: JSON.stringify({
              ...data,
              reconciliationNeeded: false,
              reconciledAt: new Date().toISOString(),
              reconciledBy: authorId,
            }),
          },
        });
        count++;
      }
    }

    this.logger.log(`Reconciled ${count} home meds for patient=${patientId}`);
    return { reconciled: count, patientId };
  }
}
