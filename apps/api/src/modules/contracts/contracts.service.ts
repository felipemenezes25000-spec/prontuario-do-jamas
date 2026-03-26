import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContractDto,
  RenewContractDto,
  ContractStatus,
} from './contracts.dto';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Contract {
  id: string;
  contractNumber: string;
  type: string;
  counterparty: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  autoRenew: boolean;
  slaTerms: string | null;
  paymentTerms: string;
  status: string;
  renewalHistory: Array<{ date: string; newEndDate: string; newValue: number; adjustmentPct: number }>;
  createdAt: Date;
}

interface ContractsDashboard {
  activeContracts: number;
  totalCommittedValue: number;
  expiringSoon30: number;
  expiringSoon60: number;
  expiringSoon90: number;
  byType: Array<{ type: string; count: number; totalValue: number }>;
  expiringList: Array<{ id: string; contractNumber: string; counterparty: string; endDate: string; daysRemaining: number }>;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CTR-${year}-`;

    const lastContract = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `[CONTRACT] ${prefix}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextNum = 1;
    if (lastContract) {
      const match = lastContract.title.match(/CTR-\d{4}-(\d{4})/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async createContract(
    tenantId: string,
    authorId: string,
    dto: CreateContractDto,
  ): Promise<Contract> {
    const contractNumber = await this.generateContractNumber(tenantId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[CONTRACT] ${contractNumber} - ${dto.counterparty}`,
        content: JSON.stringify({
          contractNumber,
          type: dto.type,
          counterparty: dto.counterparty,
          description: dto.description,
          startDate: dto.startDate,
          endDate: dto.endDate,
          value: dto.value,
          autoRenew: dto.autoRenew,
          slaTerms: dto.slaTerms ?? null,
          paymentTerms: dto.paymentTerms,
          status: ContractStatus.ACTIVE,
          renewalHistory: [],
        }),
        status: 'FINAL',
      },
    });

    return this.parseContract(doc);
  }

  async listContracts(
    tenantId: string,
    filters?: { type?: string; status?: string; expiring?: boolean; page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const contentFilters: Array<{ content: { contains: string } }> = [];
    if (filters?.type) {
      contentFilters.push({ content: { contains: `"type":"${filters.type}"` } });
    }
    if (filters?.status) {
      contentFilters.push({ content: { contains: `"status":"${filters.status}"` } });
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[CONTRACT]' },
          ...(contentFilters.length > 0 ? { AND: contentFilters } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: '[CONTRACT]' },
          ...(contentFilters.length > 0 ? { AND: contentFilters } : {}),
        },
      }),
    ]);

    let contracts = docs.map((doc) => this.parseContract(doc));

    // Filter expiring if needed
    if (filters?.expiring) {
      const now = new Date();
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      contracts = contracts.filter((c) => {
        const endDate = new Date(c.endDate);
        return endDate <= ninetyDaysFromNow && endDate >= now && c.status === ContractStatus.ACTIVE;
      });
    }

    return {
      data: contracts,
      total: filters?.expiring ? contracts.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((filters?.expiring ? contracts.length : total) / pageSize),
    };
  }

  async getContract(tenantId: string, contractId: string): Promise<Contract> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: contractId, tenantId, title: { startsWith: '[CONTRACT]' } },
    });

    if (!doc) {
      throw new NotFoundException(`Contrato com ID "${contractId}" não encontrado.`);
    }

    return this.parseContract(doc);
  }

  async renewContract(
    tenantId: string,
    contractId: string,
    dto: RenewContractDto,
  ): Promise<Contract> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: contractId, tenantId, title: { startsWith: '[CONTRACT]' } },
    });

    if (!doc) {
      throw new NotFoundException(`Contrato com ID "${contractId}" não encontrado.`);
    }

    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    const currentValue = Number(content['value'] ?? 0);
    const adjustmentPct = dto.adjustmentPct ?? 0;
    const newValue = dto.newValue ?? Math.round(currentValue * (1 + adjustmentPct / 100) * 100) / 100;

    const history = (content['renewalHistory'] ?? []) as Array<Record<string, unknown>>;
    history.push({
      date: new Date().toISOString(),
      previousEndDate: content['endDate'],
      newEndDate: dto.newEndDate,
      previousValue: currentValue,
      newValue,
      adjustmentPct,
    });

    content['endDate'] = dto.newEndDate;
    content['value'] = newValue;
    content['status'] = ContractStatus.RENEWED;
    content['renewalHistory'] = history;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: contractId },
      data: { content: JSON.stringify(content) },
    });

    return this.parseContract(updated);
  }

  async getExpiringContracts(tenantId: string, days: number = 90) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[CONTRACT]' },
        content: { contains: `"status":"${ContractStatus.ACTIVE}"` },
      },
      orderBy: { createdAt: 'desc' },
    });

    const expiring: Array<{
      id: string;
      contractNumber: string;
      counterparty: string;
      type: string;
      endDate: string;
      value: number;
      daysRemaining: number;
      autoRenew: boolean;
    }> = [];

    for (const doc of docs) {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      const endDate = new Date(String(content['endDate'] ?? ''));

      if (endDate >= now && endDate <= futureDate) {
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expiring.push({
          id: doc.id,
          contractNumber: String(content['contractNumber'] ?? ''),
          counterparty: String(content['counterparty'] ?? ''),
          type: String(content['type'] ?? ''),
          endDate: String(content['endDate'] ?? ''),
          value: Number(content['value'] ?? 0),
          daysRemaining,
          autoRenew: Boolean(content['autoRenew']),
        });
      }
    }

    return expiring.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  async getDashboard(tenantId: string): Promise<ContractsDashboard> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[CONTRACT]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let activeCount = 0;
    let totalValue = 0;
    let exp30 = 0;
    let exp60 = 0;
    let exp90 = 0;
    const typeTotals = new Map<string, { count: number; value: number }>();
    const expiringList: ContractsDashboard['expiringList'] = [];

    for (const doc of docs) {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      const status = String(content['status'] ?? '');
      const type = String(content['type'] ?? '');
      const value = Number(content['value'] ?? 0);
      const endDate = new Date(String(content['endDate'] ?? ''));

      if (status === ContractStatus.ACTIVE || status === ContractStatus.RENEWED) {
        activeCount++;
        totalValue += value;

        const existing = typeTotals.get(type) ?? { count: 0, value: 0 };
        typeTotals.set(type, { count: existing.count + 1, value: existing.value + value });

        if (endDate >= now && endDate <= ninetyDays) {
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          expiringList.push({
            id: doc.id,
            contractNumber: String(content['contractNumber'] ?? ''),
            counterparty: String(content['counterparty'] ?? ''),
            endDate: String(content['endDate'] ?? ''),
            daysRemaining,
          });

          if (endDate <= thirtyDays) exp30++;
          if (endDate <= sixtyDays) exp60++;
          exp90++;
        }
      }
    }

    return {
      activeContracts: activeCount,
      totalCommittedValue: Math.round(totalValue * 100) / 100,
      expiringSoon30: exp30,
      expiringSoon60: exp60,
      expiringSoon90: exp90,
      byType: Array.from(typeTotals.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        totalValue: Math.round(data.value * 100) / 100,
      })),
      expiringList: expiringList.sort((a, b) => a.daysRemaining - b.daysRemaining),
    };
  }

  private parseContract(doc: { id: string; content: string | null; createdAt: Date }): Contract {
    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      contractNumber: String(content['contractNumber'] ?? ''),
      type: String(content['type'] ?? ''),
      counterparty: String(content['counterparty'] ?? ''),
      description: String(content['description'] ?? ''),
      startDate: String(content['startDate'] ?? ''),
      endDate: String(content['endDate'] ?? ''),
      value: Number(content['value'] ?? 0),
      autoRenew: Boolean(content['autoRenew']),
      slaTerms: content['slaTerms'] ? String(content['slaTerms']) : null,
      paymentTerms: String(content['paymentTerms'] ?? ''),
      status: String(content['status'] ?? ''),
      renewalHistory: (content['renewalHistory'] ?? []) as Contract['renewalHistory'],
      createdAt: doc.createdAt,
    };
  }
}
