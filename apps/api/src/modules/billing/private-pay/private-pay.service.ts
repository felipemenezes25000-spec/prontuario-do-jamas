import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePriceTableDto,
  CreateBudgetDto,
  UpdateBudgetStatusDto,
  CreateInstallmentPlanDto,
  BudgetStatusEnum,
} from './dto/private-pay.dto';

// ─── Internal interfaces (stored as JSON in clinicalDocument.content) ────────

export interface PriceItem {
  code: string;
  description: string;
  unitPrice: number;
  category?: string;
}

export interface PriceTableRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  items: PriceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BudgetRecord {
  id: string;
  tenantId: string;
  patientId: string;
  priceTableId?: string;
  status: BudgetStatusEnum;
  totalAmount: number;
  validUntil: string;
  notes?: string;
  statusReason?: string;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentEntry {
  number: number;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt?: string;
}

export interface InstallmentPlanRecord {
  id: string;
  tenantId: string;
  budgetId: string;
  totalAmount: number;
  downPayment: number;
  installments: number;
  interestRateMonthly: number;
  installmentAmount: number;
  totalWithInterest: number;
  firstDueDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  entries: InstallmentEntry[];
  createdAt: string;
}

// ─── Doc title prefixes ──────────────────────────────────────────────────────

const PRICE_TABLE_PREFIX = 'PRIVATE_PAY_PRICE_TABLE:';
const BUDGET_PREFIX = 'PRIVATE_PAY_BUDGET:';
const INSTALLMENT_PREFIX = 'PRIVATE_PAY_INSTALLMENT:';

@Injectable()
export class PrivatePayService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Price Tables ──────────────────────────────────────────────────────────

  async createPriceTable(tenantId: string, authorId: string, dto: CreatePriceTableDto) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: PriceTableRecord = {
      id,
      tenantId,
      name: dto.name,
      description: dto.description,
      items: dto.items.map((i) => ({
        code: i.code,
        description: i.description,
        unitPrice: i.unitPrice,
        category: i.category,
      })),
      createdAt: now,
      updatedAt: now,
    };

