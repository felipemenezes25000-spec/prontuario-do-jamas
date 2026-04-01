import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DicomViewerDto,
  PrepProtocolRequestDto,
  CreateStructuredReportDto,
  RadiologistWorklistQueryDto,
  CreateIncidentalFollowUpDto,
  UpdateIncidentalFollowUpDto,
  ImageComparisonDto,
  IncidentalFindingStatus,
  ImagingModality,
  ClassificationCategory,
} from './dto/ris-pacs-enhanced.dto';

// ─── Internal Interfaces ──────────────────────────────────────────────────────

export interface DicomViewerSession {
  id: string;
  tenantId: string;
  studyId: string;
  patientId: string;
  modality: string;
  seriesCount: number | null;
  instanceCount: number | null;
  studyInstanceUid: string | null;
  viewerUrl: string;
  tokenExpiresAt: Date;
  createdAt: Date;
}

export interface PrepProtocol {
  examType: string;
  fastingHours: number | null;
  fastingInstructions: string;
  contrastInstructions: string | null;
  medicationHold: string[];
  allergyPremedication: string | null;
  specialInstructions: string[];
  estimatedDuration: string;
}

export interface StructuredReport {
  id: string;
  tenantId: string;
  orderId: string;
  modality: string;
  template: string;
  findings: string;
  impression: string;
  classification: string | null;
  measurements: Record<string, unknown>[];
  recommendation: string | null;
  comparisonDate: string | null;
  technique: string | null;
  reportedById: string;
  createdAt: Date;
}

export interface IncidentalFollowUp {
  id: string;
  tenantId: string;
  reportId: string;
  finding: string;
  recommendation: string;
  followUpExam: string;
  followUpDate: Date | null;
  assignedPhysicianId: string | null;
  priority: string;
  status: IncidentalFindingStatus;
  notes: string | null;
  completionExamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageComparison {
  id: string;
  tenantId: string;
  currentStudyId: string;
  priorStudyId: string | null;
  findings: string | null;
  radiologistId: string | null;
  viewerComparisonUrl: string;
  createdAt: Date;
}

// ─── Exam prep protocol catalogue ─────────────────────────────────────────────

const PREP_PROTOCOLS: Record<string, Omit<PrepProtocol, 'examType'>> = {
  CT_ABDOMEN_PELVIS: {
    fastingHours: 4,
    fastingInstructions: 'Ficar em jejum por 4 horas antes do exame. Pode tomar medicamentos com pequena quantidade de água.',
    contrastInstructions: 'Usar contraste iodado EV. Alergia conhecida → pré-medicação com prednisona 50 mg VO 13h, 7h e 1h antes + difenidramina 50 mg IV 1h antes.',
    medicationHold: ['Metformina (suspender 48h antes — risco de acidose lática)'],
    allergyPremedication: 'Prednisona 50 mg VO 13h + 7h + 1h antes; Difenidramina 50 mg IV 1h antes',
    specialInstructions: [
      'Verificar creatinina e TFG recentes (< 3 meses)',
      'TFG < 30 mL/min → contraindicação relativa ao contraste IV',
      'Informar paciente sobre sensação de calor e sabor metálico durante injeção do contraste',
    ],
    estimatedDuration: '20–40 min',
  },
  MRI_BRAIN: {
    fastingHours: null,
    fastingInstructions: 'Não é necessário jejum para RM de crânio sem contraste.',
    contrastInstructions: 'Com gadolínio: avaliar TFG — < 30 → contraindicação por risco de fibrose sistêmica nefrogênica.',
    medicationHold: [],
    allergyPremedication: null,
    specialInstructions: [
      'Remover todos os objetos metálicos',
      'Questionar marcapasso, clipes vasculares, implantes cocleares, stents — possível contraindicação absoluta',
      'Informar claustrofobia — considerar ansiolítico VO 1h antes',
    ],
    estimatedDuration: '30–60 min',
  },
  MAMMOGRAPHY: {
    fastingHours: null,
    fastingInstructions: 'Sem necessidade de jejum.',
    contrastInstructions: null,
    medicationHold: [],
    allergyPremedication: null,
    specialInstructions: [
      'Não usar desodorante, talco ou loção nas axilas ou mamas no dia do exame',
      'Agendar preferencialmente na primeira metade do ciclo menstrual (menos dor)',
    ],
    estimatedDuration: '20–30 min',
  },
  PET_CT: {
    fastingHours: 6,
    fastingInstructions: 'Jejum de 6 horas. Manter hidratação com água.',
    contrastInstructions: 'Contraste iodado se solicitado — mesmas precauções do TC.',
    medicationHold: ['Evitar exercício físico intenso por 24h antes'],
    allergyPremedication: null,
    specialInstructions: [
      'Glicemia capilar deve ser < 200 mg/dL no momento da aplicação do FDG',
      'Paciente diabético: ajuste de insulina conforme protocolo',
      'Repouso absoluto por 60 min após aplicação do FDG',
    ],
    estimatedDuration: '90–120 min',
  },
  CARDIAC_ECHO: {
    fastingHours: null,
    fastingInstructions: 'Sem necessidade de jejum para ecocardiograma transtorácico.',
    contrastInstructions: null,
    medicationHold: [],
    allergyPremedication: null,
    specialInstructions: [
      'Continuar todos os medicamentos cardíacos normalmente',
      'Ecocardiograma com estresse: suspender beta-bloqueadores se solicitado pelo médico',
    ],
    estimatedDuration: '30–60 min',
  },
};

// ─── BI-RADS / Lung-RADS follow-up recommendations ────────────────────────────

const CLASSIFICATION_RECOMMENDATIONS: Record<string, Record<string, string>> = {
  BIRADS: {
    '0': 'Inconclusivo — imagens complementares necessárias (US, magnificação)',
    '1': 'Negativo — rastreamento anual de rotina',
    '2': 'Achado benigno — rastreamento anual de rotina',
    '3': 'Provavelmente benigno — controle com mamografia em 6 meses',
    '4A': 'Suspeita baixa — biópsia recomendada',
    '4B': 'Suspeita intermediária — biópsia recomendada',
    '4C': 'Suspeita moderada — biópsia recomendada',
    '5': 'Alta probabilidade de malignidade — biópsia obrigatória',
    '6': 'Malignidade comprovada — planejamento terapêutico',
  },
  LUNGRRADS: {
    '1': 'Negativo — rastreamento anual',
    '2': 'Benigno — rastreamento anual',
    '3': 'Provável benigno — TC em 6 meses',
    '4': 'Suspeito — TC em 3 meses ou PET-CT',
    '4X': 'Suspeito com características adicionais — avaliação urgente',
  },
  TIRADS: {
    '1': 'Normal — sem nódulo',
    '2': 'Benigno — sem biópsia necessária',
    '3': 'Provavelmente benigno — seguimento em 1–3 anos',
    '4': 'Suspeito — considerar biópsia (> 1,5 cm)',
    '5': 'Alta malignidade — biópsia necessária',
  },
  PIRADS: {
    '1': 'Muito improvável — sem investigação adicional',
    '2': 'Improvável — seguimento clínico',
    '3': 'Equívoco — biopsia a critério clínico',
    '4': 'Provável — biópsia recomendada',
    '5': 'Alta probabilidade — biópsia obrigatória',
  },
};

@Injectable()
export class RisPacsAdvancedService {
  private readonly logger = new Logger(RisPacsAdvancedService.name);

