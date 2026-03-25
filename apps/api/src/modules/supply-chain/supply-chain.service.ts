import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  SupplyCategory,
  AbcCurve,
  PurchaseOrderStatus,
  ContractStatus,
  CreateSupplyItemDto,
  CreatePurchaseOrderDto,
  CreateContractDto,
} from './dto/supply-chain.dto';

export interface SupplyItem {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  category: SupplyCategory;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  lot?: string;
  expiryDate?: string;
  unitCost: number;
  unit?: string;
  supplier?: string;
  location?: string;
  abcCurve: AbcCurve;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  items: Array<{ supplyItemId: string; itemName: string; quantity: number; unitPrice: number }>;
  totalValue: number;
  notes?: string;
  createdById: string;
  approvedById?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export interface Contract {
  id: string;
  tenantId: string;
  counterpartyName: string;
  counterpartyType: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  totalValue?: number;
  readjustmentIndex?: string;
  slaDescription?: string;
  alertDaysBefore: number;
  status: ContractStatus;
  createdAt: Date;
}

@Injectable()
export class SupplyChainService {
  private readonly logger = new Logger(SupplyChainService.name);
  private readonly items = new Map<string, SupplyItem>();
  private readonly orders = new Map<string, PurchaseOrder>();
  private readonly contracts = new Map<string, Contract>();

  // ─── Supply Items ──────────────────────────────────────────────────────

  async createItem(tenantId: string, dto: CreateSupplyItemDto): Promise<SupplyItem> {
    this.logger.log(`Creating supply item: ${dto.name}`);

    const annualCost = dto.unitCost * dto.currentStock;
    let abcCurve = AbcCurve.C;
    if (annualCost > 50000) abcCurve = AbcCurve.A;
    else if (annualCost > 10000) abcCurve = AbcCurve.B;

    const item: SupplyItem = {
      id: randomUUID(),
      tenantId,
      ...dto,
      abcCurve,
      createdAt: new Date(),
    };

    this.items.set(item.id, item);
    return item;
  }

  async listItems(tenantId: string, filters?: { category?: SupplyCategory; belowReorder?: boolean; expiringDays?: number }) {
    let items = Array.from(this.items.values()).filter((i) => i.tenantId === tenantId);

    if (filters?.category) items = items.filter((i) => i.category === filters.category);
    if (filters?.belowReorder) items = items.filter((i) => i.currentStock <= i.reorderPoint);
    if (filters?.expiringDays) {
      const cutoff = new Date(Date.now() + filters.expiringDays * 24 * 60 * 60 * 1000);
      items = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= cutoff);
    }

    return { data: items, total: items.length };
  }

  async getItem(tenantId: string, itemId: string): Promise<SupplyItem> {
    const item = this.items.get(itemId);
    if (!item || item.tenantId !== tenantId) throw new NotFoundException(`Supply item ${itemId} not found`);
    return item;
  }

  async getAbcAnalysis(tenantId: string) {
    const items = Array.from(this.items.values()).filter((i) => i.tenantId === tenantId);
    const total = items.reduce((s, i) => s + i.unitCost * i.currentStock, 0);

    return {
      curveA: { items: items.filter((i) => i.abcCurve === AbcCurve.A).length, valuePercent: 70, itemPercent: 20 },
      curveB: { items: items.filter((i) => i.abcCurve === AbcCurve.B).length, valuePercent: 20, itemPercent: 30 },
      curveC: { items: items.filter((i) => i.abcCurve === AbcCurve.C).length, valuePercent: 10, itemPercent: 50 },
      totalValue: total,
      totalItems: items.length,
    };
  }

  async getExpiringItems(tenantId: string, days = 30) {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const items = Array.from(this.items.values())
      .filter((i) => i.tenantId === tenantId && i.expiryDate && new Date(i.expiryDate) <= cutoff)
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

    return { data: items, total: items.length, alertDays: days };
  }

  async getDashboard(tenantId: string) {
    const items = Array.from(this.items.values()).filter((i) => i.tenantId === tenantId);
    const belowReorder = items.filter((i) => i.currentStock <= i.reorderPoint);
    const cutoff30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiring = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= cutoff30);

