import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePriorAuthDto, UpdatePriorAuthStatusDto } from './prior-authorization.dto';

interface PriorAuthRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  tenantId: string;
  insuranceProvider: string;
  insurancePlanNumber: string;
  procedureDescription: string;
  procedureCodes: string[];
  clinicalJustification: string;
  cidCode?: string;
  urgency: string;
  status: string;
  authorizationNumber?: string;
  reviewNotes?: string;
  denialReason?: string;
  statusHistory: Array<{ status: string; at: string; by?: string; notes?: string }>;
  submittedAt: string;
  resolvedAt?: string;
}

@Injectable()
export class PriorAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createPriorAuth(tenantId: string, userEmail: string, dto: CreatePriorAuthDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true, name: true },
    });

    const auth: PriorAuthRecord = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      tenantId,
      insuranceProvider: dto.insuranceProvider,
      insurancePlanNumber: dto.insurancePlanNumber,
      procedureDescription: dto.procedureDescription,
      procedureCodes: dto.procedureCodes ?? [],
      clinicalJustification: dto.clinicalJustification,
      cidCode: dto.cidCode,
      urgency: dto.urgency ?? 'ROUTINE',
      status: 'SUBMITTED',
      statusHistory: [{ status: 'SUBMITTED', at: new Date().toISOString(), by: user?.name }],
      submittedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: user!.id,
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `PRIOR_AUTH: ${dto.insuranceProvider} — ${dto.procedureDescription}`,
        content: JSON.stringify(auth),
        status: 'DRAFT',
      },
    });

    return { priorAuthId: doc.id, status: 'SUBMITTED', insuranceProvider: dto.insuranceProvider };
  }

  async listPriorAuths(tenantId: string, options: { page?: number; pageSize?: number; status?: string; patientId?: string }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'PRIOR_AUTH:' },
    };
    if (options.patientId) where.patientId = options.patientId;

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, content: true, createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const auth = JSON.parse(d.content ?? '{}') as PriorAuthRecord;
      return {
        priorAuthId: d.id,
        insuranceProvider: auth.insuranceProvider,
        procedureDescription: auth.procedureDescription,
        status: auth.status,
        urgency: auth.urgency,
        patientName: d.patient?.fullName,
        submittedAt: auth.submittedAt,
        authorizationNumber: auth.authorizationNumber,
      };
    });

    if (options.status) {
      const filtered = data.filter((d) => d.status === options.status);
      return { data: filtered, total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) };
    }

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateStatus(tenantId: string, userEmail: string, priorAuthId: string, dto: UpdatePriorAuthStatusDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: priorAuthId, tenantId, type: 'CUSTOM', title: { startsWith: 'PRIOR_AUTH:' } },
    });
    if (!doc) throw new NotFoundException('Autorização prévia não encontrada.');

    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { name: true },
    });

    const auth = JSON.parse(doc.content ?? '{}') as PriorAuthRecord;
    auth.status = dto.status;
    auth.authorizationNumber = dto.authorizationNumber ?? auth.authorizationNumber;
    auth.reviewNotes = dto.reviewNotes;
    auth.denialReason = dto.denialReason;
    auth.statusHistory.push({
      status: dto.status,
      at: new Date().toISOString(),
      by: user?.name,
      notes: dto.reviewNotes ?? dto.denialReason,
    });

    if (['APPROVED', 'PARTIALLY_APPROVED', 'DENIED'].includes(dto.status)) {
      auth.resolvedAt = new Date().toISOString();
    }

    await this.prisma.clinicalDocument.update({
      where: { id: priorAuthId },
      data: { content: JSON.stringify(auth) },
    });

    return { priorAuthId, status: auth.status, authorizationNumber: auth.authorizationNumber };
  }

  async getTracking(tenantId: string, priorAuthId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: priorAuthId, tenantId, type: 'CUSTOM', title: { startsWith: 'PRIOR_AUTH:' } },
    });
    if (!doc) throw new NotFoundException('Autorização prévia não encontrada.');

    const auth = JSON.parse(doc.content ?? '{}') as PriorAuthRecord;
    return {
      priorAuthId,
      currentStatus: auth.status,
      insuranceProvider: auth.insuranceProvider,
      procedureDescription: auth.procedureDescription,
      authorizationNumber: auth.authorizationNumber,
      statusHistory: auth.statusHistory,
      submittedAt: auth.submittedAt,
      resolvedAt: auth.resolvedAt,
    };
  }

  // ─── Insurance Eligibility Check ────────────────────────────────────────────

  async checkEligibility(
    tenantId: string,
    dto: { patientId: string; insuranceProvider: string; insurancePlanNumber: string; cardNumber: string },
  ) {
    // Simulated eligibility check — in production, calls insurer TISS/ANS webservice
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true, cpf: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const now = new Date();
    const isActive = Math.random() > 0.1; // 90% active simulation
    const waitingPeriodComplete = Math.random() > 0.15;

    const result = {
      patientId: dto.patientId,
      patientName: patient.fullName,
      insuranceProvider: dto.insuranceProvider,
      planNumber: dto.insurancePlanNumber,
      cardNumber: dto.cardNumber,
      checkedAt: now.toISOString(),
      eligible: isActive && waitingPeriodComplete,
      details: {
        cardValid: true,
        planActive: isActive,
        planType: 'Enfermaria' as string,
        coverageLevel: 'Nacional' as string,
        waitingPeriodComplete,
        copayRequired: Math.random() > 0.5,
        copayPercentage: 20,
        maxCoverage: 500000,
        remainingCoverage: Math.round(Math.random() * 400000 + 50000),
      },
      restrictions: [] as string[],
    };

    if (!isActive) result.restrictions.push('Plano inativo ou cancelado.');
    if (!waitingPeriodComplete) result.restrictions.push('Carência não cumprida para o procedimento solicitado.');

    return result;
  }

  // ─── Price Tables Management ────────────────────────────────────────────────

  async managePriceTable(
    tenantId: string,
    authorId: string,
    dto: {
      action: 'CREATE' | 'UPDATE';
      tableName: string;
      tableType: 'AMB' | 'CBHPM' | 'TUSS' | 'SUS' | 'CUSTOM';
      version: string;
      effectiveDate: string;
      items: Array<{ code: string; description: string; unitPrice: number; category?: string; porte?: string }>;
    },
  ) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record = {
      id,
      tenantId,
      tableName: dto.tableName,
      tableType: dto.tableType,
      version: dto.version,
      effectiveDate: dto.effectiveDate,
      items: dto.items,
      totalItems: dto.items.length,
      createdAt: now,
      updatedAt: now,
    };

    const anyPatient = await this.prisma.patient.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (!anyPatient) throw new NotFoundException('Nenhum paciente cadastrado.');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: anyPatient.id,
        authorId,
        type: 'CUSTOM',
        title: `PRICE_TABLE:${dto.tableType}:${dto.tableName} v${dto.version}`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return { docId: doc.id, ...record };
  }

  async listPriceTables(tenantId: string, tableType?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'PRICE_TABLE:' },
    };

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    let data = docs.map((d) => {
      const record = JSON.parse(d.content ?? '{}');
      return { docId: d.id, ...record };
    });

    if (tableType) {
      data = data.filter((d: Record<string, unknown>) => d.tableType === tableType);
    }

    return data;
  }

  // ─── Hospital Bill Itemization ──────────────────────────────────────────────

  async createHospitalBill(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      encounterId: string;
      admissionDate: string;
      dischargeDate?: string;
      items: Array<{
        category: 'DAILY_RATE' | 'PROFESSIONAL_FEE' | 'MATERIAL' | 'DRUG' | 'EXAM' | 'PROCEDURE' | 'OTHER';
        costCenter: string;
        code: string;
        description: string;
        quantity: number;
        unitPrice: number;
        date: string;
      }>;
    },
  ) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const itemsWithTotal = dto.items.map((item) => ({
      ...item,
      total: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const byCostCenter = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const item of itemsWithTotal) {
      byCostCenter.set(item.costCenter, (byCostCenter.get(item.costCenter) ?? 0) + item.total);
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.total);
    }

    const totalAmount = itemsWithTotal.reduce((s, i) => s + i.total, 0);

    const record = {
      id,
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      admissionDate: dto.admissionDate,
      dischargeDate: dto.dischargeDate,
      items: itemsWithTotal,
      totalAmount: Math.round(totalAmount * 100) / 100,
      byCostCenter: Object.fromEntries(byCostCenter),
      byCategory: Object.fromEntries(byCategory),
      status: 'DRAFT',
      createdAt: now,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `HOSPITAL_BILL:${id}`,
        content: JSON.stringify(record),
        status: 'DRAFT',
      },
    });

    return { docId: doc.id, billId: id, totalAmount: record.totalAmount, itemCount: itemsWithTotal.length };
  }
}