  // In-memory stores
  private viewerSessions: DicomViewerSession[] = [];
  private structuredReports: StructuredReport[] = [];
  private incidentalFollowUps: IncidentalFollowUp[] = [];
  private imageComparisons: ImageComparison[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ─── DICOM Viewer Session ───────────────────────────────────────────────────

  async createViewerSession(
    tenantId: string,
    userId: string,
    dto: DicomViewerDto,
  ): Promise<DicomViewerSession> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    // Generate a signed viewer URL (in production: OHIF/Cornerstone/Orthanc token)
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

    const session: DicomViewerSession = {
      id: crypto.randomUUID(),
      tenantId,
      studyId: dto.studyId,
      patientId: dto.patientId,
      modality: dto.modality,
      seriesCount: dto.seriesCount ?? null,
      instanceCount: dto.instanceCount ?? null,
      studyInstanceUid: dto.studyInstanceUid ?? null,
      viewerUrl: `/viewer?study=${dto.studyId}&token=${token}`,
      tokenExpiresAt: expiresAt,
      createdAt: new Date(),
    };

    this.viewerSessions.push(session);
    this.logger.log(`DICOM viewer session: study=${dto.studyId} user=${userId}`);

    return session;
  }

  async getViewerSession(tenantId: string, sessionId: string): Promise<DicomViewerSession> {
    const session = this.viewerSessions.find(
      (s) => s.id === sessionId && s.tenantId === tenantId,
    );
    if (!session) {
      throw new NotFoundException(`Sessão de visualização "${sessionId}" não encontrada`);
    }
    if (session.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Sessão de visualização expirada — gere uma nova');
    }
    return session;
  }

  // ─── Exam Prep Protocols ────────────────────────────────────────────────────

