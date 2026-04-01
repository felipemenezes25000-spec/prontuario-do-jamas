import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupplyInventoryDto,
  SndDto,
  LaundryDto,
  WasteManagementDto,
  ProcurementDto,
  ContractManagementDto,
  OmbudsmanDto,
  SameDto,
  SupplyLowStockQueryDto,
  ProcurementListQueryDto,
  ContractExpiryQueryDto,
  OmbudsmanTicketStatus,
  SupplyRequisitionDto,
  EquipmentWorkOrderDto,
} from './dto/hospital-management.dto';

// ============================================================================
// Constants
// ============================================================================

const DOC_TAG = {
  SUPPLY: '[HOSPITAL_MGMT:SUPPLY]',
  SND: '[HOSPITAL_MGMT:SND]',
  LAUNDRY: '[HOSPITAL_MGMT:LAUNDRY]',
  WASTE: '[HOSPITAL_MGMT:WASTE]',
  PROCUREMENT: '[HOSPITAL_MGMT:PROCUREMENT]',
  CONTRACT: '[HOSPITAL_MGMT:CONTRACT]',
  OMBUDSMAN: '[HOSPITAL_MGMT:OMBUDSMAN]',
  SAME: '[HOSPITAL_MGMT:SAME]',
} as const;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class HospitalManagementService {
  private readonly logger = new Logger(HospitalManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Supply Chain Overview ──────────────────────────────────────────────

  async getSupplyChainOverview(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.SUPPLY } },
      orderBy: { createdAt: 'desc' },
    });

    type SupplyItem = Record<string, unknown> & {
      lowStockAlert?: boolean;
      nearExpiry?: boolean;
      name?: string;
      stock?: number;
      category?: string;
    };

    const items = docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...JSON.parse(d.content ?? '{}') as SupplyItem,
    }));

    const lowStockCount = items.filter((i) => i.lowStockAlert).length;
    const nearExpiryCount = items.filter((i) => i.nearExpiry).length;

    return {
      totalItems: items.length,
      lowStockCount,
      nearExpiryCount,
      lowStockItems: items.filter((i) => i.lowStockAlert).slice(0, 20),
      nearExpiryItems: items.filter((i) => i.nearExpiry).slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Supply Requisition ─────────────────────────────────────────────────

  async createSupplyRequisition(tenantId: string, authorId: string, dto: SupplyRequisitionDto) {
    this.logger.log(`Supply requisition from ${dto.department}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.SUPPLY}:REQUISITION:${dto.department}`,
        content: JSON.stringify({
          documentType: 'SUPPLY_REQUISITION',
          department: dto.department,
          justification: dto.justification,
          items: dto.items,
          neededBy: dto.neededBy,
          status: 'PENDING',
          requestedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      status: 'PENDING',
      itemCount: dto.items.length,
      message: 'Requisição de material criada com sucesso',
      createdAt: doc.createdAt,
    };
  }

  // ─── CME Tracking ────────────────────────────────────────────────────────

  async getCmeTracking(_tenantId: string) {
    // CME (Central de Material e Esterilização) mock data
    // In production, this would query real CME cycle records
    return {
      activeCycles: 3,
      completedToday: 12,
      pendingItems: 8,
      qualityIndicators: {
        biologicalTestCompliance: 100,
        chemicalIndicatorCompliance: 98.5,
        turnaroundTimeHours: 4.2,
        reprocessingRate: 1.5,
      },
      recentCycles: [
        {
          id: 'cme-cycle-001',
          cycleNumber: 'AUT-2026-0331-001',
          autoclave: 'Autoclave 01',
          type: 'STEAM_STERILIZATION',
          temperature: 134,
          pressureAtm: 2.1,
          durationMin: 18,
          status: 'COMPLETED',
          biologicalTestPassed: true,
          itemCount: 45,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'cme-cycle-002',
          cycleNumber: 'AUT-2026-0331-002',
          autoclave: 'Autoclave 02',
          type: 'LOW_TEMPERATURE',
          temperature: 55,
          status: 'IN_PROGRESS',
          itemCount: 22,
          startedAt: new Date().toISOString(),
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Equipment Overview ──────────────────────────────────────────────────

  async getEquipmentOverview(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: '[HOSPITAL_MGMT:EQUIPMENT]' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const workOrders = docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...JSON.parse(d.content ?? '{}') as Record<string, unknown>,
    }));

    // Mock overview with real work order count
    return {
      totalEquipment: 156,
      activeWorkOrders: workOrders.length,
      overduePreventive: 4,
      scheduledThisWeek: 8,
      workOrders: workOrders.slice(0, 20),
      summary: {
        corrective: workOrders.filter((wo) => (wo as Record<string, unknown>).type === 'CORRECTIVE').length,
        preventive: workOrders.filter((wo) => (wo as Record<string, unknown>).type === 'PREVENTIVE').length,
        calibration: workOrders.filter((wo) => (wo as Record<string, unknown>).type === 'CALIBRATION').length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Equipment Work Order ────────────────────────────────────────────────

  async createEquipmentWorkOrder(tenantId: string, authorId: string, dto: EquipmentWorkOrderDto) {
    this.logger.log(`Work order: ${dto.type} for ${dto.equipmentName}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `[HOSPITAL_MGMT:EQUIPMENT]:${dto.type}:${dto.equipmentName}`,
        content: JSON.stringify({
          documentType: 'EQUIPMENT_WORK_ORDER',
          equipmentName: dto.equipmentName,
          assetTag: dto.assetTag,
          location: dto.location,
          type: dto.type,
          priority: dto.priority,
          description: dto.description,
          assignedTo: dto.assignedTo,
          scheduledDate: dto.scheduledDate,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      status: 'OPEN',
      priority: dto.priority,
      message: `Ordem de serviço criada: ${dto.type} — ${dto.equipmentName}`,
      createdAt: doc.createdAt,
    };
  }

  // ─── Food Service Overview ───────────────────────────────────────────────

  async getFoodServiceOverview(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.SND } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    type SndRecord = Record<string, unknown> & { dietType?: string };
    const prescriptions = docs.map((d) => JSON.parse(d.content ?? '{}') as SndRecord);

    const dietCounts: Record<string, number> = {};
    for (const p of prescriptions) {
      const diet = p.dietType ?? 'OTHER';
      dietCounts[diet] = (dietCounts[diet] ?? 0) + 1;
    }

    return {
      activePrescriptions: prescriptions.length,
      dietDistribution: dietCounts,
      mealsToday: {
        breakfast: Math.floor(prescriptions.length * 0.9),
        lunch: prescriptions.length,
        dinner: Math.floor(prescriptions.length * 0.95),
        snacks: Math.floor(prescriptions.length * 0.7),
      },
      qualityIndicators: {
        dietComplianceRate: 94.5,
        mealDeliveryOnTime: 97.2,
        patientSatisfaction: 4.1,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Laundry Overview ───────────────────────────────────────────────────

  async getLaundryOverview(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.LAUNDRY } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    type LaundryRecord = Record<string, unknown> & {
      kgProcessed?: number;
      lossRatePercent?: number;
      lowStock?: boolean;
      unit?: string;
    };

    const records = docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...JSON.parse(d.content ?? '{}') as LaundryRecord,
    }));

    const totalKg = records.reduce((sum, r) => sum + (r.kgProcessed ?? 0), 0);
    const avgLossRate = records.length > 0
      ? records.reduce((sum, r) => sum + (r.lossRatePercent ?? 0), 0) / records.length
      : 0;
    const lowStockUnits = records.filter((r) => r.lowStock);

    return {
      totalRecords: records.length,
      totalKgProcessed: Math.round(totalKg * 10) / 10,
      averageLossRatePercent: Math.round(avgLossRate * 10) / 10,
      lowStockUnits: lowStockUnits.map((u) => ({ unit: u.unit, id: u.id })),
      recentRecords: records.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Housekeeping Overview ──────────────────────────────────────────────

  async getHousekeepingOverview(tenantId: string) {
    // Housekeeping/room turnover — mock data (would integrate with bed management system)
    this.logger.log(`Housekeeping overview for tenant ${tenantId}`);

    return {
      roomsPendingCleaning: 5,
      roomsBeingCleaned: 3,
      roomsReady: 42,
      averageTurnaroundMinutes: 35,
      todayStats: {
        totalCleanings: 28,
        terminalCleanings: 4,
        concurrentCleanings: 24,
        averageTimeMinutes: 32,
      },
      pendingRooms: [
        { room: '301A', type: 'TERMINAL', dischargedAt: new Date(Date.now() - 45 * 60_000).toISOString(), priority: 'HIGH' },
        { room: '215B', type: 'CONCURRENT', dischargedAt: new Date(Date.now() - 20 * 60_000).toISOString(), priority: 'NORMAL' },
        { room: '108', type: 'TERMINAL', dischargedAt: new Date(Date.now() - 90 * 60_000).toISOString(), priority: 'CRITICAL' },
        { room: '422A', type: 'CONCURRENT', dischargedAt: new Date(Date.now() - 10 * 60_000).toISOString(), priority: 'LOW' },
        { room: '510', type: 'TERMINAL', dischargedAt: new Date(Date.now() - 60 * 60_000).toISOString(), priority: 'HIGH' },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Waste Overview ──────────────────────────────────────────────────────

  async getWasteOverview(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    return this.getWasteSummary(
      tenantId,
      thirtyDaysAgo.toISOString().split('T')[0] as string,
      now.toISOString().split('T')[0] as string,
    );
  }

  // ─── Supply Inventory ─────────────────────────────────────────────────────

  async upsertSupplyItem(tenantId: string, authorId: string, dto: SupplyInventoryDto) {
    this.logger.log(`Supply upsert: ${dto.name} — tenant ${tenantId}`);

    const lowStockAlert = dto.stock <= dto.reorderPoint;
    const nearExpiry = dto.expiryDate
      ? new Date(dto.expiryDate).getTime() - Date.now() < 30 * 86_400_000
      : false;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.SUPPLY}:${dto.name}`,
        content: JSON.stringify({
          documentType: 'SUPPLY_INVENTORY',
          itemId: dto.itemId,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          stock: dto.stock,
          unitOfMeasure: dto.unitOfMeasure,
          reorderPoint: dto.reorderPoint,
          maxStock: dto.maxStock,
          lot: dto.lot,
          expiryDate: dto.expiryDate,
          abcCurve: dto.abcCurve,
          unitCost: dto.unitCost,
          supplierName: dto.supplierName,
          anvisaRegistration: dto.anvisaRegistration,
          storageLocation: dto.storageLocation,
          lowStockAlert,
          nearExpiry,
          updatedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    const alerts: string[] = [];
    if (lowStockAlert) {
      alerts.push(`Estoque baixo: ${dto.stock} ${dto.unitOfMeasure} (ponto de pedido: ${dto.reorderPoint})`);
    }
    if (nearExpiry) {
      alerts.push(`Vencimento próximo: ${dto.expiryDate}`);
    }

    return { id: doc.id, lowStockAlert, nearExpiry, alerts, createdAt: doc.createdAt };
  }

  async getLowStockItems(tenantId: string, query: SupplyLowStockQueryDto) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.SUPPLY } },
      orderBy: { createdAt: 'desc' },
    });

    const items = docs.map((d) => JSON.parse(d.content ?? '{}') as Record<string, unknown> & { lowStockAlert?: boolean; category?: string; abcCurve?: string });
    return items.filter((i) => {
      if (!i.lowStockAlert) return false;
      if (query.category && i.category !== query.category) return false;
      if (query.abcCurve && i.abcCurve !== query.abcCurve) return false;
      return true;
    });
  }

  // ─── SND — Nutrition & Dietetics ─────────────────────────────────────────

  async recordSndPrescription(tenantId: string, authorId: string, dto: SndDto) {
    this.logger.log(`SND prescription for patient ${dto.patientId}`);

    const totalCalories = dto.menu?.reduce((sum, item) => sum + (item.caloriesKcal ?? 0), 0) ?? 0;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: (dto.encounterId ?? null) as unknown as string,
        authorId: dto.dietitianId ?? authorId,
        type: 'CUSTOM',
        title: DOC_TAG.SND,
        content: JSON.stringify({
          documentType: 'SND_PRESCRIPTION',
          dietType: dto.dietType,
          specialRestrictions: dto.specialRestrictions,
          foodAllergies: dto.foodAllergies,
          menu: dto.menu,
          portioning: dto.portioning,
          qualityControl: dto.qualityControl,
          totalCaloriesKcal: dto.totalCaloriesKcal ?? totalCalories,
          calculatedCaloriesKcal: totalCalories,
          validFrom: dto.validFrom,
          validUntil: dto.validUntil,
          prescribedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, totalCaloriesKcal: dto.totalCaloriesKcal ?? totalCalories, createdAt: doc.createdAt };
  }

  async getSndHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: DOC_TAG.SND } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return docs.map((d) => ({ id: d.id, createdAt: d.createdAt, data: JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }

  // ─── Hospital Laundry ────────────────────────────────────────────────────

  async recordLaundry(tenantId: string, authorId: string, dto: LaundryDto) {
    this.logger.log(`Laundry record for unit ${dto.unit}`);

    const lowStock = dto.stockLevel <= dto.minStockLevel;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.LAUNDRY}:${dto.unit}`,
        content: JSON.stringify({
          documentType: 'LAUNDRY_RECORD',
          unit: dto.unit,
          kgProcessed: dto.kgProcessed,
          lossRatePercent: dto.lossRatePercent,
          stockLevel: dto.stockLevel,
          minStockLevel: dto.minStockLevel,
          lowStock,
          washCycle: dto.washCycle,
          periodDate: dto.periodDate ?? new Date().toISOString().split('T')[0],
          detergent: dto.detergent,
          notes: dto.notes,
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      lowStock,
      alert: lowStock ? `Estoque de rouparia baixo na unidade ${dto.unit} (${dto.stockLevel} sets)` : undefined,
      createdAt: doc.createdAt,
    };
  }

  // ─── Waste Management (PGRSS — ANVISA RDC 222/2018) ─────────────────────

  async recordWaste(tenantId: string, authorId: string, dto: WasteManagementDto) {
    this.logger.log(`Waste record: ${dto.wasteType} ${dto.weightKg} kg from ${dto.originUnit}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.WASTE}:${dto.wasteType}`,
        content: JSON.stringify({
          documentType: 'WASTE_MANAGEMENT',
          wasteType: dto.wasteType,
          weightKg: dto.weightKg,
          originUnit: dto.originUnit,
          destination: dto.destination,
          certificateNumber: dto.certificateNumber,
          transporter: dto.transporter,
          ibamaLicense: dto.ibamaLicense,
          collectionDate: dto.collectionDate ?? new Date().toISOString(),
          notes: dto.notes,
          regulatoryReference: 'ANVISA RDC 222/2018',
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async getWasteSummary(tenantId: string, startDate: string, endDate: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: DOC_TAG.WASTE },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });

    const byType: Record<string, number> = {};
    for (const d of docs) {
      const data = JSON.parse(d.content ?? '{}') as { wasteType: string; weightKg: number };
      byType[data.wasteType] = (byType[data.wasteType] ?? 0) + data.weightKg;
    }

    return {
      period: { startDate, endDate },
      totalKg: Object.values(byType).reduce((a, b) => a + b, 0),
      byType,
      recordCount: docs.length,
    };
  }

  // ─── Procurement ─────────────────────────────────────────────────────────

  async upsertProcurement(tenantId: string, authorId: string, dto: ProcurementDto) {
    this.logger.log(`Procurement ${dto.status} by ${dto.requestingDepartment}`);

    const selectedQuotation = dto.quotations?.find((q) => q.selected);
    const totalValue = selectedQuotation
      ? dto.items.reduce((sum, item) => sum + item.quantity * (selectedQuotation.unitPrice ?? 0), 0)
      : dto.totalValueBrl;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId: dto.requestedBy,
        type: 'CUSTOM',
        title: `${DOC_TAG.PROCUREMENT}:${dto.status}`,
        content: JSON.stringify({
          documentType: 'PROCUREMENT',
          requisitionId: dto.requisitionId,
          requestingDepartment: dto.requestingDepartment,
          requestedBy: dto.requestedBy,
          justification: dto.justification,
          items: dto.items,
          quotations: dto.quotations,
          status: dto.status,
          approvedBy: dto.approvedBy,
          approvedAt: dto.approvedAt,
          purchaseOrderNumber: dto.purchaseOrderNumber,
          receivedAt: dto.receivedAt,
          invoiceNumber: dto.invoiceNumber,
          totalValueBrl: totalValue,
          notes: dto.notes,
          createdAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, status: dto.status, totalValueBrl: totalValue, createdAt: doc.createdAt };
  }

  async listProcurements(tenantId: string, query: ProcurementListQueryDto) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: query.status
          ? { startsWith: `${DOC_TAG.PROCUREMENT}:${query.status}` }
          : { startsWith: DOC_TAG.PROCUREMENT },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    type ProcurementRecord = Record<string, unknown> & { requestingDepartment?: string };
    const items = docs.map((d) => ({ id: d.id, createdAt: d.createdAt, ...JSON.parse(d.content ?? '{}') as ProcurementRecord }));

    if (query.department) {
      return items.filter((i) => (i as ProcurementRecord).requestingDepartment === query.department);
    }
    return items;
  }

  // ─── Contract Management ─────────────────────────────────────────────────

  async upsertContract(tenantId: string, authorId: string, dto: ContractManagementDto) {
    this.logger.log(`Contract: ${dto.title} — ${dto.type}`);

    const endDate = new Date(dto.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
    const renewalAlert = dto.renewalAlertDays !== undefined && daysUntilExpiry <= dto.renewalAlertDays;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId: dto.managerId ?? authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.CONTRACT}:${dto.type}:${dto.title}`,
        content: JSON.stringify({
          documentType: 'CONTRACT',
          contractId: dto.contractId,
          type: dto.type,
          title: dto.title,
          counterparty: dto.counterparty,
          cnpj: dto.cnpj,
          startDate: dto.startDate,
          endDate: dto.endDate,
          daysUntilExpiry,
          renewalAlert,
          slaTerms: dto.slaTerms,
          renewalAlertDays: dto.renewalAlertDays,
          totalValueBrl: dto.totalValueBrl,
          monthlyValueBrl: dto.monthlyValueBrl,
          documentKey: dto.documentKey,
          notes: dto.notes,
          registeredAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      daysUntilExpiry,
      renewalAlert,
      message: renewalAlert ? `Alerta: Contrato "${dto.title}" vence em ${daysUntilExpiry} dias` : undefined,
      createdAt: doc.createdAt,
    };
  }

  async getExpiringContracts(tenantId: string, query: ContractExpiryQueryDto) {
    const daysAhead = query.daysAhead ?? 30;
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.CONTRACT } },
      orderBy: { createdAt: 'desc' },
    });

    return docs
      .map((d) => ({ id: d.id, createdAt: d.createdAt, ...JSON.parse(d.content ?? '{}') as Record<string, unknown> & { daysUntilExpiry?: number } }))
      .filter((c) => typeof c.daysUntilExpiry === 'number' && c.daysUntilExpiry <= daysAhead && c.daysUntilExpiry >= 0);
  }

  // ─── Ombudsman (Ouvidoria) ────────────────────────────────────────────────

  async upsertOmbudsmanTicket(tenantId: string, authorId: string, dto: OmbudsmanDto) {
    this.logger.log(`Ombudsman ticket: ${dto.type} — ${dto.status}`);

    const slaDeadline = dto.slaHours
      ? new Date(Date.now() + dto.slaHours * 3_600_000).toISOString()
      : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.OMBUDSMAN}:${dto.type}`,
        content: JSON.stringify({
          documentType: 'OMBUDSMAN_TICKET',
          ticketId: dto.ticketId,
          type: dto.type,
          description: dto.description,
          classification: dto.classification,
          relatedUnit: dto.relatedUnit,
          assignedTo: dto.assignedTo,
          status: dto.status,
          slaHours: dto.slaHours,
          slaDeadline,
          resolution: dto.resolution,
          resolvedAt: dto.resolvedAt,
          anonymous: dto.anonymous ?? false,
          contactEmail: dto.anonymous ? undefined : dto.contactEmail,
          contactPhone: dto.anonymous ? undefined : dto.contactPhone,
          openedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, slaDeadline, status: dto.status, createdAt: doc.createdAt };
  }

  async listOmbudsmanTickets(tenantId: string, status?: OmbudsmanTicketStatus) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.OMBUDSMAN } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const tickets = docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...JSON.parse(d.content ?? '{}') as Record<string, unknown> & { status?: string },
    }));

    if (status) return tickets.filter((t) => t.status === status);
    return tickets;
  }

  // ─── SAME (Medical Records Archive) ─────────────────────────────────────

  async upsertSameRecord(tenantId: string, authorId: string, dto: SameDto) {
    this.logger.log(`SAME record for patient ${dto.patientId}`);

    const retentionDeadline = dto.documentDate
      ? new Date(new Date(dto.documentDate).setFullYear(new Date(dto.documentDate).getFullYear() + dto.retentionPeriodYears)).toISOString().split('T')[0]
      : undefined;

    const isOverdue = dto.borrowDate && !dto.actualReturnDate && dto.returnDate
      ? new Date(dto.returnDate) < new Date()
      : false;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: (dto.encounterId ?? null) as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_TAG.SAME}:${dto.documentType}`,
        content: JSON.stringify({
          documentType: 'SAME_RECORD',
          recordId: dto.recordId,
          type: dto.documentType,
          physicalLocation: dto.physicalLocation,
          borrowedBy: dto.borrowedBy,
          borrowDate: dto.borrowDate,
          returnDate: dto.returnDate,
          actualReturnDate: dto.actualReturnDate,
          isOverdue,
          digitized: dto.digitized ?? false,
          digitalKey: dto.digitalKey,
          retentionPeriodYears: dto.retentionPeriodYears,
          retentionDeadline,
          documentDate: dto.documentDate,
          notes: dto.notes,
          updatedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      isOverdue,
      retentionDeadline,
      overdueAlert: isOverdue ? `Prontuário em atraso — emprestado em ${dto.borrowDate}, prazo ${dto.returnDate}` : undefined,
      createdAt: doc.createdAt,
    };
  }

  async getSameRecordsByPatient(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: DOC_TAG.SAME } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => ({ id: d.id, createdAt: d.createdAt, data: JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }

  async getOverdueBorrowings(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: DOC_TAG.SAME } },
      orderBy: { createdAt: 'desc' },
    });
    return docs
      .map((d) => ({ id: d.id, createdAt: d.createdAt, ...JSON.parse(d.content ?? '{}') as Record<string, unknown> & { isOverdue?: boolean } }))
      .filter((r) => r.isOverdue === true);
  }
}
