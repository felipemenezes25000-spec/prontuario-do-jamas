import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PredictionType,
  RiskLevel,
  UnitType,
  BedType,
  RiskPredictionResponseDto,
  LosPredictionResponseDto,
  DemandForecastResponseDto,
  BedOptimizationResponseDto,
  DashboardResponseDto,
  FeatureImportanceResponseDto,
  ContributingFeatureDto,
  RecommendedActionDto,
  ModelMetadataDto,
  DailyDemandDto,
  BedSuggestionDto,
  PatientRiskSummaryDto,
  ShapFeatureDto,
} from './dto/predictive-analytics.dto';

// ─── Internal helpers ────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pickRiskLevel(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 35) return RiskLevel.MODERATE;
  return RiskLevel.LOW;
}

function nowIso(): string {
  return new Date().toISOString();
}

function futureDateIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

// ─── Mock data builders ──────────────────────────────────────────────────────

function buildSepsisFeatures(): ContributingFeatureDto[] {
  return [
    {
      featureName: 'Lactato sérico',
      importanceWeight: 0.23,
      currentValue: '4.2 mmol/L',
      normalRange: '< 2.0 mmol/L',
      direction: 'positive',
    },
    {
      featureName: 'Leucócitos',
      importanceWeight: 0.18,
      currentValue: '18.500 /mm³',
      normalRange: '4.000-11.000 /mm³',
      direction: 'positive',
    },
    {
      featureName: 'Frequência cardíaca',
      importanceWeight: 0.15,
      currentValue: '112 bpm',
      normalRange: '60-100 bpm',
      direction: 'positive',
    },
    {
      featureName: 'Temperatura axilar',
      importanceWeight: 0.14,
      currentValue: '38.8 °C',
      normalRange: '36.0-37.5 °C',
      direction: 'positive',
    },
    {
      featureName: 'Pressão arterial sistólica',
      importanceWeight: 0.12,
      currentValue: '88 mmHg',
      normalRange: '100-140 mmHg',
      direction: 'negative',
    },
    {
      featureName: 'Creatinina',
      importanceWeight: 0.09,
      currentValue: '2.1 mg/dL',
      normalRange: '0.7-1.3 mg/dL',
      direction: 'positive',
    },
    {
      featureName: 'Plaquetas',
      importanceWeight: 0.05,
      currentValue: '95.000 /mm³',
      normalRange: '150.000-400.000 /mm³',
      direction: 'negative',
    },
    {
      featureName: 'PCR',
      importanceWeight: 0.04,
      currentValue: '180 mg/L',
      normalRange: '< 5 mg/L',
      direction: 'positive',
    },
  ];
}

function buildCardiacArrestFeatures(): ContributingFeatureDto[] {
  return [
    {
      featureName: 'Troponina I',
      importanceWeight: 0.25,
      currentValue: '2.8 ng/mL',
      normalRange: '< 0.04 ng/mL',
      direction: 'positive',
    },
    {
      featureName: 'Potássio sérico',
      importanceWeight: 0.19,
      currentValue: '6.1 mEq/L',
      normalRange: '3.5-5.0 mEq/L',
      direction: 'positive',
    },
    {
      featureName: 'Intervalo QTc',
      importanceWeight: 0.16,
      currentValue: '520 ms',
      normalRange: '< 440 ms',
      direction: 'positive',
    },
    {
      featureName: 'SpO2',
      importanceWeight: 0.14,
      currentValue: '88%',
      normalRange: '> 94%',
      direction: 'negative',
    },
    {
      featureName: 'BNP',
      importanceWeight: 0.11,
      currentValue: '1.250 pg/mL',
      normalRange: '< 100 pg/mL',
      direction: 'positive',
    },
    {
      featureName: 'Frequência cardíaca',
      importanceWeight: 0.08,
      currentValue: '135 bpm',
      normalRange: '60-100 bpm',
      direction: 'positive',
    },
    {
      featureName: 'Magnésio',
      importanceWeight: 0.07,
      currentValue: '1.2 mg/dL',
      normalRange: '1.7-2.2 mg/dL',
      direction: 'negative',
    },
  ];
}

function buildReadmissionFeatures(): ContributingFeatureDto[] {
  return [
    {
      featureName: 'Número de internações últimos 6 meses',
      importanceWeight: 0.21,
      currentValue: '3',
      normalRange: '0',
      direction: 'positive',
    },
    {
      featureName: 'Hemoglobina glicada',
      importanceWeight: 0.17,
      currentValue: '9.8%',
      normalRange: '< 7.0%',
      direction: 'positive',
    },
    {
      featureName: 'Adesão medicamentosa',
      importanceWeight: 0.15,
      currentValue: '42%',
      normalRange: '> 80%',
      direction: 'negative',
    },
    {
      featureName: 'Suporte social',
      importanceWeight: 0.13,
      currentValue: 'Baixo',
      normalRange: 'Adequado',
      direction: 'negative',
    },
    {
      featureName: 'Comorbidades (Charlson)',
      importanceWeight: 0.12,
      currentValue: '6',
      normalRange: '0-1',
      direction: 'positive',
    },
    {
      featureName: 'Idade',
      importanceWeight: 0.11,
      currentValue: '78 anos',
      normalRange: 'N/A',
      direction: 'positive',
    },
    {
      featureName: 'Tempo de internação atual',
      importanceWeight: 0.06,
      currentValue: '12 dias',
      normalRange: '< 5 dias',
      direction: 'positive',
    },
    {
      featureName: 'Alta contra indicação médica prévia',
      importanceWeight: 0.05,
      currentValue: 'Sim',
      normalRange: 'Não',
      direction: 'positive',
    },
  ];
}

function buildMortalityFeatures(): ContributingFeatureDto[] {
  return [
    {
      featureName: 'APACHE II score',
      importanceWeight: 0.22,
      currentValue: '28',
      normalRange: '< 10',
      direction: 'positive',
    },
    {
      featureName: 'Ventilação mecânica',
      importanceWeight: 0.18,
      currentValue: 'Sim — 5 dias',
      normalRange: 'Não',
      direction: 'positive',
    },
    {
      featureName: 'Vasopressores',
      importanceWeight: 0.15,
      currentValue: 'Norepinefrina 0.3 mcg/kg/min',
      normalRange: 'Não',
      direction: 'positive',
    },
    {
      featureName: 'Albumina sérica',
      importanceWeight: 0.12,
      currentValue: '1.8 g/dL',
      normalRange: '3.5-5.5 g/dL',
      direction: 'negative',
    },
    {
      featureName: 'Diurese 24h',
      importanceWeight: 0.11,
      currentValue: '350 mL',
      normalRange: '> 800 mL',
      direction: 'negative',
    },
    {
      featureName: 'GCS',
      importanceWeight: 0.10,
      currentValue: '8',
      normalRange: '15',
      direction: 'negative',
    },
    {
      featureName: 'Idade',
      importanceWeight: 0.07,
      currentValue: '82 anos',
      normalRange: 'N/A',
      direction: 'positive',
    },
    {
      featureName: 'Dias em UTI',
      importanceWeight: 0.05,
      currentValue: '14',
      normalRange: '< 3',
      direction: 'positive',
    },
  ];
}

function buildSepsisActions(): RecommendedActionDto[] {
  return [
    {
      action: 'Colher hemoculturas (2 pares) e iniciar antibioticoterapia empírica de amplo espectro',
      priority: 'CRITICAL',
      rationale: 'Protocolo Surviving Sepsis Campaign — hora de ouro',
      timeWindowMinutes: 60,
    },
    {
      action: 'Iniciar ressuscitação volêmica com 30 mL/kg de cristaloide',
      priority: 'CRITICAL',
      rationale: 'Hipotensão com lactato elevado — choque séptico provável',
      timeWindowMinutes: 30,
    },
    {
      action: 'Solicitar gasometria arterial e lactato seriado a cada 2h',
      priority: 'HIGH',
      rationale: 'Monitorar clearance de lactato como guia de ressuscitação',
      timeWindowMinutes: 120,
    },
    {
      action: 'Avaliar necessidade de vasopressor se PAM < 65 mmHg após volume',
      priority: 'HIGH',
      rationale: 'Meta: PAM >= 65 mmHg para perfusão orgânica adequada',
      timeWindowMinutes: 60,
    },
    {
      action: 'Notificar equipe de sepse e registrar no protocolo institucional',
      priority: 'MEDIUM',
      rationale: 'Protocolo institucional de sepse — notificação obrigatória',
      timeWindowMinutes: 30,
    },
  ];
}

