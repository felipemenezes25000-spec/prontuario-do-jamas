import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateImplantedDeviceDto,
  UpdateImplantedDeviceDto,
  ImplantedDeviceDto,
  ImplantStatus,
  MriCompatibility,
} from './dto/implanted-devices.dto';

@Injectable()
export class ImplantedDevicesService {
  private readonly logger = new Logger(ImplantedDevicesService.name);
  private readonly DOC_PREFIX = '[IMPLANT]';

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
  }): ImplantedDeviceDto {
    const d = JSON.parse(doc.content ?? '{}');
    return {
      id: doc.id,
      patientId: doc.patientId,
      type: d.type,
      model: d.model ?? '',
      manufacturer: d.manufacturer ?? null,
      lotNumber: d.lotNumber ?? null,
      serialNumber: d.serialNumber ?? null,
      udi: d.udi ?? null,
      implantDate: d.implantDate ?? null,
      removalDate: d.removalDate ?? null,
      status: d.status ?? ImplantStatus.ACTIVE,
      mriCompatibility: d.mriCompatibility ?? MriCompatibility.UNKNOWN,
      mriConditions: d.mriConditions ?? null,
      bodyLocation: d.bodyLocation ?? null,
      implantingPhysician: d.implantingPhysician ?? null,
      facility: d.facility ?? null,
      alertOnMriOrder: d.alertOnMriOrder ?? (d.mriCompatibility === MriCompatibility.UNSAFE),
      notes: d.notes ?? null,
      authorId: doc.authorId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    tenantId: string,
    patientId: string,
    dto: CreateImplantedDeviceDto,
    authorId: string,
  ): Promise<ImplantedDeviceDto> {
    await this.assertPatient(tenantId, patientId);

    const mriFlag = dto.mriCompatibility === MriCompatibility.UNSAFE ? ' [MRI-UNSAFE]' : '';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        type: 'CUSTOM',
        title: `${this.DOC_PREFIX} ${dto.type} — ${dto.model}${mriFlag}`,
        content: JSON.stringify(dto),
        status: 'FINAL',
      },
    });

    // Create clinical alert for MRI-unsafe implants
    if (
      dto.mriCompatibility === MriCompatibility.UNSAFE ||
      (dto.alertOnMriOrder ?? false)
    ) {
      await this.prisma.clinicalAlert.create({
        data: {
          tenantId,
          patientId,
          type: 'SYSTEM',
          severity: 'CRITICAL',
          source: 'SYSTEM',
          triggeredAt: new Date(),
          title: `MRI Contraindication: ${dto.model} (${dto.type})`,
          message: `Patient has an MRI-unsafe implant: ${dto.model} (${dto.type}). MRI orders require specialist review.`,
          isActive: true,
        },
      });
    }

    this.logger.log(`Implant recorded: ${dto.type} ${dto.model} patient=${patientId}`);
    return this.parse(doc);
  }

  async findAll(
    tenantId: string,
    patientId: string,
    activeOnly = false,
  ): Promise<ImplantedDeviceDto[]> {
    await this.assertPatient(tenantId, patientId);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: this.DOC_PREFIX } },
      orderBy: { createdAt: 'desc' },
    });

    const items = docs.map((d) => this.parse(d));
    return activeOnly ? items.filter((i) => i.status === ImplantStatus.ACTIVE) : items;
  }

  async findOne(
    tenantId: string,
    patientId: string,
    deviceId: string,
  ): Promise<ImplantedDeviceDto> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: deviceId, patientId, tenantId, title: { startsWith: this.DOC_PREFIX } },
    });
    if (!doc) throw new NotFoundException(`Implanted device "${deviceId}" not found`);
    return this.parse(doc);
  }

  async update(
    tenantId: string,
    patientId: string,
    deviceId: string,
    dto: UpdateImplantedDeviceDto,
  ): Promise<ImplantedDeviceDto> {
    const existing = await this.findOne(tenantId, patientId, deviceId);
    const merged = { ...existing, ...dto };

    const mriFlag = merged.mriCompatibility === MriCompatibility.UNSAFE ? ' [MRI-UNSAFE]' : '';

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: deviceId },
      data: {
        title: `${this.DOC_PREFIX} ${merged.type} — ${merged.model}${mriFlag}`,
        content: JSON.stringify(merged),
      },
    });

    return this.parse(updated);
  }

  async remove(
    tenantId: string,
    patientId: string,
    deviceId: string,
  ): Promise<{ deleted: boolean; deviceId: string }> {
    await this.findOne(tenantId, patientId, deviceId);
    await this.prisma.clinicalDocument.delete({ where: { id: deviceId } });
    return { deleted: true, deviceId };
  }

  // =========================================================================
  // getMriAlerts — Active MRI-unsafe / conditional implants
  // =========================================================================

  async getMriAlerts(
    tenantId: string,
    patientId: string,
  ): Promise<{ hasMriContraindication: boolean; devices: ImplantedDeviceDto[] }> {
    const all = await this.findAll(tenantId, patientId, true);
    const unsafe = all.filter(
      (d) =>
        d.mriCompatibility === MriCompatibility.UNSAFE ||
        d.mriCompatibility === MriCompatibility.CONDITIONAL,
    );
    return {
      hasMriContraindication: unsafe.some((d) => d.mriCompatibility === MriCompatibility.UNSAFE),
      devices: unsafe,
    };
  }
}
