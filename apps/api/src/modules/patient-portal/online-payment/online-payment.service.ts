import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCheckoutDto, SetupInstallmentsDto, PaymentWebhookDto, GeneratePixDto } from './online-payment.dto';

interface PaymentRecord {
  id: string;
  billingEntryId: string;
  patientId: string;
  tenantId: string;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  installments?: Array<{ number: number; amount: number; dueDate: string; status: string }>;
  cpf?: string;
  pixCode?: string;
  boletoUrl?: string;
  paidAt?: string;
  createdAt: string;
}

@Injectable()
export class OnlinePaymentService {
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

  async createCheckout(tenantId: string, userEmail: string, dto: CreateCheckoutDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const billingEntry = await this.prisma.billingEntry.findFirst({
      where: { id: dto.billingEntryId, tenantId, patientId },
    });
    if (!billingEntry) {
      throw new NotFoundException('Fatura não encontrada.');
    }

    const amount = billingEntry.totalAmount ? Number(billingEntry.totalAmount) : 0;
    if (amount <= 0) {
      throw new BadRequestException('Valor da fatura inválido.');
    }

    const userId = (await this.prisma.user.findFirst({ where: { tenantId, email: userEmail }, select: { id: true } }))!.id;

    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      billingEntryId: dto.billingEntryId,
      patientId,
      tenantId,
      amount,
      paymentMethod: dto.paymentMethod,
      status: 'PENDING',
      cpf: dto.cpf,
      createdAt: new Date().toISOString(),
    };

    // Generate PIX code or boleto URL (simulated)
    if (dto.paymentMethod === 'PIX') {
      payment.pixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}`;
    } else if (dto.paymentMethod === 'BOLETO') {
      payment.boletoUrl = `https://boleto.voxpep.com/${payment.id}`;
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `PAYMENT: R$ ${amount.toFixed(2)} — ${dto.paymentMethod}`,
        content: JSON.stringify(payment),
        status: 'DRAFT',
      },
    });

    return {
      paymentId: doc.id,
      amount,
      paymentMethod: dto.paymentMethod,
      status: 'PENDING',
      pixCode: payment.pixCode,
      boletoUrl: payment.boletoUrl,
    };
  }

  async listPayments(tenantId: string, userEmail: string, options: { page?: number; pageSize?: number }) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      patientId,
      type: 'CUSTOM' as const,
      title: { startsWith: 'PAYMENT:' },
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const payments = docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as PaymentRecord;
      return {
        paymentId: d.id,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      };
    });

    return { data: payments, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPaymentDetail(tenantId: string, userEmail: string, paymentId: string) {
    await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: paymentId, tenantId, type: 'CUSTOM', title: { startsWith: 'PAYMENT:' } },
    });
    if (!doc) throw new NotFoundException('Pagamento não encontrado.');

    const payment = JSON.parse(doc.content ?? '{}') as PaymentRecord;
    return { paymentId: doc.id, ...payment };
  }

  async setupInstallments(tenantId: string, userEmail: string, paymentId: string, dto: SetupInstallmentsDto) {
    await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: paymentId, tenantId, type: 'CUSTOM', title: { startsWith: 'PAYMENT:' } },
    });
    if (!doc) throw new NotFoundException('Pagamento não encontrado.');

    const payment = JSON.parse(doc.content ?? '{}') as PaymentRecord;
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Pagamento já processado, não é possível parcelar.');
    }

    const installmentAmount = Math.round((payment.amount / dto.installments) * 100) / 100;
    const firstDue = dto.firstDueDate ? new Date(dto.firstDueDate) : new Date();

    payment.installments = Array.from({ length: dto.installments }, (_, i) => {
      const dueDate = new Date(firstDue);
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        number: i + 1,
        amount: i === dto.installments - 1
          ? Math.round((payment.amount - installmentAmount * (dto.installments - 1)) * 100) / 100
          : installmentAmount,
        dueDate: dueDate.toISOString(),
        status: 'PENDING',
      };
    });

    await this.prisma.clinicalDocument.update({
      where: { id: paymentId },
      data: { content: JSON.stringify(payment) },
    });

    return { paymentId, installments: payment.installments };
  }

  async generatePixQrCode(tenantId: string, userEmail: string, dto: GeneratePixDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const billingEntry = await this.prisma.billingEntry.findFirst({
      where: { id: dto.billingEntryId, tenantId, patientId },
    });
    if (!billingEntry) {
      throw new NotFoundException('Fatura não encontrada.');
    }

    const amount = billingEntry.totalAmount ? Number(billingEntry.totalAmount) : 0;
    if (amount <= 0) {
      throw new BadRequestException('Valor da fatura inválido.');
    }

    // Generate PIX EMV code (production: call PSP API)
    const txId = crypto.randomUUID().replace(/-/g, '').substring(0, 25);
    const pixCopiaECola = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865802BR5913VoxPEP Saude6012SAO PAULO62070503***6304`;
    const qrImageUrl = `https://api.voxpep.com/pix/qr/${txId}.png`;

    return {
      amount,
      pixCopiaECola,
      qrImageUrl,
      txId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };
  }

  async processPaymentWebhook(tenantId: string, dto: PaymentWebhookDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.paymentId, tenantId, type: 'CUSTOM', title: { startsWith: 'PAYMENT:' } },
    });
    if (!doc) throw new NotFoundException('Pagamento não encontrado.');

    const payment = JSON.parse(doc.content ?? '{}') as PaymentRecord;
    payment.status = dto.status;
    if (dto.status === 'PAID') {
      payment.paidAt = dto.paidAt ?? new Date().toISOString();
    }

    await this.prisma.clinicalDocument.update({
      where: { id: dto.paymentId },
      data: {
        content: JSON.stringify(payment),
        status: dto.status === 'PAID' ? 'SIGNED' : 'DRAFT',
      },
    });

    return { paymentId: dto.paymentId, status: dto.status, processed: true };
  }

  async getReceipt(tenantId: string, userEmail: string, paymentId: string) {
    await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: paymentId, tenantId, type: 'CUSTOM', title: { startsWith: 'PAYMENT:' } },
    });
    if (!doc) throw new NotFoundException('Pagamento não encontrado.');

    const payment = JSON.parse(doc.content ?? '{}') as PaymentRecord;
    if (payment.status !== 'PAID') {
      throw new BadRequestException('Comprovante disponível apenas para pagamentos confirmados.');
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: payment.patientId, tenantId },
      select: { fullName: true, cpf: true },
    });

    return {
      receiptId: crypto.randomUUID(),
      paymentId,
      patientName: patient?.fullName,
      cpf: payment.cpf ?? patient?.cpf,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      installments: payment.installments,
    };
  }
}
