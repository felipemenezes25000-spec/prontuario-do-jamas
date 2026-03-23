import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { BillingStatus } from '@prisma/client';

@Injectable()
export class BillingService {
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
}