function buildCardiacArrestActions(): RecommendedActionDto[] {
  return [
    {
      action: 'Monitorização contínua com telemetria e cabeceira elevada',
      priority: 'CRITICAL',
      rationale: 'Hipercalemia com QTc prolongado — alto risco de arritmia fatal',
      timeWindowMinutes: 15,
    },
    {
      action: 'Gluconato de cálcio 10% IV lento + insulina regular + glicose para hipercalemia',
      priority: 'CRITICAL',
      rationale: 'K+ 6.1 — estabilização de membrana e shift intracelular urgente',
      timeWindowMinutes: 30,
    },
    {
      action: 'Corrigir magnésio — sulfato de magnésio 2g IV',
      priority: 'HIGH',
      rationale: 'Hipomagnesemia contribui para QTc prolongado e arritmias',
      timeWindowMinutes: 60,
    },
    {
      action: 'Avaliar cardiologia para ecocardiograma de urgência',
      priority: 'HIGH',
      rationale: 'Troponina elevada com BNP alto — descartar IAM e IC descompensada',
      timeWindowMinutes: 120,
    },
  ];
}

function buildReadmissionActions(): RecommendedActionDto[] {
  return [
    {
      action: 'Agendar consulta ambulatorial em 7 dias pós-alta com equipe multidisciplinar',
      priority: 'HIGH',
      rationale: 'Seguimento precoce reduz reinternações em 30% (evidência nível A)',
    },
    {
      action: 'Reconciliação medicamentosa com farmacêutico clínico antes da alta',
      priority: 'HIGH',
      rationale: 'Paciente com baixa adesão e múltiplas comorbidades',
    },
    {
      action: 'Contato telefônico em 48h pelo serviço social',
      priority: 'MEDIUM',
      rationale: 'Suporte social baixo — verificar condições domiciliares',
    },
    {
      action: 'Encaminhar para programa de educação em diabetes',
      priority: 'MEDIUM',
      rationale: 'HbA1c 9.8% — controle glicêmico inadequado, principal fator de readmissão',
    },
  ];
}

function buildMortalityActions(): RecommendedActionDto[] {
  return [
    {
      action: 'Discussão de caso multidisciplinar com equipe de cuidados paliativos',
      priority: 'HIGH',
      rationale: 'APACHE II 28 com falência multiorgânica — definir metas de cuidado',
    },
    {
      action: 'Otimizar suporte hemodinâmico e ventilatório com reavaliação diária',
      priority: 'HIGH',
      rationale: 'Vasopressor em dose moderada com oligúria — escalar pode ser necessário',
    },
    {
      action: 'Comunicação com família sobre prognóstico e diretivas antecipadas de vontade',
      priority: 'HIGH',
      rationale: 'Risco de mortalidade elevado — bioética e autonomia do paciente',
    },
    {
      action: 'Suporte nutricional enteral precoce e correção de hipoalbuminemia',
      priority: 'MEDIUM',
      rationale: 'Albumina 1.8 — desnutrição proteico-calórica grave piora desfecho',
    },
  ];
}

