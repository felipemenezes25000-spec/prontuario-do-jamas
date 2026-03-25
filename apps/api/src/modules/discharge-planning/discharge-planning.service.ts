import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDischargeInstructionsDto,
  CreateHomePrescriptionDto,
  CreateDischargeChecklistDto,
  CreateDischargeBarrierDto,
  ResolveDischargeBarrierDto,
  CreateMultidisciplinaryRoundDto,
  BedAllocationSuggestionDto,
} from './dto/discharge-planning.dto';

@Injectable()
export class DischargePlanningService {
  private readonly logger = new Logger(DischargePlanningService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Discharge Instructions ─────────────────────────────────────────────

  async createDischargeInstructions(
    tenantId: string,
    authorId: string,
    dto: CreateDischargeInstructionsDto,
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE:INSTRUCTIONS] Discharge Instructions',
        content: JSON.stringify({
          docType: 'DISCHARGE_INSTRUCTIONS',
          medications: dto.medications,
          dietInstructions: dto.dietInstructions,
          activityRestrictions: dto.activityRestrictions,
          warningSigns: dto.warningSigns,
          followUpAppointments: dto.followUpAppointments,
          woundCareInstructions: dto.woundCareInstructions,
          additionalInstructions: dto.additionalInstructions,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async getDischargeInstructions(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[DISCHARGE:INSTRUCTIONS]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ─── Home Prescription ──────────────────────────────────────────────────

  async createHomePrescription(
    tenantId: string,
    authorId: string,
    dto: CreateHomePrescriptionDto,
  ) {
    const continuousMeds = dto.medications.filter((m) => m.continuousUse).length;
    const tempMeds = dto.medications.filter((m) => !m.continuousUse).length;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE:HOME_PRESCRIPTION] Home Prescription',
        content: JSON.stringify({
          docType: 'HOME_PRESCRIPTION',
          medications: dto.medications,
          continuousMedicationsCount: continuousMeds,
          temporaryMedicationsCount: tempMeds,
          totalMedications: dto.medications.length,
          pharmacyNotes: dto.pharmacyNotes,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      continuousMedicationsCount: continuousMeds,
      temporaryMedicationsCount: tempMeds,
      createdAt: doc.createdAt,
    };
  }

  // ─── Safe Discharge Checklist ───────────────────────────────────────────

  async createDischargeChecklist(
    tenantId: string,
    authorId: string,
    dto: CreateDischargeChecklistDto,
  ) {
    const items: Record<string, boolean> = {
      medicationReconciliationDone: dto.medicationReconciliationDone,
      dischargeInstructionsGiven: dto.dischargeInstructionsGiven,
      followUpScheduled: dto.followUpScheduled,
      pendingTestsReviewed: dto.pendingTestsReviewed,
      patientEducationCompleted: dto.patientEducationCompleted,
      transportArranged: dto.transportArranged,
      equipmentArranged: dto.equipmentArranged,
      homeCareReferralDone: dto.homeCareReferralDone,
      primaryCarePhysicianNotified: dto.primaryCarePhysicianNotified,
      dischargeSummaryCompleted: dto.dischargeSummaryCompleted,
    };

    const completedCount = Object.values(items).filter(Boolean).length;
    const totalCount = Object.keys(items).length;
    const compliance = Math.round((completedCount / totalCount) * 100);
    const safeToDischarge = compliance === 100;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE:CHECKLIST] Safe Discharge Checklist',
        content: JSON.stringify({
          docType: 'DISCHARGE_CHECKLIST',
          items,
          completedCount,
          totalCount,
          compliance,
          safeToDischarge,
          additionalNotes: dto.additionalNotes,
          checkedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      compliance,
      safeToDischarge,
      completedCount,
      totalCount,
      createdAt: doc.createdAt,
    };
  }

  // ─── Barrier to Discharge ───────────────────────────────────────────────

  async createDischargeBarrier(
    tenantId: string,
    authorId: string,
    dto: CreateDischargeBarrierDto,
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[DISCHARGE:BARRIER] ${dto.barrierType}`,
        content: JSON.stringify({
          docType: 'DISCHARGE_BARRIER',
          barrierType: dto.barrierType,
          description: dto.description,
          responsiblePerson: dto.responsiblePerson,
          expectedResolutionDate: dto.expectedResolutionDate,
          status: dto.status ?? 'ACTIVE',
          resolvedAt: null,
          resolutionNotes: null,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, barrierType: dto.barrierType, createdAt: doc.createdAt };
  }

  async resolveDischargeBarrier(
    tenantId: string,
    authorId: string,
    dto: ResolveDischargeBarrierDto,
  ) {
    const existing = await this.prisma.clinicalDocument.findUnique({
      where: { id: dto.barrierDocumentId },
    });
    if (!existing) throw new NotFoundException(`Barrier document "${dto.barrierDocumentId}" not found`);

    const content = JSON.parse(existing.content as string);
    content.status = 'RESOLVED';
    content.resolvedAt = new Date().toISOString();
    content.resolvedBy = authorId;
    content.resolutionNotes = dto.resolutionNotes;

    await this.prisma.clinicalDocument.update({
      where: { id: dto.barrierDocumentId },
      data: { content: JSON.stringify(content) },
    });

    return { id: dto.barrierDocumentId, status: 'RESOLVED' };
  }

  async getActiveBarriers(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[DISCHARGE:BARRIER]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs
      .map((doc) => ({
        id: doc.id,
        ...JSON.parse(doc.content as string),
        createdAt: doc.createdAt,
      }))
      .filter((b) => b.status !== 'RESOLVED');
  }

  async getAllBarriers(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[DISCHARGE:BARRIER]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ─── Multidisciplinary Rounding ─────────────────────────────────────────

  async createMultidisciplinaryRound(
    tenantId: string,
    authorId: string,
    dto: CreateMultidisciplinaryRoundDto,
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[DISCHARGE:ROUNDING] Multidisciplinary Round',
        content: JSON.stringify({
          docType: 'MULTIDISCIPLINARY_ROUND',
          participants: dto.participants,
          pendingTasks: dto.pendingTasks,
          dailyGoals: dto.dailyGoals,
          estimatedDischargeDate: dto.estimatedDischargeDate,
          dischargeReadiness: dto.dischargeReadiness,
          notes: dto.notes,
          completedPendingTasks: 0,
          totalPendingTasks: dto.pendingTasks.length,
          roundedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async getRoundingHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[DISCHARGE:ROUNDING]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ─── AI Bed Allocation Suggestion ───────────────────────────────────────

  async getBedAllocationSuggestion(tenantId: string, _dto: BedAllocationSuggestionDto) {
    // Fetch current bed occupancy data
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        actualDischargeDate: null,
      },
      include: {
        patient: { select: { fullName: true } },
        currentBed: { select: { bedNumber: true, ward: true } },
      },
    });

    // Fetch patients with barriers
    const barriersRaw = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[DISCHARGE:BARRIER]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeBarriers = barriersRaw
      .map((doc) => ({
        id: doc.id,
        patientId: doc.patientId,
        ...JSON.parse(doc.content as string),
      }))
      .filter((b) => b.status !== 'RESOLVED');

    // Fetch discharge checklists to identify patients ready for discharge
    const checklistDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[DISCHARGE:CHECKLIST]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const patientReadiness = new Map<string, number>();
    for (const doc of checklistDocs) {
      if (!patientReadiness.has(doc.patientId)) {
        const content = JSON.parse(doc.content as string);
        patientReadiness.set(doc.patientId, content.compliance ?? 0);
      }
    }

    // Build suggestion: patients closest to discharge first
    const patientsNearDischarge = admissions
      .filter((a) => {
        const readiness = patientReadiness.get(a.patientId) ?? 0;
        return readiness >= 70;
      })
      .map((a) => ({
        patientId: a.patientId,
        patientName: a.patient.fullName,
        bed: a.currentBed?.bedNumber ?? null,
        ward: a.currentBed?.ward ?? null,
        dischargeReadiness: patientReadiness.get(a.patientId) ?? 0,
        activeBarriers: activeBarriers.filter((b) => b.patientId === a.patientId).length,
      }))
      .sort((a, b) => b.dischargeReadiness - a.dischargeReadiness);

    return {
      totalOccupiedBeds: admissions.length,
      patientsNearDischarge,
      patientsWithBarriers: activeBarriers.length,
      suggestion: patientsNearDischarge.length > 0
        ? `${patientsNearDischarge.length} paciente(s) com alta iminente. Leito mais provável a liberar: ${patientsNearDischarge[0]?.bed ?? 'N/A'} (${patientsNearDischarge[0]?.ward ?? 'N/A'}).`
        : 'Nenhum paciente com alta iminente identificado no momento.',
    };
  }

  // ─── Discharge Summary (aggregated view) ────────────────────────────────

  async getDischargeSummary(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[DISCHARGE:' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const instructions = docs
      .filter((d) => d.title.includes('[DISCHARGE:INSTRUCTIONS]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const prescriptions = docs
      .filter((d) => d.title.includes('[DISCHARGE:HOME_PRESCRIPTION]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const checklists = docs
      .filter((d) => d.title.includes('[DISCHARGE:CHECKLIST]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const barriers = docs
      .filter((d) => d.title.includes('[DISCHARGE:BARRIER]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const rounds = docs
      .filter((d) => d.title.includes('[DISCHARGE:ROUNDING]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const latestChecklist = checklists[0];
    const activeBarriers = barriers.filter((b) => b.status !== 'RESOLVED');

    return {
      patientId,
      instructions: instructions[0] ?? null,
      homePrescription: prescriptions[0] ?? null,
      latestChecklist: latestChecklist ?? null,
      safeToDischarge: latestChecklist?.safeToDischarge ?? false,
      activeBarriers,
      resolvedBarriers: barriers.filter((b) => b.status === 'RESOLVED'),
      roundingHistory: rounds,
    };
  }
}
