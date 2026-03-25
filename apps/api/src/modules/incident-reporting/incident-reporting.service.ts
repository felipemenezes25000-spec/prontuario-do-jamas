import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateIncidentDto,
  UpdateInvestigationDto,
  UpdateActionPlanDto,
  IncidentStatus,
} from './dto/create-incident-reporting.dto';

@Injectable()
export class IncidentReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async createIncident(tenantId: string, authorId: string, dto: CreateIncidentDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId ?? authorId, // fallback for non-patient incidents
        encounterId: dto.encounterId,
        authorId: dto.anonymous ? authorId : authorId,
        tenantId,
        type: 'CUSTOM',
        title: `Incident Report — ${dto.type} — ${dto.severity}`,
        content: JSON.stringify({
          documentType: 'INCIDENT_REPORT',
          incidentType: dto.type,
          severity: dto.severity,
          description: dto.description,
          location: dto.location,
          occurredAt: dto.occurredAt ?? new Date().toISOString(),
          involvedPersons: dto.involvedPersons,
          immediateActions: dto.immediateActions,
          anonymous: dto.anonymous ?? false,
          status: IncidentStatus.REPORTED,
          investigation: null,
          actionPlan: null,
          reportedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, type: dto.type, severity: dto.severity, status: IncidentStatus.REPORTED, createdAt: doc.createdAt };
  }

  async listIncidents(tenantId: string, filters: { type?: string; severity?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Incident Report' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.clinicalDocument.count({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Incident Report' },
      },
    });

    const data = docs.map((d) => ({
      id: d.id,
      ...JSON.parse(d.content ?? '{}'),
      author: d.author,
      patient: d.patient,
      createdAt: d.createdAt,
    }));

    // Apply in-memory filters on parsed content
    const filtered = data.filter((d) => {
      if (filters.type && d.incidentType !== filters.type) return false;
      if (filters.severity && d.severity !== filters.severity) return false;
      if (filters.status && d.status !== filters.status) return false;
      return true;
    });

    return { data: filtered, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncidentById(tenantId: string, id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, type: 'CUSTOM' },
      include: {
        author: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
    if (!doc) throw new NotFoundException(`Incident "${id}" not found`);

    return {
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      author: doc.author,
      patient: doc.patient,
      createdAt: doc.createdAt,
    };
  }

  async updateInvestigation(tenantId: string, authorId: string, id: string, dto: UpdateInvestigationDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException(`Incident "${id}" not found`);

    const existing = JSON.parse(doc.content ?? '{}');
    existing.investigation = {
      rootCauseAnalysis: dto.rootCauseAnalysis,
      contributingFactors: dto.contributingFactors,
      classificationAfterInvestigation: dto.classificationAfterInvestigation,
      investigatorNotes: dto.investigatorNotes,
      investigatedBy: authorId,
      investigatedAt: new Date().toISOString(),
    };
    existing.status = IncidentStatus.UNDER_INVESTIGATION;

    await this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(existing) },
    });

    return { id, status: existing.status, investigation: existing.investigation };
  }

  async updateActionPlan(tenantId: string, authorId: string, id: string, dto: UpdateActionPlanDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId },
    });
    if (!doc) throw new NotFoundException(`Incident "${id}" not found`);

    const existing = JSON.parse(doc.content ?? '{}');
    existing.actionPlan = {
      actions: dto.actions,
      responsiblePerson: dto.responsiblePerson,
      dueDate: dto.dueDate,
      preventiveMeasures: dto.preventiveMeasures,
      notes: dto.notes,
      createdBy: authorId,
      createdAt: new Date().toISOString(),
    };
    existing.status = IncidentStatus.ACTION_PLAN;

    await this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(existing) },
    });

    return { id, status: existing.status, actionPlan: existing.actionPlan };
  }

  async getDashboard(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Incident Report' },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const doc of docs) {
      const content = JSON.parse(doc.content ?? '{}');
      byType[content.incidentType] = (byType[content.incidentType] ?? 0) + 1;
      bySeverity[content.severity] = (bySeverity[content.severity] ?? 0) + 1;
      byStatus[content.status] = (byStatus[content.status] ?? 0) + 1;
    }

    return {
      period: '30d',
      totalIncidents: docs.length,
      byType,
      bySeverity,
      byStatus,
    };
  }

  // ─── Near-Miss Reporting ────────────────────────────────────────────────────

  async reportNearMiss(tenantId: string, authorId: string, dto: {
    description: string;
    location?: string;
    interceptedBy?: string;
    howIntercepted: string;
    potentialConsequence: string;
    patientId?: string;
    anonymous?: boolean;
  }) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId ?? authorId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `NEAR_MISS:${dto.potentialConsequence.slice(0, 50)}`,
        content: JSON.stringify({
          documentType: 'NEAR_MISS',
          description: dto.description,
          location: dto.location,
          interceptedBy: dto.interceptedBy,
          howIntercepted: dto.howIntercepted,
          potentialConsequence: dto.potentialConsequence,
          anonymous: dto.anonymous ?? false,
          noPunishment: true,
          learningOpportunity: true,
          status: 'REPORTED',
          reportedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, type: 'NEAR_MISS', status: 'REPORTED', createdAt: doc.createdAt };
  }

  // ─── Positive Identification Verification ───────────────────────────────────

  async verifyPositiveIdentification(tenantId: string, authorId: string, dto: {
    patientId: string;
    encounterId?: string;
    procedureType: string;
    identifier1Type: string; // NAME, MRN, DOB, WRISTBAND
    identifier1Value: string;
    identifier2Type: string;
    identifier2Value: string;
    verified: boolean;
  }) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `POSITIVE_ID:${dto.procedureType}:${dto.verified ? 'VERIFIED' : 'FAILED'}`,
        content: JSON.stringify({
          documentType: 'POSITIVE_IDENTIFICATION',
          procedureType: dto.procedureType,
          identifiers: [
            { type: dto.identifier1Type, value: dto.identifier1Value },
            { type: dto.identifier2Type, value: dto.identifier2Value },
          ],
          verified: dto.verified,
          verifiedBy: authorId,
          verifiedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, verified: dto.verified, procedureType: dto.procedureType };
  }

  // ─── Visual Allergy Signaling ───────────────────────────────────────────────

  async getAllergyAlerts(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true, allergies: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const allergies = patient.allergies ?? [];
    const hasAllergies = allergies.length > 0;

    return {
      patientId,
      patientName: patient.fullName,
      hasAllergies,
      alertLevel: hasAllergies ? 'RED' : 'NONE',
      allergies,
      displayIcon: hasAllergies ? 'ALLERGY_RED_ICON' : null,
      wristbandColor: hasAllergies ? 'RED' : 'WHITE',
      prescriptionPopup: hasAllergies,
    };
  }

  // ─── Invasive Procedure Timeout ─────────────────────────────────────────────

  async recordTimeout(tenantId: string, authorId: string, dto: {
    patientId: string;
    encounterId?: string;
    procedureName: string;
    procedureType: string; // BIOPSY, CVC, CHEST_TUBE, LUMBAR_PUNCTURE, etc.
    checklist: Array<{ item: string; confirmed: boolean }>;
    teamMembers: string[];
    site?: string;
    laterality?: string;
  }) {
    const allConfirmed = dto.checklist.every((c) => c.confirmed);
    const now = new Date().toISOString();

    const defaultChecklist = [
      'Identificação do paciente confirmada',
      'Procedimento correto confirmado',
      'Lateralidade/sítio confirmado',
      'Consentimento informado assinado',
      'Alergias verificadas',
      'Materiais e equipamentos prontos',
      'Reserva de sangue (se aplicável)',
    ];

    const finalChecklist = dto.checklist.length > 0
      ? dto.checklist
      : defaultChecklist.map((item) => ({ item, confirmed: false }));

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `TIMEOUT:${dto.procedureType}:${allConfirmed ? 'COMPLETE' : 'INCOMPLETE'}`,
        content: JSON.stringify({
          documentType: 'PROCEDURE_TIMEOUT',
          procedureName: dto.procedureName,
          procedureType: dto.procedureType,
          site: dto.site,
          laterality: dto.laterality,
          checklist: finalChecklist,
          allConfirmed,
          teamMembers: dto.teamMembers,
          timeoutAt: now,
          conductedBy: authorId,
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, allConfirmed, procedureType: dto.procedureType };
  }

  // ─── Root Cause Analysis (Ishikawa, 5 Whys) ────────────────────────────────

  async createRCA(tenantId: string, authorId: string, incidentId: string, dto: {
    method: 'ISHIKAWA' | 'FIVE_WHYS' | 'BOTH';
    ishikawa?: {
      manpower: string[];
      method: string[];
      material: string[];
      machine: string[];
      measurement: string[];
      environment: string[];
    };
    fiveWhys?: Array<{ why: string; answer: string }>;
    rootCause: string;
    correctiveActions: Array<{ action: string; responsible: string; dueDate: string; status: string }>;
    followUpDate?: string;
  }) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id: incidentId, tenantId } });
    if (!doc) throw new NotFoundException('Incidente não encontrado.');

    const existing = JSON.parse(doc.content ?? '{}');
    existing.rootCauseAnalysis = {
      method: dto.method,
      ishikawa: dto.ishikawa,
      fiveWhys: dto.fiveWhys,
      rootCause: dto.rootCause,
      correctiveActions: dto.correctiveActions,
      followUpDate: dto.followUpDate,
      analyzedBy: authorId,
      analyzedAt: new Date().toISOString(),
    };
    existing.status = IncidentStatus.UNDER_INVESTIGATION;

    await this.prisma.clinicalDocument.update({
      where: { id: incidentId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: incidentId, rootCauseAnalysis: existing.rootCauseAnalysis };
  }

  // ─── Adverse Event Classification (NCC MERP) ───────────────────────────────

  async classifyAdverseEvent(tenantId: string, incidentId: string, dto: {
    nccMerpCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
    whoClassification?: string;
    description: string;
  }) {
    const nccMerpDescriptions: Record<string, string> = {
      A: 'Circunstâncias com capacidade de causar erro',
      B: 'Erro ocorreu mas não atingiu o paciente',
      C: 'Erro atingiu o paciente, sem dano',
      D: 'Erro atingiu o paciente, necessitou monitorização',
      E: 'Erro contribuiu para dano temporário, necessitou intervenção',
      F: 'Erro contribuiu para dano temporário com hospitalização prolongada',
      G: 'Erro contribuiu para dano permanente ao paciente',
      H: 'Erro necessitou intervenção para sustentação de vida',
      I: 'Erro contribuiu para morte do paciente',
    };

    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id: incidentId, tenantId } });
    if (!doc) throw new NotFoundException('Incidente não encontrado.');

    const existing = JSON.parse(doc.content ?? '{}');
    existing.adverseEventClassification = {
      nccMerpCategory: dto.nccMerpCategory,
      nccMerpDescription: nccMerpDescriptions[dto.nccMerpCategory],
      whoClassification: dto.whoClassification,
      description: dto.description,
      classifiedAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.update({
      where: { id: incidentId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: incidentId, classification: existing.adverseEventClassification };
  }

  // ─── Medical Device Tracking & Recall ───────────────────────────────────────

  async trackDevice(tenantId: string, authorId: string, dto: {
    patientId: string;
    encounterId?: string;
    deviceName: string;
    manufacturer: string;
    lotNumber: string;
    serialNumber?: string;
    expiryDate: string;
    implantDate?: string;
    anvisaRegistration?: string;
  }) {
    const isExpired = new Date(dto.expiryDate) < new Date();

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `DEVICE_TRACKING:${dto.deviceName}:${dto.lotNumber}`,
        content: JSON.stringify({
          documentType: 'DEVICE_TRACKING',
          ...dto,
          isExpired,
          recallStatus: 'NONE',
          trackedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, deviceName: dto.deviceName, lotNumber: dto.lotNumber, isExpired };
  }

  // ─── Safety Indicators Dashboard ────────────────────────────────────────────

  async getSafetyIndicatorsDashboard(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const incidents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'Incident Report' },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Parse incidents and count by type
    const fallCount = incidents.filter((d) => {
      const c = JSON.parse(d.content ?? '{}');
      return c.incidentType === 'FALL';
    }).length;

    const pressureInjuryCount = incidents.filter((d) => {
      const c = JSON.parse(d.content ?? '{}');
      return c.incidentType === 'PRESSURE_INJURY';
    }).length;

    const infectionCount = incidents.filter((d) => {
      const c = JSON.parse(d.content ?? '{}');
      return c.incidentType === 'INFECTION';
    }).length;

    const medicationErrorCount = incidents.filter((d) => {
      const c = JSON.parse(d.content ?? '{}');
      return c.incidentType === 'MEDICATION_ERROR';
    }).length;

    // Estimate patient-days (simplified)
    const admissions = await this.prisma.admission.count({
      where: { tenantId, admissionDate: { gte: thirtyDaysAgo } },
    });
    const estimatedPatientDays = Math.max(admissions * 5, 1); // ~5 day average LOS

    return {
      period: '30d',
      estimatedPatientDays,
      indicators: [
        { name: 'Taxa de Queda', value: Math.round((fallCount / estimatedPatientDays) * 1000 * 100) / 100, unit: 'por 1000 pacientes-dia', count: fallCount },
        { name: 'Taxa de LPP', value: Math.round((pressureInjuryCount / estimatedPatientDays) * 1000 * 100) / 100, unit: 'por 1000 pacientes-dia', count: pressureInjuryCount },
        { name: 'Taxa de ISC', value: Math.round((infectionCount / estimatedPatientDays) * 1000 * 100) / 100, unit: 'por 1000 pacientes-dia', count: infectionCount },
        { name: 'Erros de Medicação', value: Math.round((medicationErrorCount / estimatedPatientDays) * 1000 * 100) / 100, unit: 'por 1000 pacientes-dia', count: medicationErrorCount },
        { name: 'Total EA', value: Math.round((incidents.length / estimatedPatientDays) * 1000 * 100) / 100, unit: 'por 1000 pacientes-dia', count: incidents.length },
      ],
      totalIncidents: incidents.length,
    };
  }

  // ─── FMEA (Failure Mode and Effects Analysis) ──────────────────────────────

  async createFMEA(tenantId: string, authorId: string, dto: {
    processName: string;
    teamMembers: string[];
    failureModes: Array<{
      step: string;
      failureMode: string;
      effect: string;
      severity: number; // 1-10
      occurrence: number; // 1-10
      detection: number; // 1-10
      currentControls?: string;
      recommendedActions?: string;
      responsible?: string;
    }>;
  }) {
    const failureModesWithRPN = dto.failureModes.map((fm) => ({
      ...fm,
      rpn: fm.severity * fm.occurrence * fm.detection,
    })).sort((a, b) => b.rpn - a.rpn);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: authorId, // placeholder
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `FMEA:${dto.processName}`,
        content: JSON.stringify({
          documentType: 'FMEA',
          processName: dto.processName,
          teamMembers: dto.teamMembers,
          failureModes: failureModesWithRPN,
          highestRPN: failureModesWithRPN[0]?.rpn ?? 0,
          criticalItems: failureModesWithRPN.filter((fm) => fm.rpn >= 200).length,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      processName: dto.processName,
      totalFailureModes: failureModesWithRPN.length,
      criticalItems: failureModesWithRPN.filter((fm) => fm.rpn >= 200).length,
      topRisks: failureModesWithRPN.slice(0, 5),
    };
  }

  // ─── AI: Preventable Readmission Prediction ────────────────────────────────

  async predictReadmission(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        encounters: { orderBy: { createdAt: 'desc' }, take: 10 },
        admissions: { orderBy: { admissionDate: 'desc' }, take: 5 },
        allergies: { select: { id: true } },
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const recentAdmissions = patient.admissions.length;
    const encounterCount = patient.encounters.length;

    // Risk factors (simplified ML model)
    let riskScore = 0;
    if (recentAdmissions >= 3) riskScore += 0.3;
    else if (recentAdmissions >= 2) riskScore += 0.15;
    if (encounterCount > 8) riskScore += 0.1;
    if (patient.birthDate) {
      const age = Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age >= 75) riskScore += 0.25;
      else if (age >= 65) riskScore += 0.15;
    }
    if (patient.allergies.length > 0) riskScore += 0.05;

    const riskLevel = riskScore >= 0.5 ? 'HIGH' : riskScore >= 0.25 ? 'MODERATE' : 'LOW';

    return {
      patientId,
      patientName: patient.fullName,
      readmissionRisk: Math.round(riskScore * 100),
      riskLevel,
      riskFactors: [
        recentAdmissions >= 2 ? `${recentAdmissions} internações recentes` : null,
        encounterCount > 8 ? `${encounterCount} atendimentos recentes` : null,
      ].filter(Boolean),
      recommendations: riskLevel === 'HIGH'
        ? ['Agendar consulta ambulatorial em 7 dias', 'Contato telefônico em 48h pós-alta', 'Reconciliação medicamentosa detalhada']
        : riskLevel === 'MODERATE'
          ? ['Agendar consulta ambulatorial em 14 dias', 'Orientação de alta reforçada']
          : ['Follow-up padrão'],
    };
  }

  // ─── AI: Real-time Medication Error Detection ──────────────────────────────

  async detectMedicationErrors(tenantId: string) {
    const recentChecks = await this.prisma.medicationCheck.findMany({
      where: {
        prescriptionItem: { prescription: { tenantId } },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        prescriptionItem: {
          select: {
            medicationName: true,
            dose: true,
            route: true,
            frequency: true,
            prescription: { select: { patient: { select: { id: true, fullName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const alerts: Array<{
      type: string;
      severity: string;
      patientName: string;
      medication: string;
      detail: string;
    }> = [];

    // Check for missed doses
    const missedDoses = recentChecks.filter((c) => c.status === 'MISSED' || c.status === 'REFUSED');
    for (const missed of missedDoses.slice(0, 10)) {
      alerts.push({
        type: 'MISSED_DOSE',
        severity: 'WARNING',
        patientName: missed.prescriptionItem?.prescription?.patient?.fullName ?? 'N/A',
        medication: missed.prescriptionItem?.medicationName ?? 'N/A',
        detail: `Dose não administrada: ${missed.reason ?? 'sem motivo registrado'}`,
      });
    }

    // Check for late administrations
    const lateAdministrations = recentChecks.filter((c) => {
      if (!c.scheduledAt || !c.checkedAt) return false;
      const diff = c.checkedAt.getTime() - c.scheduledAt.getTime();
      return diff > 60 * 60 * 1000; // > 1 hour late
    });

    for (const late of lateAdministrations.slice(0, 10)) {
      alerts.push({
        type: 'LATE_ADMINISTRATION',
        severity: 'INFO',
        patientName: late.prescriptionItem?.prescription?.patient?.fullName ?? 'N/A',
        medication: late.prescriptionItem?.medicationName ?? 'N/A',
        detail: 'Administração com atraso > 1 hora',
      });
    }

    return {
      period: '24h',
      totalChecks: recentChecks.length,
      missedDoses: missedDoses.length,
      lateAdministrations: lateAdministrations.length,
      alerts,
      alertCount: alerts.length,
    };
  }
}
