import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestRenewalDto, UpdateRenewalDto } from './prescription-renewal.dto';

interface RenewalRequest {
  id: string;
  prescriptionId: string;
  patientId: string;
  tenantId: string;
  justification?: string;
  preferredPharmacy?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  decision?: { by: string; at: string; notes?: string; validityDays?: number };
  requestedAt: string;
}

@Injectable()
export class PrescriptionRenewalService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  async requestRenewal(tenantId: string, userEmail: string, dto: RequestRenewalDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const prescription = await this.prisma.prescription.findFirst({
      where: { id: dto.prescriptionId, tenantId, patientId },
      include: { items: { select: { medicationName: true } } },
    });
    if (!prescription) {
      throw new NotFoundException('Prescrição não encontrada.');
    }

    const renewal: RenewalRequest = {
      id: crypto.randomUUID(),
      prescriptionId: dto.prescriptionId,
      patientId,
      tenantId,
      justification: dto.justification,
      preferredPharmacy: dto.preferredPharmacy,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    const userId = (await this.prisma.user.findFirst({ where: { tenantId, email: userEmail }, select: { id: true } }))!.id;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `RENEWAL: ${prescription.items.map((i) => i.medicationName).join(', ')}`,
        content: JSON.stringify(renewal),
        status: 'DRAFT',
      },
    });

    return { renewalId: doc.id, status: 'PENDING', prescriptionId: dto.prescriptionId };
  }

  async listRenewals(
    tenantId: string,
    userEmail: string,
    userRole: string,
    options: { page?: number; pageSize?: number; status?: string },
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const staffRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'];
    const isStaff = staffRoles.includes(userRole);

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'RENEWAL:' },
    };

    if (!isStaff) {
      const patientId = await this.resolvePatientId(tenantId, userEmail);
      where.patientId = patientId;
    }

    const [data, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const renewals = data.map((d) => {
      const renewal = JSON.parse(d.content ?? '{}') as RenewalRequest;
      return {
        renewalId: d.id,
        prescriptionId: renewal.prescriptionId,
        status: renewal.status,
        justification: renewal.justification,
        patientName: d.patient?.fullName,
        requestedAt: renewal.requestedAt,
        decision: renewal.decision,
      };
    });

    return { data: renewals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateRenewal(tenantId: string, userEmail: string, renewalId: string, dto: UpdateRenewalDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: renewalId, tenantId, type: 'CUSTOM', title: { startsWith: 'RENEWAL:' } },
    });
    if (!doc) {
      throw new NotFoundException('Solicitação de renovação não encontrada.');
    }

    const renewal = JSON.parse(doc.content ?? '{}') as RenewalRequest;
    if (renewal.status !== 'PENDING') {
      throw new BadRequestException('Solicitação já foi processada.');
    }

    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true, name: true },
    });

    renewal.status = dto.decision as 'APPROVED' | 'DENIED';
    renewal.decision = {
      by: user?.name ?? userEmail,
      at: new Date().toISOString(),
      notes: dto.notes,
      validityDays: dto.validityDays,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: renewalId },
      data: {
        content: JSON.stringify(renewal),
        status: dto.decision === 'APPROVED' ? 'SIGNED' : 'VOIDED',
      },
    });

    // If approved, extend the prescription validity
    if (dto.decision === 'APPROVED' && dto.validityDays) {
      const newValidUntil = new Date();
      newValidUntil.setDate(newValidUntil.getDate() + dto.validityDays);
      await this.prisma.prescription.update({
        where: { id: renewal.prescriptionId },
        data: { validUntil: newValidUntil, status: 'ACTIVE' },
      });
    }

    return { renewalId, status: renewal.status, decision: renewal.decision };
  }
}