    // Find a system patient to use as placeholder (required FK)
    const anyPatient = await this.prisma.patient.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (!anyPatient) throw new BadRequestException('Nenhum paciente cadastrado no tenant.');

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: anyPatient.id,
        authorId,
        type: 'CUSTOM',
        title: `${PRICE_TABLE_PREFIX}${dto.name}`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return record;
  }

  async getPriceTables(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: PRICE_TABLE_PREFIX },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => {
      const record = JSON.parse(d.content ?? '{}') as PriceTableRecord;
      return { docId: d.id, ...record };
    });
  }

  // ─── Budgets ───────────────────────────────────────────────────────────────

  async createBudget(tenantId: string, authorId: string, dto: CreateBudgetDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const validDays = dto.validDays ?? 30;
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const items: BudgetItem[] = dto.items.map((i) => ({
      code: i.code,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: Math.round(i.quantity * i.unitPrice * 100) / 100,
    }));

    const totalAmount = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;

    const record: BudgetRecord = {
      id,
      tenantId,
      patientId: dto.patientId,
      priceTableId: dto.priceTableId,
      status: BudgetStatusEnum.DRAFT,
      totalAmount,
      validUntil,
      notes: dto.notes,
      items,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `${BUDGET_PREFIX}${patient.fullName} — R$ ${totalAmount.toFixed(2)}`,
        content: JSON.stringify(record),
        status: 'DRAFT',
      },
    });

    return { budgetId: id, patientName: patient.fullName, totalAmount, status: record.status, validUntil };
  }

  async getBudgets(tenantId: string, options: { patientId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: BUDGET_PREFIX },
    };

    if (options.patientId) {
      where.patientId = options.patientId;
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, content: true, createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    let data = docs.map((d) => {
      const record = JSON.parse(d.content ?? '{}') as BudgetRecord;
      return {
        docId: d.id,
        budgetId: record.id,
        patientId: d.patient?.id,
        patientName: d.patient?.fullName,
        status: record.status,
        totalAmount: record.totalAmount,
        validUntil: record.validUntil,
        itemCount: record.items.length,
        createdAt: record.createdAt,
      };
    });

    if (options.status) {
      data = data.filter((b) => b.status === options.status);
    }

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateBudgetStatus(tenantId: string, docId: string, dto: UpdateBudgetStatusDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: docId, tenantId, type: 'CUSTOM', title: { startsWith: BUDGET_PREFIX } },
    });
    if (!doc) throw new NotFoundException('Orçamento não encontrado.');

    const record = JSON.parse(doc.content ?? '{}') as BudgetRecord;
    record.status = dto.status;
    record.statusReason = dto.reason;
    record.updatedAt = new Date().toISOString();

    await this.prisma.clinicalDocument.update({
      where: { id: docId },
      data: {
        content: JSON.stringify(record),
        status: dto.status === BudgetStatusEnum.APPROVED ? 'FINAL' : 'DRAFT',
      },
    });

    return { docId, budgetId: record.id, status: record.status };
  }

  // ─── Installment Plans ─────────────────────────────────────────────────────

  async createInstallmentPlan(tenantId: string, authorId: string, dto: CreateInstallmentPlanDto) {
    // Find the budget document
    const budgetDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: BUDGET_PREFIX },
        content: { contains: dto.budgetId },
      },
      select: { id: true, content: true, patientId: true },
    });
    if (!budgetDoc) throw new NotFoundException('Orçamento não encontrado.');

    const budget = JSON.parse(budgetDoc.content ?? '{}') as BudgetRecord;
    if (budget.status !== BudgetStatusEnum.APPROVED) {
      throw new BadRequestException('Apenas orçamentos aprovados podem ser parcelados.');
    }

    const downPayment = dto.downPayment ?? 0;
    const interestRate = dto.interestRateMonthly ?? 0;
    const remainingAmount = budget.totalAmount - downPayment;

    if (remainingAmount < 0) {
      throw new BadRequestException('Entrada não pode ser maior que o valor total.');
    }

    // Calculate installment amount with compound interest
    let installmentAmount: number;
    if (interestRate === 0) {
      installmentAmount = Math.round((remainingAmount / dto.installments) * 100) / 100;
    } else {
      const r = interestRate / 100;
      installmentAmount = Math.round(
        (remainingAmount * r * Math.pow(1 + r, dto.installments)) /
        (Math.pow(1 + r, dto.installments) - 1) * 100
      ) / 100;
    }

    const totalWithInterest = Math.round((downPayment + installmentAmount * dto.installments) * 100) / 100;

    const firstDueDate = dto.firstDueDate
      ? new Date(dto.firstDueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const entries: InstallmentEntry[] = Array.from({ length: dto.installments }, (_, i) => {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        number: i + 1,
        dueDate: dueDate.toISOString(),
        amount: installmentAmount,
        status: 'PENDING' as const,
      };
    });

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const plan: InstallmentPlanRecord = {
      id,
      tenantId,
      budgetId: dto.budgetId,
      totalAmount: budget.totalAmount,
      downPayment,
      installments: dto.installments,
      interestRateMonthly: interestRate,
      installmentAmount,
      totalWithInterest,
      firstDueDate: firstDueDate.toISOString(),
      status: 'ACTIVE',
      entries,
      createdAt: now,
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: budgetDoc.patientId,
        authorId,
        type: 'CUSTOM',
        title: `${INSTALLMENT_PREFIX}${dto.installments}x R$ ${installmentAmount.toFixed(2)}`,
        content: JSON.stringify(plan),
        status: 'FINAL',
      },
    });

    return plan;
  }

  async getInstallmentPlans(tenantId: string, budgetId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: INSTALLMENT_PREFIX },
        content: { contains: budgetId },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => {
      const plan = JSON.parse(d.content ?? '{}') as InstallmentPlanRecord;
      return { docId: d.id, ...plan };
    });
  }

  // ─── Payment Gateway Integration ────────────────────────────────────────────

  async processPayment(
    tenantId: string,
    dto: {
      budgetId: string;
      patientId: string;
      amount: number;
      method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
      installments?: number;
      cardToken?: string;
      cpf?: string;
    },
  ) {
    const now = new Date();
    const transactionId = crypto.randomUUID();

    // Simulated payment gateway response
    let paymentDetails: Record<string, unknown> = {};

    switch (dto.method) {
      case 'PIX': {
        const pixKey = `pix-${transactionId.slice(0, 8)}`;
        paymentDetails = {
          pixKey,
          qrCode: `00020126580014BR.GOV.BCB.PIX0136${pixKey}5204000053039865406${dto.amount.toFixed(2)}5802BR`,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 min
        };
        break;
      }
      case 'CREDIT_CARD': {
        paymentDetails = {
          cardLastFour: '****',
          installments: dto.installments ?? 1,
          installmentAmount: dto.installments
            ? Math.round((dto.amount / dto.installments) * 100) / 100
            : dto.amount,
          authorizationCode: `AUTH-${Date.now().toString(36).toUpperCase()}`,
        };
        break;
      }
      case 'DEBIT_CARD': {
        paymentDetails = {
          cardLastFour: '****',
          authorizationCode: `AUTH-${Date.now().toString(36).toUpperCase()}`,
        };
        break;
      }
      case 'BOLETO': {
        const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        paymentDetails = {
          barcode: `23793.${Math.random().toString().slice(2, 7)} ${Math.random().toString().slice(2, 7)}.${Math.random().toString().slice(2, 7)}`,
          dueDate: dueDate.toISOString().split('T')[0],
          bankSlipUrl: `https://boleto.example.com/${transactionId}`,
        };
        break;
      }
    }

    const payment = {
      transactionId,
      tenantId,
      budgetId: dto.budgetId,
      patientId: dto.patientId,
      amount: dto.amount,
      method: dto.method,
      status: dto.method === 'PIX' || dto.method === 'BOLETO' ? 'PENDING' : 'APPROVED',
      ...paymentDetails,
      createdAt: now.toISOString(),
    };

    // Store payment record
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: dto.patientId, // placeholder
        type: 'CUSTOM',
        title: `PAYMENT:${dto.method}:${transactionId.slice(0, 8)}`,
        content: JSON.stringify(payment),
        status: 'FINAL',
      },
    });

    return payment;
  }

  async getPaymentHistory(tenantId: string, patientId?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'PAYMENT:' },
    };
    if (patientId) where.patientId = patientId;

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
      take: 50,
    });

    return docs.map((d) => ({
      docId: d.id,
      ...JSON.parse(d.content ?? '{}'),
    }));
  }

  // ─── Digital Payment Plan ───────────────────────────────────────────────────

  async createDigitalPaymentPlan(
    tenantId: string,
    authorId: string,
    dto: {
      patientId: string;
      budgetId: string;
      totalAmount: number;
      downPayment: number;
      installments: number;
      paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
      firstDueDate: string;
      autoCharge: boolean;
      cardToken?: string;
    },
  ) {
    const remainingAmount = dto.totalAmount - dto.downPayment;
    const installmentAmount = Math.round((remainingAmount / dto.installments) * 100) / 100;

    const firstDue = new Date(dto.firstDueDate);
    const schedule = Array.from({ length: dto.installments }, (_, i) => {
      const dueDate = new Date(firstDue);
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        number: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        status: 'SCHEDULED' as const,
        paymentMethod: dto.paymentMethod,
      };
    });

    const plan = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      budgetId: dto.budgetId,
      totalAmount: dto.totalAmount,
      downPayment: dto.downPayment,
      installments: dto.installments,
      installmentAmount,
      paymentMethod: dto.paymentMethod,
      autoCharge: dto.autoCharge,
      schedule,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `DIGITAL_PAYMENT_PLAN:${dto.installments}x R$ ${installmentAmount.toFixed(2)}`,
        content: JSON.stringify(plan),
        status: 'FINAL',
      },
    });

    return plan;
  }
}
