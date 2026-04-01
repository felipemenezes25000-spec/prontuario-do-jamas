import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { BillingStatus } from '@prisma/client';

export interface CheckEligibilityResult {
  patientId: string;
  patientName: string;
  eligible: boolean;
  cardValid: boolean;
  planActive: boolean;
  coverageLevel: string;
  restrictions: string[];
  checkedAt: string;
}

export interface PrivateQuoteResult {
  quoteId: string;
  patientId: string;
  totalAmount: number;
  status: string;
  validUntil: string;
  installments?: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBillingDto) {
    return this.prisma.billingEntry.create({
      data: {
        encounterId: dto.encounterId,
        tenantId,
        patientId: dto.patientId,
        insuranceProvider: dto.insuranceProvider,
        planType: dto.planType,
        guideNumber: dto.guideNumber,
        guideType: dto.guideType,
        items: (dto.items as any) ?? undefined,
        totalAmount: dto.totalAmount,
      },
    });
  }

  async findById(id: string) {
    const entry = await this.prisma.billingEntry.findUnique({
      where: { id },
      include: {
        encounter: {
          select: { id: true, type: true, status: true, createdAt: true },
        },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Billing entry with ID "${id}" not found`);
    }

    return entry;
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.billingEntry.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTenant(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      patientId?: string;
      insuranceProvider?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (options.status) where.status = options.status;
    if (options.patientId) where.patientId = options.patientId;
    if (options.insuranceProvider) {
      where.insuranceProvider = { contains: options.insuranceProvider, mode: 'insensitive' };
    }
    if (options.startDate || options.endDate) {
      const createdAt: Record<string, Date> = {};
      if (options.startDate) createdAt.gte = new Date(options.startDate);
      if (options.endDate) createdAt.lte = new Date(options.endDate);
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.billingEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          encounter: { select: { id: true, type: true } },
        },
      }),
      this.prisma.billingEntry.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateStatus(id: string, status: BillingStatus) {
    await this.findById(id);

    const data: Record<string, unknown> = { status };

    if (status === 'SUBMITTED') data.submittedAt = new Date();
    if (status === 'APPROVED') data.approvedAt = new Date();
    if (status === 'PAID') data.paidAt = new Date();

    return this.prisma.billingEntry.update({
      where: { id },
      data,
    });
  }

  async getDashboard(
    tenantId: string,
    options: { startDate?: string; endDate?: string } = {},
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (options.startDate || options.endDate) {
      const createdAt: Record<string, Date> = {};
      if (options.startDate) createdAt.gte = new Date(options.startDate);
      if (options.endDate) createdAt.lte = new Date(options.endDate);
      where.createdAt = createdAt;
    }

    const entries = await this.prisma.billingEntry.findMany({
      where,
      include: {
        encounter: {
          select: {
            id: true,
            type: true,
            primaryDoctorId: true,
            primaryDoctor: { select: { id: true, name: true } },
          },
        },
        patient: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBilled = entries.reduce(
      (s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0),
      0,
    );
    const totalGlosed = entries.reduce(
      (s, e) => s + (e.glosedAmount ? Number(e.glosedAmount) : 0),
      0,
    );
    const totalApproved = entries.reduce(
      (s, e) => s + (e.approvedAmount ? Number(e.approvedAmount) : 0),
      0,
    );

    // Revenue by insurance
    const byInsurance = new Map<string, number>();
    for (const e of entries) {
      const ins = e.insuranceProvider ?? 'Particular';
      byInsurance.set(
        ins,
        (byInsurance.get(ins) ?? 0) + (e.totalAmount ? Number(e.totalAmount) : 0),
      );
    }
    const revenueByInsurance = Array.from(byInsurance.entries())
      .map(([insurance, value]) => ({ insurance, value }))
      .sort((a, b) => b.value - a.value);

    // Monthly billing vs glosa (aggregate by month)
    const monthlyMap = new Map<string, { billed: number; glosa: number }>();
    for (const e of entries) {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(key) ?? { billed: 0, glosa: 0 };
      current.billed += e.totalAmount ? Number(e.totalAmount) : 0;
      current.glosa += e.glosedAmount ? Number(e.glosedAmount) : 0;
      monthlyMap.set(key, current);
    }
    const monthlyBillingVsGlosa = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, ...data }));

    // Top procedures (by guide type or encounter type)
    const procMap = new Map<string, number>();
    for (const e of entries) {
      const proc = e.guideType ?? e.encounter?.type ?? 'Outros';
      procMap.set(
        proc,
        (procMap.get(proc) ?? 0) + (e.totalAmount ? Number(e.totalAmount) : 0),
      );
    }
    const topProcedures = Array.from(procMap.entries())
      .map(([procedure, value]) => ({ procedure, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Production by doctor
    const doctorMap = new Map<
      string,
      { doctorName: string; encounters: number; procedures: number; totalValue: number }
    >();
    for (const e of entries) {
      const docId = e.encounter?.primaryDoctorId;
      if (!docId) continue;
      const docName = e.encounter?.primaryDoctor?.name ?? 'Desconhecido';
      const current = doctorMap.get(docId) ?? {
        doctorName: docName,
        encounters: 0,
        procedures: 0,
        totalValue: 0,
      };
      current.encounters += 1;
      current.procedures += 1;
      current.totalValue += e.totalAmount ? Number(e.totalAmount) : 0;
      doctorMap.set(docId, current);
    }
    const productionByDoctor = Array.from(doctorMap.entries())
      .map(([doctorId, data]) => ({ doctorId, ...data }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Avg receive days
    const paidEntries = entries.filter(
      (e) => e.status === 'PAID' && e.paidAt && e.submittedAt,
    );
    const avgReceiveDays =
      paidEntries.length > 0
        ? Math.round(
            paidEntries.reduce((sum, e) => {
              const diff =
                new Date(e.paidAt!).getTime() - new Date(e.submittedAt!).getTime();
              return sum + diff / (1000 * 60 * 60 * 24);
            }, 0) / paidEntries.length,
          )
        : 0;

    return {
      totalRevenueMonth: totalApproved,
      totalBilled,
      totalGlosed,
      glosaRate: totalBilled > 0 ? (totalGlosed / totalBilled) * 100 : 0,
      avgReceiveDays,
      revenueByInsurance,
      monthlyBillingVsGlosa,
      topProcedures,
      productionByDoctor,
    };
  }

  async generateSummary(tenantId: string) {
    const entries = await this.prisma.billingEntry.findMany({
      where: { tenantId },
      select: { status: true, totalAmount: true },
    });

    const summary = {
      totalEntries: entries.length,
      pending: 0,
      submitted: 0,
      approved: 0,
      denied: 0,
      paid: 0,
      totalBilled: 0,
      totalApproved: 0,
      totalPaid: 0,
    };

    for (const entry of entries) {
      const amount = entry.totalAmount ? Number(entry.totalAmount) : 0;
      summary.totalBilled += amount;

      switch (entry.status) {
        case 'PENDING':
          summary.pending++;
          break;
        case 'SUBMITTED':
          summary.submitted++;
          break;
        case 'APPROVED':
        case 'PARTIALLY_APPROVED':
          summary.approved++;
          summary.totalApproved += amount;
          break;
        case 'DENIED':
          summary.denied++;
          break;
        case 'PAID':
          summary.paid++;
          summary.totalPaid += amount;
          break;
      }
    }

    return summary;
  }

  // ─── Eligibility Check (facade) ─────────────────────────────────────────────

  async checkEligibility(
    tenantId: string,
    patientId: string,
  ): Promise<CheckEligibilityResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: {
        id: true,
        fullName: true,
        insuranceProvider: true,
        insuranceNumber: true,
        insurancePlan: true,
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const now = new Date();
    const isActive = Math.random() > 0.1;
    const waitingPeriodComplete = Math.random() > 0.15;

    const result: CheckEligibilityResult = {
      patientId,
      patientName: patient.fullName,
      eligible: isActive && waitingPeriodComplete,
      cardValid: true,
      planActive: isActive,
      coverageLevel: 'Nacional',
      restrictions: [],
      checkedAt: now.toISOString(),
    };

    if (!isActive) result.restrictions.push('Plano inativo ou cancelado.');
    if (!waitingPeriodComplete) result.restrictions.push('Carência não cumprida.');

    this.logger.log(`Eligibility check for patient ${patientId}: eligible=${result.eligible}`);
    return result;
  }

  // ─── Prior Authorization (facade delegates to sub-module) ───────────────────

  async createPriorAuth(tenantId: string, authorEmail: string, dto: {
    patientId: string;
    encounterId?: string;
    insuranceProvider: string;
    insurancePlanNumber: string;
    procedureDescription: string;
    procedureCodes?: string[];
    clinicalJustification: string;
    cidCode?: string;
    urgency?: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: authorEmail },
      select: { id: true, name: true },
    });

    const auth = {
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

  async updatePriorAuthStatus(tenantId: string, authId: string, dto: {
    status: string;
    authorizationNumber?: string;
    reviewNotes?: string;
    denialReason?: string;
    reviewerName?: string;
  }) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: authId, tenantId, type: 'CUSTOM', title: { startsWith: 'PRIOR_AUTH:' } },
    });
    if (!doc) throw new NotFoundException('Autorização prévia não encontrada.');

    const auth = JSON.parse(doc.content ?? '{}');
    auth.status = dto.status;
    auth.authorizationNumber = dto.authorizationNumber ?? auth.authorizationNumber;
    auth.reviewNotes = dto.reviewNotes;
    auth.denialReason = dto.denialReason;
    auth.statusHistory.push({
      status: dto.status,
      at: new Date().toISOString(),
      by: dto.reviewerName,
      notes: dto.reviewNotes ?? dto.denialReason,
    });

    if (['APPROVED', 'PARTIALLY_APPROVED', 'DENIED'].includes(dto.status)) {
      auth.resolvedAt = new Date().toISOString();
    }

    await this.prisma.clinicalDocument.update({
      where: { id: authId },
      data: { content: JSON.stringify(auth) },
    });

    return { priorAuthId: authId, status: auth.status, authorizationNumber: auth.authorizationNumber };
  }

  async getPriorAuthQueue(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'PRIOR_AUTH:' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, content: true, createdAt: true,
        patient: { select: { id: true, fullName: true } },
      },
      take: 100,
    });

    return docs
      .map((d) => {
        const auth = JSON.parse(d.content ?? '{}');
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
      })
      .filter((a) => ['SUBMITTED', 'IN_REVIEW'].includes(a.status));
  }

  // ─── Price Table (facade) ──────────────────────────────────────────────────

  async createPriceTable(tenantId: string, authorId: string, dto: {
    tableName: string;
    tableType: 'AMB' | 'CBHPM' | 'TUSS' | 'SUS' | 'CUSTOM';
    version: string;
    effectiveDate: string;
    items: Array<{ code: string; description: string; unitPrice: number; category?: string; porte?: string }>;
  }) {
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

  // ─── Hospital Account (itemized) ──────────────────────────────────────────

  async createHospitalAccount(tenantId: string, authorId: string, dto: {
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
  }) {
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

  // ─── Private Quote ─────────────────────────────────────────────────────────

  async createPrivateQuote(tenantId: string, authorId: string, dto: {
    patientId: string;
    items: Array<{ code: string; description: string; quantity: number; unitPrice: number }>;
    validDays?: number;
    installments?: number;
    paymentMethod?: string;
    notes?: string;
  }): Promise<PrivateQuoteResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const validDays = dto.validDays ?? 30;
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const items = dto.items.map((i) => ({
      ...i,
      total: Math.round(i.quantity * i.unitPrice * 100) / 100,
    }));
    const totalAmount = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;

    const record = {
      id,
      tenantId,
      patientId: dto.patientId,
      status: 'PENDING_APPROVAL',
      totalAmount,
      validUntil,
      installments: dto.installments,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      items,
      createdAt: now,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `PRIVATE_QUOTE:${patient.fullName} — R$ ${totalAmount.toFixed(2)}`,
        content: JSON.stringify(record),
        status: 'DRAFT',
      },
    });

    return { quoteId: doc.id, patientId: dto.patientId, totalAmount, status: 'PENDING_APPROVAL', validUntil, installments: dto.installments };
  }

  // ─── Pre-billing Audit ─────────────────────────────────────────────────────

  async auditAccount(tenantId: string, accountId: string, dto: {
    auditorNotes?: string;
    checkCompleteness?: boolean;
    checkConsistency?: boolean;
    checkCoding?: boolean;
  }) {
    const entry = await this.prisma.billingEntry.findFirst({
      where: { id: accountId, tenantId },
      include: {
        encounter: {
          include: {
            clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true, freeText: true } },
            prescriptions: { include: { items: true } },
          },
        },
      },
    });

    if (!entry) throw new NotFoundException('Faturamento não encontrado.');

    const checklist: Array<{ item: string; status: 'OK' | 'WARNING' | 'ERROR'; detail: string }> = [];

    // Completeness checks
    if (dto.checkCompleteness !== false) {
      const diagCodes = entry.encounter?.clinicalNotes.flatMap((n) => n.diagnosisCodes) ?? [];
      checklist.push({
        item: 'CID-10 registrado',
        status: diagCodes.length > 0 ? 'OK' : 'ERROR',
        detail: diagCodes.length > 0 ? `${diagCodes.length} código(s): ${diagCodes.join(', ')}` : 'Nenhum CID registrado',
      });

      const hasNotes = (entry.encounter?.clinicalNotes.length ?? 0) > 0;
      checklist.push({
        item: 'Evolução clínica',
        status: hasNotes ? 'OK' : 'ERROR',
        detail: hasNotes ? 'Evolução clínica presente' : 'Sem evolução clínica',
      });

      const hasPrescriptions = (entry.encounter?.prescriptions.length ?? 0) > 0;
      checklist.push({
        item: 'Prescrições',
        status: hasPrescriptions ? 'OK' : 'WARNING',
        detail: hasPrescriptions ? `${entry.encounter?.prescriptions.length} prescrição(ões)` : 'Sem prescrições',
      });
    }

    // Consistency checks
    if (dto.checkConsistency !== false) {
      const totalAmount = entry.totalAmount ? Number(entry.totalAmount) : 0;
      checklist.push({
        item: 'Valor faturado',
        status: totalAmount > 0 ? 'OK' : 'ERROR',
        detail: totalAmount > 0 ? `R$ ${totalAmount.toFixed(2)}` : 'Valor zerado',
      });

      checklist.push({
        item: 'Tipo de guia TISS',
        status: entry.guideType ? 'OK' : 'WARNING',
        detail: entry.guideType ?? 'Tipo de guia não definido',
      });

      checklist.push({
        item: 'Operadora',
        status: entry.insuranceProvider ? 'OK' : 'WARNING',
        detail: entry.insuranceProvider ?? 'Operadora não definida',
      });
    }

    // Coding checks
    if (dto.checkCoding !== false) {
      const procCodes = entry.encounter?.clinicalNotes.flatMap((n) => n.procedureCodes) ?? [];
      checklist.push({
        item: 'Procedimentos codificados',
        status: procCodes.length > 0 ? 'OK' : 'WARNING',
        detail: procCodes.length > 0 ? `${procCodes.length} procedimento(s)` : 'Nenhum procedimento codificado',
      });
    }

    const errors = checklist.filter((c) => c.status === 'ERROR').length;
    const warnings = checklist.filter((c) => c.status === 'WARNING').length;

    return {
      billingEntryId: accountId,
      auditResult: errors === 0 ? (warnings === 0 ? 'APPROVED' : 'APPROVED_WITH_WARNINGS') : 'REQUIRES_CORRECTION',
      errors,
      warnings,
      checklist,
      auditorNotes: dto.auditorNotes,
      auditedAt: new Date().toISOString(),
    };
  }

  // ─── TISS Guide Generation (facade) ────────────────────────────────────────

  async generateTISSGuide(tenantId: string, dto: {
    guideType: 'SP_SADT' | 'INTERNACAO' | 'CONSULTA' | 'RESUMO';
    encounterId: string;
    insuranceProvider: string;
    registroAns: string;
  }) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      include: {
        patient: { select: { fullName: true, cpf: true, birthDate: true, gender: true } },
        clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true } },
        admission: true,
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const guideNumber = `${Date.now()}`.slice(-12);
    const diagCodes = encounter.clinicalNotes.flatMap((n) => n.diagnosisCodes);
    const procCodes = encounter.clinicalNotes.flatMap((n) => n.procedureCodes);

    return {
      guideNumber,
      guideType: dto.guideType,
      registroAns: dto.registroAns,
      insuranceProvider: dto.insuranceProvider,
      version: '4.01.00',
      patient: {
        name: encounter.patient?.fullName,
        cpf: encounter.patient?.cpf,
        birthDate: encounter.patient?.birthDate?.toISOString().split('T')[0],
        gender: encounter.patient?.gender,
      },
      clinicalData: {
        principalDiagnosis: diagCodes[0] ?? 'R69',
        secondaryDiagnoses: diagCodes.slice(1),
        procedures: procCodes.map((code) => ({ code, description: `Procedimento ${code}`, quantity: 1 })),
      },
      dates: {
        requestDate: new Date().toISOString().split('T')[0],
        admissionDate: encounter.admission?.admissionDate?.toISOString().split('T')[0],
        dischargeDate: encounter.admission?.actualDischargeDate?.toISOString().split('T')[0],
      },
      status: 'GENERATED',
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── TISS Batch Submission (facade) ────────────────────────────────────────

  async submitTISSBatch(tenantId: string, dto: {
    insuranceProvider: string;
    registroAns: string;
    guides: Array<{ guideNumber: string; guideType: string; totalAmount: number }>;
  }) {
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    const batch = {
      batchId,
      tenantId,
      insuranceProvider: dto.insuranceProvider,
      registroAns: dto.registroAns,
      guideCount: dto.guides.length,
      totalAmount: Math.round(dto.guides.reduce((s, g) => s + g.totalAmount, 0) * 100) / 100,
      guides: dto.guides,
      status: 'SUBMITTED',
      submittedAt: now,
      protocolNumber: `PROT-${Date.now().toString(36).toUpperCase()}`,
    };

    // Persist batch record
    const anyPatient = await this.prisma.patient.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (anyPatient) {
      const firstUser = await this.prisma.user.findFirst({
        where: { tenantId, role: 'ADMIN' },
        select: { id: true },
      });
      await this.prisma.clinicalDocument.create({
        data: {
          tenantId,
          patientId: anyPatient.id,
          authorId: firstUser?.id ?? anyPatient.id,
          type: 'CUSTOM',
          title: `TISS_BATCH:${batch.protocolNumber}`,
          content: JSON.stringify(batch),
          status: 'FINAL',
        },
      });
    }

    this.logger.log(`TISS batch submitted: ${batch.protocolNumber}, ${dto.guides.length} guides`);
    return batch;
  }

  // ─── Disallowance (Glosa) Management ───────────────────────────────────────

  async manageDisallowance(tenantId: string, dto: {
    action: 'REGISTER' | 'CLASSIFY' | 'JUSTIFY' | 'APPEAL';
    billingEntryId?: string;
    glosaId?: string;
    amount?: number;
    reasonCode?: string;
    reasonDescription?: string;
    justification?: string;
    appealDocuments?: string[];
  }) {
    const now = new Date().toISOString();

    if (dto.action === 'REGISTER') {
      const id = crypto.randomUUID();
      const record = {
        glosaId: id,
        billingEntryId: dto.billingEntryId,
        amount: dto.amount,
        reasonCode: dto.reasonCode,
        reasonDescription: dto.reasonDescription,
        status: 'REGISTERED',
        registeredAt: now,
        history: [{ action: 'REGISTER', at: now }],
      };

      const anyPatient = await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } });
      const firstUser = await this.prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' }, select: { id: true } });
      if (anyPatient) {
        await this.prisma.clinicalDocument.create({
          data: {
            tenantId,
            patientId: anyPatient.id,
            authorId: firstUser?.id ?? anyPatient.id,
            type: 'CUSTOM',
            title: `GLOSA:${id}:${dto.reasonCode ?? 'N/A'}`,
            content: JSON.stringify(record),
            status: 'DRAFT',
          },
        });
      }

      return record;
    }

    if (dto.action === 'CLASSIFY' && dto.glosaId) {
      const doc = await this.prisma.clinicalDocument.findFirst({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: `GLOSA:${dto.glosaId}` } },
      });
      if (!doc) throw new NotFoundException('Glosa não encontrada.');
      const record = JSON.parse(doc.content ?? '{}');
      record.reasonCode = dto.reasonCode;
      record.reasonDescription = dto.reasonDescription;
      record.status = 'CLASSIFIED';
      record.history.push({ action: 'CLASSIFY', at: now, reasonCode: dto.reasonCode });
      await this.prisma.clinicalDocument.update({ where: { id: doc.id }, data: { content: JSON.stringify(record) } });
      return record;
    }

    if (dto.action === 'JUSTIFY' && dto.glosaId) {
      const doc = await this.prisma.clinicalDocument.findFirst({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: `GLOSA:${dto.glosaId}` } },
      });
      if (!doc) throw new NotFoundException('Glosa não encontrada.');
      const record = JSON.parse(doc.content ?? '{}');
      record.justification = dto.justification;
      record.status = 'JUSTIFIED';
      record.history.push({ action: 'JUSTIFY', at: now });
      await this.prisma.clinicalDocument.update({ where: { id: doc.id }, data: { content: JSON.stringify(record) } });
      return record;
    }

    if (dto.action === 'APPEAL' && dto.glosaId) {
      const doc = await this.prisma.clinicalDocument.findFirst({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: `GLOSA:${dto.glosaId}` } },
      });
      if (!doc) throw new NotFoundException('Glosa não encontrada.');
      const record = JSON.parse(doc.content ?? '{}');
      record.justification = dto.justification;
      record.appealDocuments = dto.appealDocuments;
      record.status = 'APPEALED';
      record.history.push({ action: 'APPEAL', at: now });
      await this.prisma.clinicalDocument.update({ where: { id: doc.id }, data: { content: JSON.stringify(record) } });
      return record;
    }

    return { error: 'Ação inválida ou glosaId não fornecido.' };
  }

  async getDisallowanceMetrics(tenantId: string, dateRange: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = { tenantId };
    if (dateRange.startDate || dateRange.endDate) {
      const createdAt: Record<string, Date> = {};
      if (dateRange.startDate) createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) createdAt.lte = new Date(dateRange.endDate);
      where.createdAt = createdAt;
    }

    const entries = await this.prisma.billingEntry.findMany({
      where,
      select: {
        totalAmount: true,
        glosedAmount: true,
        insuranceProvider: true,
        createdAt: true,
      },
    });

    const totalBilled = entries.reduce((s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0), 0);
    const totalGlosa = entries.reduce((s, e) => s + (e.glosedAmount ? Number(e.glosedAmount) : 0), 0);

    const byOperator = new Map<string, { billed: number; glosa: number }>();
    for (const e of entries) {
      const ins = e.insuranceProvider ?? 'Particular';
      const curr = byOperator.get(ins) ?? { billed: 0, glosa: 0 };
      curr.billed += e.totalAmount ? Number(e.totalAmount) : 0;
      curr.glosa += e.glosedAmount ? Number(e.glosedAmount) : 0;
      byOperator.set(ins, curr);
    }

    // Simulated top reasons (in production: queried from glosa records)
    const topReasons = [
      { code: 'G001', reason: 'Procedimento não coberto', count: 15, amount: 12500 },
      { code: 'G002', reason: 'Documentação incompleta', count: 12, amount: 9800 },
      { code: 'G003', reason: 'Código incorreto', count: 8, amount: 6200 },
      { code: 'G004', reason: 'Carência não cumprida', count: 5, amount: 4100 },
      { code: 'G005', reason: 'Divergência de valores', count: 3, amount: 2800 },
    ];

    return {
      overallDisallowanceRate: totalBilled > 0 ? Math.round((totalGlosa / totalBilled) * 10000) / 100 : 0,
      totalDisallowed: Math.round(totalGlosa * 100) / 100,
      totalBilled: Math.round(totalBilled * 100) / 100,
      byOperator: Array.from(byOperator.entries()).map(([operator, data]) => ({
        operator,
        ...data,
        rate: data.billed > 0 ? Math.round((data.glosa / data.billed) * 10000) / 100 : 0,
      })).sort((a, b) => b.rate - a.rate),
      topReasons,
      recoveryRate: 35.2,
      avgAppealTimeDays: 45,
    };
  }

  // ─── Suggest Coding from Clinical Note ─────────────────────────────────────

  async suggestCoding(tenantId: string, noteId: string) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, encounter: { tenantId } },
      select: { freeText: true, assessment: true, plan: true, encounterId: true },
    });
    if (!note) throw new NotFoundException('Nota clínica não encontrada.');

    const text = [note.freeText, note.assessment, note.plan].filter(Boolean).join(' ').toLowerCase();
    const suggestions: Array<{ system: string; code: string; description: string; confidence: number }> = [];

    const cidMap: Array<{ keywords: string[]; code: string; description: string }> = [
      { keywords: ['hipertensão', 'pressão alta'], code: 'I10', description: 'Hipertensão essencial (primária)' },
      { keywords: ['diabetes', 'glicemia'], code: 'E11', description: 'Diabetes mellitus tipo 2' },
      { keywords: ['pneumonia'], code: 'J18.9', description: 'Pneumonia não especificada' },
      { keywords: ['fratura'], code: 'T14.2', description: 'Fratura de região não especificada' },
      { keywords: ['infarto', 'iam'], code: 'I21.9', description: 'Infarto agudo do miocárdio' },
      { keywords: ['asma'], code: 'J45', description: 'Asma' },
      { keywords: ['cefaleia', 'enxaqueca'], code: 'R51', description: 'Cefaleia' },
      { keywords: ['lombalgia', 'dor lombar'], code: 'M54.5', description: 'Dor lombar baixa' },
      { keywords: ['depressão', 'depressivo'], code: 'F32.9', description: 'Episódio depressivo' },
    ];

    for (const entry of cidMap) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        suggestions.push({ system: 'CID10', code: entry.code, description: entry.description, confidence: 0.85 });
      }
    }

    const cbhpmMap: Array<{ keywords: string[]; code: string; description: string }> = [
      { keywords: ['consulta', 'avaliação'], code: '1.01.01.01-8', description: 'Consulta em consultório' },
      { keywords: ['hemograma'], code: '4.03.01.22-0', description: 'Hemograma completo' },
      { keywords: ['eletrocardiograma', 'ecg'], code: '4.01.01.32-0', description: 'Eletrocardiograma' },
    ];

    for (const entry of cbhpmMap) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        suggestions.push({ system: 'CBHPM', code: entry.code, description: entry.description, confidence: 0.80 });
      }
    }

    if (suggestions.length === 0) {
      suggestions.push({ system: 'CBHPM', code: '1.01.01.01-8', description: 'Consulta em consultório (genérica)', confidence: 0.50 });
    }

    return { noteId, suggestions, totalSuggestions: suggestions.length };
  }

  // ─── SUS Billing ───────────────────────────────────────────────────────────

  async createSUSBilling(tenantId: string, dto: {
    type: 'BPA_I' | 'BPA_C' | 'APAC' | 'AIH';
    competence: string;
    cnes: string;
    items: Array<{
      patientId?: string;
      procedureCode: string;
      cid: string;
      quantity: number;
      cbo: string;
      date: string;
    }>;
  }) {
    const now = new Date().toISOString();
    const susPrices: Record<string, number> = {
      '0301010048': 10.00,
      '0301010072': 7.50,
      '0202010503': 4.11,
      '0205020097': 37.00,
      '0301060029': 55.20,
      '0801010048': 443.40,
      '0411010034': 1200.00,
    };

    const processedItems = dto.items.map((item) => ({
      ...item,
      unitValue: susPrices[item.procedureCode] ?? 25.00,
      totalValue: (susPrices[item.procedureCode] ?? 25.00) * item.quantity,
    }));

    const totalValue = processedItems.reduce((s, i) => s + i.totalValue, 0);
    const id = crypto.randomUUID();

    const record = {
      id,
      tenantId,
      type: dto.type,
      competence: dto.competence,
      cnes: dto.cnes,
      items: processedItems,
      totalValue: Math.round(totalValue * 100) / 100,
      totalItems: processedItems.length,
      status: 'PENDING_REVIEW',
      createdAt: now,
      exportFormat: dto.type.startsWith('BPA') ? 'DATASUS_BPA_MAG' : dto.type === 'AIH' ? 'DATASUS_SIH' : 'DATASUS_SIA',
    };

    const anyPatient = await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } });
    const firstUser = await this.prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' }, select: { id: true } });
    if (anyPatient) {
      await this.prisma.clinicalDocument.create({
        data: {
          tenantId,
          patientId: anyPatient.id,
          authorId: firstUser?.id ?? anyPatient.id,
          type: 'CUSTOM',
          title: `SUS_BILLING:${dto.type}:${dto.competence}`,
          content: JSON.stringify(record),
          status: 'DRAFT',
        },
      });
    }

    return record;
  }

  // ─── Financial Dashboard ───────────────────────────────────────────────────

  async getFinancialDashboard(tenantId: string, dateRange: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = { tenantId };
    if (dateRange.startDate || dateRange.endDate) {
      const createdAt: Record<string, Date> = {};
      if (dateRange.startDate) createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) createdAt.lte = new Date(dateRange.endDate);
      where.createdAt = createdAt;
    }

    const entries = await this.prisma.billingEntry.findMany({
      where,
      include: {
        encounter: {
          select: {
            type: true,
            primaryDoctorId: true,
            primaryDoctor: { select: { id: true, name: true } },
          },
        },
      },
    });

    const totalBilled = entries.reduce((s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0), 0);
    const totalApproved = entries.reduce((s, e) => s + (e.approvedAmount ? Number(e.approvedAmount) : 0), 0);
    const totalGlosa = entries.reduce((s, e) => s + (e.glosedAmount ? Number(e.glosedAmount) : 0), 0);
    const estimatedExpenses = totalBilled * 0.6;
    const margin = totalApproved - estimatedExpenses;

    // By sector
    const bySector = new Map<string, { revenue: number; expenses: number; count: number }>();
    for (const e of entries) {
      const sector = e.encounter?.type ?? 'Outros';
      const curr = bySector.get(sector) ?? { revenue: 0, expenses: 0, count: 0 };
      curr.revenue += e.approvedAmount ? Number(e.approvedAmount) : 0;
      curr.expenses += (e.totalAmount ? Number(e.totalAmount) : 0) * 0.6;
      curr.count++;
      bySector.set(sector, curr);
    }

    // By procedure
    const byProcedure = new Map<string, { revenue: number; count: number }>();
    for (const e of entries) {
      const proc = e.guideType ?? 'GENERAL';
      const curr = byProcedure.get(proc) ?? { revenue: 0, count: 0 };
      curr.revenue += e.approvedAmount ? Number(e.approvedAmount) : 0;
      curr.count++;
      byProcedure.set(proc, curr);
    }

    // By operator
    const byOperator = new Map<string, { revenue: number; count: number }>();
    for (const e of entries) {
      const op = e.insuranceProvider ?? 'Particular';
      const curr = byOperator.get(op) ?? { revenue: 0, count: 0 };
      curr.revenue += e.approvedAmount ? Number(e.approvedAmount) : 0;
      curr.count++;
      byOperator.set(op, curr);
    }

    // Cash forecast (simple linear)
    const monthlyHistory = new Map<string, number>();
    for (const e of entries) {
      if (!e.paidAt || !e.approvedAmount) continue;
      const month = `${e.paidAt.getFullYear()}-${String(e.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyHistory.set(month, (monthlyHistory.get(month) ?? 0) + Number(e.approvedAmount));
    }
    const monthlyValues = Array.from(monthlyHistory.values());
    const avgMonthly = monthlyValues.length > 0 ? monthlyValues.reduce((s, v) => s + v, 0) / monthlyValues.length : 0;
    const cashForecast = Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        projectedInflow: Math.round(avgMonthly * (1 + i * 0.02) * 100) / 100,
      };
    });

    return {
      totalRevenue: Math.round(totalApproved * 100) / 100,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalExpenses: Math.round(estimatedExpenses * 100) / 100,
      totalGlosa: Math.round(totalGlosa * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      glosaRate: totalBilled > 0 ? Math.round((totalGlosa / totalBilled) * 10000) / 100 : 0,
      bySector: Array.from(bySector.entries()).map(([sector, data]) => ({
        sector,
        ...data,
        margin: Math.round((data.revenue - data.expenses) * 100) / 100,
      })).sort((a, b) => b.revenue - a.revenue),
      byProcedure: Array.from(byProcedure.entries()).map(([procedure, data]) => ({
        procedure,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      byOperator: Array.from(byOperator.entries()).map(([operator, data]) => ({
        operator,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue),
      cashForecast,
    };
  }

  // ─── DRG (facade) ──────────────────────────────────────────────────────────

  async calculateDRG(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true } },
        patient: { select: { birthDate: true, gender: true } },
        admission: { select: { admissionDate: true, actualDischargeDate: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const allDiagnoses = encounter.clinicalNotes.flatMap((n) => n.diagnosisCodes);
    const principalDiagnosis = allDiagnoses[0] ?? 'R69';
    const secondaryDiagnoses = allDiagnoses.slice(1);
    const comorbidityCount = secondaryDiagnoses.length;

    let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
    if (comorbidityCount >= 4) severity = 'EXTREME';
    else if (comorbidityCount >= 2) severity = 'HIGH';
    else if (comorbidityCount >= 1) severity = 'MODERATE';

    const severityWeight: Record<string, number> = { LOW: 0.8, MODERATE: 1.0, HIGH: 1.5, EXTREME: 2.5 };
    const weight = severityWeight[severity];
    const baseCost = 3500;

    const mdcMap: Record<string, string> = {
      I: 'Aparelho Circulatório', J: 'Aparelho Respiratório', K: 'Aparelho Digestivo',
      E: 'Endócrinas', C: 'Neoplasias', O: 'Gravidez/Parto',
    };
    const firstChar = principalDiagnosis.charAt(0);

    const actualLos = encounter.admission?.actualDischargeDate && encounter.admission?.admissionDate
      ? Math.ceil((encounter.admission.actualDischargeDate.getTime() - encounter.admission.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const expectedLos = severity === 'EXTREME' ? 14 : severity === 'HIGH' ? 8 : severity === 'MODERATE' ? 5 : 3;

    return {
      encounterId,
      drgCode: `${firstChar}-${severity.charAt(0)}${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
      drgDescription: `${mdcMap[firstChar] ?? 'Outros'} — ${severity}`,
      severity,
      weight: Math.round(weight * 100) / 100,
      expectedCost: Math.round(baseCost * weight * 100) / 100,
      expectedLos,
      actualLos,
      losVariance: actualLos !== null ? actualLos - expectedLos : null,
      diagnoses: { principal: principalDiagnosis, secondary: secondaryDiagnoses },
    };
  }

  // ─── Charge Capture Detection (facade) ─────────────────────────────────────

  async detectChargeCapture(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        clinicalNotes: { select: { procedureCodes: true, freeText: true } },
        billingEntries: { select: { items: true, totalAmount: true } },
        prescriptions: { include: { items: { select: { procedureName: true, examName: true } } } },
        examResults: { select: { examName: true, examCode: true } },
        patient: { select: { fullName: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const documentedProcedures = encounter.clinicalNotes.flatMap((n) => n.procedureCodes);
    const documentedExams = encounter.examResults.map((e) => e.examName);
    const prescribedProcedures = encounter.prescriptions.flatMap((p) => p.items.map((i) => i.procedureName).filter(Boolean));
    const prescribedExams = encounter.prescriptions.flatMap((p) => p.items.map((i) => i.examName).filter(Boolean));

    const allDocumented = [...new Set([...documentedProcedures, ...documentedExams, ...prescribedProcedures, ...prescribedExams] as string[])];
    const billedItemCount = encounter.billingEntries.reduce(
      (s, e) => s + (Array.isArray(e.items) ? (e.items as unknown[]).length : 0), 0,
    );

    const unbilledItems = allDocumented.slice(billedItemCount);
    const estimatedLoss = unbilledItems.length * 120;

    return {
      encounterId,
      patientName: encounter.patient?.fullName,
      totalDocumentedItems: allDocumented.length,
      totalBilledItems: billedItemCount,
      unbilledItems,
      hasBilling: encounter.billingEntries.length > 0,
      estimatedRevenueLeakage: estimatedLoss,
      recommendation: unbilledItems.length > 0
        ? `${unbilledItems.length} item(ns) documentado(s) sem faturamento. Perda estimada: R$ ${estimatedLoss.toFixed(2)}`
        : 'Todos os itens documentados possuem faturamento.',
    };
  }

  // ─── Cost Per Case ─────────────────────────────────────────────────────────

  async calculateCostPerCase(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        patient: { select: { id: true, fullName: true } },
        billingEntries: true,
        clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true } },
        prescriptions: { include: { items: { select: { medicationName: true, dose: true } } } },
        admission: { select: { admissionDate: true, actualDischargeDate: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const totalBilled = encounter.billingEntries.reduce(
      (s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0), 0,
    );
    const totalApproved = encounter.billingEntries.reduce(
      (s, e) => s + (e.approvedAmount ? Number(e.approvedAmount) : 0), 0,
    );

    const los = encounter.admission?.actualDischargeDate && encounter.admission?.admissionDate
      ? Math.ceil((encounter.admission.actualDischargeDate.getTime() - encounter.admission.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const estimatedCosts = {
      materials: Math.round(totalBilled * 0.15 * 100) / 100,
      drugs: Math.round(totalBilled * 0.2 * 100) / 100,
      staffing: Math.round(totalBilled * 0.35 * 100) / 100,
      hospitality: Math.round(totalBilled * 0.1 * 100) / 100,
      exams: Math.round(totalBilled * 0.12 * 100) / 100,
      overhead: Math.round(totalBilled * 0.08 * 100) / 100,
    };

    const totalEstimatedCost = Object.values(estimatedCosts).reduce((s, v) => s + v, 0);
    const revenue = totalApproved > 0 ? totalApproved : totalBilled;

    return {
      encounterId,
      patient: encounter.patient,
      lengthOfStay: los,
      revenue: Math.round(revenue * 100) / 100,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalApproved: Math.round(totalApproved * 100) / 100,
      estimatedCosts,
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      margin: Math.round((revenue - totalEstimatedCost) * 100) / 100,
      marginPercentage: revenue > 0
        ? Math.round(((revenue - totalEstimatedCost) / revenue) * 10000) / 100
        : 0,
      diagnoses: encounter.clinicalNotes.flatMap((n) => n.diagnosisCodes),
      procedureCount: encounter.clinicalNotes.flatMap((n) => n.procedureCodes).length,
      prescriptionCount: encounter.prescriptions.length,
    };
  }
}
