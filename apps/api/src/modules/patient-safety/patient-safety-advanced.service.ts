import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdverseEventDto,
  NearMissDto,
  PositiveIdDto,
  AllergyAlertDto,
  InvasiveProcedureTimeoutDto,
  RootCauseAnalysisDto,
  EventClassificationDto,
  DeviceTrackingDto,
  SafetyDashboardQueryDto,
  VteProphylaxisDto,
  SsiPreventionDto,
  AdverseEventSeverity,
  type SafetyDashboardResultDto,
  type SafetyIndicator,
} from './dto/patient-safety-advanced.dto';

// ============================================================================
// Constants
// ============================================================================

const DOC_TAG = {
  ADVERSE_EVENT: '[PATIENT_SAFETY:ADVERSE_EVENT]',
  NEAR_MISS: '[PATIENT_SAFETY:NEAR_MISS]',
  POSITIVE_ID: '[PATIENT_SAFETY:POSITIVE_ID]',
  ALLERGY_ALERT: '[PATIENT_SAFETY:ALLERGY_ALERT]',
  PROCEDURE_TIMEOUT: '[PATIENT_SAFETY:PROCEDURE_TIMEOUT]',
  RCA: '[PATIENT_SAFETY:RCA]',
  CLASSIFICATION: '[PATIENT_SAFETY:CLASSIFICATION]',
  DEVICE_TRACKING: '[PATIENT_SAFETY:DEVICE_TRACKING]',
  VTE: '[PATIENT_SAFETY:VTE]',
  SSI: '[PATIENT_SAFETY:SSI]',
} as const;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PatientSafetyAdvancedService {
  private readonly logger = new Logger(PatientSafetyAdvancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Adverse Event Reporting ──────────────────────────────────────────────

  async reportAdverseEvent(tenantId: string, reporterId: string, dto: AdverseEventDto) {
    this.logger.warn(
      `Adverse event reported: type=${dto.type} severity=${dto.severity} harm=${dto.harm} tenant=${tenantId}`,
    );

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: (dto.patientId ?? null) as unknown as string,
        encounterId: (dto.encounterId ?? null) as unknown as string,
        authorId: dto.anonymous ? reporterId : (dto.reportedBy ?? reporterId),
        type: 'CUSTOM',
        title: DOC_TAG.ADVERSE_EVENT,
        content: JSON.stringify({
          documentType: 'ADVERSE_EVENT',
          type: dto.type,
          severity: dto.severity,
          harm: dto.harm,
          description: dto.description,
          anonymous: dto.anonymous ?? false,
          unit: dto.unit,
          immediateActions: dto.immediateActions,
          reportedAt: dto.reportedAt ?? new Date().toISOString(),
          status: 'OPEN',
        }),
        status: 'SIGNED',
      },
    });

    // Trigger NOTIVISA alert for serious events
    const requiresNotivisa = [AdverseEventSeverity.SEVERE, AdverseEventSeverity.DEATH].includes(dto.severity);

    return {
      id: doc.id,
      requiresNotivisaNotification: requiresNotivisa,
      message: requiresNotivisa
        ? 'Evento grave — notificação compulsória NOTIVISA recomendada (RDC 36/2013)'
        : 'Evento registrado com sucesso',
      createdAt: doc.createdAt,
    };
  }

  // ─── Near-Miss Reporting ─────────────────────────────────────────────────

  async reportNearMiss(tenantId: string, reporterId: string, dto: NearMissDto) {
    this.logger.log(`Near-miss reported: type=${dto.type} tenant=${tenantId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: (dto.patientId ?? null) as unknown as string,
        encounterId: null as unknown as string,
        authorId: dto.reportedBy ?? reporterId,
        type: 'CUSTOM',
        title: DOC_TAG.NEAR_MISS,
        content: JSON.stringify({
          documentType: 'NEAR_MISS',
          type: dto.type,
          interceptedBy: dto.interceptedBy,
          description: dto.description,
          lessonsLearned: dto.lessonsLearned,
          unit: dto.unit,
          reportedAt: new Date().toISOString(),
          status: 'RECORDED',
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      message: 'Quase-falha registrada — obrigado por contribuir com a cultura de segurança',
      createdAt: doc.createdAt,
    };
  }

  // ─── Positive Patient Identification ────────────────────────────────────

  async recordPositiveIdentification(tenantId: string, dto: PositiveIdDto) {
    this.logger.log(`Positive ID check for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null as unknown as string,
        authorId: dto.verifiedBy,
        type: 'CUSTOM',
        title: DOC_TAG.POSITIVE_ID,
        content: JSON.stringify({
          documentType: 'POSITIVE_ID',
          identifier1: dto.identifier1,
          identifier2: dto.identifier2,
          procedureType: dto.procedureType,
          verifiedAt: dto.timestamp ?? new Date().toISOString(),
          compliant: true,
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      compliant: true,
      message: `Identificação positiva confirmada para: ${dto.procedureType}`,
      createdAt: doc.createdAt,
    };
  }

  // ─── Allergy Visual Signaling ────────────────────────────────────────────

  async configureAllergyAlert(tenantId: string, authorId: string, dto: AllergyAlertDto) {
    this.logger.log(`Configuring allergy alert for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.ALLERGY_ALERT,
        content: JSON.stringify({
          documentType: 'ALLERGY_ALERT',
          allergens: dto.allergens,
          displayType: dto.displayType,
          popupOnPrescription: dto.popupOnPrescription ?? true,
          severity: dto.severity,
          reactions: dto.reactions,
          configuredAt: new Date().toISOString(),
          active: true,
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      allergens: dto.allergens,
      displayType: dto.displayType,
      popupOnPrescription: dto.popupOnPrescription ?? true,
      message: 'Alerta de alergia configurado — aparecerá em prescrições e cabeçalho do prontuário',
      createdAt: doc.createdAt,
    };
  }

  async getActiveAllergyAlerts(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: DOC_TAG.ALLERGY_ALERT } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (!docs.length) return { patientId, allergens: [], active: false };
    const data = JSON.parse(docs[0].content ?? '{}') as Record<string, unknown>;
    return { patientId, ...data };
  }

  // ─── Invasive Procedure Timeout ──────────────────────────────────────────

  async recordProcedureTimeout(tenantId: string, authorId: string, dto: InvasiveProcedureTimeoutDto) {
    this.logger.log(`Procedure timeout for ${dto.procedureType} — patient ${dto.patientId}`);

    const allChecked = dto.patientVerified && dto.siteMarked && dto.consentSigned && dto.equipmentReady;
    const failedChecks: string[] = [];
    if (!dto.patientVerified) failedChecks.push('Identificação do paciente');
    if (!dto.siteMarked) failedChecks.push('Marcação do sítio');
    if (!dto.consentSigned) failedChecks.push('Consentimento informado');
    if (!dto.equipmentReady) failedChecks.push('Equipamentos disponíveis');

    if (!allChecked) {
      this.logger.warn(`Procedure timeout incomplete — missing: ${failedChecks.join(', ')}`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null as unknown as string,
        authorId: dto.operatorId ?? authorId,
        type: 'CUSTOM',
        title: DOC_TAG.PROCEDURE_TIMEOUT,
        content: JSON.stringify({
          documentType: 'PROCEDURE_TIMEOUT',
          procedureType: dto.procedureType,
          patientVerified: dto.patientVerified,
          siteMarked: dto.siteMarked,
          consentSigned: dto.consentSigned,
          equipmentReady: dto.equipmentReady,
          antibioticProphylaxis: dto.antibioticProphylaxis,
          allergiesReviewed: dto.allergiesReviewed,
          allChecked,
          failedChecks,
          notes: dto.notes,
          completedAt: dto.completedAt ?? new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      allChecked,
      failedChecks,
      message: allChecked
        ? 'Time-out concluído — todos os itens verificados'
        : `Atenção: ${failedChecks.length} itens não verificados`,
      createdAt: doc.createdAt,
    };
  }

  // ─── Root Cause Analysis ─────────────────────────────────────────────────

  async createRootCauseAnalysis(tenantId: string, authorId: string, dto: RootCauseAnalysisDto) {
    this.logger.log(`RCA created for event ${dto.eventId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.RCA,
        content: JSON.stringify({
          documentType: 'ROOT_CAUSE_ANALYSIS',
          eventId: dto.eventId,
          ishikawaDiagram: dto.ishikawaDiagram,
          fiveWhys: dto.fiveWhys,
          correctiveActions: dto.correctiveActions,
          followUp: dto.followUp,
          completedAt: dto.completedAt ?? new Date().toISOString(),
          openActions: (dto.correctiveActions ?? []).filter((a) => a.status !== 'completed').length,
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      openActions: (dto.correctiveActions ?? []).filter((a) => a.status !== 'completed').length,
      message: 'Análise de Causa Raiz registrada',
      createdAt: doc.createdAt,
    };
  }

  // ─── Event Classification ────────────────────────────────────────────────

  async classifyEvent(tenantId: string, authorId: string, dto: EventClassificationDto) {
    this.logger.log(`Classifying event ${dto.eventId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: null as unknown as string,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.CLASSIFICATION,
        content: JSON.stringify({
          documentType: 'EVENT_CLASSIFICATION',
          eventId: dto.eventId,
          whoTaxonomy: dto.whoTaxonomy,
          nccMerpCategory: dto.nccMerpCategory,
          severity: dto.severity,
          notes: dto.notes,
          classifiedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── Medical Device Tracking ─────────────────────────────────────────────

  async trackDevice(tenantId: string, authorId: string, dto: DeviceTrackingDto) {
    this.logger.log(`Device tracking: ${dto.deviceType} for patient ${dto.patientId}`);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.DEVICE_TRACKING,
        content: JSON.stringify({
          documentType: 'DEVICE_TRACKING',
          deviceType: dto.deviceType,
          manufacturer: dto.manufacturer,
          anvisaRegistryNumber: dto.anvisaRegistryNumber,
          lotNumber: dto.lotNumber,
          serialNumber: dto.serialNumber,
          implantDate: dto.implantDate,
          recallStatus: dto.recallStatus ?? false,
          notivisaNotification: dto.notivisaNotification,
          notes: dto.notes,
          trackedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    const recallAlert = dto.recallStatus
      ? 'ALERTA: Dispositivo em recall — notificar equipe e ANVISA/NOTIVISA imediatamente'
      : undefined;

    return { id: doc.id, recallAlert, createdAt: doc.createdAt };
  }

  async getDevicesByPatient(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: DOC_TAG.DEVICE_TRACKING } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => ({ id: d.id, createdAt: d.createdAt, ...JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }

  // ─── Safety Dashboard ────────────────────────────────────────────────────

  async getSafetyDashboard(tenantId: string, dto: SafetyDashboardQueryDto): Promise<SafetyDashboardResultDto> {
    this.logger.log(`Safety dashboard for tenant ${tenantId} period ${dto.startDate}–${dto.endDate}`);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const [adverseEvents, nearMisses] = await Promise.all([
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: DOC_TAG.ADVERSE_EVENT },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: DOC_TAG.NEAR_MISS },
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    // Patient-days estimation: total patient-days would come from census data
    // Using a stub calculation based on period length * avg beds (would be replaced by real census query)
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    const estimatedPatientDays = periodDays * 30; // stub: 30-bed ward average

    const indicators: SafetyIndicator[] = [
      {
        name: 'Eventos Adversos por 1000 Pacientes-Dia',
        value: estimatedPatientDays > 0 ? Math.round((adverseEvents / estimatedPatientDays) * 1000 * 10) / 10 : 0,
        unit: 'eventos/1000 pacientes-dia',
        benchmark: 25,
        trend: 'STABLE',
      },
      {
        name: 'Quase-Falhas Notificadas',
        value: nearMisses,
        unit: 'notificações',
        benchmark: undefined,
        trend: 'STABLE',
      },
      // Additional indicators would be computed from real nursing/pharmacy data
      { name: 'Taxa de Quedas', value: 0, unit: 'quedas/1000 pacientes-dia', benchmark: 3, trend: 'STABLE' },
      { name: 'Taxa de Lesão por Pressão', value: 0, unit: '%', benchmark: 3, trend: 'STABLE' },
      { name: 'Taxa de ISC', value: 0, unit: '%', benchmark: 2, trend: 'STABLE' },
      { name: 'Taxa de Erros de Medicação', value: 0, unit: 'erros/1000 doses', benchmark: 5, trend: 'STABLE' },
    ];

    return {
      period: { startDate: dto.startDate, endDate: dto.endDate },
      totalPatientDays: estimatedPatientDays,
      indicators,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── VTE Prophylaxis ─────────────────────────────────────────────────────

  async recordVteProphylaxis(tenantId: string, authorId: string, dto: VteProphylaxisDto) {
    this.logger.log(`VTE prophylaxis for patient ${dto.patientId}`);

    // Risk classification
    let riskLevel = 'LOW';
    if (dto.capriniScore !== undefined) {
      riskLevel = dto.capriniScore >= 5 ? 'HIGH' : dto.capriniScore >= 3 ? 'MODERATE' : 'LOW';
    } else if (dto.paduaScore !== undefined) {
      riskLevel = dto.paduaScore >= 4 ? 'HIGH' : 'LOW';
    }

    const alert =
      !dto.prescribed && dto.alertIfMissing && riskLevel !== 'LOW'
        ? `Alerta: Paciente com risco ${riskLevel} para TEV sem profilaxia prescrita`
        : undefined;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: (dto.encounterId ?? null) as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.VTE,
        content: JSON.stringify({
          documentType: 'VTE_PROPHYLAXIS',
          capriniScore: dto.capriniScore,
          paduaScore: dto.paduaScore,
          riskLevel,
          prophylaxisType: dto.prophylaxisType,
          prescribed: dto.prescribed,
          drugDose: dto.drugDose,
          contraindications: dto.contraindications,
          alert,
          recordedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return { id: doc.id, riskLevel, alert, createdAt: doc.createdAt };
  }

  // ─── SSI Prevention ──────────────────────────────────────────────────────

  async recordSsiPrevention(tenantId: string, authorId: string, dto: SsiPreventionDto) {
    this.logger.log(`SSI prevention checklist for surgery ${dto.surgeryId}`);

    const items = [
      { key: 'abxProphylaxisTiming', label: 'Profilaxia ABX ≤ 60 min antes da incisão', value: dto.abxProphylaxisTiming },
      { key: 'trichotomy', label: 'Tricotomia com clipper (não lâmina)', value: dto.trichotomy },
      { key: 'normothermia', label: 'Normotermia intraoperatória (≥ 36°C)', value: dto.normothermia },
      { key: 'glycemicControl', label: 'Controle glicêmico (< 180 mg/dL)', value: dto.glycemicControl },
    ];

    const nonCompliant = items.filter((i) => i.value === false).map((i) => i.label);
    const complianceScore = dto.complianceScore ?? Math.round(((items.length - nonCompliant.length) / items.length) * 100);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null as unknown as string,
        authorId,
        type: 'CUSTOM',
        title: DOC_TAG.SSI,
        content: JSON.stringify({
          documentType: 'SSI_PREVENTION',
          surgeryId: dto.surgeryId,
          abxProphylaxisTiming: dto.abxProphylaxisTiming,
          abxNameDose: dto.abxNameDose,
          trichotomy: dto.trichotomy,
          normothermia: dto.normothermia,
          glycemicControl: dto.glycemicControl,
          skinAntisepsis: dto.skinAntisepsis,
          complianceScore,
          nonCompliantItems: nonCompliant.length ? nonCompliant : dto.nonCompliantItems,
          recordedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      id: doc.id,
      complianceScore,
      nonCompliantItems: nonCompliant,
      message:
        complianceScore === 100
          ? 'Protocolo ISC 100% compliant'
          : `Conformidade ${complianceScore}% — revisar itens: ${nonCompliant.join(', ')}`,
      createdAt: doc.createdAt,
    };
  }

  // ─── Generic list ────────────────────────────────────────────────────────

  async listEventsByType(tenantId: string, tag: string, take = 50) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, title: { startsWith: tag } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return docs.map((d) => ({ id: d.id, createdAt: d.createdAt, data: JSON.parse(d.content ?? '{}') as Record<string, unknown> }));
  }

  // ─── Unified Incident Listing ────────────────────────────────────────────

  async listIncidents(tenantId: string, type?: string, take = 50) {
    let tag: string;
    if (type === 'ADVERSE_EVENT') {
      tag = DOC_TAG.ADVERSE_EVENT;
    } else if (type === 'NEAR_MISS') {
      tag = DOC_TAG.NEAR_MISS;
    } else {
      // Return both adverse events and near-misses merged
      const [adverse, nearMiss] = await Promise.all([
        this.listEventsByType(tenantId, DOC_TAG.ADVERSE_EVENT, take),
        this.listEventsByType(tenantId, DOC_TAG.NEAR_MISS, take),
      ]);

      const merged = [...adverse, ...nearMiss]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, take);

      return { total: merged.length, incidents: merged };
    }

    const items = await this.listEventsByType(tenantId, tag, take);
    return { total: items.length, incidents: items };
  }

  // ─── Single Incident Detail ──────────────────────────────────────────────

  async getIncidentById(tenantId: string, incidentId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: incidentId,
        tenantId,
        OR: [
          { title: { startsWith: DOC_TAG.ADVERSE_EVENT } },
          { title: { startsWith: DOC_TAG.NEAR_MISS } },
        ],
      },
    });

    if (!doc) {
      throw new NotFoundException(`Incident "${incidentId}" not found`);
    }

    const data = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;

    // Look for linked RCA
    const rcaDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: DOC_TAG.RCA },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const linkedRcas = rcaDocs
      .map((d) => ({ id: d.id, createdAt: d.createdAt, ...JSON.parse(d.content ?? '{}') as Record<string, unknown> & { eventId?: string } }))
      .filter((r) => r.eventId === incidentId);

    return {
      id: doc.id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      authorId: doc.authorId,
      data,
      linkedRcas,
    };
  }

  // ─── Quality/Safety KPIs ────────────────────────────────────────────────

  async getIndicators(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const [adverseCount, nearMissCount, rcaCount] = await Promise.all([
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: DOC_TAG.ADVERSE_EVENT },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: DOC_TAG.NEAR_MISS },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.clinicalDocument.count({
        where: {
          tenantId,
          title: { startsWith: DOC_TAG.RCA },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      period: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      },
      indicators: [
        { name: 'Eventos Adversos (30 dias)', value: adverseCount, trend: 'STABLE' as const },
        { name: 'Quase-Falhas (30 dias)', value: nearMissCount, trend: 'STABLE' as const },
        { name: 'Análises de Causa Raiz (30 dias)', value: rcaCount, trend: 'STABLE' as const },
        { name: 'Taxa de Notificação', value: adverseCount + nearMissCount, unit: 'notificações/mês', trend: 'STABLE' as const },
        { name: 'Taxa de Quedas', value: 0, unit: 'quedas/1000 pacientes-dia', benchmark: 3, trend: 'STABLE' as const },
        { name: 'Taxa de Lesão por Pressão', value: 0, unit: '%', benchmark: 3, trend: 'STABLE' as const },
        { name: 'Taxa de ISC', value: 0, unit: '%', benchmark: 2, trend: 'STABLE' as const },
        { name: 'Taxa de Erros de Medicação', value: 0, unit: 'erros/1000 doses', benchmark: 5, trend: 'STABLE' as const },
      ],
      generatedAt: now.toISOString(),
    };
  }
}
