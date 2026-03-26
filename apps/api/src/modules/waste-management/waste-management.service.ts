import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  RegisterWasteDto,
  WeighingRecordDto,
  DisposalRecordDto,
  WasteGroup,
} from './waste-management.dto';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface WasteRecord {
  id: string;
  wasteGroup: string;
  source: string;
  weight: number;
  containerId: string | null;
  description: string;
  status: string;
  createdAt: Date;
}

interface WeighingRecord {
  id: string;
  containerId: string;
  grossWeight: number;
  netWeight: number;
  weighedBy: string;
  createdAt: Date;
}

interface DisposalRecord {
  id: string;
  manifestId: string;
  transportCompany: string;
  driverName: string;
  vehiclePlate: string;
  disposalMethod: string;
  certificateNumber: string | null;
  status: string;
  createdAt: Date;
}

interface WasteDashboard {
  totalKgByGroup: Array<{ group: string; kg: number }>;
  monthlyTrend: Array<{ month: string; kg: number }>;
  estimatedMonthlyCost: number;
  pendingDisposals: number;
  totalRecordsThisMonth: number;
}

// ─── Waste Group Labels ─────────────────────────────────────────────────────

const WASTE_GROUP_LABELS: Record<string, string> = {
  A1: 'A1 - Culturas e estoques de microrganismos',
  A2: 'A2 - Carcaças e peças anatômicas (animais)',
  A3: 'A3 - Peças anatômicas humanas',
  A4: 'A4 - Kits de linhas arteriais e filtros',
  A5: 'A5 - Órgãos, tecidos e fluidos com prions',
  B: 'B - Químicos',
  C: 'C - Radioativos',
  D: 'D - Comuns (recicláveis/não recicláveis)',
  E: 'E - Perfurocortantes',
};