function buildModelMetadata(type: PredictionType): ModelMetadataDto {
  const models: Record<PredictionType, ModelMetadataDto> = {
    [PredictionType.SEPSIS]: {
      modelVersion: 'sepsis-prediction-v3.2.1',
      lastTrainingDate: '2026-03-01T00:00:00Z',
      auroc: 0.91,
      trainingDatasetSize: 45230,
      modelType: 'XGBoost + LSTM ensemble',
    },
    [PredictionType.CARDIAC_ARREST]: {
      modelVersion: 'cardiac-arrest-v2.4.0',
      lastTrainingDate: '2026-02-15T00:00:00Z',
      auroc: 0.88,
      trainingDatasetSize: 32100,
      modelType: 'Transformer + gradient boosting',
    },
    [PredictionType.READMISSION]: {
      modelVersion: 'readmission-30d-v4.1.0',
      lastTrainingDate: '2026-03-10T00:00:00Z',
      auroc: 0.84,
      trainingDatasetSize: 128500,
      modelType: 'LightGBM + logistic regression stacking',
    },
    [PredictionType.LENGTH_OF_STAY]: {
      modelVersion: 'los-prediction-v2.8.0',
      lastTrainingDate: '2026-02-28T00:00:00Z',
      auroc: 0.82,
      trainingDatasetSize: 96400,
      modelType: 'Random Forest + quantile regression',
    },
    [PredictionType.MORTALITY]: {
      modelVersion: 'mortality-inpatient-v3.0.2',
      lastTrainingDate: '2026-03-05T00:00:00Z',
      auroc: 0.89,
      trainingDatasetSize: 54800,
      modelType: 'Deep survival model (DeepHit)',
    },
    [PredictionType.DEMAND_FORECAST]: {
      modelVersion: 'demand-forecast-v1.5.0',
      lastTrainingDate: '2026-03-20T00:00:00Z',
      auroc: 0.86,
      trainingDatasetSize: 730,
      modelType: 'Prophet + ARIMA ensemble',
    },
  };
  return models[type];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  // ─── Sepsis Risk ──────────────────────────────────────────────────────────

  async getSepsisRisk(
    tenantId: string,
    patientId: string,
    vitals?: {
      heartRate?: number;
      systolicBP?: number;
      respiratoryRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
      glasgow?: number;
    },
    labs?: {
      lactate?: number;
      wbc?: number;
      platelets?: number;
      creatinine?: number;
      bilirubin?: number;
      pcr?: number;
      procalcitonin?: number;
    },
  ): Promise<RiskPredictionResponseDto> {
    this.logger.log(`[${tenantId}] Calculating sepsis risk for patient ${patientId}`);

    // Calculate qSOFA-based risk if vitals provided
    let riskScore: number;
    const features: ContributingFeatureDto[] = [];
    const actions: RecommendedActionDto[] = [];

    if (vitals || labs) {
      let qsofaScore = 0;
      const v = vitals ?? {};
      const l = labs ?? {};

      // qSOFA components
      if (v.respiratoryRate !== undefined && v.respiratoryRate >= 22) {
        qsofaScore++;
        features.push({ featureName: 'Frequencia respiratoria', importanceWeight: 0.20, currentValue: `${v.respiratoryRate} irpm`, normalRange: '12-20 irpm', direction: 'positive' });
      }
      if (v.systolicBP !== undefined && v.systolicBP <= 100) {
        qsofaScore++;
        features.push({ featureName: 'PA sistolica', importanceWeight: 0.20, currentValue: `${v.systolicBP} mmHg`, normalRange: '100-140 mmHg', direction: 'negative' });
      }
      if (v.glasgow !== undefined && v.glasgow < 15) {
        qsofaScore++;
        features.push({ featureName: 'Glasgow', importanceWeight: 0.18, currentValue: `${v.glasgow}`, normalRange: '15', direction: 'negative' });
      }

      // SIRS components (supplementary)
      let sirsScore = 0;
      if (v.heartRate !== undefined && v.heartRate > 90) sirsScore++;
      if (v.respiratoryRate !== undefined && v.respiratoryRate > 20) sirsScore++;
      if (v.temperature !== undefined && (v.temperature > 38 || v.temperature < 36)) sirsScore++;
      if (l.wbc !== undefined && (l.wbc > 12 || l.wbc < 4)) sirsScore++;

      // Lab-based risk factors
      if (l.lactate !== undefined) {
        const lactateWeight = l.lactate > 4 ? 0.25 : l.lactate > 2 ? 0.15 : 0.05;
        features.push({ featureName: 'Lactato serico', importanceWeight: lactateWeight, currentValue: `${l.lactate} mmol/L`, normalRange: '< 2.0 mmol/L', direction: l.lactate > 2 ? 'positive' : 'neutral' });
      }
      if (l.pcr !== undefined && l.pcr > 50) {
        features.push({ featureName: 'PCR', importanceWeight: 0.10, currentValue: `${l.pcr} mg/L`, normalRange: '< 5 mg/L', direction: 'positive' });
      }
      if (l.procalcitonin !== undefined && l.procalcitonin > 0.5) {
        features.push({ featureName: 'Procalcitonina', importanceWeight: 0.15, currentValue: `${l.procalcitonin} ng/mL`, normalRange: '< 0.5 ng/mL', direction: 'positive' });
      }
      if (l.platelets !== undefined && l.platelets < 150) {
        features.push({ featureName: 'Plaquetas', importanceWeight: 0.08, currentValue: `${l.platelets}.000 /mm³`, normalRange: '150.000-400.000 /mm³', direction: 'negative' });
      }
      if (l.creatinine !== undefined && l.creatinine > 1.5) {
        features.push({ featureName: 'Creatinina', importanceWeight: 0.10, currentValue: `${l.creatinine} mg/dL`, normalRange: '0.7-1.3 mg/dL', direction: 'positive' });
      }
      if (v.temperature !== undefined) {
        features.push({ featureName: 'Temperatura', importanceWeight: 0.12, currentValue: `${v.temperature} °C`, normalRange: '36.0-37.5 °C', direction: v.temperature > 38 || v.temperature < 36 ? 'positive' : 'neutral' });
      }

      // Composite risk calculation
      riskScore = 0;
      riskScore += qsofaScore * 20; // qSOFA 0-3 maps to 0-60
      riskScore += sirsScore * 5;   // SIRS adds 0-20
      if (l.lactate !== undefined && l.lactate > 2) riskScore += Math.min(20, (l.lactate - 2) * 5);
      if (l.procalcitonin !== undefined && l.procalcitonin > 2) riskScore += 10;
      riskScore = Math.min(99, Math.max(1, Math.round(riskScore)));

      // Generate actions based on risk
      if (riskScore >= 60) {
        actions.push({ action: 'Colher hemoculturas (2 pares) e iniciar ATB empirico de amplo espectro', priority: 'CRITICAL', rationale: 'qSOFA positivo — Protocolo SSC hora de ouro', timeWindowMinutes: 60 });
        actions.push({ action: 'Ressuscitacao com 30 mL/kg de cristaloide', priority: 'CRITICAL', rationale: 'Hipoperfusao provavel', timeWindowMinutes: 30 });
      }
      if (l.lactate !== undefined && l.lactate > 2) {
        actions.push({ action: 'Lactato seriado a cada 2h — alvo clearance > 10%', priority: 'HIGH', rationale: 'Lactato elevado como guia de ressuscitacao', timeWindowMinutes: 120 });
      }
      if (riskScore >= 40) {
        actions.push({ action: 'Avaliar necessidade de DVA se PAM < 65 apos volume', priority: 'HIGH', rationale: 'Meta PAM >= 65 mmHg', timeWindowMinutes: 60 });
        actions.push({ action: 'Gasometria arterial e eletrólitos', priority: 'MEDIUM', rationale: 'Avaliar perfusao e disturbios acido-base' });
      }
    } else {
      // Fallback to static mock if no data provided
      riskScore = randomBetween(55, 85);
      features.push(...buildSepsisFeatures());
      actions.push(...buildSepsisActions());
    }

    const margin = Math.round(riskScore * 0.12);

    return {
      predictionId: randomUUID(),
      patientId,
      predictionType: PredictionType.SEPSIS,
      riskScore,
      riskLevel: pickRiskLevel(riskScore),
      confidenceLower: Math.max(0, riskScore - margin),
      confidenceUpper: Math.min(100, riskScore + margin),
      timeHorizon: '4-6 horas',
      contributingFeatures: features.length > 0 ? features : buildSepsisFeatures(),
      recommendedActions: actions.length > 0 ? actions : buildSepsisActions(),
      modelMetadata: buildModelMetadata(PredictionType.SEPSIS),
      calculatedAt: nowIso(),
      trend: riskScore >= 60 ? 'worsening' : riskScore >= 35 ? 'stable' : 'improving',
    };
  }

  // ─── Cardiac Arrest Risk ──────────────────────────────────────────────────

  async getCardiacArrestRisk(
    tenantId: string,
    patientId: string,
    vitals?: {
      heartRate?: number;
      systolicBP?: number;
      diastolicBP?: number;
      oxygenSaturation?: number;
      respiratoryRate?: number;
    },
    labs?: {
      troponin?: number;
      potassium?: number;
      magnesium?: number;
      bnp?: number;
      qtcInterval?: number;
      ejectionFraction?: number;
    },
    history?: {
      priorArrhythmia?: boolean;
      priorCardiacArrest?: boolean;
      qtProlongingMeds?: number;
    },
  ): Promise<RiskPredictionResponseDto> {
    this.logger.log(`[${tenantId}] Calculating cardiac arrest risk for patient ${patientId}`);

    let riskScore: number;
    const features: ContributingFeatureDto[] = [];
    const actions: RecommendedActionDto[] = [];

    if (vitals || labs || history) {
      const v = vitals ?? {};
      const l = labs ?? {};
      const h = history ?? {};
      riskScore = 0;

      // Troponin elevation (major factor)
      if (l.troponin !== undefined) {
        if (l.troponin > 1.0) { riskScore += 25; features.push({ featureName: 'Troponina I', importanceWeight: 0.25, currentValue: `${l.troponin} ng/mL`, normalRange: '< 0.04 ng/mL', direction: 'positive' }); }
        else if (l.troponin > 0.1) { riskScore += 12; features.push({ featureName: 'Troponina I', importanceWeight: 0.15, currentValue: `${l.troponin} ng/mL`, normalRange: '< 0.04 ng/mL', direction: 'positive' }); }
        else if (l.troponin > 0.04) { riskScore += 5; features.push({ featureName: 'Troponina I', importanceWeight: 0.08, currentValue: `${l.troponin} ng/mL`, normalRange: '< 0.04 ng/mL', direction: 'positive' }); }
      }

      // Potassium (hyper/hypokalemia)
      if (l.potassium !== undefined) {
        if (l.potassium > 6.0) { riskScore += 20; features.push({ featureName: 'Potassio serico', importanceWeight: 0.19, currentValue: `${l.potassium} mEq/L`, normalRange: '3.5-5.0 mEq/L', direction: 'positive' }); }
        else if (l.potassium > 5.5) { riskScore += 12; features.push({ featureName: 'Potassio serico', importanceWeight: 0.14, currentValue: `${l.potassium} mEq/L`, normalRange: '3.5-5.0 mEq/L', direction: 'positive' }); }
        else if (l.potassium < 3.0) { riskScore += 15; features.push({ featureName: 'Potassio serico', importanceWeight: 0.16, currentValue: `${l.potassium} mEq/L`, normalRange: '3.5-5.0 mEq/L', direction: 'negative' }); }
        else if (l.potassium < 3.5) { riskScore += 8; features.push({ featureName: 'Potassio serico', importanceWeight: 0.10, currentValue: `${l.potassium} mEq/L`, normalRange: '3.5-5.0 mEq/L', direction: 'negative' }); }
      }

      // QTc prolongation
      if (l.qtcInterval !== undefined) {
        if (l.qtcInterval > 500) { riskScore += 18; features.push({ featureName: 'Intervalo QTc', importanceWeight: 0.16, currentValue: `${l.qtcInterval} ms`, normalRange: '< 440 ms', direction: 'positive' }); }
        else if (l.qtcInterval > 470) { riskScore += 10; features.push({ featureName: 'Intervalo QTc', importanceWeight: 0.10, currentValue: `${l.qtcInterval} ms`, normalRange: '< 440 ms', direction: 'positive' }); }
      }

      // SpO2
      if (v.oxygenSaturation !== undefined && v.oxygenSaturation < 90) {
        riskScore += 10;
        features.push({ featureName: 'SpO2', importanceWeight: 0.14, currentValue: `${v.oxygenSaturation}%`, normalRange: '> 94%', direction: 'negative' });
      }

      // BNP (heart failure marker)
      if (l.bnp !== undefined && l.bnp > 400) {
        riskScore += Math.min(12, Math.round((l.bnp - 400) / 100));
        features.push({ featureName: 'BNP', importanceWeight: 0.11, currentValue: `${l.bnp} pg/mL`, normalRange: '< 100 pg/mL', direction: 'positive' });
      }

      // Heart rate (extreme tachy or brady)
      if (v.heartRate !== undefined) {
        if (v.heartRate > 130) { riskScore += 10; features.push({ featureName: 'Frequencia cardiaca', importanceWeight: 0.08, currentValue: `${v.heartRate} bpm`, normalRange: '60-100 bpm', direction: 'positive' }); }
        else if (v.heartRate < 45) { riskScore += 12; features.push({ featureName: 'Frequencia cardiaca', importanceWeight: 0.10, currentValue: `${v.heartRate} bpm`, normalRange: '60-100 bpm', direction: 'negative' }); }
      }

      // Magnesium
      if (l.magnesium !== undefined && l.magnesium < 1.5) {
        riskScore += 8;
        features.push({ featureName: 'Magnesio', importanceWeight: 0.07, currentValue: `${l.magnesium} mg/dL`, normalRange: '1.7-2.2 mg/dL', direction: 'negative' });
      }

      // Ejection fraction
      if (l.ejectionFraction !== undefined && l.ejectionFraction < 35) {
        riskScore += 10;
        features.push({ featureName: 'Fracao de ejecao', importanceWeight: 0.05, currentValue: `${l.ejectionFraction}%`, normalRange: '> 55%', direction: 'negative' });
      }

      // History
      if (h.priorCardiacArrest) { riskScore += 15; }
      if (h.priorArrhythmia) { riskScore += 8; }
      if (h.qtProlongingMeds !== undefined && h.qtProlongingMeds > 1) { riskScore += h.qtProlongingMeds * 3; }

      riskScore = Math.min(99, Math.max(1, Math.round(riskScore)));

      // Actions based on risk
      if (l.potassium !== undefined && l.potassium > 6.0) {
        actions.push({ action: 'Gluconato de calcio 10% IV lento + insulina regular + glicose para hipercalemia', priority: 'CRITICAL', rationale: `K+ ${l.potassium} — estabilizacao de membrana urgente`, timeWindowMinutes: 30 });
      }
      if (l.qtcInterval !== undefined && l.qtcInterval > 500) {
        actions.push({ action: 'Monitorização continua com telemetria e revisao de medicacoes QT-prolongadoras', priority: 'CRITICAL', rationale: `QTc ${l.qtcInterval}ms — alto risco de torsades de pointes`, timeWindowMinutes: 15 });
      }
      if (l.magnesium !== undefined && l.magnesium < 1.5) {
        actions.push({ action: 'Sulfato de magnesio 2g IV', priority: 'HIGH', rationale: 'Hipomagnesemia contribui para instabilidade eletrica', timeWindowMinutes: 60 });
      }
      if (l.troponin !== undefined && l.troponin > 0.1) {
        actions.push({ action: 'Avaliacao cardiologica para ecocardiograma de urgencia', priority: 'HIGH', rationale: 'Troponina elevada — descartar IAM', timeWindowMinutes: 120 });
      }
      if (riskScore >= 60) {
        actions.push({ action: 'Transferir para leito com monitorização continua (UTI/UCO)', priority: 'HIGH', rationale: 'Risco elevado de arritmia fatal', timeWindowMinutes: 60 });
      }
    } else {
      riskScore = randomBetween(40, 75);
      features.push(...buildCardiacArrestFeatures());
      actions.push(...buildCardiacArrestActions());
    }

    const margin = Math.round(riskScore * 0.12);

    return {
      predictionId: randomUUID(),
      patientId,
      predictionType: PredictionType.CARDIAC_ARREST,
      riskScore,
      riskLevel: pickRiskLevel(riskScore),
      confidenceLower: Math.max(0, riskScore - margin),
      confidenceUpper: Math.min(100, riskScore + margin),
      timeHorizon: '2-4 horas',
      contributingFeatures: features.length > 0 ? features : buildCardiacArrestFeatures(),
      recommendedActions: actions.length > 0 ? actions : buildCardiacArrestActions(),
      modelMetadata: buildModelMetadata(PredictionType.CARDIAC_ARREST),
      calculatedAt: nowIso(),
      trend: riskScore >= 60 ? 'worsening' : riskScore >= 35 ? 'stable' : 'improving',
    };
  }

  // ─── Readmission Risk ─────────────────────────────────────────────────────

  async getReadmissionRisk(
    tenantId: string,
    patientId: string,
    data?: {
      lengthOfStay?: number;
      admittedViaEmergency?: boolean;
      charlsonIndex?: number;
      priorAdmissions6Months?: number;
      age?: number;
      hba1c?: number;
      medicationAdherence?: number; // 0-100%
      socialSupport?: 'high' | 'medium' | 'low';
      priorAMA?: boolean; // alta contra indicacao medica
    },
  ): Promise<RiskPredictionResponseDto> {
    this.logger.log(`[${tenantId}] Calculating 30-day readmission risk for patient ${patientId}`);

    let riskScore: number;
    const features: ContributingFeatureDto[] = [];
    const actions: RecommendedActionDto[] = [];

    if (data) {
      // LACE Index-inspired calculation
      riskScore = 0;

      // L - Length of stay (days)
      if (data.lengthOfStay !== undefined) {
        const losPoints = data.lengthOfStay >= 14 ? 7 : data.lengthOfStay >= 7 ? 5 : data.lengthOfStay >= 4 ? 4 : data.lengthOfStay >= 3 ? 3 : data.lengthOfStay >= 2 ? 2 : 1;
        riskScore += losPoints * 3;
        features.push({ featureName: 'Tempo de internacao', importanceWeight: 0.12, currentValue: `${data.lengthOfStay} dias`, normalRange: '< 5 dias', direction: data.lengthOfStay >= 5 ? 'positive' : 'neutral' });
      }

      // A - Acuity of admission
      if (data.admittedViaEmergency) {
        riskScore += 9;
        features.push({ featureName: 'Via de admissao', importanceWeight: 0.08, currentValue: 'Pronto-Socorro', normalRange: 'Eletiva', direction: 'positive' });
      }

      // C - Comorbidities (Charlson)
      if (data.charlsonIndex !== undefined) {
        const charlsonPoints = data.charlsonIndex >= 4 ? 5 : data.charlsonIndex >= 2 ? 3 : data.charlsonIndex >= 1 ? 1 : 0;
        riskScore += charlsonPoints * 3;
        features.push({ featureName: 'Comorbidades (Charlson)', importanceWeight: 0.12, currentValue: `${data.charlsonIndex}`, normalRange: '0-1', direction: data.charlsonIndex >= 2 ? 'positive' : 'neutral' });
      }

      // E - Emergency department visits in past 6 months (using prior admissions as proxy)
      if (data.priorAdmissions6Months !== undefined) {
        const edPoints = data.priorAdmissions6Months >= 4 ? 4 : data.priorAdmissions6Months;
        riskScore += edPoints * 5;
        features.push({ featureName: 'Internacoes ultimos 6 meses', importanceWeight: 0.21, currentValue: `${data.priorAdmissions6Months}`, normalRange: '0', direction: data.priorAdmissions6Months >= 1 ? 'positive' : 'neutral' });
      }

      // Additional clinical factors
      if (data.age !== undefined && data.age >= 65) {
        riskScore += Math.min(8, Math.round((data.age - 65) / 5) * 2);
        features.push({ featureName: 'Idade', importanceWeight: 0.11, currentValue: `${data.age} anos`, normalRange: 'N/A', direction: 'positive' });
      }

      if (data.hba1c !== undefined && data.hba1c > 7.0) {
        riskScore += Math.min(10, Math.round((data.hba1c - 7.0) * 3));
        features.push({ featureName: 'Hemoglobina glicada', importanceWeight: 0.17, currentValue: `${data.hba1c}%`, normalRange: '< 7.0%', direction: 'positive' });
      }

      if (data.medicationAdherence !== undefined && data.medicationAdherence < 80) {
        riskScore += Math.min(10, Math.round((80 - data.medicationAdherence) / 5));
        features.push({ featureName: 'Adesao medicamentosa', importanceWeight: 0.15, currentValue: `${data.medicationAdherence}%`, normalRange: '> 80%', direction: 'negative' });
      }

      if (data.socialSupport === 'low') { riskScore += 8; features.push({ featureName: 'Suporte social', importanceWeight: 0.13, currentValue: 'Baixo', normalRange: 'Adequado', direction: 'negative' }); }
      else if (data.socialSupport === 'medium') { riskScore += 4; }

      if (data.priorAMA) { riskScore += 6; features.push({ featureName: 'Alta contra indicacao medica previa', importanceWeight: 0.05, currentValue: 'Sim', normalRange: 'Nao', direction: 'positive' }); }

      riskScore = Math.min(99, Math.max(1, Math.round(riskScore)));

      // Recommended actions based on risk
      if (riskScore >= 40) {
        actions.push({ action: 'Agendar consulta ambulatorial em 7 dias pos-alta com equipe multidisciplinar', priority: 'HIGH', rationale: 'Seguimento precoce reduz reinternacoes em 30%' });
        actions.push({ action: 'Reconciliacao medicamentosa com farmaceutico clinico antes da alta', priority: 'HIGH', rationale: 'Paciente com risco elevado de reinternacao' });
      }
      if (data.socialSupport === 'low') {
        actions.push({ action: 'Contato telefonico em 48h pelo servico social', priority: 'MEDIUM', rationale: 'Suporte social baixo — verificar condicoes domiciliares' });
      }
      if (data.hba1c !== undefined && data.hba1c > 8.0) {
        actions.push({ action: 'Encaminhar para programa de educacao em diabetes', priority: 'MEDIUM', rationale: `HbA1c ${data.hba1c}% — controle glicemico inadequado` });
      }
      if (data.medicationAdherence !== undefined && data.medicationAdherence < 60) {
        actions.push({ action: 'Avaliar simplificacao do esquema terapeutico e uso de pill organizers', priority: 'MEDIUM', rationale: 'Adesao medicamentosa muito baixa' });
      }
    } else {
      riskScore = randomBetween(25, 65);
      features.push(...buildReadmissionFeatures());
      actions.push(...buildReadmissionActions());
    }

    const margin = Math.round(riskScore * 0.12);

    return {
      predictionId: randomUUID(),
      patientId,
      predictionType: PredictionType.READMISSION,
      riskScore,
      riskLevel: pickRiskLevel(riskScore),
      confidenceLower: Math.max(0, riskScore - margin),
      confidenceUpper: Math.min(100, riskScore + margin),
      timeHorizon: '30 dias pos-alta',
      contributingFeatures: features.length > 0 ? features : buildReadmissionFeatures(),
      recommendedActions: actions.length > 0 ? actions : buildReadmissionActions(),
      modelMetadata: buildModelMetadata(PredictionType.READMISSION),
      calculatedAt: nowIso(),
      trend: riskScore >= 50 ? 'worsening' : riskScore >= 30 ? 'stable' : 'improving',
    };
  }

  // ─── Length of Stay ───────────────────────────────────────────────────────

  async getLengthOfStayPrediction(
    tenantId: string,
    patientId: string,
    data?: {
      primaryDiagnosisCID?: string;
      age?: number;
      charlsonIndex?: number;
      admittedViaEmergency?: boolean;
      requiresO2?: boolean;
      requiresSurgery?: boolean;
      albumin?: number;
      functionalStatus?: 'independent' | 'partial' | 'dependent';
    },
  ): Promise<LosPredictionResponseDto> {
    this.logger.log(`[${tenantId}] Predicting length of stay for patient ${patientId}`);

    let predictedDays: number;
    const features: ContributingFeatureDto[] = [];
    const actions: RecommendedActionDto[] = [];

    if (data) {
      // Base LOS by diagnosis category
      const cid = (data.primaryDiagnosisCID ?? '').toUpperCase();
      let baseDays = 5; // default
      if (cid.startsWith('J')) baseDays = 6; // respiratory
      else if (cid.startsWith('I')) baseDays = 7; // cardiovascular
      else if (cid.startsWith('K')) baseDays = 5; // GI
      else if (cid.startsWith('N')) baseDays = 4; // renal/urinary
      else if (cid.startsWith('S') || cid.startsWith('T')) baseDays = 8; // trauma
      else if (cid.startsWith('C')) baseDays = 10; // oncology
      else if (cid.startsWith('A') || cid.startsWith('B')) baseDays = 7; // infectious

      if (cid) features.push({ featureName: 'Diagnostico principal (CID)', importanceWeight: 0.20, currentValue: cid, normalRange: 'N/A', direction: 'positive' });

      // Age modifier
      if (data.age !== undefined) {
        if (data.age >= 80) baseDays += 4;
        else if (data.age >= 70) baseDays += 2;
        else if (data.age >= 60) baseDays += 1;
        features.push({ featureName: 'Idade', importanceWeight: 0.16, currentValue: `${data.age} anos`, normalRange: 'N/A', direction: data.age >= 65 ? 'positive' : 'neutral' });
      }

      // Charlson
      if (data.charlsonIndex !== undefined) {
        baseDays += Math.min(4, Math.round(data.charlsonIndex * 0.7));
        features.push({ featureName: 'Comorbidades (Charlson)', importanceWeight: 0.14, currentValue: `${data.charlsonIndex}`, normalRange: '0-1', direction: data.charlsonIndex >= 2 ? 'positive' : 'neutral' });
      }

      // O2 requirement
      if (data.requiresO2) {
        baseDays += 2;
        features.push({ featureName: 'Necessidade de O2 suplementar', importanceWeight: 0.13, currentValue: 'Sim', normalRange: 'Nao', direction: 'positive' });
      }

      // Surgery
      if (data.requiresSurgery) {
        baseDays += 3;
        features.push({ featureName: 'Procedimento cirurgico', importanceWeight: 0.07, currentValue: 'Sim', normalRange: 'N/A', direction: 'positive' });
      }

      // Albumin
      if (data.albumin !== undefined && data.albumin < 3.5) {
        baseDays += data.albumin < 2.5 ? 3 : 1;
        features.push({ featureName: 'Albumina serica', importanceWeight: 0.10, currentValue: `${data.albumin} g/dL`, normalRange: '3.5-5.5 g/dL', direction: 'negative' });
      }

      // Admission route
      if (data.admittedViaEmergency) {
        baseDays += 1;
        features.push({ featureName: 'Via de admissao', importanceWeight: 0.08, currentValue: 'Pronto-Socorro', normalRange: 'N/A', direction: 'positive' });
      }

      // Functional status
      if (data.functionalStatus === 'dependent') { baseDays += 3; features.push({ featureName: 'Estado funcional', importanceWeight: 0.06, currentValue: 'Dependente', normalRange: 'Independente', direction: 'positive' }); }
      else if (data.functionalStatus === 'partial') { baseDays += 1; }

      predictedDays = Math.max(1, baseDays);

      // Actions
      actions.push({ action: 'Iniciar fisioterapia respiratoria e mobilizacao precoce', priority: 'HIGH', rationale: 'Mobilizacao precoce reduz tempo de internacao em 1.5 dias' });
      if (predictedDays > 7) {
        actions.push({ action: 'Acionar assistencia social para planejamento de alta domiciliar', priority: 'MEDIUM', rationale: 'Internacao prolongada prevista — planejar alta com antecedencia' });
      }
      if (data.requiresO2) {
        actions.push({ action: 'Avaliar transicao de ATB IV para VO em 48-72h se criterios atendidos', priority: 'MEDIUM', rationale: 'Switch terapeutico precoce permite planejamento de alta mais cedo' });
      }
    } else {
      predictedDays = randomBetween(4, 14);
      features.push(
        { featureName: 'Diagnostico principal (CID)', importanceWeight: 0.20, currentValue: 'J18.9 — Pneumonia nao especificada', normalRange: 'N/A', direction: 'positive' },
        { featureName: 'Idade', importanceWeight: 0.16, currentValue: '72 anos', normalRange: 'N/A', direction: 'positive' },
        { featureName: 'Comorbidades (Charlson)', importanceWeight: 0.14, currentValue: '4', normalRange: '0-1', direction: 'positive' },
      );
      actions.push(
        { action: 'Iniciar fisioterapia respiratoria e mobilizacao precoce', priority: 'HIGH', rationale: 'Mobilizacao precoce reduz tempo de internacao em pneumonia em 1.5 dias' },
        { action: 'Avaliar transicao de antibiotico IV para VO em 48-72h se criterios atendidos', priority: 'MEDIUM', rationale: 'Switch terapeutico precoce permite planejamento de alta mais cedo' },
      );
    }

    const margin = Math.max(1, Math.round(predictedDays * 0.25));

    return {
      predictionId: randomUUID(),
      patientId,
      predictionType: PredictionType.LENGTH_OF_STAY,
      predictedDays,
      confidenceLowerDays: Math.max(1, predictedDays - margin),
      confidenceUpperDays: predictedDays + margin,
      expectedDischargeDate: futureDateIso(Math.round(predictedDays)),
      contributingFeatures: features,
      recommendedActions: actions,
      modelMetadata: buildModelMetadata(PredictionType.LENGTH_OF_STAY),
      calculatedAt: nowIso(),
    };
  }

  // ─── Mortality Risk ───────────────────────────────────────────────────────

  async getMortalityRisk(
    tenantId: string,
    patientId: string,
    data?: {
      apacheIIScore?: number;
      sofaScore?: number;
      glasgow?: number;
      age?: number;
      onMechanicalVentilation?: boolean;
      ventilationDays?: number;
      onVasopressors?: boolean;
      vasopressorDose?: number; // norepinephrine mcg/kg/min equivalent
      albumin?: number;
      urineOutput24h?: number; // mL
      icuDays?: number;
      charlsonIndex?: number;
    },
  ): Promise<RiskPredictionResponseDto> {
    this.logger.log(`[${tenantId}] Calculating inpatient mortality risk for patient ${patientId}`);

    let riskScore: number;
    const features: ContributingFeatureDto[] = [];
    const actions: RecommendedActionDto[] = [];

    if (data) {
      riskScore = 0;

      // APACHE II contribution (major factor)
      if (data.apacheIIScore !== undefined) {
        // APACHE II mortality approximation
        if (data.apacheIIScore >= 30) riskScore += 30;
        else if (data.apacheIIScore >= 25) riskScore += 22;
        else if (data.apacheIIScore >= 20) riskScore += 15;
        else if (data.apacheIIScore >= 15) riskScore += 10;
        else if (data.apacheIIScore >= 10) riskScore += 5;
        features.push({ featureName: 'APACHE II score', importanceWeight: 0.22, currentValue: `${data.apacheIIScore}`, normalRange: '< 10', direction: data.apacheIIScore >= 15 ? 'positive' : 'neutral' });
      }

      // SOFA contribution
      if (data.sofaScore !== undefined) {
        if (data.sofaScore >= 11) riskScore += 20;
        else if (data.sofaScore >= 7) riskScore += 12;
        else if (data.sofaScore >= 4) riskScore += 6;
        features.push({ featureName: 'SOFA score', importanceWeight: 0.18, currentValue: `${data.sofaScore}`, normalRange: '< 4', direction: data.sofaScore >= 4 ? 'positive' : 'neutral' });
      }

      // Mechanical ventilation
      if (data.onMechanicalVentilation) {
        const ventDays = data.ventilationDays ?? 1;
        riskScore += Math.min(15, 5 + ventDays);
        features.push({ featureName: 'Ventilacao mecanica', importanceWeight: 0.18, currentValue: `Sim — ${ventDays} dias`, normalRange: 'Nao', direction: 'positive' });
      }

      // Vasopressors
      if (data.onVasopressors) {
        const dose = data.vasopressorDose ?? 0.1;
        riskScore += dose > 0.3 ? 15 : dose > 0.1 ? 10 : 5;
        features.push({ featureName: 'Vasopressores', importanceWeight: 0.15, currentValue: `Norepinefrina ${dose} mcg/kg/min`, normalRange: 'Nao', direction: 'positive' });
      }

      // Albumin
      if (data.albumin !== undefined && data.albumin < 3.0) {
        riskScore += Math.min(10, Math.round((3.0 - data.albumin) * 7));
        features.push({ featureName: 'Albumina serica', importanceWeight: 0.12, currentValue: `${data.albumin} g/dL`, normalRange: '3.5-5.5 g/dL', direction: 'negative' });
      }

      // Urine output (oliguria)
      if (data.urineOutput24h !== undefined && data.urineOutput24h < 500) {
        riskScore += data.urineOutput24h < 200 ? 12 : 7;
        features.push({ featureName: 'Diurese 24h', importanceWeight: 0.11, currentValue: `${data.urineOutput24h} mL`, normalRange: '> 800 mL', direction: 'negative' });
      }

      // GCS
      if (data.glasgow !== undefined && data.glasgow < 12) {
        riskScore += data.glasgow <= 8 ? 12 : 6;
        features.push({ featureName: 'GCS', importanceWeight: 0.10, currentValue: `${data.glasgow}`, normalRange: '15', direction: 'negative' });
      }

      // Age
      if (data.age !== undefined && data.age >= 65) {
        riskScore += Math.min(8, Math.round((data.age - 65) / 5) * 2);
        features.push({ featureName: 'Idade', importanceWeight: 0.07, currentValue: `${data.age} anos`, normalRange: 'N/A', direction: 'positive' });
      }

      // ICU days
      if (data.icuDays !== undefined && data.icuDays > 7) {
        riskScore += Math.min(6, Math.round((data.icuDays - 7) / 2));
        features.push({ featureName: 'Dias em UTI', importanceWeight: 0.05, currentValue: `${data.icuDays}`, normalRange: '< 3', direction: 'positive' });
      }

      riskScore = Math.min(99, Math.max(1, Math.round(riskScore)));

      // Actions based on findings
      if (riskScore >= 60) {
        actions.push({ action: 'Discussao de caso multidisciplinar com equipe de cuidados paliativos', priority: 'HIGH', rationale: 'Risco de mortalidade elevado — definir metas de cuidado' });
        actions.push({ action: 'Comunicacao com familia sobre prognostico e diretivas antecipadas de vontade', priority: 'HIGH', rationale: 'Bioetica e autonomia do paciente' });
      }
      if (data.onVasopressors || data.onMechanicalVentilation) {
        actions.push({ action: 'Otimizar suporte hemodinamico e ventilatorio com reavaliacao diaria', priority: 'HIGH', rationale: 'Suporte intensivo ativo — reavaliar escalonamento' });
      }
      if (data.albumin !== undefined && data.albumin < 2.5) {
        actions.push({ action: 'Suporte nutricional enteral precoce e correcao de hipoalbuminemia', priority: 'MEDIUM', rationale: `Albumina ${data.albumin} — desnutricao proteico-calorica grave piora desfecho` });
      }
      if (data.urineOutput24h !== undefined && data.urineOutput24h < 400) {
        actions.push({ action: 'Avaliar necessidade de terapia renal substitutiva', priority: 'HIGH', rationale: `Diurese ${data.urineOutput24h} mL/24h — oliguria/anuria` });
      }
    } else {
      riskScore = randomBetween(20, 70);
      features.push(...buildMortalityFeatures());
      actions.push(...buildMortalityActions());
    }

    const margin = Math.round(riskScore * 0.12);

    return {
      predictionId: randomUUID(),
      patientId,
      predictionType: PredictionType.MORTALITY,
      riskScore,
      riskLevel: pickRiskLevel(riskScore),
      confidenceLower: Math.max(0, riskScore - margin),
      confidenceUpper: Math.min(100, riskScore + margin),
      timeHorizon: 'Internacao atual',
      contributingFeatures: features.length > 0 ? features : buildMortalityFeatures(),
      recommendedActions: actions.length > 0 ? actions : buildMortalityActions(),
      modelMetadata: buildModelMetadata(PredictionType.MORTALITY),
      calculatedAt: nowIso(),
      trend: riskScore >= 50 ? 'worsening' : riskScore >= 30 ? 'stable' : 'improving',
    };
  }

  // ─── Demand Forecast ──────────────────────────────────────────────────────

  async getDemandForecast(
    tenantId: string,
    unit?: UnitType,
    horizonDays: number = 7,
  ): Promise<DemandForecastResponseDto> {
    this.logger.log(`[${tenantId}] Generating ${horizonDays}-day demand forecast for unit=${unit ?? 'ALL'}`);

    const dailyForecasts: DailyDemandDto[] = [];
    let peakOccupancy = 0;
    let peakDate = '';

    for (let i = 1; i <= horizonDays; i++) {
      const date = futureDateIso(i);
      const dayIndex = new Date(date).getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;

      const baseAdmissions = isWeekend ? randomBetween(100, 130) : randomBetween(130, 170);
      const admissions = Math.round(baseAdmissions);
      const discharges = Math.round(randomBetween(admissions * 0.8, admissions * 1.1));
      const occupancy = randomBetween(75, 95);

      if (occupancy > peakOccupancy) {
        peakOccupancy = occupancy;
        peakDate = date;
      }

      dailyForecasts.push({
        date,
        dayOfWeek: WEEKDAYS_PT[dayIndex],
        predictedAdmissions: admissions,
        predictedDischarges: discharges,
        predictedEmergencyVisits: Math.round(randomBetween(15, 35)),
        predictedSurgeries: Math.round(isWeekend ? randomBetween(2, 6) : randomBetween(8, 18)),
        bedOccupancyPercent: occupancy,
        confidenceLower: Math.round(admissions * 0.85),
        confidenceUpper: Math.round(admissions * 1.15),
      });
    }

    return {
      forecastId: randomUUID(),
      unit,
      horizonDays,
      dailyForecasts,
      peakDemandDate: peakDate,
      peakOccupancy,
      recommendations: [
        {
          action: `Reforçar equipe de enfermagem para ${peakDate} — pico de ocupação previsto de ${peakOccupancy}%`,
          priority: 'HIGH',
          rationale: 'Modelo identifica sobrecarga de capacidade no período',
        },
        {
          action: 'Revisar altas programadas e antecipar planos de alta para pacientes estáveis',
          priority: 'MEDIUM',
          rationale: 'Aumentar giro de leitos antes do pico de demanda',
        },
        {
          action: 'Considerar ativar leitos extras ou transferir para unidade parceira',
          priority: 'MEDIUM',
          rationale: 'Ocupação acima de 90% aumenta mortalidade e tempo de espera no PS',
        },
      ],
      modelMetadata: buildModelMetadata(PredictionType.DEMAND_FORECAST),
      calculatedAt: nowIso(),
    };
  }

  // ─── Bed Optimization ─────────────────────────────────────────────────────

  async getBedOptimization(
    tenantId: string,
    unit: UnitType,
    _includeDischarges: boolean = true,
    maxTransfers: number = 5,
    priorityPatientIds?: string[],
  ): Promise<BedOptimizationResponseDto> {
    this.logger.log(`[${tenantId}] Running bed optimization for unit ${unit}`);

    const mockPatients = [
      { id: priorityPatientIds?.[0] ?? randomUUID(), name: 'Maria Silva Santos', current: 'PS — Maca 7' },
      { id: priorityPatientIds?.[1] ?? randomUUID(), name: 'José Carlos Oliveira', current: 'PS — Sala Vermelha' },
      { id: randomUUID(), name: 'Ana Beatriz Ferreira', current: 'Enf. 2 — Leito 4A' },
      { id: randomUUID(), name: 'Pedro Henrique Lima', current: 'UTI — Leito 3' },
      { id: randomUUID(), name: 'Francisca Rodrigues', current: 'Enf. 1 — Leito 9B' },
    ];

    const suggestions: BedSuggestionDto[] = mockPatients.slice(0, maxTransfers).map((p, idx) => ({
      patientId: p.id,
      patientName: p.name,
      suggestedBedType: idx < 2 ? BedType.UTI : BedType.ENFERMARIA,
      suggestedBed: idx < 2 ? `UTI — Leito ${idx + 8}` : `Enf. 4 — Leito ${12 + idx}B`,
      matchScore: Math.round(randomBetween(70, 98)),
      rationale: idx === 0
        ? 'Paciente com sepse grave, indicação de UTI pelo escore qSOFA >= 2'
        : idx === 1
        ? 'PCR abortada, necessita monitorização contínua em UTI'
        : `Step-down possível — paciente estável há ${24 + idx * 12}h sem intercorrência`,
      currentBed: p.current,
      isTransfer: true,
    }));

    const currentOccupancy = randomBetween(85, 95);

    return {
      optimizationId: randomUUID(),
      unit,
      suggestions,
      currentOccupancy,
      projectedOccupancy: currentOccupancy - randomBetween(3, 8),
      efficiencyGainPercent: randomBetween(3, 8),
      pendingDischarges: Math.round(randomBetween(3, 8)),
      availableBeds: Math.round(randomBetween(2, 7)),
      modelMetadata: buildModelMetadata(PredictionType.DEMAND_FORECAST),
      calculatedAt: nowIso(),
    };
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard(
    tenantId: string,
    unit?: UnitType,
    minRiskScore: number = 0,
  ): Promise<DashboardResponseDto> {
    this.logger.log(`[${tenantId}] Building predictive dashboard for unit=${unit ?? 'ALL'}`);

    const mockPatients: PatientRiskSummaryDto[] = [
      {
        patientId: randomUUID(),
        patientName: 'Carlos Eduardo Mendes',
        location: 'UTI — Leito 3',
        sepsisRisk: 78,
        cardiacArrestRisk: 45,
        readmissionRisk: 62,
        mortalityRisk: 55,
        highestRiskLevel: RiskLevel.HIGH,
        highestRiskType: 'Sepse',
        activeAlerts: ['qSOFA >= 2', 'Lactato > 4 mmol/L', 'Hipotensão persistente'],
      },
      {
        patientId: randomUUID(),
        patientName: 'Maria das Graças Souza',
        location: 'Enf. 2 — Leito 7A',
        sepsisRisk: 35,
        cardiacArrestRisk: 82,
        readmissionRisk: 40,
        mortalityRisk: 38,
        highestRiskLevel: RiskLevel.CRITICAL,
        highestRiskType: 'Parada cardíaca',
        activeAlerts: ['K+ 6.1 mEq/L', 'QTc prolongado', 'Troponina elevada'],
      },
      {
        patientId: randomUUID(),
        patientName: 'João Batista Pereira',
        location: 'Enf. 4 — Leito 12B',
        sepsisRisk: 22,
        cardiacArrestRisk: 18,
        readmissionRisk: 71,
        mortalityRisk: 12,
        highestRiskLevel: RiskLevel.HIGH,
        highestRiskType: 'Readmissão',
        activeAlerts: ['3 internações em 6 meses', 'HbA1c 9.8%', 'Baixa adesão medicamentosa'],
      },
      {
        patientId: randomUUID(),
        patientName: 'Ana Lúcia Fernandes',
        location: 'UTI — Leito 6',
        sepsisRisk: 88,
        cardiacArrestRisk: 52,
        readmissionRisk: 55,
        mortalityRisk: 67,
        highestRiskLevel: RiskLevel.CRITICAL,
        highestRiskType: 'Sepse',
        activeAlerts: ['Choque séptico', 'Vasopressor em dose alta', 'IRA dialítica'],
      },
      {
        patientId: randomUUID(),
        patientName: 'Roberto Carlos Lima',
        location: 'Enf. 1 — Leito 3C',
        sepsisRisk: 15,
        cardiacArrestRisk: 10,
        readmissionRisk: 28,
        mortalityRisk: 8,
        highestRiskLevel: RiskLevel.MODERATE,
        highestRiskType: 'Readmissão',
        activeAlerts: ['DPOC descompensada', 'Uso domiciliar de O2'],
      },
      {
        patientId: randomUUID(),
        patientName: 'Tereza Cristina Alves',
        location: 'Enf. 3 — Leito 5B',
        sepsisRisk: 8,
        cardiacArrestRisk: 5,
        readmissionRisk: 12,
        mortalityRisk: 3,
        highestRiskLevel: RiskLevel.LOW,
        highestRiskType: 'Readmissão',
        activeAlerts: [],
      },
    ];

    const filtered = mockPatients.filter((p) => {
      const maxRisk = Math.max(p.sepsisRisk, p.cardiacArrestRisk, p.readmissionRisk, p.mortalityRisk);
      return maxRisk >= minRiskScore;
    });

    const criticalCount = filtered.filter((p) => p.highestRiskLevel === RiskLevel.CRITICAL).length;
    const highCount = filtered.filter((p) => p.highestRiskLevel === RiskLevel.HIGH).length;
    const moderateCount = filtered.filter((p) => p.highestRiskLevel === RiskLevel.MODERATE).length;
    const lowCount = filtered.filter((p) => p.highestRiskLevel === RiskLevel.LOW).length;

    return {
      unit,
      totalPatientsMonitored: filtered.length,
      criticalRiskCount: criticalCount,
      highRiskCount: highCount,
      moderateRiskCount: moderateCount,
      lowRiskCount: lowCount,
      patients: filtered,
      modelsLastUpdated: '2026-03-25T06:00:00Z',
      accuracyLast30d: 87.3,
      calculatedAt: nowIso(),
    };
  }

  // ─── Feature Importance (SHAP) ────────────────────────────────────────────

  async getFeatureImportance(
    tenantId: string,
    predictionType: PredictionType,
    patientId?: string,
    topN: number = 10,
  ): Promise<FeatureImportanceResponseDto> {
    this.logger.log(
      `[${tenantId}] Getting SHAP feature importance for ${predictionType} (patient=${patientId ?? 'global'})`,
    );

    const featuresByType: Record<PredictionType, ShapFeatureDto[]> = {
      [PredictionType.SEPSIS]: [
        { featureName: 'Lactato sérico', shapValue: 0.23, explanation: 'Elevação de lactato indica hipoperfusão tecidual, marcador precoce de sepse', featureCategory: 'laboratorial' },
        { featureName: 'Leucócitos', shapValue: 0.18, explanation: 'Leucocitose ou leucopenia sugere resposta inflamatória sistêmica', featureCategory: 'laboratorial' },
        { featureName: 'Frequência cardíaca', shapValue: 0.15, explanation: 'Taquicardia como resposta compensatória a infecção/hipotensão', featureCategory: 'sinal-vital' },
        { featureName: 'Temperatura', shapValue: 0.14, explanation: 'Febre ou hipotermia como critério SIRS', featureCategory: 'sinal-vital' },
        { featureName: 'PA sistólica', shapValue: 0.12, explanation: 'Hipotensão reflete comprometimento hemodinâmico', featureCategory: 'sinal-vital' },
        { featureName: 'Creatinina', shapValue: 0.09, explanation: 'Disfunção renal aguda como marcador de gravidade', featureCategory: 'laboratorial' },
        { featureName: 'Plaquetas', shapValue: 0.05, explanation: 'Plaquetopenia indica coagulopatia de consumo', featureCategory: 'laboratorial' },
        { featureName: 'PCR', shapValue: 0.04, explanation: 'Proteína C reativa como marcador inflamatório inespecífico', featureCategory: 'laboratorial' },
        { featureName: 'Frequência respiratória', shapValue: 0.03, explanation: 'Taquipneia como critério qSOFA', featureCategory: 'sinal-vital' },
        { featureName: 'Idade', shapValue: 0.02, explanation: 'Idade avançada aumenta susceptibilidade a infecções graves', featureCategory: 'demográfico' },
      ],
      [PredictionType.CARDIAC_ARREST]: [
        { featureName: 'Troponina', shapValue: 0.25, explanation: 'Injúria miocárdica aumenta risco de arritmia', featureCategory: 'laboratorial' },
        { featureName: 'Potássio', shapValue: 0.19, explanation: 'Distúrbios de K+ alteram condução cardíaca', featureCategory: 'laboratorial' },
        { featureName: 'QTc', shapValue: 0.16, explanation: 'QTc prolongado predispõe a torsades de pointes', featureCategory: 'ECG' },
        { featureName: 'SpO2', shapValue: 0.14, explanation: 'Hipoxemia crônica causa remodelamento cardíaco', featureCategory: 'sinal-vital' },
        { featureName: 'BNP', shapValue: 0.11, explanation: 'Marcador de sobrecarga/disfunção ventricular', featureCategory: 'laboratorial' },
        { featureName: 'FC', shapValue: 0.08, explanation: 'Taquicardia sustentada aumenta consumo miocárdico de O2', featureCategory: 'sinal-vital' },
        { featureName: 'Magnésio', shapValue: 0.07, explanation: 'Hipomagnesemia contribui para instabilidade elétrica', featureCategory: 'laboratorial' },
        { featureName: 'Fração de ejeção', shapValue: 0.05, explanation: 'FE reduzida é fator de risco independente para PCR', featureCategory: 'imagem' },
        { featureName: 'Medicações QT-prolongadoras', shapValue: 0.03, explanation: 'Polifarmácia com drogas arritmogênicas', featureCategory: 'medicação' },
        { featureName: 'Histórico de arritmia', shapValue: 0.02, explanation: 'Arritmia prévia é forte preditor de recorrência', featureCategory: 'histórico' },
      ],
      [PredictionType.READMISSION]: [
        { featureName: 'Internações prévias', shapValue: 0.21, explanation: 'Histórico de reinternações é o principal preditor', featureCategory: 'histórico' },
        { featureName: 'HbA1c', shapValue: 0.17, explanation: 'Controle glicêmico inadequado leva a complicações', featureCategory: 'laboratorial' },
        { featureName: 'Adesão medicamentosa', shapValue: 0.15, explanation: 'Baixa adesão aumenta risco de descompensação', featureCategory: 'comportamental' },
        { featureName: 'Suporte social', shapValue: 0.13, explanation: 'Isolamento social dificulta cuidado domiciliar', featureCategory: 'social' },
        { featureName: 'Índice de Charlson', shapValue: 0.12, explanation: 'Múltiplas comorbidades aumentam complexidade', featureCategory: 'clínico' },
        { featureName: 'Idade', shapValue: 0.11, explanation: 'Idosos têm maior vulnerabilidade pós-alta', featureCategory: 'demográfico' },
        { featureName: 'Tempo de internação', shapValue: 0.06, explanation: 'Internação prolongada indica maior gravidade', featureCategory: 'clínico' },
        { featureName: 'Alta contra indicação', shapValue: 0.05, explanation: 'Alta precoce ou contra indicação piora desfecho', featureCategory: 'histórico' },
      ],
      [PredictionType.LENGTH_OF_STAY]: [
        { featureName: 'CID principal', shapValue: 0.20, explanation: 'Diagnóstico determina tempo esperado de tratamento', featureCategory: 'clínico' },
        { featureName: 'Idade', shapValue: 0.16, explanation: 'Pacientes idosos recuperam-se mais lentamente', featureCategory: 'demográfico' },
        { featureName: 'Comorbidades', shapValue: 0.14, explanation: 'Múltiplas comorbidades complicam internação', featureCategory: 'clínico' },
        { featureName: 'Necessidade de O2', shapValue: 0.13, explanation: 'Suplementação de O2 indica gravidade respiratória', featureCategory: 'sinal-vital' },
        { featureName: 'Albumina', shapValue: 0.10, explanation: 'Hipoalbuminemia está associada a pior recuperação', featureCategory: 'laboratorial' },
        { featureName: 'Via de admissão', shapValue: 0.08, explanation: 'Admissão via PS tende a ser mais grave que eletiva', featureCategory: 'administrativo' },
        { featureName: 'Procedimento cirúrgico', shapValue: 0.07, explanation: 'Cirurgias adicionam dias de recuperação', featureCategory: 'clínico' },
        { featureName: 'Estado funcional', shapValue: 0.06, explanation: 'Dependência funcional atrasa alta segura', featureCategory: 'funcional' },
      ],
      [PredictionType.MORTALITY]: [
        { featureName: 'APACHE II', shapValue: 0.22, explanation: 'Score de gravidade validado para UTI', featureCategory: 'clínico' },
        { featureName: 'Ventilação mecânica', shapValue: 0.18, explanation: 'VM prolongada aumenta mortalidade', featureCategory: 'suporte' },
        { featureName: 'Vasopressores', shapValue: 0.15, explanation: 'Necessidade de vasopressor indica choque', featureCategory: 'suporte' },
        { featureName: 'Albumina', shapValue: 0.12, explanation: 'Desnutrição piora prognóstico em UTI', featureCategory: 'laboratorial' },
        { featureName: 'Diurese', shapValue: 0.11, explanation: 'Oligúria indica falência renal', featureCategory: 'sinal-vital' },
        { featureName: 'GCS', shapValue: 0.10, explanation: 'Rebaixamento de consciência indica gravidade neurológica', featureCategory: 'neurológico' },
        { featureName: 'Idade', shapValue: 0.07, explanation: 'Mortalidade aumenta com idade', featureCategory: 'demográfico' },
        { featureName: 'Dias em UTI', shapValue: 0.05, explanation: 'Permanência prolongada aumenta complicações', featureCategory: 'clínico' },
      ],
      [PredictionType.DEMAND_FORECAST]: [
        { featureName: 'Dia da semana', shapValue: 0.25, explanation: 'Demanda varia significativamente entre dias úteis e finais de semana', featureCategory: 'temporal' },
        { featureName: 'Sazonalidade', shapValue: 0.20, explanation: 'Inverno aumenta internações respiratórias', featureCategory: 'temporal' },
        { featureName: 'Ocupação atual', shapValue: 0.15, explanation: 'Inércia de ocupação — leitos cheios demoram a liberar', featureCategory: 'operacional' },
        { featureName: 'Altas programadas', shapValue: 0.12, explanation: 'Altas previstas liberam capacidade', featureCategory: 'operacional' },
        { featureName: 'Cirurgias eletivas', shapValue: 0.10, explanation: 'Cirurgias programadas geram internações previsíveis', featureCategory: 'operacional' },
        { featureName: 'Epidemias ativas', shapValue: 0.08, explanation: 'Surtos de dengue/influenza aumentam demanda de PS', featureCategory: 'epidemiológico' },
        { featureName: 'Eventos regionais', shapValue: 0.05, explanation: 'Feriados e eventos locais alteram fluxo de pacientes', featureCategory: 'contextual' },
        { featureName: 'Tendência histórica', shapValue: 0.05, explanation: 'Crescimento ou declínio de demanda ao longo dos meses', featureCategory: 'temporal' },
      ],
    };

    const allFeatures = featuresByType[predictionType] ?? featuresByType[PredictionType.SEPSIS];
    const features = allFeatures.slice(0, topN);

    return {
      predictionType,
      patientId,
      features,
      modelMetadata: buildModelMetadata(predictionType),
      calculatedAt: nowIso(),
    };
  }
}