    return {
      totalItems: items.length,
      totalValue: items.reduce((s, i) => s + i.unitCost * i.currentStock, 0),
      belowReorderPoint: belowReorder.length,
      expiringSoon: expiring.length,
      pendingOrders: Array.from(this.orders.values()).filter((o) => o.tenantId === tenantId && o.status === PurchaseOrderStatus.PENDING_APPROVAL).length,
      activeContracts: Array.from(this.contracts.values()).filter((c) => c.tenantId === tenantId && c.status === ContractStatus.ACTIVE).length,
      byCategory: Object.values(SupplyCategory).map((cat) => ({
        category: cat,
        count: items.filter((i) => i.category === cat).length,
        value: items.filter((i) => i.category === cat).reduce((s, i) => s + i.unitCost * i.currentStock, 0),
      })),
    };
  }

  // ─── Purchase Orders ───────────────────────────────────────────────────

  async createPurchaseOrder(tenantId: string, userId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    this.logger.log(`Creating purchase order for supplier ${dto.supplierId}`);

    const orderItems = dto.items.map((item) => {
      const supply = this.items.get(item.supplyItemId);
      return { ...item, itemName: supply?.name ?? 'Item desconhecido' };
    });

    const order: PurchaseOrder = {
      id: randomUUID(),
      tenantId,
      supplierId: dto.supplierId,
      status: PurchaseOrderStatus.PENDING_APPROVAL,
      items: orderItems,
      totalValue: dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      notes: dto.notes,
      createdById: userId,
      createdAt: new Date(),
    };

    this.orders.set(order.id, order);
    return order;
  }

  async listPurchaseOrders(tenantId: string, status?: PurchaseOrderStatus) {
    let orders = Array.from(this.orders.values()).filter((o) => o.tenantId === tenantId);
    if (status) orders = orders.filter((o) => o.status === status);
    return { data: orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), total: orders.length };
  }

  async approvePurchaseOrder(tenantId: string, userId: string, orderId: string, _notes?: string): Promise<PurchaseOrder> {
    const order = this.orders.get(orderId);
    if (!order || order.tenantId !== tenantId) throw new NotFoundException(`Purchase order ${orderId} not found`);
    order.status = PurchaseOrderStatus.APPROVED;
    order.approvedById = userId;
    order.approvedAt = new Date();
    return order;
  }

  async receivePurchaseOrder(tenantId: string, orderId: string): Promise<PurchaseOrder> {
    const order = this.orders.get(orderId);
    if (!order || order.tenantId !== tenantId) throw new NotFoundException(`Purchase order ${orderId} not found`);
    order.status = PurchaseOrderStatus.RECEIVED;

    // Update stock
    for (const item of order.items) {
      const supply = this.items.get(item.supplyItemId);
      if (supply) supply.currentStock += item.quantity;
    }

    return order;
  }

  // ─── Contract Management ───────────────────────────────────────────────

  async createContract(tenantId: string, dto: CreateContractDto): Promise<Contract> {
    this.logger.log(`Creating contract: ${dto.contractNumber}`);

    const now = new Date();
    const end = new Date(dto.endDate);
    const daysToExpiry = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    let status = ContractStatus.ACTIVE;
    if (daysToExpiry <= 0) status = ContractStatus.EXPIRED;
    else if (daysToExpiry <= (dto.alertDaysBefore ?? 60)) status = ContractStatus.EXPIRING_SOON;

    const contract: Contract = {
      id: randomUUID(),
      tenantId,
      ...dto,
      alertDaysBefore: dto.alertDaysBefore ?? 60,
      status,
      createdAt: new Date(),
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  async listContracts(tenantId: string, status?: ContractStatus) {
    let contracts = Array.from(this.contracts.values()).filter((c) => c.tenantId === tenantId);
    if (status) contracts = contracts.filter((c) => c.status === status);
    return { data: contracts.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()), total: contracts.length };
  }

  async getContract(tenantId: string, contractId: string): Promise<Contract> {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.tenantId !== tenantId) throw new NotFoundException(`Contract ${contractId} not found`);
    return contract;
  }

  async getExpiringContracts(tenantId: string, days = 60) {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const contracts = Array.from(this.contracts.values())
      .filter((c) => c.tenantId === tenantId && new Date(c.endDate) <= cutoff && c.status !== ContractStatus.EXPIRED)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    return { data: contracts, total: contracts.length, alertDays: days };
  }
}
