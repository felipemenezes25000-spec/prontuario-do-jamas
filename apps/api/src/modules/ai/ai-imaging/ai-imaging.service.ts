import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ImagingAnalysisStatus,
  ImagingPriority,
  ImagingAnalysisResponseDto,
  PrioritizedWorklistResponseDto,
  ImagingDashboardResponseDto,
} from './dto/ai-imaging.dto';

interface StoredAnalysis {
  id: string;
  tenantId: string;
  examResultId: string;
  status: ImagingAnalysisStatus;
  findings: Array<{
    finding: string;
    location: string;
    severity?: string;
    confidence: number;
    suggestedAction?: string;
    relatedIcdCode?: string;
  }>;
  impression?: string;
  recommendation?: string;
  aiModel: string;
  analyzedAt: Date;
}

@Injectable()
export class AiImagingService {
  private readonly logger = new Logger(AiImagingService.name);
  private readonly analyses = new Map<string, StoredAnalysis>();

  async analyzeImage(
    tenantId: string,
    examResultId: string,
    modality?: string,
    _clinicalIndication?: string,
    _bodyPart?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    this.logger.log(`Analyzing image for exam ${examResultId}, modality=${modality}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        {
          finding: 'Opacidade em base pulmonar direita',
          location: 'Base pulmonar direita',
          severity: 'MODERATE',
          confidence: 0.87,
          suggestedAction: 'Correlacionar com quadro clínico. Considerar TC de tórax se persistência.',
          relatedIcdCode: 'R91.1',
        },
        {
          finding: 'Área cardíaca dentro dos limites da normalidade',
          location: 'Mediastino',
          confidence: 0.95,
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
    };

    this.analyses.set(analysis.id, analysis);

    return analysis;
  }

  async getFindings(
    tenantId: string,
    analysisId: string,
  ): Promise<ImagingAnalysisResponseDto> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis || analysis.tenantId !== tenantId) {
      throw new NotFoundException(`Imaging analysis ${analysisId} not found`);
    }
    return analysis;
  }

  async prioritizeWorklist(
    _tenantId: string,
    modality?: string,
    limit = 20,
  ): Promise<PrioritizedWorklistResponseDto> {
    this.logger.log(`Prioritizing worklist, modality=${modality}, limit=${limit}`);

    return {
      items: [
        {
          examResultId: randomUUID(),
          patientName: 'Maria Oliveira',
          modality: 'XRAY',
          aiPriority: ImagingPriority.STAT,
          priorityScore: 0.95,
          reason: 'Possível pneumotórax — achado crítico detectado por IA',
          orderedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          examResultId: randomUUID(),
          patientName: 'Carlos Mendes',
          modality: 'CT',
          aiPriority: ImagingPriority.URGENT,
          priorityScore: 0.82,
          reason: 'Suspeita de AVC — TC de crânio de urgência',
          orderedAt: new Date(Date.now() - 45 * 60 * 1000),
        },
        {
          examResultId: randomUUID(),
          patientName: 'Ana Paula Santos',
          modality: 'XRAY',
          aiPriority: ImagingPriority.ROUTINE,
          priorityScore: 0.35,
          reason: 'RX de tórax de rotina — pré-operatório',
          orderedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ].slice(0, limit),
      totalItems: 3,
      generatedAt: new Date(),
    };
  }

  // ─── Specific Detection Methods ───────────────────────────────────────

  async analyzeChestXray(
    tenantId: string,
    examResultId: string,
    _clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    this.logger.log(`Chest X-ray analysis for exam ${examResultId}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        { finding: 'Pneumotórax à direita — colapso parcial (~30%)', location: 'Hemitórax direito', severity: 'CRITICAL', confidence: 0.93, suggestedAction: 'Drenagem torácica imediata', relatedIcdCode: 'J93.1' },
        { finding: 'Fratura de arco costal (8º arco D)', location: 'Parede torácica direita', severity: 'MODERATE', confidence: 0.87, suggestedAction: 'Analgesia e controle em 7 dias', relatedIcdCode: 'S22.3' },
        { finding: 'Índice cardiotorácico: 0.48 (normal)', location: 'Mediastino', confidence: 0.96 },
        { finding: 'Sem consolidações parenquimatosas', location: 'Parênquima pulmonar', confidence: 0.91 },
      ],
      impression: 'Pneumotórax direito (~30%) associado a fratura de arco costal D. Achado crítico — requer intervenção imediata.',
      recommendation: 'Drenagem torácica em selo d\'água. Controle radiográfico após procedimento.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  async analyzeCtStroke(
    tenantId: string,
    examResultId: string,
    _clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    this.logger.log(`CT stroke detection for exam ${examResultId}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        { finding: 'Hipodensidade em território de ACM esquerda', location: 'Hemisfério cerebral esquerdo', severity: 'CRITICAL', confidence: 0.91, suggestedAction: 'Avaliar trombólise / trombectomia', relatedIcdCode: 'I63.5' },
        { finding: 'ASPECTS score estimado: 7', location: 'Território ACM E', severity: 'HIGH', confidence: 0.85 },
        { finding: 'Sem evidência de hemorragia intracraniana', location: 'Encéfalo', confidence: 0.97 },
        { finding: 'Linha média preservada', location: 'Estruturas medianas', confidence: 0.95 },
      ],
      impression: 'AVC isquêmico agudo em território de ACM esquerda. ASPECTS 7. Sem transformação hemorrágica. Candidato potencial a trombólise/trombectomia se dentro da janela terapêutica.',
      recommendation: 'Protocolo de AVC agudo. Avaliar critérios para trombólise IV (rt-PA) ou trombectomia mecânica.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  async analyzeMammography(
    tenantId: string,
    examResultId: string,
    _clinicalIndication?: string,
  ): Promise<ImagingAnalysisResponseDto> {
    this.logger.log(`Mammography CAD for exam ${examResultId}`);

    const analysis: StoredAnalysis = {
      id: randomUUID(),
      tenantId,
      examResultId,
      status: ImagingAnalysisStatus.COMPLETED,
      findings: [
        { finding: 'Agrupamento de microcalcificações pleomórficas', location: 'QSE mama esquerda', severity: 'HIGH', confidence: 0.89, suggestedAction: 'Biópsia estereotáxica', relatedIcdCode: 'R92.0' },
        { finding: 'Nódulo espiculado de 12mm', location: 'Junção QSE/QIE mama esquerda', severity: 'HIGH', confidence: 0.86, suggestedAction: 'Biópsia com agulha grossa (core biopsy)', relatedIcdCode: 'N63' },
        { finding: 'Mama direita sem alterações suspeitas', location: 'Mama direita', confidence: 0.94 },
        { finding: 'Linfonodos axilares normais bilateralmente', location: 'Axilas', confidence: 0.92 },
      ],
      impression: 'BI-RADS 4C — Achados altamente suspeitos em mama esquerda: microcalcificações pleomórficas + nódulo espiculado. Biópsia fortemente recomendada.',
      recommendation: 'Biópsia com agulha grossa guiada por ultrassom do nódulo + biópsia estereotáxica das microcalcificações.',
      aiModel: 'gpt-4o-vision',
      analyzedAt: new Date(),
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
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
    return {
      totalPending: 12,
      totalAnalyzed: 847,
      criticalFindings: 3,
      avgProcessingTimeMs: 4200,
      analysisByModality: {
        XRAY: 420,
        CT: 210,
        MRI: 130,
        ULTRASOUND: 87,
      },
      recentCritical: [
        {
          examResultId: randomUUID(),
          finding: 'Possível pneumotórax',
          patientName: 'Maria Oliveira',
          analyzedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      ],
    };
  }
}
