import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DischargeInstructionsDto,
  DischargePrescriptionDto,
  SafeDischargeChecklistDto,
  UpdateChecklistItemDto,
  DischargeBarrierDto,
  ResolveBarrierDto,
  RoundingDto,
  BedRequestDto,
  UpdateBedRequestStatusDto,
  ChecklistCategory,
  ChecklistItemStatus,
  ChecklistItemDto,
  BedRequestStatus,
  DischargeLanguage,
} from './dto/discharge-enhanced.dto';

// ============================================================================
// Interfaces
// ============================================================================

export interface StoredChecklistItem {
  category: string;
  description: string;
  status: string;
  responsible?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface StoredChecklist {
  docType: string;
  encounterId: string;
  items: StoredChecklistItem[];
  createdAt: string;
}

export interface StoredBarrier {
  docType: string;
  encounterId: string;
  patientId: string;
  barrierType: string;
  description: string;
  identifiedDate: string;
  expectedResolution?: string;
  resolvedDate?: string;
  responsibleTeam?: string;
  escalated: boolean;
  status: string;
  resolutionNotes?: string;
  resolvedBy?: string;
}

export interface StoredBedRequest {
  docType: string;
  requestingUnit: string;
  patientId: string;
  requestedBedType: string;
  urgency: string;
  clinicalSummary: string;
  currentLocation: string;
  requestedAt: string;
  status: string;
  allocatedBed?: string;
  approvedBy?: string;
  denialReason?: string;
  responseTime?: string;
}

export interface StoredRounding {
  docType: string;
  encounterId: string;
  date: string;
  participants: Array<{ name: string; role: string; present: boolean }>;
  checklist: Record<string, unknown>;
  createdAt: string;
}

export interface PrintableSection {
  title: string;
  content: string;
}

export interface DischargeInstructionsPrintable {
  header: string;
  patientId: string;
  language: string;
  generatedAt: string;
  sections: PrintableSection[];
}

export interface DischargeReadinessDashboard {
  encounterId: string;
  totalItems: number;
  doneItems: number;
  pendingItems: number;
  notApplicableItems: number;
  completionPercentage: number;
  isReadyForDischarge: boolean;
  pendingCategories: string[];
}

export interface BarrierDashboard {
  unitId: string;
  totalPatientsWithBarriers: number;
  totalActiveBarriers: number;
  averageDelayDays: number;
  topBarrierTypes: Array<{ type: string; count: number }>;
  escalatedBarriers: number;
}

export interface BedRegulationDashboard {
  pendingRequestsByUrgency: Record<string, number>;
  totalPending: number;
  totalApproved: number;
  totalAllocated: number;
  averageResponseTimeMinutes: number;
}

// ============================================================================
// Default Checklist Items
// ============================================================================

function getDefaultChecklistItems(): ChecklistItemDto[] {
  return [
    {
      category: ChecklistCategory.RECONCILIATION,
      description: 'Medication reconciliation completed',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.INSTRUCTIONS,
      description: 'Discharge instructions given and understood',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.FOLLOW_UP,
      description: 'Follow-up appointments scheduled',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.RECONCILIATION,
      description: 'Prescriptions provided',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.EDUCATION,
      description: 'Patient education documented',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.FOLLOW_UP,
      description: 'Referrals made',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.EQUIPMENT,
      description: 'Home equipment arranged',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.TRANSPORT,
      description: 'Transport arranged',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.SOCIAL,
      description: 'Companion present',
      status: ChecklistItemStatus.PENDING,
    },
    {
      category: ChecklistCategory.RECONCILIATION,
      description: 'Vital signs stable',
      status: ChecklistItemStatus.PENDING,
    },
  ];
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class DischargeEnhancedService {
  private readonly logger = new Logger(DischargeEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Discharge Instructions ──────────────────────────────────────────

  async generateDischargeInstructions(
    tenantId: string,
    userId: string,
    dto: DischargeInstructionsDto,
  ) {
    this.logger.log(`Generating discharge instructions for encounter ${dto.encounterId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE_ENHANCED:INSTRUCTIONS] Discharge Instructions',
        content: JSON.stringify({
          docType: 'DISCHARGE_INSTRUCTIONS_ENHANCED',
          encounterId: dto.encounterId,
          patientId: dto.patientId,
          language: dto.language,
          sections: dto.sections,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      encounterId: dto.encounterId,
      language: dto.language,
      sectionsIncluded: {
        medications: dto.sections.medications.length,
        diet: true,
        activity: true,
        woundCare: !!dto.sections.woundCare,
        alarmSigns: dto.sections.alarmSigns.length,
        followUp: dto.sections.followUp.length,
      },
      createdAt: doc.createdAt,
    };
  }

  async printDischargeInstructions(
    tenantId: string,
    encounterId: string,
  ): Promise<DischargeInstructionsPrintable> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:INSTRUCTIONS]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException(`No discharge instructions found for encounter ${encounterId}`);
    }

    const content = JSON.parse(doc.content as string) as {
      language: DischargeLanguage;
      patientId: string;
      sections: DischargeInstructionsDto['sections'];
      createdAt: string;
    };

    const isPtBr = content.language === DischargeLanguage.PT_BR;
    const printableSections: PrintableSection[] = [];

    // Medications
    if (content.sections.medications.length > 0) {
      const medsText = content.sections.medications
        .map((m, i) =>
          `${i + 1}. ${m.name} - ${m.dose}, ${m.frequency}, ${m.duration}\n   ${isPtBr ? 'Instrucoes' : 'Instructions'}: ${m.instructions}${m.warnings ? `\n   ${isPtBr ? 'Atencao' : 'Warning'}: ${m.warnings}` : ''}`,
        )
        .join('\n');
      printableSections.push({
        title: isPtBr ? 'Medicamentos' : 'Medications',
        content: medsText,
      });
    }

    // Diet
    printableSections.push({
      title: isPtBr ? 'Dieta' : 'Diet',
      content: `${isPtBr ? 'Tipo' : 'Type'}: ${content.sections.diet.type}\n${isPtBr ? 'Restricoes' : 'Restrictions'}: ${content.sections.diet.restrictions.join(', ')}\n${isPtBr ? 'Recomendacoes' : 'Recommendations'}: ${content.sections.diet.recommendations.join(', ')}`,
    });

    // Activity
    printableSections.push({
      title: isPtBr ? 'Atividade Fisica' : 'Activity',
      content: `${isPtBr ? 'Nivel' : 'Level'}: ${content.sections.activity.level}\n${isPtBr ? 'Restricoes' : 'Restrictions'}: ${content.sections.activity.restrictions.join(', ')}\n${isPtBr ? 'Plano de Progressao' : 'Progression Plan'}: ${content.sections.activity.progressionPlan}`,
    });

    // Wound Care
    if (content.sections.woundCare) {
      printableSections.push({
        title: isPtBr ? 'Cuidados com a Ferida' : 'Wound Care',
        content: `${content.sections.woundCare.instructions}\n${isPtBr ? 'Curativos' : 'Dressings'}: ${content.sections.woundCare.dressings}\n${isPtBr ? 'Frequencia de troca' : 'Change frequency'}: ${content.sections.woundCare.changeFrequency}`,
      });
    }

    // Alarm Signs
    if (content.sections.alarmSigns.length > 0) {
      const signsText = content.sections.alarmSigns
        .map((s) => `- ${s.sign} -> ${s.action}`)
        .join('\n');
      printableSections.push({
        title: isPtBr ? 'Sinais de Alarme' : 'Alarm Signs',
        content: signsText,
      });
    }

    // Follow-Up
    if (content.sections.followUp.length > 0) {
      const fuText = content.sections.followUp
        .map((f) => `- ${f.specialty}${f.provider ? ` (${f.provider})` : ''}: ${f.timeframe}${f.phone ? ` | Tel: ${f.phone}` : ''}`)
        .join('\n');
      printableSections.push({
        title: isPtBr ? 'Retorno / Acompanhamento' : 'Follow-Up',
        content: fuText,
      });
    }

    return {
      header: isPtBr ? 'INSTRUCOES DE ALTA HOSPITALAR' : 'DISCHARGE INSTRUCTIONS',
      patientId: content.patientId,
      language: content.language,
      generatedAt: new Date().toISOString(),
      sections: printableSections,
    };
  }

  // ─── 2. Discharge Prescription ──────────────────────────────────────────

  async generateDischargePrescription(
    tenantId: string,
    userId: string,
    dto: DischargePrescriptionDto,
  ) {
    this.logger.log(`Generating discharge prescription for encounter ${dto.encounterId}`);

    const newMeds = dto.medications.filter((m) => m.isNew);
    const continuedMeds = dto.medications.filter((m) => m.wasContinuedFromHome);
    const modifiedMeds = dto.medications.filter((m) => m.wasModified);
    const unchangedMeds = dto.medications.filter(
      (m) => !m.isNew && !m.wasModified && m.wasContinuedFromHome,
    );

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE_ENHANCED:PRESCRIPTION] Discharge Prescription',
        content: JSON.stringify({
          docType: 'DISCHARGE_PRESCRIPTION_ENHANCED',
          encounterId: dto.encounterId,
          patientId: dto.patientId,
          medications: dto.medications,
          reconciliationNotes: dto.reconciliationNotes,
          reconciliationSummary: {
            totalMedications: dto.medications.length,
            newMedications: newMeds.length,
            continuedFromHome: continuedMeds.length,
            modifiedMedications: modifiedMeds.length,
            unchangedMedications: unchangedMeds.length,
          },
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      encounterId: dto.encounterId,
      reconciliationSummary: {
        totalMedications: dto.medications.length,
        newMedications: newMeds.length,
        continuedFromHome: continuedMeds.length,
        modifiedMedications: modifiedMeds.length,
        unchangedMedications: unchangedMeds.length,
      },
      createdAt: doc.createdAt,
    };
  }

  // ─── 3. Safe Discharge Checklist ────────────────────────────────────────

  async getDischargeChecklist(tenantId: string, encounterId: string) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:CHECKLIST]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const content = JSON.parse(existing.content as string) as StoredChecklist;
      return {
        id: existing.id,
        encounterId,
        items: content.items,
        createdAt: existing.createdAt,
      };
    }

    // Generate default checklist items
    const defaultItems = getDefaultChecklistItems();
    return {
      id: null,
      encounterId,
      items: defaultItems,
      createdAt: null,
    };
  }

  async saveDischargeChecklist(
    tenantId: string,
    userId: string,
    dto: SafeDischargeChecklistDto,
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: 'system',
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE_ENHANCED:CHECKLIST] Safe Discharge Checklist',
        content: JSON.stringify({
          docType: 'SAFE_DISCHARGE_CHECKLIST',
          encounterId: dto.encounterId,
          items: dto.items,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, encounterId: dto.encounterId, items: dto.items, createdAt: doc.createdAt };
  }

  async updateChecklistItem(
    tenantId: string,
    userId: string,
    encounterId: string,
    dto: UpdateChecklistItemDto,
  ) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:CHECKLIST]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      throw new NotFoundException(`No checklist found for encounter ${encounterId}`);
    }

    const content = JSON.parse(existing.content as string) as StoredChecklist;
    if (dto.itemIndex < 0 || dto.itemIndex >= content.items.length) {
      throw new BadRequestException(`Invalid item index: ${dto.itemIndex}`);
    }

    content.items[dto.itemIndex].status = dto.status;
    if (dto.status === ChecklistItemStatus.DONE) {
      content.items[dto.itemIndex].completedAt = new Date().toISOString();
      content.items[dto.itemIndex].completedBy = dto.completedBy ?? userId;
    }

    await this.prisma.clinicalDocument.update({
      where: { id: existing.id },
      data: { content: JSON.stringify(content) },
    });

    return { id: existing.id, updatedItem: content.items[dto.itemIndex] };
  }

  async isReadyForDischarge(tenantId: string, encounterId: string): Promise<boolean> {
    const checklist = await this.getDischargeChecklist(tenantId, encounterId);
    if (!checklist.id) return false;

    return checklist.items.every(
      (item: StoredChecklistItem) =>
        item.status === ChecklistItemStatus.DONE ||
        item.status === ChecklistItemStatus.NOT_APPLICABLE,
    );
  }

  async getDischargeReadinessDashboard(
    tenantId: string,
    encounterId: string,
  ): Promise<DischargeReadinessDashboard> {
    const checklist = await this.getDischargeChecklist(tenantId, encounterId);
    const items = checklist.items as StoredChecklistItem[];

    const doneItems = items.filter((i) => i.status === ChecklistItemStatus.DONE).length;
    const pendingItems = items.filter((i) => i.status === ChecklistItemStatus.PENDING).length;
    const naItems = items.filter((i) => i.status === ChecklistItemStatus.NOT_APPLICABLE).length;
    const applicableItems = items.length - naItems;
    const completionPercentage = applicableItems > 0
      ? Math.round((doneItems / applicableItems) * 100)
      : 100;

    const pendingCategories = [
      ...new Set(
        items
          .filter((i) => i.status === ChecklistItemStatus.PENDING)
          .map((i) => i.category),
      ),
    ];

    return {
      encounterId,
      totalItems: items.length,
      doneItems,
      pendingItems,
      notApplicableItems: naItems,
      completionPercentage,
      isReadyForDischarge: pendingItems === 0,
      pendingCategories,
    };
  }

  // ─── 4. Barrier to Discharge ────────────────────────────────────────────

  async addBarrier(tenantId: string, userId: string, dto: DischargeBarrierDto) {
    this.logger.log(`Adding discharge barrier for encounter ${dto.encounterId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `[DISCHARGE_ENHANCED:BARRIER] ${dto.barrierType}`,
        content: JSON.stringify({
          docType: 'DISCHARGE_BARRIER_ENHANCED',
          encounterId: dto.encounterId,
          patientId: dto.patientId,
          barrierType: dto.barrierType,
          description: dto.description,
          identifiedDate: dto.identifiedDate,
          expectedResolution: dto.expectedResolution ?? undefined,
          resolvedDate: undefined,
          responsibleTeam: dto.responsibleTeam ?? undefined,
          escalated: dto.escalated ?? false,
          status: 'ACTIVE',
          resolutionNotes: undefined,
          resolvedBy: undefined,
        } satisfies StoredBarrier),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, barrierType: dto.barrierType, status: 'ACTIVE', createdAt: doc.createdAt };
  }

  async resolveBarrier(tenantId: string, userId: string, barrierId: string, dto: ResolveBarrierDto) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { id: barrierId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Barrier ${barrierId} not found`);
    }

    const content = JSON.parse(existing.content as string) as StoredBarrier;
    content.status = 'RESOLVED';
    content.resolvedDate = new Date().toISOString();
    content.resolvedBy = userId;
    content.resolutionNotes = dto.resolutionNotes ?? undefined;

    await this.prisma.clinicalDocument.update({
      where: { id: barrierId },
      data: { content: JSON.stringify(content) },
    });

    return { id: barrierId, status: 'RESOLVED', resolvedAt: content.resolvedDate };
  }

  async getActiveBarriers(tenantId: string, encounterId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:BARRIER]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs
      .map((doc) => ({
        id: doc.id,
        ...(JSON.parse(doc.content as string) as StoredBarrier),
        createdAt: doc.createdAt,
      }))
      .filter((b) => b.status !== 'RESOLVED');
  }

  async getBarrierDashboard(tenantId: string, unitId: string): Promise<BarrierDashboard> {
    const allBarrierDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[DISCHARGE_ENHANCED:BARRIER]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const barriers = allBarrierDocs.map((doc) => ({
      id: doc.id,
      ...(JSON.parse(doc.content as string) as StoredBarrier),
      createdAt: doc.createdAt,
    }));

    const activeBarriers = barriers.filter((b) => b.status !== 'RESOLVED');

    // Unique patients with active barriers
    const patientsWithBarriers = new Set(activeBarriers.map((b) => b.patientId));

    // Average delay: days from identifiedDate to now for active barriers
    const now = Date.now();
    const delays = activeBarriers.map((b) => {
      const identified = new Date(b.identifiedDate).getTime();
      return (now - identified) / (1000 * 60 * 60 * 24);
    });
    const averageDelayDays = delays.length > 0
      ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
      : 0;

    // Top barrier types
    const typeCounts = new Map<string, number>();
    for (const b of activeBarriers) {
      typeCounts.set(b.barrierType, (typeCounts.get(b.barrierType) ?? 0) + 1);
    }
    const topBarrierTypes = [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const escalatedBarriers = activeBarriers.filter((b) => b.escalated).length;

    return {
      unitId,
      totalPatientsWithBarriers: patientsWithBarriers.size,
      totalActiveBarriers: activeBarriers.length,
      averageDelayDays,
      topBarrierTypes,
      escalatedBarriers,
    };
  }

  // ─── 5. Multidisciplinary Rounding ──────────────────────────────────────

  async createRoundingNote(tenantId: string, userId: string, dto: RoundingDto) {
    this.logger.log(`Creating rounding note for encounter ${dto.encounterId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: 'system',
        encounterId: dto.encounterId,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE_ENHANCED:ROUNDING] Multidisciplinary Round',
        content: JSON.stringify({
          docType: 'MULTIDISCIPLINARY_ROUND_ENHANCED',
          encounterId: dto.encounterId,
          date: dto.date,
          participants: dto.participants,
          checklist: dto.checklist as unknown as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        } satisfies StoredRounding),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      encounterId: dto.encounterId,
      date: dto.date,
      participantCount: dto.participants.filter((p) => p.present).length,
      goalsCount: dto.checklist.todaysGoals.length,
      pendingTasksCount: dto.checklist.pendingTasks.length,
      createdAt: doc.createdAt,
    };
  }

  async getRoundingHistory(tenantId: string, encounterId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:ROUNDING]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...(JSON.parse(doc.content as string) as StoredRounding),
      createdAt: doc.createdAt,
    }));
  }

  async getPatientRoundingSummary(tenantId: string, encounterId: string) {
    const latest = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        encounterId,
        title: { startsWith: '[DISCHARGE_ENHANCED:ROUNDING]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return { encounterId, latestRound: null };
    }

    const content = JSON.parse(latest.content as string) as StoredRounding;
    return {
      encounterId,
      latestRound: {
        id: latest.id,
        date: content.date,
        participants: content.participants,
        checklist: content.checklist,
        createdAt: latest.createdAt,
      },
    };
  }

  // ─── 6. Bed Regulation / Central de Vagas ───────────────────────────────

  async requestBed(tenantId: string, userId: string, dto: BedRequestDto) {
    this.logger.log(`Bed request from ${dto.requestingUnit} for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: null,
        authorId: userId,
        tenantId,
        type: 'CUSTOM',
        title: `[DISCHARGE_ENHANCED:BED_REQUEST] ${dto.requestedBedType} - ${dto.urgency}`,
        content: JSON.stringify({
          docType: 'BED_REQUEST',
          requestingUnit: dto.requestingUnit,
          patientId: dto.patientId,
          requestedBedType: dto.requestedBedType,
          urgency: dto.urgency,
          clinicalSummary: dto.clinicalSummary,
          currentLocation: dto.currentLocation,
          requestedAt: new Date().toISOString(),
          status: BedRequestStatus.PENDING,
          allocatedBed: undefined,
          approvedBy: undefined,
          denialReason: undefined,
          responseTime: undefined,
        } satisfies StoredBedRequest),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      requestedBedType: dto.requestedBedType,
      urgency: dto.urgency,
      status: BedRequestStatus.PENDING,
      createdAt: doc.createdAt,
    };
  }

  async updateBedRequestStatus(
    tenantId: string,
    requestId: string,
    dto: UpdateBedRequestStatusDto,
  ) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { id: requestId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Bed request ${requestId} not found`);
    }

    const content = JSON.parse(existing.content as string) as StoredBedRequest;
    content.status = dto.status;

    if (dto.status === BedRequestStatus.APPROVED || dto.status === BedRequestStatus.DENIED) {
      content.responseTime = new Date().toISOString();
    }
    if (dto.allocatedBed) content.allocatedBed = dto.allocatedBed;
    if (dto.approvedBy) content.approvedBy = dto.approvedBy;
    if (dto.denialReason) content.denialReason = dto.denialReason;

    await this.prisma.clinicalDocument.update({
      where: { id: requestId },
      data: {
        content: JSON.stringify(content),
        title: `[DISCHARGE_ENHANCED:BED_REQUEST] ${content.requestedBedType} - ${content.urgency} [${dto.status}]`,
      },
    });

    return { id: requestId, status: dto.status, allocatedBed: content.allocatedBed ?? null };
  }

  async getRegulationDashboard(tenantId: string): Promise<BedRegulationDashboard> {
    const allRequests = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[DISCHARGE_ENHANCED:BED_REQUEST]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requests = allRequests.map((doc) => ({
      id: doc.id,
      ...(JSON.parse(doc.content as string) as StoredBedRequest),
      docCreatedAt: doc.createdAt,
    }));

    const pending = requests.filter((r) => r.status === BedRequestStatus.PENDING);
    const approved = requests.filter((r) => r.status === BedRequestStatus.APPROVED);
    const allocated = requests.filter((r) => r.status === BedRequestStatus.ALLOCATED);

    // Pending by urgency
    const pendingByUrgency: Record<string, number> = {};
    for (const r of pending) {
      pendingByUrgency[r.urgency] = (pendingByUrgency[r.urgency] ?? 0) + 1;
    }

    // Average response time in minutes for responded requests
    const respondedRequests = requests.filter((r) => r.responseTime && r.requestedAt);
    let avgResponseMinutes = 0;
    if (respondedRequests.length > 0) {
      const totalMinutes = respondedRequests.reduce((sum, r) => {
        const requested = new Date(r.requestedAt).getTime();
        const responded = new Date(r.responseTime!).getTime();
        return sum + (responded - requested) / (1000 * 60);
      }, 0);
      avgResponseMinutes = Math.round(totalMinutes / respondedRequests.length);
    }

    return {
      pendingRequestsByUrgency: pendingByUrgency,
      totalPending: pending.length,
      totalApproved: approved.length,
      totalAllocated: allocated.length,
      averageResponseTimeMinutes: avgResponseMinutes,
    };
  }
}
