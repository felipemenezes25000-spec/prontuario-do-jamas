import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRequisitionDto,
  CreateQuotationDto,
  ApproveQuotationDto,
  CreatePurchaseOrderDto,
  RecordDeliveryDto,
  RequisitionStatus,
} from './procurement.dto';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface Requisition {
  id: string;
  requisitionNumber: string;
  items: Array<{ itemName: string; quantity: number; unit: string; specification: string; urgency: string }>;
  requestedBy: string;
  department: string;
  justification: string;
  status: string;
  createdAt: Date;
}

export interface Quotation {
  id: string;
  requisitionId: string;
  supplierName: string;
  items: Array<{ itemName: string; unitPrice: number; quantity: number; totalPrice: number }>;
  totalValue: number;
  deliveryDays: number;
  paymentTerms: string;
  validUntil: string;
  approved: boolean;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  quotationId: string;
  supplierName: string;
  totalValue: number;
  status: string;
  createdAt: Date;
}

export interface ProcurementDashboard {
  openRequisitions: number;
  pendingApprovals: number;
  totalSpendThisMonth: number;
  savingsThisMonth: number;
  recentRequisitions: Requisition[];
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateRequisitionNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const lastReq = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `[PROCUREMENT_REQ] ${prefix}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextNum = 1;
    if (lastReq) {
      const match = lastReq.title.match(/REQ-\d{4}-(\d{4})/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  private async generatePONumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastPO = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `[PROCUREMENT_PO] ${prefix}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextNum = 1;
    if (lastPO) {
      const match = lastPO.title.match(/PO-\d{4}-(\d{4})/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async createRequisition(
    tenantId: string,
    authorId: string,
    dto: CreateRequisitionDto,
  ): Promise<Requisition> {
    const reqNumber = await this.generateRequisitionNumber(tenantId);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[PROCUREMENT_REQ] ${reqNumber} - ${dto.department}`,
        content: JSON.stringify({
          requisitionNumber: reqNumber,
          items: dto.items,
          requestedBy: dto.requestedBy,
          department: dto.department,
          justification: dto.justification,
          status: RequisitionStatus.PENDING_QUOTATION,
        }),
        status: 'FINAL',
      },
    });

    return this.parseRequisition(doc);
  }

  async listRequisitions(
    tenantId: string,
    filters?: { status?: string; department?: string; page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const contentFilters: Array<{ content: { contains: string } }> = [];
    if (filters?.status) {
      contentFilters.push({ content: { contains: `"status":"${filters.status}"` } });
    }
    if (filters?.department) {
      contentFilters.push({ content: { contains: filters.department } });
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[PROCUREMENT_REQ]' },
          ...(contentFilters.length > 0 ? { AND: contentFilters } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: '[PROCUREMENT_REQ]' },
          ...(contentFilters.length > 0 ? { AND: contentFilters } : {}),
        },
      }),
    ]);

    return {
      data: docs.map((doc) => this.parseRequisition(doc)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createQuotation(
    tenantId: string,
    authorId: string,
    dto: CreateQuotationDto,
  ): Promise<Quotation> {
    // Verify requisition exists
    const reqDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.requisitionId, tenantId, title: { startsWith: '[PROCUREMENT_REQ]' } },
    });

    if (!reqDoc) {
      throw new NotFoundException(`Requisição com ID "${dto.requisitionId}" não encontrada.`);
    }

    // Update requisition status to QUOTING
    const reqContent = JSON.parse(reqDoc.content ?? '{}') as Record<string, unknown>;
    if (reqContent['status'] === RequisitionStatus.PENDING_QUOTATION) {
      reqContent['status'] = RequisitionStatus.QUOTING;
      await this.prisma.clinicalDocument.update({
        where: { id: dto.requisitionId },
        data: { content: JSON.stringify(reqContent) },
      });
    }

    const totalValue = dto.items.reduce((sum, item) => sum + item.totalPrice, 0);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[PROCUREMENT_QUOT] ${dto.supplierName} - REQ:${dto.requisitionId.slice(0, 8)}`,
        content: JSON.stringify({
          requisitionId: dto.requisitionId,
          supplierName: dto.supplierName,
          items: dto.items,
          totalValue,
          deliveryDays: dto.deliveryDays,
          paymentTerms: dto.paymentTerms,
          validUntil: dto.validUntil,
          approved: false,
        }),
        status: 'FINAL',
      },
    });