  getExamPrepProtocol(dto: PrepProtocolRequestDto): PrepProtocol {
    const key = dto.examType.toUpperCase().replace(/[\s-]/g, '_');
    const base = PREP_PROTOCOLS[key];

    const protocol: PrepProtocol = base
      ? { examType: dto.examType, ...base }
      : {
          examType: dto.examType,
          fastingHours: null,
          fastingInstructions: 'Consultar equipe médica para instruções específicas.',
          contrastInstructions: null,
          medicationHold: [],
          allergyPremedication: null,
          specialInstructions: ['Protocolo padrão — consulte o radiologista responsável.'],
          estimatedDuration: 'Variável',
        };

    // Override contrast allergy premedication if flagged
    if (dto.contrastAllergy && dto.contrastRequired) {
      protocol.allergyPremedication =
        'Protocolo de pré-medicação para alergia a contraste: Prednisona 50 mg VO 13h, 7h e 1h antes + Difenidramina 50 mg IV 1h antes';
      protocol.contrastInstructions =
        (protocol.contrastInstructions ?? '') +
        ' ATENÇÃO: alergia prévia ao contraste — pré-medicação obrigatória. Ter epinefrina e suporte disponíveis.';
    }

    return protocol;
  }

  listAvailableExamTypes(): string[] {
    return Object.keys(PREP_PROTOCOLS);
  }

  // ─── Structured Radiology Reports ──────────────────────────────────────────

  async createStructuredReport(
    tenantId: string,
    userId: string,
    dto: CreateStructuredReportDto,
  ): Promise<StructuredReport> {
    const recommendation =
      dto.recommendation ??
      this.getClassificationRecommendation(dto.template, dto.classification);

    const report: StructuredReport = {
      id: crypto.randomUUID(),
      tenantId,
      orderId: dto.orderId,
      modality: dto.modality,
      template: dto.template,
      findings: dto.findings,
      impression: dto.impression,
      classification: dto.classification ?? null,
      measurements: (dto.measurements ?? []).map((m) => m as unknown as Record<string, unknown>),
      recommendation: recommendation ?? null,
      comparisonDate: dto.comparisonDate ?? null,
      technique: dto.technique ?? null,
      reportedById: userId,
      createdAt: new Date(),
    };

    this.structuredReports.push(report);

    // Auto-create incidental follow-up if BI-RADS ≥ 3 or Lung-RADS ≥ 3
    if (dto.classification) {
      const needsFollowUp = this.classificationNeedsFollowUp(dto.template, dto.classification);
      if (needsFollowUp) {
        await this.createIncidentalFollowUp(tenantId, {
          reportId: report.id,
          finding: `${dto.template} Categoria ${dto.classification}`,
          recommendation: recommendation ?? 'Seguimento conforme protocolo',
          followUpExam: this.suggestFollowUpExam(dto.template, dto.modality),
        });
      }
    }

    return report;
  }

  async getStructuredReportsByOrder(tenantId: string, orderId: string): Promise<StructuredReport[]> {
    return this.structuredReports.filter(
      (r) => r.tenantId === tenantId && r.orderId === orderId,
    );
  }

  private getClassificationRecommendation(
    template: string,
    classification?: ClassificationCategory,
  ): string | undefined {
    if (!classification) return undefined;
    return CLASSIFICATION_RECOMMENDATIONS[template]?.[classification];
  }

  private classificationNeedsFollowUp(template: string, classification: ClassificationCategory): boolean {
    const category = String(classification);
    if (['BIRADS', 'TIRADS'].includes(template)) return ['3', '4', '4A', '4B', '4C', '4X', '5'].includes(category);
    if (template === 'LUNGRRADS') return ['3', '4', '4X'].includes(category);
    if (template === 'PIRADS') return ['3', '4', '5'].includes(category);
    return false;
  }

  private suggestFollowUpExam(template: string, modality: ImagingModality): string {
    const map: Record<string, string> = {
      BIRADS: 'US de mama ou biópsia guiada por US/mamografia',
      LUNGRRADS: 'TC de tórax de baixa dose',
      TIRADS: 'US de tireoide com PAAF',
      PIRADS: 'RM de próstata multiparamétrica + biópsia',
      LIRADS: 'TC ou RM de abdome com contraste',
    };
    return map[template] ?? `Controle com ${modality}`;
  }

  // ─── Radiologist Worklist ───────────────────────────────────────────────────

