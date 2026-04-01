import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RassScaleDto,
  CamIcuDto,
  VitalsTrendDto,
  VitalTrendType,
  NormalZoneDto,
  RassScoreLabel,
  TrendPeriodHours,
} from './dto/vitals-scales.dto';

// ─── Normal reference ranges ──────────────────────────────────────────────────

const NORMAL_ZONES: Record<VitalTrendType, NormalZoneDto> = {
  [VitalTrendType.HEART_RATE]:            { low: 60,   high: 100,  unit: 'bpm'    },
  [VitalTrendType.SYSTOLIC_BP]:           { low: 90,   high: 140,  unit: 'mmHg'   },
  [VitalTrendType.DIASTOLIC_BP]:          { low: 60,   high: 90,   unit: 'mmHg'   },
  [VitalTrendType.MEAN_ARTERIAL_PRESSURE]:{ low: 70,   high: 100,  unit: 'mmHg'   },
  [VitalTrendType.RESPIRATORY_RATE]:      { low: 12,   high: 20,   unit: 'rpm'    },
  [VitalTrendType.TEMPERATURE]:           { low: 36.0, high: 37.5, unit: '°C'     },
  [VitalTrendType.OXYGEN_SATURATION]:     { low: 94,   high: 100,  unit: '%'      },
  [VitalTrendType.GLUCOSE]:               { low: 70,   high: 180,  unit: 'mg/dL'  },
  [VitalTrendType.GCS]:                   { low: 13,   high: 15,   unit: 'pts'    },
  [VitalTrendType.NEWS_SCORE]:            { low: 0,    high: 4,    unit: 'pts'    },
};

// Map VitalTrendType to Prisma VitalSigns field name
const FIELD_MAP: Record<VitalTrendType, string> = {
  [VitalTrendType.HEART_RATE]:            'heartRate',
  [VitalTrendType.SYSTOLIC_BP]:           'systolicBP',
  [VitalTrendType.DIASTOLIC_BP]:          'diastolicBP',
  [VitalTrendType.MEAN_ARTERIAL_PRESSURE]:'meanArterialPressure',
  [VitalTrendType.RESPIRATORY_RATE]:      'respiratoryRate',
  [VitalTrendType.TEMPERATURE]:           'temperature',
  [VitalTrendType.OXYGEN_SATURATION]:     'oxygenSaturation',
  [VitalTrendType.GLUCOSE]:               'glucoseLevel',
  [VitalTrendType.GCS]:                   'gcs',
  [VitalTrendType.NEWS_SCORE]:            'newsScore',
};

// ─── RASS label helper ────────────────────────────────────────────────────────

function getRassLabel(score: number): RassScoreLabel {
  const map: Record<number, RassScoreLabel> = {
    4: RassScoreLabel.COMBATIVE,
    3: RassScoreLabel.VERY_AGITATED,
    2: RassScoreLabel.AGITATED,
    1: RassScoreLabel.RESTLESS,
    0: RassScoreLabel.ALERT_CALM,
    [-1]: RassScoreLabel.DROWSY,
    [-2]: RassScoreLabel.LIGHT_SEDATION,
    [-3]: RassScoreLabel.MODERATE_SEDATION,
    [-4]: RassScoreLabel.DEEP_SEDATION,
    [-5]: RassScoreLabel.UNAROUSABLE,
  };
  return map[score] ?? RassScoreLabel.ALERT_CALM;
}

