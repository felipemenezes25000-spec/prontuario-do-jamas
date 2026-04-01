import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateComplaintDto,
  RespondComplaintDto,
  TicketStatus,
} from './ombudsman.dto';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface OmbudsmanTicket {
  id: string;
  ticketNumber: string;
  type: string;
  subject: string;
  description: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  department: string | null;
  isAnonymous: boolean;
  status: string;
  slaDeadline: string;
  responses: Array<{ response: string; respondedBy: string; respondedAt: string; newStatus: string }>;
  createdAt: Date;
}

export interface OmbudsmanDashboard {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  slaCompliancePct: number;
  byType: Array<{ type: string; count: number }>;
  byDepartment: Array<{ department: string; count: number }>;
  avgResolutionDays: number;
  monthlyTrend: Array<{ month: string; count: number }>;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class OmbudsmanService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OUV-${year}-`;

    const lastTicket = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `[OMBUDSMAN] ${prefix}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextNum = 1;
    if (lastTicket) {
      const match = lastTicket.title.match(/OUV-\d{4}-(\d{4})/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async createTicket(
    tenantId: string,
    authorId: string,
    dto: CreateComplaintDto,
  ): Promise<OmbudsmanTicket> {
    const ticketNumber = await this.generateTicketNumber(tenantId);

    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 7); // 7-day SLA

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[OMBUDSMAN] ${ticketNumber} - ${dto.subject}`,
        content: JSON.stringify({
          ticketNumber,
          type: dto.type,
          subject: dto.subject,
          description: dto.description,
          contactName: dto.isAnonymous ? null : (dto.contactName ?? null),
          contactPhone: dto.isAnonymous ? null : (dto.contactPhone ?? null),
          contactEmail: dto.isAnonymous ? null : (dto.contactEmail ?? null),
          department: dto.department ?? null,
          isAnonymous: dto.isAnonymous,
          status: TicketStatus.OPEN,
          slaDeadline: slaDeadline.toISOString(),
          responses: [],
          createdAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return this.parseTicket(doc);
  }

  async listTickets(
    tenantId: string,
    filters?: {
      type?: string;
      status?: string;
      department?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const whereConditions: Array<{ title?: { startsWith: string }; content?: { contains: string } }> = [];

    if (filters?.type) {
      whereConditions.push({ content: { contains: `"type":"${filters.type}"` } });
    }
    if (filters?.status) {
      whereConditions.push({ content: { contains: `"status":"${filters.status}"` } });
    }
    if (filters?.department) {
      whereConditions.push({ content: { contains: filters.department } });
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[OMBUDSMAN]' },
          ...(whereConditions.length > 0 ? { AND: whereConditions } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: '[OMBUDSMAN]' },
          ...(whereConditions.length > 0 ? { AND: whereConditions } : {}),
        },
      }),
    ]);

    return {
      data: docs.map((doc) => this.parseTicket(doc)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async respondTicket(
    tenantId: string,
    ticketId: string,
    authorId: string,
    dto: RespondComplaintDto,
  ): Promise<OmbudsmanTicket> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: ticketId, tenantId, title: { startsWith: '[OMBUDSMAN]' } },
    });

    if (!doc) {
      throw new NotFoundException(`Ticket com ID "${ticketId}" não encontrado.`);
    }

    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    const responses = (content['responses'] ?? []) as Array<Record<string, string>>;

    responses.push({
      response: dto.response,
      respondedBy: authorId,
      respondedAt: new Date().toISOString(),
      newStatus: dto.status,
    });

    content['responses'] = responses;
    content['status'] = dto.status;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: ticketId },
      data: {
        content: JSON.stringify(content),
      },
    });

    return this.parseTicket(updated);
  }

  async getDashboard(tenantId: string): Promise<OmbudsmanDashboard> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const allDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[OMBUDSMAN]' },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = allDocs.map((doc) => {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...content, createdAt: doc.createdAt };
      return merged;
    });

    const typeCounts = new Map<string, number>();
    const deptCounts = new Map<string, number>();
    const monthCounts = new Map<string, number>();
    let openCount = 0;
    let resolvedCount = 0;
    let slaCompliantCount = 0;
    let totalResolutionDays = 0;
    let resolvedWithTimeCount = 0;

    // Initialize months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(key, 0);
    }

    for (const ticket of tickets) {
      const type = String(ticket['type'] ?? 'COMPLAINT');
      const status = String(ticket['status'] ?? 'OPEN');
      const dept = String(ticket['department'] ?? 'Geral');
      const slaDeadline = ticket['slaDeadline'] ? new Date(String(ticket['slaDeadline'])) : null;

      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);

      if (status === 'OPEN' || status === 'IN_PROGRESS' || status === 'FORWARDED') {
        openCount++;
      }
      if (status === 'RESOLVED' || status === 'CLOSED') {
        resolvedCount++;
        const responses = (ticket['responses'] ?? []) as Array<Record<string, string>>;
        if (responses.length > 0) {
          const lastResponse = responses[responses.length - 1];
          const resolvedAt = lastResponse ? new Date(String(lastResponse['respondedAt'])) : null;
          const createdAt = ticket['createdAt'] as Date;
          if (resolvedAt && createdAt) {
            const days = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            totalResolutionDays += days;
            resolvedWithTimeCount++;
            if (slaDeadline && resolvedAt <= slaDeadline) {
              slaCompliantCount++;
            }
          }
        }
      }

      const createdAt = ticket['createdAt'] as Date;
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
      }
    }

    const totalResolved = resolvedCount || 1;

    return {
      totalTickets: tickets.length,
      openTickets: openCount,
      resolvedTickets: resolvedCount,
      slaCompliancePct: Math.round((slaCompliantCount / totalResolved) * 100),
      byType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
      byDepartment: Array.from(deptCounts.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count),
      avgResolutionDays: resolvedWithTimeCount > 0
        ? Math.round((totalResolutionDays / resolvedWithTimeCount) * 10) / 10
        : 0,
      monthlyTrend: Array.from(monthCounts.entries()).map(([month, count]) => ({ month, count })),
    };
  }

  async generateReport(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[OMBUDSMAN]' },
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tickets = docs.map((doc) => this.parseTicket(doc));

    const byType = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const t of tickets) {
      byType.set(t.type, (byType.get(t.type) ?? 0) + 1);
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    }

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalTickets: tickets.length,
      byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      tickets,
    };
  }

  private parseTicket(doc: { id: string; content: string | null; createdAt: Date }): OmbudsmanTicket {
    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      ticketNumber: String(content['ticketNumber'] ?? ''),
      type: String(content['type'] ?? ''),
      subject: String(content['subject'] ?? ''),
      description: String(content['description'] ?? ''),
      contactName: content['contactName'] ? String(content['contactName']) : null,
      contactPhone: content['contactPhone'] ? String(content['contactPhone']) : null,
      contactEmail: content['contactEmail'] ? String(content['contactEmail']) : null,
      department: content['department'] ? String(content['department']) : null,
      isAnonymous: Boolean(content['isAnonymous']),
      status: String(content['status'] ?? 'OPEN'),
      slaDeadline: String(content['slaDeadline'] ?? ''),
      responses: (content['responses'] ?? []) as OmbudsmanTicket['responses'],
      createdAt: doc.createdAt,
    };
  }
}
