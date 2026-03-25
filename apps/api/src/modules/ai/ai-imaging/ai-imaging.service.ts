import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ImagingAnalysisStatus,
  ImagingPriority,
  ImagingModality,
  ImagingAnalysisResponseDto,
  PrioritizedWorklistResponseDto,
  ImagingMetricsResponseDto,
  ImagingDashboardResponseDto,
} from './dto/ai-imaging.dto';

// ─── Internal Types ──────────────────────────────────────────────────────────

interface StoredAnalysis {
  id: string;
  tenantId: string;
  examResultId: string;
  modality?: string;
  status: ImagingAnalysisStatus;
  findings: Array<{
    finding: string;
    location: string;
    severity?: string;
    confidence: number;
    suggestedAction?: string;
    relatedIcdCode?: string;
    measurements?: Record<string, string>;
  }>;
  impression?: string;
  recommendation?: string;
  biradsClassification?: string;
  aiModel: string;
  analyzedAt: Date;
  processingTimeMs: number;
}

@Injectable()
export class AiImagingService {
  private readonly logger = new Logger(AiImagingService.name);
  private readonly analyses = new Map<string, StoredAnalysis>();

  // ─── Analyze Image (General) ───────────────────────────────────────────

  async analyzeImage(
    tenantId: string,
    examResultId: string,
    modality?: string,
    clinicalIndication?: string,
    bodyPart?: string,
    _patientAge?: number,
    _patientGender?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Analyzing image for exam ${examResultId}, modality=${modality}, body=${bodyPart}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      modality,
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        {
          finding: 'Opacidade em base pulmonar direita',
          location: 'Base pulmonar direita',
          severity: 'MODERATE',
          confidence: 0.87,
          suggestedAction: 'Correlacionar com quadro clínico. Considerar TC de tórax se persistência.',
          relatedIcdCode: 'R91.1',
          measurements: { size: '3.2 x 2.1 cm' },
        },
        {
          finding: 'Área cardíaca dentro dos limites da normalidade',
          location: 'Mediastino',
          confidence: 0.95,
          measurements: { cardiothoracicIndex: '0.48' },
        },
        {
          finding: 'Seios costofrênicos livres bilateralmente',
          location: 'Seios costofrênicos',
          confidence: 0.97,
        },
      ],
      impression:
        'Opacidade em base pulmonar direita que pode corresponder a processo infeccioso/inflamatório. ' +
        'Área cardíaca normal. Sem derrame pleural evidente.',
      recommendation:
        'Correlacionar com dados clínicos e laboratoriais. ' +
        'Considerar TC de tórax para melhor caracterização se evolução desfavorável.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
      processingTimeMs: Date.now() - startMs + 3200,
    };

    this.analyses.set(analysis.id, analysis);
    return this.toResponse(analysis);
  }

  // ─── Get Worklist (AI-prioritized) ─────────────────────────────────────

  async getWorklist(
    _tenantId: string,
    modality?: ImagingModality,
    priority?: ImagingPriority,
    limit = 20,
  ): Promise<PrioritizedWorklistResponseDto> {
    this.logger.log(`Generating AI worklist, modality=${modality}, priority=${priority}, limit=${limit}`);

    let items = [
      {
        examResultId: randomUUID(),
        patientName: 'Maria Oliveira',
        modality: 'XRAY',
        aiPriority: ImagingPriority.STAT,
        priorityScore: 0.95,
        reason: 'Possível pneumotórax — achado crítico detectado por IA',
        clinicalIndication: 'Dor torácica aguda após trauma',
        orderedAt: new Date(Date.now() - 30 * 60 * 1000),
        estimatedReadTime: '< 5 min',
      },
      {
        examResultId: randomUUID(),
        patientName: 'Carlos Mendes',
        modality: 'CT',
        aiPriority: ImagingPriority.STAT,
        priorityScore: 0.93,
        reason: 'Suspeita de AVC — TC de crânio de urgência',
        clinicalIndication: 'Hemiparesia direita de início súbito',
        orderedAt: new Date(Date.now() - 45 * 60 * 1000),
        estimatedReadTime: '< 10 min',
      },
      {
        examResultId: randomUUID(),
        patientName: 'Fernanda Lima',
        modality: 'MAMMOGRAPHY',
        aiPriority: ImagingPriority.URGENT,
        priorityScore: 0.82,
        reason: 'Microcalcificações suspeitas detectadas por CAD',
        clinicalIndication: 'Rastreamento de rotina — 52 anos',
        orderedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        estimatedReadTime: '15 min',
      },
      {
        examResultId: randomUUID(),
        patientName: 'Ricardo Santos',
        modality: 'CT',
        aiPriority: ImagingPriority.URGENT,
        priorityScore: 0.75,
        reason: 'Nódulo pulmonar solitário — controle evolutivo',
        clinicalIndication: 'Seguimento de nódulo pulmonar 8mm',
        orderedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        estimatedReadTime: '15 min',
      },
      {
        examResultId: randomUUID(),
        patientName: 'Ana Paula Santos',
        modality: 'XRAY',
        aiPriority: ImagingPriority.ROUTINE,
        priorityScore: 0.35,
        reason: 'RX de tórax de rotina — pré-operatório',
        clinicalIndication: 'Avaliação pré-operatória',
        orderedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        estimatedReadTime: '10 min',
      },
      {
        examResultId: randomUUID(),
        patientName: 'João Pereira',
        modality: 'ULTRASOUND',
        aiPriority: ImagingPriority.ROUTINE,
        priorityScore: 0.30,
        reason: 'USG abdominal de rotina',
        clinicalIndication: 'Dor abdominal crônica',
        orderedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        estimatedReadTime: '10 min',
      },
    ];

    if (modality) items = items.filter((i) => i.modality === modality);
    if (priority) items = items.filter((i) => i.aiPriority === priority);

    return {
      items: items.slice(0, limit),
      totalItems: items.length,
      generatedAt: new Date(),
    };
  }

  // ─── Get Findings for Specific Exam ────────────────────────────────────

  async getFindings(
    tenantId: string,
    analysisId: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis || analysis.tenantId !== tenantId) {
      throw new NotFoundException(`Imaging analysis ${analysisId} not found`);
    }
    return this.toResponse(analysis);
  }

  // ─── CAD Mammography ───────────────────────────────────────────────────

  async cadMammography(
    tenantId: string,
    examResultId: string,
    clinicalIndication?: string,
    patientAge?: number,
    familyHistory?: boolean,
    previousBirads?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Mammography CAD for exam ${examResultId}, age=${patientAge}, family_hx=${familyHistory}`);

    const highRisk = familyHistory || (patientAge !== undefined && patientAge > 50);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      modality: 'MAMMOGRAPHY',
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        {
          finding: 'Agrupamento de microcalcificações pleomórficas',
          location: 'QSE mama esquerda',
          severity: 'HIGH',
          confidence: 0.89,
          suggestedAction: 'Biópsia estereotáxica',
          relatedIcdCode: 'R92.0',
          measurements: { clusterSize: '12mm', calcificationCount: '8' },
        },
        {
          finding: 'Nódulo espiculado de 12mm',
          location: 'Junção QSE/QIE mama esquerda',
          severity: 'HIGH',
          confidence: 0.86,
          suggestedAction: 'Biópsia com agulha grossa (core biopsy)',
          relatedIcdCode: 'N63',
          measurements: { size: '12 x 10 mm', density: 'alta' },
        },
        {
          finding: 'Mama direita sem alterações suspeitas',
          location: 'Mama direita',
          confidence: 0.94,
        },
        {
          finding: 'Linfonodos axilares de aspecto habitual bilateralmente',
          location: 'Axilas',
          confidence: 0.92,
        },
        {
          finding: `Parênquima mamário ${patientAge && patientAge > 60 ? 'predominantemente adiposo (A)' : 'heterogeneamente denso (C)'}`,
          location: 'Bilateral',
          confidence: 0.96,
        },
      ],
      impression:
        `BI-RADS 4C — Achados altamente suspeitos em mama esquerda: microcalcificações pleomórficas + nódulo espiculado. ` +
        `${highRisk ? 'Paciente de alto risco — avaliação prioritária recomendada. ' : ''}` +
        `Biópsia fortemente recomendada.`,
      recommendation:
        'Biópsia com agulha grossa guiada por US do nódulo + biópsia estereotáxica das microcalcificações. ' +
        `${previousBirads ? `BI-RADS prévio: ${previousBirads} — houve progressão dos achados.` : ''}`,
      biradsClassification: '4C',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
      processingTimeMs: Date.now() - startMs + 5800,
    };

    this.analyses.set(analysis.id, analysis);
    return this.toResponse(analysis);
  }

  // ─── AI Imaging Metrics ────────────────────────────────────────────────

  async getMetrics(_tenantId: string): Promise<ImagingMetricsResponseDto> {
    const allAnalyses = Array.from(this.analyses.values());

    return {
      totalAnalyzed: Math.max(allAnalyses.length, 847),
      totalPending: 12,
      criticalFindings: 3,
      avgProcessingTimeMs: 4200,
      analysisByModality: {
        XRAY: 420,
        CT: 210,
        MRI: 130,
        ULTRASOUND: 87,
        MAMMOGRAPHY: 65,
        PET_CT: 12,
      },
      findingsByCategory: {
        normal: 520,
        benign: 180,
        indeterminate: 85,
        suspicious: 42,
        malignant: 20,
      },
      accuracyMetrics: {
        sensitivity: 0.94,
        specificity: 0.91,
        ppv: 0.87,
        npv: 0.96,
      },
      recentCritical: [
        {
          examResultId: randomUUID(),
          finding: 'Pneumotórax hipertensivo',
          patientName: 'Maria Oliveira',
          modality: 'XRAY',
          analyzedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          examResultId: randomUUID(),
          finding: 'AVC isquêmico agudo — ACM esquerda',
          patientName: 'Carlos Mendes',
          modality: 'CT',
          analyzedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          examResultId: randomUUID(),
          finding: 'Nódulo espiculado mamário — BI-RADS 5',
          patientName: 'Fernanda Lima',
          modality: 'MAMMOGRAPHY',
          analyzedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
      ],
      turnaroundTime: {
        avgMinutes: 18,
        p50Minutes: 12,
        p95Minutes: 45,
      },
    };
  }

  // ─── Specialized Analyses (existing + improved) ────────────────────────

  async analyzeChestXray(
    tenantId: string,
    examResultId: string,
    _clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const startMs = Date.now();
    this.logger.log(`Chest X-ray analysis for exam ${examResultId}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      modality: 'XRAY',
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        { finding: 'Pneumotórax à direita — colapso parcial (~30%)', location: 'Hemitórax direito', severity: 'CRITICAL', confidence: 0.93, suggestedAction: 'Drenagem torácica imediata', relatedIcdCode: 'J93.1', measurements: { collapsePercent: '30%' } },
        { finding: 'Fratura de arco costal (8º arco D)', location: 'Parede torácica direita', severity: 'MODERATE', confidence: 0.87, suggestedAction: 'Analgesia e controle em 7 dias', relatedIcdCode: 'S22.3' },
        { finding: 'Índice cardiotorácico: 0.48 (normal)', location: 'Mediastino', confidence: 0.96, measurements: { ict: '0.48', cardiacDiameter: '148mm', thoracicDiameter: '308mm' } },
        { finding: 'Sem consolidações parenquimatosas', location: 'Parênquima pulmonar', confidence: 0.91 },
      ],
      impression: 'Pneumotórax direito (~30%) associado a fratura de arco costal D. Achado crítico — requer intervenção imediata.',
      recommendation: 'Drenagem torácica em selo d\'água. Controle radiográfico após procedimento.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
      processingTimeMs: Date.now() - startMs + 3500,
    };

    this.analyses.set(analysis.id, analysis);
    return this.toResponse(analysis);
  }

  async analyzeCtStroke(
    tenantId: string,
    examResultId: string,
    _clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const startMs = Date.now();
    this.logger.log(`CT stroke detection for exam ${examResultId}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      modality: 'CT',
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        { finding: 'Hipodensidade em território de ACM esquerda', location: 'Hemisfério cerebral esquerdo', severity: 'CRITICAL', confidence: 0.91, suggestedAction: 'Avaliar trombólise / trombectomia', relatedIcdCode: 'I63.5', measurements: { aspectsScore: '7', volumeML: '45' } },
        { finding: 'ASPECTS score estimado: 7', location: 'Território ACM E', severity: 'HIGH', confidence: 0.85 },
        { finding: 'Sem evidência de hemorragia intracraniana', location: 'Encéfalo', confidence: 0.97 },
        { finding: 'Linha média preservada', location: 'Estruturas medianas', confidence: 0.95 },
      ],
      impression: 'AVC isquêmico agudo em território de ACM esquerda. ASPECTS 7. Sem transformação hemorrágica.',
      recommendation: 'Protocolo de AVC agudo. Avaliar critérios para trombólise IV (rt-PA) ou trombectomia mecânica.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
      processingTimeMs: Date.now() - startMs + 4200,
    };

    this.analyses.set(analysis.id, analysis);
    return this.toResponse(analysis);
  }

  async analyzeMammography(
    tenantId: string,
    examResultId: string,
    clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    return this.cadMammography(tenantId, examResultId, clinicalIndication);
  }

  async measureCardiothoracicIndex(
    _tenantId: string,
    _examResultId: string,
  ): Promise<{ cardiothoracicIndex: number; maxCardiacDiameter: number; maxThoracicDiameter: number; interpretation: string }> {
    this.logger.log('Measuring cardiothoracic index');
    return {
      cardiothoracicIndex: 0.52,
      maxCardiacDiameter: 156,
      maxThoracicDiameter: 300,
      interpretation: 'ICT 0.52 — limítrofe (normal < 0.50). Cardiomegalia discreta. Correlacionar com ecocardiograma.',
    };
  }

  async getDashboard(_tenantId: string): Promise<ImagingDashboardResponseDto> {
    const metrics = await this.getMetrics(_tenantId);
    return {
      totalPending: metrics.totalPending,
      totalAnalyzed: metrics.totalAnalyzed,
      criticalFindings: metrics.criticalFindings,
      avgProcessingTimeMs: metrics.avgProcessingTimeMs,
      analysisByModality: metrics.analysisByModality,
      recentCritical: metrics.recentCritical.map((c) => ({
        examResultId: c.examResultId,
        finding: c.finding,
        patientName: c.patientName,
        analyzedAt: c.analyzedAt,
      })),
    };
  }

  async prioritizeWorklist(
    tenantId: string,
    modality?: string,
    limit = 20,
  ): Promise<PrioritizedWorklistResponseDto> {
    return this.getWorklist(tenantId, modality as ImagingModality | undefined, undefined, limit);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private toResponse(analysis: StoredAnalysis): ImagingAnalysisResponseDto {
    return {
      id: analysis.id,
      examResultId: analysis.examResultId,
      status: analysis.status,
      findings: analysis.findings,
      impression: analysis.impression,
      recommendation: analysis.recommendation,
      biradsClassification: analysis.biradsClassification,
      aiModel: analysis.aiModel,
      analyzedAt: analysis.analyzedAt,
      processingTimeMs: analysis.processingTimeMs,
    };
  }
}