// Cost estimates per kg (BRL) by group
const COST_PER_KG: Record<string, number> = {
  A1: 4.5,
  A2: 4.5,
  A3: 6.0,
  A4: 3.0,
  A5: 8.0,
  B: 5.5,
  C: 12.0,
  D: 0.5,
  E: 5.0,
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class WasteManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async registerWaste(
    tenantId: string,
    authorId: string,
    dto: RegisterWasteDto,
  ): Promise<WasteRecord> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000', // system record
        authorId,
        type: 'CUSTOM',
        title: `[PGRSS_WASTE] ${dto.wasteGroup} - ${dto.source}`,
        content: JSON.stringify({
          wasteGroup: dto.wasteGroup,
          wasteGroupLabel: WASTE_GROUP_LABELS[dto.wasteGroup] ?? dto.wasteGroup,
          source: dto.source,
          weight: dto.weight,
          containerId: dto.containerId ?? null,
          description: dto.description,
          status: 'PENDING_WEIGHING',
          registeredAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      wasteGroup: String(content['wasteGroup'] ?? ''),
      source: String(content['source'] ?? ''),
      weight: Number(content['weight'] ?? 0),
      containerId: content['containerId'] ? String(content['containerId']) : null,
      description: String(content['description'] ?? ''),
      status: String(content['status'] ?? ''),
      createdAt: doc.createdAt,
    };
  }

  async recordWeighing(
    tenantId: string,
    authorId: string,
    dto: WeighingRecordDto,
  ): Promise<WeighingRecord> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[PGRSS_WEIGHING] ${dto.containerId}`,
        content: JSON.stringify({
          containerId: dto.containerId,
          grossWeight: dto.grossWeight,
          netWeight: dto.netWeight,
          weighedBy: dto.weighedBy,
          weighedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      containerId: String(content['containerId'] ?? ''),
      grossWeight: Number(content['grossWeight'] ?? 0),
      netWeight: Number(content['netWeight'] ?? 0),
      weighedBy: String(content['weighedBy'] ?? ''),
      createdAt: doc.createdAt,
    };
  }

  async recordDisposal(
    tenantId: string,
    authorId: string,
    dto: DisposalRecordDto,
  ): Promise<DisposalRecord> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[PGRSS_DISPOSAL] ${dto.manifestId}`,
        content: JSON.stringify({
          manifestId: dto.manifestId,
          transportCompany: dto.transportCompany,
          driverName: dto.driverName,
          vehiclePlate: dto.vehiclePlate,
          disposalMethod: dto.disposalMethod,
          certificateNumber: dto.certificateNumber ?? null,
          status: dto.certificateNumber ? 'CERTIFIED' : 'PENDING_CERTIFICATE',
          disposedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      manifestId: String(content['manifestId'] ?? ''),
      transportCompany: String(content['transportCompany'] ?? ''),
      driverName: String(content['driverName'] ?? ''),
      vehiclePlate: String(content['vehiclePlate'] ?? ''),
      disposalMethod: String(content['disposalMethod'] ?? ''),
      certificateNumber: content['certificateNumber'] ? String(content['certificateNumber']) : null,
      status: String(content['status'] ?? ''),
      createdAt: doc.createdAt,
    };
  }

  async getDashboard(tenantId: string): Promise<WasteDashboard> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const allWasteDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PGRSS_WASTE]' },
        createdAt: { gte: twelveMonthsAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingDisposalDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PGRSS_DISPOSAL]' },
        content: { contains: 'PENDING_CERTIFICATE' },
      },
    });

    // Aggregate by group
    const groupTotals = new Map<string, number>();
    const monthTotals = new Map<string, number>();
    let thisMonthCount = 0;

    // Initialize months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthTotals.set(key, 0);
    }

    for (const doc of allWasteDocs) {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      const group = String(content['wasteGroup'] ?? 'D');
      const weight = Number(content['weight'] ?? 0);

      groupTotals.set(group, (groupTotals.get(group) ?? 0) + weight);

      const monthKey = `${doc.createdAt.getFullYear()}-${String(doc.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthTotals.has(monthKey)) {
        monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + weight);
      }

      if (doc.createdAt >= startOfMonth) {
        thisMonthCount++;
      }
    }

    // Calculate estimated cost
    let estimatedMonthlyCost = 0;
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    for (const doc of allWasteDocs) {
      const createdKey = `${doc.createdAt.getFullYear()}-${String(doc.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (createdKey === currentMonthKey) {
        const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
        const group = String(content['wasteGroup'] ?? 'D');
        const weight = Number(content['weight'] ?? 0);
        estimatedMonthlyCost += weight * (COST_PER_KG[group] ?? 1);
      }
    }

    return {
      totalKgByGroup: Object.values(WasteGroup).map((g) => ({
        group: g,
        kg: Math.round((groupTotals.get(g) ?? 0) * 100) / 100,
      })).filter((item) => item.kg > 0),
      monthlyTrend: Array.from(monthTotals.entries()).map(([month, kg]) => ({
        month,
        kg: Math.round(kg * 100) / 100,
      })),
      estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
      pendingDisposals: pendingDisposalDocs.length,
      totalRecordsThisMonth: thisMonthCount,
    };
  }

  async getMonthlyReport(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const wasteDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PGRSS_WASTE]' },
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const disposalDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PGRSS_DISPOSAL]' },
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const wasteRecords = wasteDocs.map((doc) => {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        id: doc.id,
        wasteGroup: String(content['wasteGroup'] ?? ''),
        source: String(content['source'] ?? ''),
        weight: Number(content['weight'] ?? 0),
        description: String(content['description'] ?? ''),
        date: doc.createdAt,
      };
    });

    const disposalRecords = disposalDocs.map((doc) => {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        id: doc.id,
        manifestId: String(content['manifestId'] ?? ''),
        transportCompany: String(content['transportCompany'] ?? ''),
        disposalMethod: String(content['disposalMethod'] ?? ''),
        certificateNumber: content['certificateNumber'] ? String(content['certificateNumber']) : null,
        date: doc.createdAt,
      };
    });

    const totalByGroup = new Map<string, number>();
    for (const r of wasteRecords) {
      totalByGroup.set(r.wasteGroup, (totalByGroup.get(r.wasteGroup) ?? 0) + r.weight);
    }

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      wasteRecords,
      disposalRecords,
      summary: Array.from(totalByGroup.entries()).map(([group, kg]) => ({
        group,
        totalKg: Math.round(kg * 100) / 100,
        label: WASTE_GROUP_LABELS[group] ?? group,
      })),
      totalWasteKg: Math.round(wasteRecords.reduce((sum, r) => sum + r.weight, 0) * 100) / 100,
      totalDisposals: disposalRecords.length,
    };
  }

  async listPendingDisposals(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PGRSS_WASTE]' },
        content: { contains: 'PENDING' },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((doc) => {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      return {
        id: doc.id,
        wasteGroup: String(content['wasteGroup'] ?? ''),
        source: String(content['source'] ?? ''),
        weight: Number(content['weight'] ?? 0),
        containerId: content['containerId'] ? String(content['containerId']) : null,
        description: String(content['description'] ?? ''),
        status: String(content['status'] ?? ''),
        registeredAt: doc.createdAt,
      };
    });
  }
}
