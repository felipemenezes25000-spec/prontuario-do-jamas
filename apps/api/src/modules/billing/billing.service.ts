import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
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

  async findByTenant(tenantId: string, pagination: PaginationQueryDto) {
    const where = { tenantId };

    const [data, total] = await Promise.all([
      this.prisma.billingEntry.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
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
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
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