    return this.parseQuotation(doc);
  }

  async compareQuotations(tenantId: string, requisitionId: string) {
    const quotDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[PROCUREMENT_QUOT]' },
        content: { contains: requisitionId },
      },
      orderBy: { createdAt: 'asc' },
    });

    const quotations = quotDocs.map((doc) => this.parseQuotation(doc));

    // Rank by total value (ascending)
    const ranked = [...quotations].sort((a, b) => a.totalValue - b.totalValue);

    const lowestPrice = ranked[0]?.totalValue ?? 0;
    const highestPrice = ranked[ranked.length - 1]?.totalValue ?? 0;
    const potentialSavings = highestPrice - lowestPrice;

    return {
      requisitionId,
      quotations: ranked.map((q, index) => ({
        ...q,
        rank: index + 1,
        priceDiffFromLowest: Math.round((q.totalValue - lowestPrice) * 100) / 100,
      })),
      summary: {
        totalQuotations: quotations.length,
        lowestPrice: Math.round(lowestPrice * 100) / 100,
        highestPrice: Math.round(highestPrice * 100) / 100,
        potentialSavings: Math.round(potentialSavings * 100) / 100,
      },
    };
  }

  async approveQuotation(
    tenantId: string,
    authorId: string,
    dto: ApproveQuotationDto,
  ): Promise<Quotation> {
    const quotDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.quotationId, tenantId, title: { startsWith: '[PROCUREMENT_QUOT]' } },
    });

    if (!quotDoc) {
      throw new NotFoundException(`Cotação com ID "${dto.quotationId}" não encontrada.`);
    }

    const content = JSON.parse(quotDoc.content ?? '{}') as Record<string, unknown>;
    if (content['approved'] === true) {
      throw new BadRequestException('Cotação já foi aprovada.');
    }

    content['approved'] = true;
    content['approvedBy'] = dto.approvedBy;
    content['approvedAt'] = new Date().toISOString();
    content['approvalNotes'] = dto.notes ?? null;

    // Update requisition status
    const requisitionId = String(content['requisitionId'] ?? '');
    if (requisitionId) {
      const reqDoc = await this.prisma.clinicalDocument.findFirst({
        where: { id: requisitionId, tenantId },
      });
      if (reqDoc) {
        const reqContent = JSON.parse(reqDoc.content ?? '{}') as Record<string, unknown>;
        reqContent['status'] = RequisitionStatus.APPROVED;
        await this.prisma.clinicalDocument.update({
          where: { id: requisitionId },
          data: { content: JSON.stringify(reqContent) },
        });
      }
    }

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: dto.quotationId },
      data: { content: JSON.stringify(content) },
    });

    return this.parseQuotation(updated);
  }

  async createPurchaseOrder(
    tenantId: string,
    authorId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const quotDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.quotationId, tenantId, title: { startsWith: '[PROCUREMENT_QUOT]' } },
    });

    if (!quotDoc) {
      throw new NotFoundException(`Cotação com ID "${dto.quotationId}" não encontrada.`);
    }

    const quotContent = JSON.parse(quotDoc.content ?? '{}') as Record<string, unknown>;
    if (quotContent['approved'] !== true) {
      throw new BadRequestException('Cotação precisa estar aprovada para gerar pedido de compra.');
    }

    const poNumber = await this.generatePONumber(tenantId);

    // Update requisition status
    const requisitionId = String(quotContent['requisitionId'] ?? '');
    if (requisitionId) {
      const reqDoc = await this.prisma.clinicalDocument.findFirst({
        where: { id: requisitionId, tenantId },
      });
      if (reqDoc) {
        const reqContent = JSON.parse(reqDoc.content ?? '{}') as Record<string, unknown>;
        reqContent['status'] = RequisitionStatus.ORDERED;
        await this.prisma.clinicalDocument.update({
          where: { id: requisitionId },
          data: { content: JSON.stringify(reqContent) },
        });
      }
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: '00000000-0000-0000-0000-000000000000',
        authorId,
        type: 'CUSTOM',
        title: `[PROCUREMENT_PO] ${poNumber}`,
        content: JSON.stringify({
          poNumber,
          quotationId: dto.quotationId,
          supplierName: String(quotContent['supplierName'] ?? ''),
          totalValue: Number(quotContent['totalValue'] ?? 0),
          items: quotContent['items'],
          status: 'ORDERED',
          orderedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });

    return this.parsePurchaseOrder(doc);
  }

  async recordDelivery(
    tenantId: string,
    authorId: string,
    dto: RecordDeliveryDto,
  ) {
    const poDoc = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.purchaseOrderId, tenantId, title: { startsWith: '[PROCUREMENT_PO]' } },
    });

    if (!poDoc) {
      throw new NotFoundException(`Pedido de compra com ID "${dto.purchaseOrderId}" não encontrado.`);
    }

    const content = JSON.parse(poDoc.content ?? '{}') as Record<string, unknown>;
    content['status'] = 'DELIVERED';
    content['deliveredAt'] = new Date().toISOString();
    content['receivedBy'] = dto.receivedBy;
    content['deliveryNotes'] = dto.notes ?? null;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: dto.purchaseOrderId },
      data: { content: JSON.stringify(content) },
    });

    return this.parsePurchaseOrder(updated);
  }

  async getDashboard(tenantId: string): Promise<ProcurementDashboard> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [reqDocs, poDocs] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: { tenantId, title: { startsWith: '[PROCUREMENT_REQ]' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[PROCUREMENT_PO]' },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    let openReqs = 0;
    let pendingApprovals = 0;
    const recentReqs: Requisition[] = [];

    for (const doc of reqDocs) {
      const req = this.parseRequisition(doc);
      if (recentReqs.length < 10) {
        recentReqs.push(req);
      }
      const status = req.status;
      if (status !== RequisitionStatus.DELIVERED && status !== RequisitionStatus.CANCELLED) {
        openReqs++;
      }
      if (status === RequisitionStatus.QUOTING) {
        pendingApprovals++;
      }
    }

    let totalSpend = 0;
    for (const doc of poDocs) {
      const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
      totalSpend += Number(content['totalValue'] ?? 0);
    }

    return {
      openRequisitions: openReqs,
      pendingApprovals,
      totalSpendThisMonth: Math.round(totalSpend * 100) / 100,
      savingsThisMonth: 0, // Would need comparison data
      recentRequisitions: recentReqs,
    };
  }

  private parseRequisition(doc: { id: string; content: string | null; createdAt: Date }): Requisition {
    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      requisitionNumber: String(content['requisitionNumber'] ?? ''),
      items: (content['items'] ?? []) as Requisition['items'],
      requestedBy: String(content['requestedBy'] ?? ''),
      department: String(content['department'] ?? ''),
      justification: String(content['justification'] ?? ''),
      status: String(content['status'] ?? ''),
      createdAt: doc.createdAt,
    };
  }

  private parseQuotation(doc: { id: string; content: string | null; createdAt: Date }): Quotation {
    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      requisitionId: String(content['requisitionId'] ?? ''),
      supplierName: String(content['supplierName'] ?? ''),
      items: (content['items'] ?? []) as Quotation['items'],
      totalValue: Number(content['totalValue'] ?? 0),
      deliveryDays: Number(content['deliveryDays'] ?? 0),
      paymentTerms: String(content['paymentTerms'] ?? ''),
      validUntil: String(content['validUntil'] ?? ''),
      approved: Boolean(content['approved']),
      createdAt: doc.createdAt,
    };
  }

  private parsePurchaseOrder(doc: { id: string; content: string | null; createdAt: Date }): PurchaseOrder {
    const content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    return {
      id: doc.id,
      poNumber: String(content['poNumber'] ?? ''),
      quotationId: String(content['quotationId'] ?? ''),
      supplierName: String(content['supplierName'] ?? ''),
      totalValue: Number(content['totalValue'] ?? 0),
      status: String(content['status'] ?? ''),
      createdAt: doc.createdAt,
    };
  }
}