  async getRadiologistWorklist(tenantId: string, query: RadiologistWorklistQueryDto) {
    // Fetch all pending imaging exams for this tenant; filter in-memory for optional criteria
    const pending = await this.prisma.examResult.findMany({
      where: {
        status: 'REQUESTED',
        examType: 'IMAGING',
        patient: { tenantId },
        ...(query.requestingDoctorId ? { requestedById: query.requestingDoctorId } : {}),
      },
      select: {
        id: true,
        patientId: true,
        examName: true,
        examCode: true,
        imageModality: true,
        requestedAt: true,
        requestedById: true,
        patient: { select: { id: true, fullName: true, mrn: true, birthDate: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'asc' },
      take: 200,
    });

    const filtered = query.modality
      ? pending.filter((er) => er.imageModality?.toString() === query.modality?.toString())
      : pending;

    return {
      generatedAt: new Date().toISOString(),
      totalPending: filtered.length,
      filters: query,
      items: filtered.map((er) => ({
        examResultId: er.id,
        patientId: er.patientId,
        patient: er.patient,
        examName: er.examName,
        modality: er.imageModality,
        priority: 'ROUTINE',
        requestedAt: er.requestedAt,
        requestedById: er.requestedById,
        requestedBy: er.requestedBy,
        deadline: er.requestedAt
          ? new Date(er.requestedAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null,
      })),
    };
  }

  // ─── Incidental Finding Follow-up ──────────────────────────────────────────

  async createIncidentalFollowUp(
    tenantId: string,
    dto: CreateIncidentalFollowUpDto,
  ): Promise<IncidentalFollowUp> {
    const followUp: IncidentalFollowUp = {
      id: crypto.randomUUID(),
      tenantId,
      reportId: dto.reportId,
      finding: dto.finding,
      recommendation: dto.recommendation,
      followUpExam: dto.followUpExam,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
      assignedPhysicianId: dto.assignedPhysicianId ?? null,
      priority: dto.priority ?? 'ROUTINE',
      status: IncidentalFindingStatus.PENDING,
      notes: null,
      completionExamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.incidentalFollowUps.push(followUp);
    return followUp;
  }

  async updateIncidentalFollowUp(
    tenantId: string,
    id: string,
    dto: UpdateIncidentalFollowUpDto,
  ): Promise<IncidentalFollowUp> {
    const followUp = this.incidentalFollowUps.find(
      (f) => f.id === id && f.tenantId === tenantId,
    );
    if (!followUp) {
      throw new NotFoundException(`Achado incidental "${id}" não encontrado`);
    }

    followUp.status = dto.status;
    followUp.notes = dto.notes ?? followUp.notes;
    followUp.completionExamId = dto.completionExamId ?? followUp.completionExamId;
    followUp.updatedAt = new Date();

    return followUp;
  }

  async getOverdueFollowUps(tenantId: string): Promise<IncidentalFollowUp[]> {
    const now = new Date();
    const results = this.incidentalFollowUps.filter(
      (f) =>
        f.tenantId === tenantId &&
        f.status === IncidentalFindingStatus.PENDING &&
        f.followUpDate !== null &&
        f.followUpDate < now,
    );

    // Auto-mark as overdue
    for (const f of results) {
      f.status = IncidentalFindingStatus.OVERDUE;
      f.updatedAt = new Date();
    }

    return results;
  }

  async getPendingFollowUps(tenantId: string): Promise<IncidentalFollowUp[]> {
    return this.incidentalFollowUps.filter(
      (f) =>
        f.tenantId === tenantId &&
        [IncidentalFindingStatus.PENDING, IncidentalFindingStatus.OVERDUE].includes(f.status),
    );
  }

  // ─── Image Comparison ───────────────────────────────────────────────────────

  async createImageComparison(
    tenantId: string,
    userId: string,
    dto: ImageComparisonDto,
  ): Promise<ImageComparison> {
    // If no prior study provided, attempt automatic lookup
    let priorStudyId = dto.priorStudyId ?? null;

    if (!priorStudyId) {
      this.logger.log(`No prior study specified for comparison — auto-lookup not implemented`);
    }

    const comparisonUrl = `/viewer/compare?current=${dto.currentStudyId}${priorStudyId ? `&prior=${priorStudyId}` : ''}`;

    const comparison: ImageComparison = {
      id: crypto.randomUUID(),
      tenantId,
      currentStudyId: dto.currentStudyId,
      priorStudyId,
      findings: dto.findings ?? null,
      radiologistId: dto.radiologistId ?? userId,
      viewerComparisonUrl: comparisonUrl,
      createdAt: new Date(),
    };

    this.imageComparisons.push(comparison);
    return comparison;
  }

  async getImageComparisonsByStudy(
    tenantId: string,
    studyId: string,
  ): Promise<ImageComparison[]> {
    return this.imageComparisons.filter(
      (c) =>
        c.tenantId === tenantId &&
        (c.currentStudyId === studyId || c.priorStudyId === studyId),
    );
  }
}

// Re-export enum so controller can use it
export { RadiologyPriority } from './dto/ris-pacs-enhanced.dto';
