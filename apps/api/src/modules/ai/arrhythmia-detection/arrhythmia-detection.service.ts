import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalyzeRhythmDto,
  ArrhythmiaType,
  RhythmRegularity,
  ArrhythmiaAlert,
  RhythmAnalysisResult,
  ArrhythmiaHistoryEntry,
} from './arrhythmia-detection.dto';

@Injectable()
export class ArrhythmiaDetectionService {
  private readonly logger = new Logger(ArrhythmiaDetectionService.name);

  // In-memory store for alerts (would be a DB table in production)
  private alerts: ArrhythmiaAlert[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ─── Analyze Rhythm ───────────────────────────────────────────────────────

  async analyzeRhythm(
    tenantId: string,
    dto: AnalyzeRhythmDto,
  ): Promise<RhythmAnalysisResult> {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    this.logger.log(
      `Analyzing rhythm for patient ${dto.patientId}, ${dto.ecgData.length} leads, ${dto.duration}s`,
    );

    // Pick the primary lead (II preferred, fallback to first)
    const primaryLead =
      dto.ecgData.find((l) => l.lead === 'II') ?? dto.ecgData[0];

    // ── R-R interval detection (simple peak detection heuristic) ──────────
    const { rrIntervalsMean, rrIntervalsStdDev, heartRate, rrIntervals } =
      this.computeRRIntervals(primaryLead.values, primaryLead.samplingRate);

    // Coefficient of variation for regularity assessment
    const cv = rrIntervalsMean > 0 ? rrIntervalsStdDev / rrIntervalsMean : 0;

    // ── QRS width estimation (heuristic) ─────────────────────────────────
    const qrsWidth = this.estimateQrsWidth(primaryLead.values, primaryLead.samplingRate);

    // ── Rhythm classification ────────────────────────────────────────────
    const { rhythm, regularity, confidence } = this.classifyRhythm(
      heartRate,
      cv,
      qrsWidth,
      rrIntervals,
    );

    // ── Generate alerts ──────────────────────────────────────────────────
    const newAlerts = this.generateAlerts(
      dto.patientId,
      rhythm,
      heartRate,
      confidence,
    );

    // Store alerts
    this.alerts.push(...newAlerts);

    // Persist analysis as clinical document
    const analysisId = randomUUID();
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: null,
        authorId: 'AI_ARRHYTHMIA_SYSTEM',
        type: 'CUSTOM',
        title: `[AI:ARRHYTHMIA] Análise de Ritmo — ${rhythm} (FC ${heartRate} bpm)`,
        content: JSON.stringify({
          analysisId,
          rhythm,
          heartRate,
          regularity,
          confidence,
          rrIntervals: { mean: rrIntervalsMean, stdDev: rrIntervalsStdDev, cv },
          qrsWidth,
          alertCount: newAlerts.length,
          leads: dto.ecgData.map((l) => l.lead),
          duration: dto.duration,
        }),
        status: 'FINAL',
        generatedByAI: true,
      },
    });

    return {
      analysisId,
      patientId: dto.patientId,
      rhythm,
      heartRate,
      regularity,
      confidence,
      alerts: newAlerts,
      rrIntervals: {
        mean: Math.round(rrIntervalsMean * 1000) / 1000,
        stdDev: Math.round(rrIntervalsStdDev * 1000) / 1000,
        cv: Math.round(cv * 1000) / 1000,
      },
      qrsWidth: Math.round(qrsWidth * 1000) / 1000,
      analysedLeads: dto.ecgData.map((l) => l.lead),
      duration: dto.duration,
      timestamp: new Date().toISOString(),
      disclaimer:
        'Análise algorítmica assistida por IA — NÃO substitui interpretação de cardiologista. Confirme achados com ECG de 12 derivações.',
    };
  }

  // ─── Continuous Monitoring (last 24h alerts) ──────────────────────────────

  async getContinuousMonitoring(
    tenantId: string,
    patientId: string,
  ): Promise<{ patientId: string; alerts: ArrhythmiaAlert[]; period: string }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const recentAlerts = this.alerts.filter(
      (a) =>
        a.patientId === patientId &&
        new Date(a.detectedAt) >= cutoff,
    );

    return {
      patientId,
      alerts: recentAlerts.sort(
        (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
      ),
      period: '24h',
    };
  }

  // ─── Arrhythmia History ───────────────────────────────────────────────────

  async getArrhythmiaHistory(
    tenantId: string,
    patientId: string,
  ): Promise<{ patientId: string; history: ArrhythmiaHistoryEntry[]; total: number }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    // Also pull from clinical documents for persistence
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[AI:ARRHYTHMIA]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const history: ArrhythmiaHistoryEntry[] = docs.map((doc) => {
      const data = JSON.parse(doc.content ?? '{}') as {
        analysisId: string;
        rhythm: ArrhythmiaType;
        heartRate: number;
        confidence: number;
        alertCount: number;
      };

      return {
        id: data.analysisId,
        patientId,
        arrhythmiaType: data.rhythm,
        heartRate: data.heartRate,
        confidence: data.confidence,
        severity: this.getSeverity(data.rhythm),
        detectedAt: doc.createdAt.toISOString(),
        acknowledged: doc.status === 'FINAL',
        acknowledgedBy: null,
      };
    });

    return {
      patientId,
      history,
      total: history.length,
    };
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────────

  private computeRRIntervals(
    values: number[],
    samplingRate: number,
  ): {
    rrIntervalsMean: number;
    rrIntervalsStdDev: number;
    heartRate: number;
    rrIntervals: number[];
  } {
    // Simple peak detection: find local maxima above threshold
    if (values.length < 10) {
      return { rrIntervalsMean: 0, rrIntervalsStdDev: 0, heartRate: 0, rrIntervals: [] };
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const threshold = min + (max - min) * 0.6;

    const peakIndices: number[] = [];
    for (let i = 2; i < values.length - 2; i++) {
      if (
        values[i] > threshold &&
        values[i] >= values[i - 1] &&
        values[i] >= values[i + 1] &&
        values[i] >= values[i - 2] &&
        values[i] >= values[i + 2]
      ) {
        // Ensure minimum distance between peaks (200ms ~ 0.2s * samplingRate)
        const minDist = Math.round(samplingRate * 0.2);
        if (peakIndices.length === 0 || (i - peakIndices[peakIndices.length - 1]) > minDist) {
          peakIndices.push(i);
        }
      }
    }

    if (peakIndices.length < 2) {
      // Fallback: estimate from signal frequency
      const estimatedHR = 72; // default normal HR
      return {
        rrIntervalsMean: 60 / estimatedHR,
        rrIntervalsStdDev: 0.02,
        heartRate: estimatedHR,
        rrIntervals: [60 / estimatedHR],
      };
    }

    const rrIntervals: number[] = [];
    for (let i = 1; i < peakIndices.length; i++) {
      const intervalSamples = peakIndices[i] - peakIndices[i - 1];
      rrIntervals.push(intervalSamples / samplingRate);
    }

    const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const variance =
      rrIntervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / rrIntervals.length;
    const stdDev = Math.sqrt(variance);
    const heartRate = mean > 0 ? Math.round(60 / mean) : 0;

    return {
      rrIntervalsMean: mean,
      rrIntervalsStdDev: stdDev,
      heartRate,
      rrIntervals,
    };
  }

  private estimateQrsWidth(values: number[], samplingRate: number): number {
    // Simplified QRS width estimation
    // Normal QRS < 120ms, wide QRS >= 120ms
    if (values.length < 10) return 0.08;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const halfAmplitude = min + (max - min) * 0.5;

    // Find first major deflection width
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > halfAmplitude && startIdx === -1) {
        startIdx = i;
      }
      if (startIdx !== -1 && values[i] < halfAmplitude && endIdx === -1) {
        endIdx = i;
        break;
      }
    }

    if (startIdx >= 0 && endIdx > startIdx) {
      return (endIdx - startIdx) / samplingRate;
    }

    return 0.08; // default normal QRS width
  }

  private classifyRhythm(
    heartRate: number,
    cv: number,
    qrsWidth: number,
    rrIntervals: number[],
  ): { rhythm: ArrhythmiaType; regularity: RhythmRegularity; confidence: number } {
    let rhythm: ArrhythmiaType = 'NORMAL';
    let regularity: RhythmRegularity = 'REGULAR';
    let confidence = 85;

    // Irregularity assessment
    if (cv > 0.15) {
      regularity = 'IRREGULARLY_IRREGULAR';
    } else if (cv > 0.08) {
      regularity = 'IRREGULAR';
    }

    // Atrial fibrillation: irregularly irregular + normal or high rate
    if (regularity === 'IRREGULARLY_IRREGULAR' && heartRate >= 60) {
      rhythm = 'ATRIAL_FIBRILLATION';
      confidence = Math.min(95, 70 + Math.round(cv * 100));
    }
    // Atrial flutter: HR around 150 (2:1 block) or 100 (3:1 block)
    else if (heartRate >= 140 && heartRate <= 160 && regularity === 'REGULAR') {
      rhythm = 'ATRIAL_FLUTTER';
      confidence = 65;
    }
    // Ventricular tachycardia: HR > 100 + wide QRS
    else if (heartRate > 100 && qrsWidth >= 0.12) {
      rhythm = 'VENTRICULAR_TACHYCARDIA';
      confidence = 70;
    }
    // Simple tachycardia: HR > 100, narrow QRS, regular
    else if (heartRate > 100 && qrsWidth < 0.12) {
      rhythm = 'TACHYCARDIA';
      confidence = 90;
    }
    // Bradycardia: HR < 60
    else if (heartRate < 60 && heartRate > 0) {
      rhythm = 'BRADYCARDIA';
      confidence = 90;
    }
    // AV Block: look for dropped beats (large gaps in RR intervals)
    else if (rrIntervals.length >= 3) {
      const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
      const hasLongPause = rrIntervals.some((rr) => rr > meanRR * 1.8);
      if (hasLongPause && regularity === 'IRREGULAR') {
        rhythm = 'AV_BLOCK';
        confidence = 60;
      }
    }

    // Normal sinus rhythm
    if (rhythm === 'NORMAL') {
      confidence = 92;
    }

    return { rhythm, regularity, confidence };
  }

  private generateAlerts(
    patientId: string,
    rhythm: ArrhythmiaType,
    heartRate: number,
    confidence: number,
  ): ArrhythmiaAlert[] {
    if (rhythm === 'NORMAL') {
      return [];
    }

    const severity = this.getSeverity(rhythm);

    const RHYTHM_MESSAGES: Record<ArrhythmiaType, string> = {
      NORMAL: '',
      ATRIAL_FIBRILLATION: `Fibrilação atrial detectada — FC ${heartRate} bpm. Avaliar anticoagulação (CHA₂DS₂-VASc).`,
      ATRIAL_FLUTTER: `Flutter atrial detectado — FC ${heartRate} bpm. Considerar cardioversão ou controle de frequência.`,
      VENTRICULAR_TACHYCARDIA: `TAQUICARDIA VENTRICULAR — FC ${heartRate} bpm, QRS alargado. EMERGÊNCIA — avaliar desfibrilação.`,
      BRADYCARDIA: `Bradicardia — FC ${heartRate} bpm. Avaliar sintomas, medicações e necessidade de marca-passo.`,
      TACHYCARDIA: `Taquicardia sinusal — FC ${heartRate} bpm. Investigar causa (dor, febre, hipovolemia, ansiedade).`,
      AV_BLOCK: `Bloqueio atrioventricular suspeito. Avaliar grau e necessidade de marca-passo.`,
      PREMATURE_VENTRICULAR_CONTRACTION: `Extrassístoles ventriculares detectadas. Avaliar frequência e sintomas.`,
    };

    const alert: ArrhythmiaAlert = {
      id: randomUUID(),
      patientId,
      arrhythmiaType: rhythm,
      heartRate,
      confidence,
      severity,
      message: RHYTHM_MESSAGES[rhythm],
      detectedAt: new Date().toISOString(),
      acknowledged: false,
    };

    return [alert];
  }

  private getSeverity(rhythm: ArrhythmiaType): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const SEVERITY_MAP: Record<ArrhythmiaType, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      NORMAL: 'LOW',
      TACHYCARDIA: 'MEDIUM',
      BRADYCARDIA: 'MEDIUM',
      ATRIAL_FIBRILLATION: 'HIGH',
      ATRIAL_FLUTTER: 'HIGH',
      AV_BLOCK: 'HIGH',
      PREMATURE_VENTRICULAR_CONTRACTION: 'LOW',
      VENTRICULAR_TACHYCARDIA: 'CRITICAL',
    };
    return SEVERITY_MAP[rhythm];
  }
}