@Injectable()
export class VitalsScalesService {
  private readonly logger = new Logger(VitalsScalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── RASS Assessment ────────────────────────────────────────────────────────

  async recordRassAssessment(
    tenantId: string,
    authorId: string,
    dto: RassScaleDto,
  ) {
    this.logger.log(`RASS assessment patient=${dto.patientId} score=${dto.score}`);

    const label = getRassLabel(dto.score);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[RASS] Assessment — ${label} (${dto.score})`,
        content: JSON.stringify({
          score: dto.score,
          label,
          targetScore: dto.targetScore,
          assessmentTimestamp: dto.assessmentTimestamp,
          assessorId: dto.assessorId,
          observations: dto.observations,
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      score: dto.score,
      label,
      targetScore: dto.targetScore,
      atTarget: dto.targetScore !== undefined ? dto.score === dto.targetScore : null,
      assessmentTimestamp: dto.assessmentTimestamp,
      assessorId: dto.assessorId,
      observations: dto.observations,
      createdAt: doc.createdAt,
    };
  }

  // ─── CAM-ICU Assessment ─────────────────────────────────────────────────────

  async recordCamIcuAssessment(
    tenantId: string,
    authorId: string,
    dto: CamIcuDto,
  ) {
    this.logger.log(`CAM-ICU assessment patient=${dto.patientId} result=${dto.result}`);

    const computedResult =
      dto.acuteOnset &&
      dto.inattention &&
      (dto.disorganizedThinking || dto.consciousnessLevel !== 'ALERT');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[CAM_ICU] ${computedResult ? 'POSITIVO (Delirium)' : 'NEGATIVO'}`,
        content: JSON.stringify({
          acuteOnset: dto.acuteOnset,
          inattention: dto.inattention,
          disorganizedThinking: dto.disorganizedThinking,
          consciousnessLevel: dto.consciousnessLevel,
          result: computedResult,
          rassAtAssessment: dto.rassAtAssessment,
          assessmentTimestamp: dto.assessmentTimestamp,
          assessorId: dto.assessorId,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      acuteOnset: dto.acuteOnset,
      inattention: dto.inattention,
      disorganizedThinking: dto.disorganizedThinking,
      consciousnessLevel: dto.consciousnessLevel,
      result: computedResult,
      interpretation: computedResult
        ? 'Delirium presente — iniciar protocolo de manejo'
        : 'Sem evidência de delirium',
      rassAtAssessment: dto.rassAtAssessment,
      assessmentTimestamp: dto.assessmentTimestamp,
      assessorId: dto.assessorId,
      notes: dto.notes,
      createdAt: doc.createdAt,
    };
  }

  // ─── Vital Signs Trends ─────────────────────────────────────────────────────

  async getVitalsTrend(patientId: string, dto: VitalsTrendDto) {
    const exists = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Patient ${patientId} not found`);

    const since = new Date(Date.now() - dto.periodHours * 60 * 60 * 1000);

    const records = await this.prisma.vitalSigns.findMany({
      where: {
        patientId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        heartRate: true,
        systolicBP: true,
        diastolicBP: true,
        meanArterialPressure: true,
        respiratoryRate: true,
        temperature: true,
        oxygenSaturation: true,
        glucoseLevel: true,
        gcs: true,
        newsScore: true,
      },
    });

    const field = FIELD_MAP[dto.vitalType] as keyof typeof records[0];

    const dataPoints = records
      .map((r) => ({
        timestamp: r.recordedAt.toISOString(),
        value: (r[field] as number | null) ?? null,
      }))
      .filter((p): p is { timestamp: string; value: number } => p.value !== null);

    const normalZone = NORMAL_ZONES[dto.vitalType];

    const values = dataPoints.map((p) => p.value);
    const stats =
      values.length > 0
        ? {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
            latest: values[values.length - 1],
          }
        : null;

    const periodLabel: Record<TrendPeriodHours, string> = {
      [TrendPeriodHours.H24]: '24 horas',
      [TrendPeriodHours.H168]: '7 dias',
      [TrendPeriodHours.H720]: '30 dias',
    };

    return {
      patientId,
      vitalType: dto.vitalType,
      periodHours: dto.periodHours,
      periodLabel: periodLabel[dto.periodHours],
      since: since.toISOString(),
      normalZone,
      dataPoints,
      stats,
      totalPoints: dataPoints.length,
    };
  }

  // ─── History helpers ────────────────────────────────────────────────────────

  async getRassHistory(patientId: string, limit = 20) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: '[RASS]' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }

  async getCamIcuHistory(patientId: string, limit = 20) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { patientId, type: 'CUSTOM', title: { contains: '[CAM_ICU]' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      ...(JSON.parse(d.content as string) as Record<string, unknown>),
    }));
  }
}
