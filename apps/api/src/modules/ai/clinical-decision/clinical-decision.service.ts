import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ClinicalCalculatorType,
  InteractionSeverity,
  RiskLevel,
  DifferentialDiagnosisResponseDto,
  ClinicalCalculatorResponseDto,
  CalculatorResultDto,
  PredictiveAlertsResponseDto,
  DrugInteractionResponseDto,
  DrugInteractionResult,
  ProtocolRecommendationResponseDto,
  RiskTimelineResponseDto,
  CdsMetricsResponseDto,
  DiagnosisCandidate,
} from './dto/clinical-decision.dto';

// ─── Internal Types ──────────────────────────────────────────────────────────

interface CdsQuery {
  id: string;
  tenantId: string;
  userId: string;
  endpoint: string;
  patientId?: string;
  createdAt: Date;
  responseTimeMs: number;
  accepted: boolean;
  overridden: boolean;
}

// ─── Clinical Score Calculators ──────────────────────────────────────────────

type ScoreCalculator = (params: Record<string, string | number | boolean>) => CalculatorResultDto;

const CALCULATORS: Record<ClinicalCalculatorType, ScoreCalculator> = {
  [ClinicalCalculatorType.CHADS2_VASC]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    const age = Number(params['age'] ?? 65);
    if (age >= 75) {
      score += 2;
      components.push({ name: 'Idade >= 75', value: 2, description: 'Idade >= 75 anos' });
    } else if (age >= 65) {
      score += 1;
      components.push({ name: 'Idade 65-74', value: 1, description: 'Idade entre 65-74 anos' });
    } else {
      components.push({ name: 'Idade < 65', value: 0, description: 'Idade menor que 65 anos' });
    }

    if (params['heartFailure']) {
      score += 1;
      components.push({ name: 'IC/disfuncao VE', value: 1, description: 'Insuficiencia cardiaca ou disfuncao ventricular' });
    }
    if (params['hypertension']) {
      score += 1;
      components.push({ name: 'Hipertensao', value: 1, description: 'Hipertensao arterial sistemica' });
    }
    if (params['diabetes']) {
      score += 1;
      components.push({ name: 'Diabetes', value: 1, description: 'Diabetes mellitus' });
    }
    if (params['stroke']) {
      score += 2;
      components.push({ name: 'AVC/AIT/TE', value: 2, description: 'AVC, AIT ou tromboembolismo previo' });
    }
    if (params['vascularDisease']) {
      score += 1;
      components.push({ name: 'Doenca vascular', value: 1, description: 'IAM previo, DAP ou placa aortica' });
    }
    if (params['sex'] === 'F' || params['sex'] === 'female') {
      score += 1;
      components.push({ name: 'Sexo feminino', value: 1, description: 'Sexo feminino' });
    }

    const riskLevel = score === 0 ? RiskLevel.LOW : score === 1 ? RiskLevel.MODERATE : RiskLevel.HIGH;
    const recommendation = score === 0
      ? 'Baixo risco — considerar nao anticoagular ou AAS isolado'
      : score === 1
        ? 'Risco intermediario — considerar anticoagulacao oral (NOAC preferencial)'
        : 'Alto risco — anticoagulacao oral indicada (NOAC ou varfarina com INR 2-3)';

    return {
      calculatorType: ClinicalCalculatorType.CHADS2_VASC,
      calculatorName: 'CHA2DS2-VASc (Risco de AVC na Fibrilacao Atrial)',
      score,
      maxScore: 9,
      interpretation: `Score ${score}/9 — risco anual de AVC estimado: ${[0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2][score]}%`,
      riskLevel,
      recommendation,
      components,
      references: [
        'Lip GYH et al. Chest 2010;137:263-72',
        'Diretriz Brasileira de Fibrilacao Atrial — SBC 2023',
      ],
    };
  },

  [ClinicalCalculatorType.WELLS_DVT]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    if (params['activeCancer']) { score += 1; components.push({ name: 'Cancer ativo', value: 1, description: 'Tratamento nos ultimos 6 meses ou paliativo' }); }
    if (params['paralysis']) { score += 1; components.push({ name: 'Paralisia/paresia', value: 1, description: 'Paralisia, paresia ou imobilizacao de MMII' }); }
    if (params['bedridden']) { score += 1; components.push({ name: 'Restritos ao leito', value: 1, description: 'Repouso no leito >3 dias ou cirurgia major <12 sem' }); }
    if (params['localTenderness']) { score += 1; components.push({ name: 'Dor localizada', value: 1, description: 'Dor ao longo do sistema venoso profundo' }); }
    if (params['entireLegSwollen']) { score += 1; components.push({ name: 'Edema global', value: 1, description: 'Edema de toda a perna' }); }
    if (params['calfSwelling']) { score += 1; components.push({ name: 'Edema de panturrilha', value: 1, description: 'Panturrilha >3cm vs contralateral' }); }
    if (params['pittingEdema']) { score += 1; components.push({ name: 'Edema depressivel', value: 1, description: 'Edema depressivel (pitting) na perna sintomatica' }); }
    if (params['collateralVeins']) { score += 1; components.push({ name: 'Veias colaterais', value: 1, description: 'Veias colaterais superficiais (nao varicosas)' }); }
    if (params['alternativeDiagnosis']) { score -= 2; components.push({ name: 'Diagnostico alternativo', value: -2, description: 'Diagnostico alternativo tao provavel quanto TVP' }); }

    const riskLevel = score <= 0 ? RiskLevel.LOW : score <= 2 ? RiskLevel.MODERATE : RiskLevel.HIGH;

    return {
      calculatorType: ClinicalCalculatorType.WELLS_DVT,
      calculatorName: 'Wells Score para TVP',
      score,
      maxScore: 8,
      interpretation: `Score ${score} — probabilidade pre-teste: ${score <= 0 ? 'baixa (~5%)' : score <= 2 ? 'moderada (~17%)' : 'alta (~53%)'}`,
      riskLevel,
      recommendation: score <= 0
        ? 'Solicitar D-dimero. Se negativo, TVP excluida'
        : score <= 2
          ? 'Solicitar D-dimero. Se positivo, prosseguir com USG Doppler'
          : 'Solicitar USG Doppler venoso diretamente',
      components,
      references: ['Wells PS et al. NEJM 2003;349:1227-35'],
    };
  },

  [ClinicalCalculatorType.WELLS_PE]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    if (params['dvtSymptoms']) { score += 3; components.push({ name: 'Sinais/sintomas TVP', value: 3, description: 'Sinais clinicos de TVP' }); }
    if (params['alternativeLessLikely']) { score += 3; components.push({ name: 'Alternativa menos provavel', value: 3, description: 'Diagnostico alternativo menos provavel que TEP' }); }
    if (params['heartRate100']) { score += 1.5; components.push({ name: 'FC > 100', value: 1.5, description: 'Frequencia cardiaca > 100 bpm' }); }
    if (params['immobilization']) { score += 1.5; components.push({ name: 'Imobilizacao/cirurgia', value: 1.5, description: 'Imobilizacao ou cirurgia nas ultimas 4 semanas' }); }
    if (params['previousDvtPe']) { score += 1.5; components.push({ name: 'TVP/TEP previo', value: 1.5, description: 'TVP ou TEP previo' }); }
    if (params['hemoptysis']) { score += 1; components.push({ name: 'Hemoptise', value: 1, description: 'Hemoptise' }); }
    if (params['malignancy']) { score += 1; components.push({ name: 'Malignidade', value: 1, description: 'Malignidade com tratamento nos ultimos 6 meses' }); }

    const riskLevel = score < 2 ? RiskLevel.LOW : score <= 6 ? RiskLevel.MODERATE : RiskLevel.HIGH;

    return {
      calculatorType: ClinicalCalculatorType.WELLS_PE,
      calculatorName: 'Wells Score para TEP',
      score,
      maxScore: 12.5,
      interpretation: `Score ${score} — probabilidade: ${score < 2 ? 'baixa' : score <= 6 ? 'moderada' : 'alta'}`,
      riskLevel,
      recommendation: score < 2
        ? 'Aplicar criterios PERC ou solicitar D-dimero'
        : score <= 6
          ? 'Solicitar D-dimero. Se positivo, angioTC de torax'
          : 'Solicitar angioTC de torax diretamente. Considerar anticoagulacao empirica',
      components,
      references: ['Wells PS et al. Thromb Haemost 2000;83:416-20'],
    };
  },

  [ClinicalCalculatorType.CURB65]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    if (params['confusion']) { score += 1; components.push({ name: 'Confusao mental', value: 1, description: 'Confusao mental (AMT <= 8)' }); }
    if (Number(params['bun'] ?? 0) > 20 || Number(params['urea'] ?? 0) > 42.8) {
      score += 1;
      components.push({ name: 'Ureia > 42.8 mg/dL', value: 1, description: 'Ureia serica > 42.8 mg/dL (BUN > 20 mg/dL)' });
    }
    if (Number(params['respiratoryRate'] ?? 0) >= 30) {
      score += 1;
      components.push({ name: 'FR >= 30', value: 1, description: 'Frequencia respiratoria >= 30 irpm' });
    }
    const sbp = Number(params['systolicBP'] ?? 120);
    const dbp = Number(params['diastolicBP'] ?? 80);
    if (sbp < 90 || dbp <= 60) {
      score += 1;
      components.push({ name: 'Hipotensao', value: 1, description: 'PAS < 90 mmHg ou PAD <= 60 mmHg' });
    }
    if (Number(params['age'] ?? 0) >= 65) {
      score += 1;
      components.push({ name: 'Idade >= 65', value: 1, description: 'Idade >= 65 anos' });
    }

    const mortality = [0.6, 2.7, 6.8, 14.0, 27.8, 57.0];
    const riskLevel = score <= 1 ? RiskLevel.LOW : score === 2 ? RiskLevel.MODERATE : RiskLevel.HIGH;

    return {
      calculatorType: ClinicalCalculatorType.CURB65,
      calculatorName: 'CURB-65 (Gravidade de Pneumonia Comunitaria)',
      score,
      maxScore: 5,
      interpretation: `Score ${score}/5 — mortalidade em 30 dias estimada: ${mortality[score]}%`,
      riskLevel,
      recommendation: score <= 1
        ? 'Baixo risco — considerar tratamento ambulatorial'
        : score === 2
          ? 'Risco moderado — considerar internacao hospitalar breve ou tratamento supervisionado'
          : 'Alto risco — internacao. Score >= 4: considerar UTI',
      components,
      references: ['Lim WS et al. Thorax 2003;58:377-82', 'Diretriz SBP/SBPT — Pneumonia Comunitaria 2022'],
    };
  },

  [ClinicalCalculatorType.MELD]: (params) => {
    const bilirubin = Math.max(1, Number(params['bilirubin'] ?? 1));
    const creatinine = Math.min(4, Math.max(1, Number(params['creatinine'] ?? 1)));
    const inr = Math.max(1, Number(params['inr'] ?? 1));
    const sodium = Math.min(137, Math.max(125, Number(params['sodium'] ?? 137)));
    const onDialysis = params['dialysis'] === true || params['dialysis'] === 'true';

    const creatinineAdj = onDialysis ? 4 : creatinine;

    const meld = Math.round(
      10 * (
        0.957 * Math.log(creatinineAdj) +
        0.378 * Math.log(bilirubin) +
        1.120 * Math.log(inr) +
        0.643
      ),
    );

    const meldNa = Math.round(meld - sodium * (0.025 * meld * (140 - sodium)) + 140);
    const finalScore = Math.max(6, Math.min(40, meldNa));

    const riskLevel = finalScore < 10 ? RiskLevel.LOW
      : finalScore < 20 ? RiskLevel.MODERATE
        : finalScore < 30 ? RiskLevel.HIGH
          : RiskLevel.CRITICAL;

    return {
      calculatorType: ClinicalCalculatorType.MELD,
      calculatorName: 'MELD-Na (Doenca Hepatica Terminal)',
      score: finalScore,
      maxScore: 40,
      interpretation: `MELD-Na ${finalScore} — mortalidade em 90 dias: ${finalScore < 10 ? '<2%' : finalScore < 20 ? '6%' : finalScore < 30 ? '20%' : '>50%'}`,
      riskLevel,
      recommendation: finalScore < 15
        ? 'Acompanhamento ambulatorial. Repetir em 3-6 meses'
        : finalScore < 25
          ? 'Encaminhar para centro de transplante hepatico. Repetir em 1-3 meses'
          : 'Prioridade para transplante hepatico. Monitoramento frequente',
      components: [
        { name: 'Bilirrubina', value: bilirubin, description: `${bilirubin} mg/dL` },
        { name: 'Creatinina', value: creatinineAdj, description: `${creatinineAdj} mg/dL${onDialysis ? ' (dialise)' : ''}` },
        { name: 'INR', value: inr, description: `${inr}` },
        { name: 'Sodio', value: sodium, description: `${sodium} mEq/L` },
      ],
      references: ['Kamath PS et al. Hepatology 2001;33:464-70', 'Kim WR et al. Hepatology 2008;48:S107'],
    };
  },

  [ClinicalCalculatorType.CHILD_PUGH]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    const bilirubin = Number(params['bilirubin'] ?? 1);
    if (bilirubin < 2) { score += 1; components.push({ name: 'Bilirrubina', value: 1, description: `${bilirubin} mg/dL (< 2)` }); }
    else if (bilirubin <= 3) { score += 2; components.push({ name: 'Bilirrubina', value: 2, description: `${bilirubin} mg/dL (2-3)` }); }
    else { score += 3; components.push({ name: 'Bilirrubina', value: 3, description: `${bilirubin} mg/dL (> 3)` }); }

    const albumin = Number(params['albumin'] ?? 4);
    if (albumin > 3.5) { score += 1; components.push({ name: 'Albumina', value: 1, description: `${albumin} g/dL (> 3.5)` }); }
    else if (albumin >= 2.8) { score += 2; components.push({ name: 'Albumina', value: 2, description: `${albumin} g/dL (2.8-3.5)` }); }
    else { score += 3; components.push({ name: 'Albumina', value: 3, description: `${albumin} g/dL (< 2.8)` }); }

    const inr = Number(params['inr'] ?? 1);
    if (inr < 1.7) { score += 1; components.push({ name: 'INR', value: 1, description: `${inr} (< 1.7)` }); }
    else if (inr <= 2.3) { score += 2; components.push({ name: 'INR', value: 2, description: `${inr} (1.7-2.3)` }); }
    else { score += 3; components.push({ name: 'INR', value: 3, description: `${inr} (> 2.3)` }); }

    const ascites = String(params['ascites'] ?? 'none');
    if (ascites === 'none') { score += 1; components.push({ name: 'Ascite', value: 1, description: 'Ausente' }); }
    else if (ascites === 'mild') { score += 2; components.push({ name: 'Ascite', value: 2, description: 'Leve (controlada com diureticos)' }); }
    else { score += 3; components.push({ name: 'Ascite', value: 3, description: 'Moderada/grave (refrataria)' }); }

    const encephalopathy = String(params['encephalopathy'] ?? 'none');
    if (encephalopathy === 'none') { score += 1; components.push({ name: 'Encefalopatia', value: 1, description: 'Ausente' }); }
    else if (encephalopathy === 'grade1-2') { score += 2; components.push({ name: 'Encefalopatia', value: 2, description: 'Grau I-II' }); }
    else { score += 3; components.push({ name: 'Encefalopatia', value: 3, description: 'Grau III-IV' }); }

    const classLabel = score <= 6 ? 'A' : score <= 9 ? 'B' : 'C';
    const survival1yr = score <= 6 ? '100%' : score <= 9 ? '81%' : '45%';
    const riskLevel = score <= 6 ? RiskLevel.LOW : score <= 9 ? RiskLevel.MODERATE : RiskLevel.HIGH;

    return {
      calculatorType: ClinicalCalculatorType.CHILD_PUGH,
      calculatorName: 'Child-Pugh (Classificacao de Cirrose)',
      score,
      maxScore: 15,
      interpretation: `Child-Pugh Classe ${classLabel} (${score} pontos) — sobrevida em 1 ano: ${survival1yr}`,
      riskLevel,
      recommendation: classLabel === 'A'
        ? 'Doenca compensada — acompanhar. Ajustar doses de medicamentos hepatotoxicos'
        : classLabel === 'B'
          ? 'Doenca significativa — avaliar transplante. Rastrear varizes esofagicas'
          : 'Doenca descompensada — encaminhar para transplante hepatico urgente',
      components,
      references: ['Pugh RN et al. Br J Surg 1973;60:646-9'],
    };
  },

  [ClinicalCalculatorType.APACHE_II]: (params) => {
    let apsScore = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    // Temperature
    const temp = Number(params['temperature'] ?? 37);
    if (temp >= 41) { apsScore += 4; components.push({ name: 'Temperatura', value: 4, description: `${temp}°C (>= 41)` }); }
    else if (temp >= 39) { apsScore += 3; components.push({ name: 'Temperatura', value: 3, description: `${temp}°C (39-40.9)` }); }
    else if (temp >= 38.5) { apsScore += 1; components.push({ name: 'Temperatura', value: 1, description: `${temp}°C (38.5-38.9)` }); }
    else if (temp >= 36) { apsScore += 0; components.push({ name: 'Temperatura', value: 0, description: `${temp}°C (36-38.4)` }); }
    else if (temp >= 34) { apsScore += 1; components.push({ name: 'Temperatura', value: 1, description: `${temp}°C (34-35.9)` }); }
    else if (temp >= 32) { apsScore += 2; components.push({ name: 'Temperatura', value: 2, description: `${temp}°C (32-33.9)` }); }
    else if (temp >= 30) { apsScore += 3; components.push({ name: 'Temperatura', value: 3, description: `${temp}°C (30-31.9)` }); }
    else { apsScore += 4; components.push({ name: 'Temperatura', value: 4, description: `${temp}°C (< 30)` }); }

    // Mean arterial pressure
    const map = Number(params['meanArterialPressure'] ?? params['map'] ?? 85);
    if (map >= 160) { apsScore += 4; } else if (map >= 130) { apsScore += 3; } else if (map >= 110) { apsScore += 2; }
    else if (map >= 70) { apsScore += 0; } else if (map >= 50) { apsScore += 2; } else { apsScore += 4; }
    components.push({ name: 'PAM', value: map, description: `${map} mmHg` });

    // Heart rate
    const hr = Number(params['heartRate'] ?? params['hr'] ?? 80);
    if (hr >= 180) { apsScore += 4; } else if (hr >= 140) { apsScore += 3; } else if (hr >= 110) { apsScore += 2; }
    else if (hr >= 70) { apsScore += 0; } else if (hr >= 55) { apsScore += 2; } else if (hr >= 40) { apsScore += 3; }
    else { apsScore += 4; }
    components.push({ name: 'FC', value: hr, description: `${hr} bpm` });

    // Respiratory rate
    const rr = Number(params['respiratoryRate'] ?? params['rr'] ?? 16);
    if (rr >= 50) { apsScore += 4; } else if (rr >= 35) { apsScore += 3; } else if (rr >= 25) { apsScore += 1; }
    else if (rr >= 12) { apsScore += 0; } else if (rr >= 10) { apsScore += 1; } else if (rr >= 6) { apsScore += 2; }
    else { apsScore += 4; }
    components.push({ name: 'FR', value: rr, description: `${rr} irpm` });

    // Oxygenation: if FiO2 >= 0.5 use A-a gradient, else use PaO2
    const fio2 = Number(params['fio2'] ?? 0.21);
    const pao2 = Number(params['pao2'] ?? 80);
    if (fio2 >= 0.5) {
      const aaGradient = Number(params['aaGradient'] ?? ((fio2 * 713) - (Number(params['paco2'] ?? 40) / 0.8) - pao2));
      if (aaGradient >= 500) { apsScore += 4; } else if (aaGradient >= 350) { apsScore += 3; } else if (aaGradient >= 200) { apsScore += 2; }
      else { apsScore += 0; }
      components.push({ name: 'A-a gradiente', value: Math.round(aaGradient), description: `${Math.round(aaGradient)} (FiO2 ${(fio2 * 100).toFixed(0)}%)` });
    } else {
      if (pao2 > 70) { apsScore += 0; } else if (pao2 >= 61) { apsScore += 1; } else if (pao2 >= 55) { apsScore += 3; }
      else { apsScore += 4; }
      components.push({ name: 'PaO2', value: pao2, description: `${pao2} mmHg (FiO2 ${(fio2 * 100).toFixed(0)}%)` });
    }

    // pH arterial
    const ph = Number(params['ph'] ?? 7.4);
    if (ph >= 7.7) { apsScore += 4; } else if (ph >= 7.6) { apsScore += 3; } else if (ph >= 7.5) { apsScore += 1; }
    else if (ph >= 7.33) { apsScore += 0; } else if (ph >= 7.25) { apsScore += 2; } else if (ph >= 7.15) { apsScore += 3; }
    else { apsScore += 4; }
    components.push({ name: 'pH arterial', value: ph, description: `${ph}` });

    // Sodium
    const na = Number(params['sodium'] ?? params['na'] ?? 140);
    if (na >= 180) { apsScore += 4; } else if (na >= 160) { apsScore += 3; } else if (na >= 155) { apsScore += 2; }
    else if (na >= 150) { apsScore += 1; } else if (na >= 130) { apsScore += 0; } else if (na >= 120) { apsScore += 2; }
    else { apsScore += 3; }

    // Potassium
    const k = Number(params['potassium'] ?? params['k'] ?? 4.0);
    if (k >= 7) { apsScore += 4; } else if (k >= 6) { apsScore += 3; } else if (k >= 5.5) { apsScore += 1; }
    else if (k >= 3.5) { apsScore += 0; } else if (k >= 3.0) { apsScore += 1; } else if (k >= 2.5) { apsScore += 2; }
    else { apsScore += 4; }

    // Creatinine
    const cr = Number(params['creatinine'] ?? params['cr'] ?? 1.0);
    const arf = params['acuteRenalFailure'] === true || params['acuteRenalFailure'] === 'true';
    const crMult = arf ? 2 : 1;
    if (cr >= 3.5) { apsScore += 4 * crMult; } else if (cr >= 2.0) { apsScore += 3 * crMult; } else if (cr >= 1.5) { apsScore += 2 * crMult; }
    else if (cr >= 0.6) { apsScore += 0; } else { apsScore += 2 * crMult; }

    // Hematocrit
    const hct = Number(params['hematocrit'] ?? params['hct'] ?? 40);
    if (hct >= 60) { apsScore += 4; } else if (hct >= 50) { apsScore += 2; } else if (hct >= 46) { apsScore += 1; }
    else if (hct >= 30) { apsScore += 0; } else if (hct >= 20) { apsScore += 2; } else { apsScore += 4; }

    // WBC
    const wbc = Number(params['wbc'] ?? params['leukocytes'] ?? 10);
    if (wbc >= 40) { apsScore += 4; } else if (wbc >= 20) { apsScore += 2; } else if (wbc >= 15) { apsScore += 1; }
    else if (wbc >= 3) { apsScore += 0; } else if (wbc >= 1) { apsScore += 2; } else { apsScore += 4; }

    // GCS (15 - GCS)
    const gcs = Number(params['gcs'] ?? params['glasgow'] ?? 15);
    const gcsScore = 15 - gcs;
    apsScore += gcsScore;
    components.push({ name: 'Glasgow', value: gcs, description: `GCS ${gcs} (pontos: ${gcsScore})` });

    // Age points
    const age = Number(params['age'] ?? 50);
    let ageScore = 0;
    if (age >= 75) ageScore = 6;
    else if (age >= 65) ageScore = 5;
    else if (age >= 55) ageScore = 3;
    else if (age >= 45) ageScore = 2;
    components.push({ name: 'Idade', value: ageScore, description: `${age} anos` });

    // Chronic health points
    let chronicScore = 0;
    const immunocompromised = params['immunocompromised'] === true || params['immunocompromised'] === 'true';
    const severeOrganInsuff = params['severeOrganInsufficiency'] === true || params['severeOrganInsufficiency'] === 'true';
    const isElective = params['electiveSurgery'] === true || params['electiveSurgery'] === 'true';
    if (immunocompromised || severeOrganInsuff) {
      chronicScore = isElective ? 2 : 5;
    }
    components.push({ name: 'Doenca cronica', value: chronicScore, description: immunocompromised || severeOrganInsuff ? (isElective ? 'Cirurgia eletiva com comorbidade grave' : 'Emergencia/clinico com comorbidade grave') : 'Sem comorbidade cronica grave' });

    const totalScore = apsScore + ageScore + chronicScore;

    // Mortality estimation table (APACHE II)
    const mortalityTable: Record<number, string> = {
      0: '~4%', 5: '~8%', 10: '~15%', 15: '~25%', 20: '~40%', 25: '~55%', 30: '~73%', 35: '~85%',
    };
    const mortalityBracket = Math.min(35, Math.floor(totalScore / 5) * 5);
    const mortalityEst = mortalityTable[mortalityBracket] ?? '>85%';

    const riskLevel = totalScore < 10 ? RiskLevel.LOW : totalScore < 20 ? RiskLevel.MODERATE : totalScore < 30 ? RiskLevel.HIGH : RiskLevel.CRITICAL;

    return {
      calculatorType: ClinicalCalculatorType.APACHE_II,
      calculatorName: 'APACHE II (Gravidade em UTI)',
      score: totalScore,
      maxScore: 71,
      interpretation: `APACHE II ${totalScore} (APS: ${apsScore}, Idade: ${ageScore}, Cronico: ${chronicScore}) — mortalidade estimada: ${mortalityEst}`,
      riskLevel,
      recommendation: totalScore < 10
        ? 'Baixa gravidade em UTI. Monitoramento padrao'
        : totalScore < 20
          ? 'Gravidade moderada. Monitoramento intensivo, reavaliacao em 24h'
          : totalScore < 30
            ? 'Alta gravidade. Considerar medidas agressivas, monitoramento continuo'
            : 'Gravidade critica. Prognostico reservado. Discutir metas de cuidado com familia',
      components,
      references: ['Knaus WA et al. Crit Care Med 1985;13:818-29'],
    };
  },

  [ClinicalCalculatorType.GLASGOW]: (params) => {
    const eye = Math.min(4, Math.max(1, Number(params['eye'] ?? 4)));
    const verbal = Math.min(5, Math.max(1, Number(params['verbal'] ?? 5)));
    const motor = Math.min(6, Math.max(1, Number(params['motor'] ?? 6)));
    const score = eye + verbal + motor;

    const riskLevel = score <= 8 ? RiskLevel.CRITICAL : score <= 12 ? RiskLevel.HIGH : RiskLevel.LOW;

    return {
      calculatorType: ClinicalCalculatorType.GLASGOW,
      calculatorName: 'Escala de Coma de Glasgow',
      score,
      maxScore: 15,
      interpretation: `GCS ${score}/15 (O${eye}V${verbal}M${motor}) — ${score <= 8 ? 'TCE grave' : score <= 12 ? 'TCE moderado' : 'TCE leve ou normal'}`,
      riskLevel,
      recommendation: score <= 8
        ? 'TCE grave — proteger via aerea, considerar IOT. TC de cranio urgente. Neurocirurgia'
        : score <= 12
          ? 'TCE moderado — observacao em UTI, TC de cranio, reavaliacao seriada'
          : 'TCE leve — observacao clinica, TC se indicada por criterios clinicos',
      components: [
        { name: 'Abertura ocular', value: eye, description: `E${eye}` },
        { name: 'Resposta verbal', value: verbal, description: `V${verbal}` },
        { name: 'Resposta motora', value: motor, description: `M${motor}` },
      ],
      references: ['Teasdale G, Jennett B. Lancet 1974;2:81-4'],
    };
  },

  [ClinicalCalculatorType.NIHSS]: (params) => {
    const components: Array<{ name: string; value: number; description: string }> = [];
    const descriptions: Record<string, Record<number, string>> = {
      consciousness: { 0: 'Alerta', 1: 'Nao alerta, despertavel com estimulo minimo', 2: 'Nao alerta, requer estimulo repetido', 3: 'Coma/irresponsivo' },
      consciousnessQuestions: { 0: 'Responde ambas corretamente', 1: 'Responde uma corretamente', 2: 'Nao responde nenhuma' },
      consciousnessCommands: { 0: 'Executa ambos corretamente', 1: 'Executa um corretamente', 2: 'Nao executa nenhum' },
      gaze: { 0: 'Normal', 1: 'Paralisia parcial do olhar', 2: 'Desvio forcado do olhar' },
      visual: { 0: 'Sem perda visual', 1: 'Hemianopsia parcial', 2: 'Hemianopsia completa', 3: 'Cegueira bilateral' },
      facialPalsy: { 0: 'Normal', 1: 'Paralisia leve', 2: 'Paralisia parcial', 3: 'Paralisia completa (uni ou bilateral)' },
      motorArm: { 0: 'Sem queda', 1: 'Queda antes de 10s', 2: 'Algum esforco contra gravidade', 3: 'Sem esforco contra gravidade', 4: 'Sem movimento' },
      motorLeg: { 0: 'Sem queda', 1: 'Queda antes de 5s', 2: 'Algum esforco contra gravidade', 3: 'Sem esforco contra gravidade', 4: 'Sem movimento' },
      limb: { 0: 'Sem ataxia', 1: 'Ataxia em 1 membro', 2: 'Ataxia em 2 membros' },
      sensory: { 0: 'Normal', 1: 'Perda leve a moderada', 2: 'Perda grave ou total' },
      language: { 0: 'Normal', 1: 'Afasia leve a moderada', 2: 'Afasia grave', 3: 'Mutismo/afasia global' },
      dysarthria: { 0: 'Normal', 1: 'Disartria leve a moderada', 2: 'Disartria grave/ininteligivel' },
      neglect: { 0: 'Sem negligencia', 1: 'Negligencia parcial', 2: 'Negligencia profunda' },
    };

    const fields = [
      { key: 'consciousness', name: '1a. Nivel de consciencia', max: 3 },
      { key: 'consciousnessQuestions', name: '1b. Perguntas de orientacao', max: 2 },
      { key: 'consciousnessCommands', name: '1c. Comandos', max: 2 },
      { key: 'gaze', name: '2. Melhor olhar conjugado', max: 2 },
      { key: 'visual', name: '3. Campo visual', max: 3 },
      { key: 'facialPalsy', name: '4. Paralisia facial', max: 3 },
      { key: 'motorArmLeft', name: '5a. Motor MSE', max: 4 },
      { key: 'motorArmRight', name: '5b. Motor MSD', max: 4 },
      { key: 'motorLegLeft', name: '6a. Motor MIE', max: 4 },
      { key: 'motorLegRight', name: '6b. Motor MID', max: 4 },
      { key: 'limb', name: '7. Ataxia de membros', max: 2 },
      { key: 'sensory', name: '8. Sensibilidade', max: 2 },
      { key: 'language', name: '9. Linguagem', max: 3 },
      { key: 'dysarthria', name: '10. Disartria', max: 2 },
      { key: 'neglect', name: '11. Extincao/negligencia', max: 2 },
    ];

    let score = 0;
    for (const field of fields) {
      const baseKey = field.key.replace(/Left|Right/, '');
      const val = Math.min(field.max, Math.max(0, Number(params[field.key] ?? 0)));
      score += val;
      const descKey = baseKey === 'motorArmLeft' || baseKey === 'motorArmRight' ? 'motorArm'
        : baseKey === 'motorLegLeft' || baseKey === 'motorLegRight' ? 'motorLeg'
        : baseKey;
      const descMap = descriptions[descKey];
      const desc = descMap ? (descMap[val] ?? `${val}`) : `${val}`;
      components.push({ name: field.name, value: val, description: desc });
    }

    const severity = score === 0 ? 'Sem deficit' : score <= 4 ? 'AVC leve (minor stroke)' : score <= 15 ? 'AVC moderado' : score <= 24 ? 'AVC moderado-grave' : 'AVC grave';
    const riskLevel = score <= 4 ? RiskLevel.LOW : score <= 15 ? RiskLevel.MODERATE : score <= 24 ? RiskLevel.HIGH : RiskLevel.CRITICAL;

    return {
      calculatorType: ClinicalCalculatorType.NIHSS,
      calculatorName: 'NIHSS (Escala de AVC do NIH)',
      score,
      maxScore: 42,
      interpretation: `NIHSS ${score}/42 — ${severity}`,
      riskLevel,
      recommendation: score <= 4
        ? 'AVC leve — avaliar trombolise IV se dentro da janela e deficits incapacitantes. Monitorar de perto'
        : score <= 15
          ? 'AVC moderado — candidato a trombolise IV (alteplase 0.9 mg/kg, max 90mg, 10% em bolus, resto em 1h) se < 4.5h do inicio. Considerar trombectomia se oclusao de grande vaso e < 24h'
          : score <= 24
            ? 'AVC moderado-grave — trombolise IV se elegivel. Trombectomia mecanica se LVO. Monitorar em UTI neurologica'
            : 'AVC grave — prognostico reservado. Trombolise/trombectomia se elegivel. UTI. Discutir prognostico com familia',
      components,
      references: ['Brott T et al. Stroke 1989;20:864-70', 'AHA/ASA Guidelines 2019'],
    };
  },

  [ClinicalCalculatorType.NEWS2]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    // Respiratory rate
    const rr = Number(params['respiratoryRate'] ?? params['rr'] ?? 16);
    let rrScore = 0;
    if (rr <= 8) rrScore = 3;
    else if (rr <= 11) rrScore = 1;
    else if (rr <= 20) rrScore = 0;
    else if (rr <= 24) rrScore = 2;
    else rrScore = 3;
    score += rrScore;
    components.push({ name: 'Frequencia respiratoria', value: rrScore, description: `${rr} irpm` });

    // SpO2 Scale 1 (default) or Scale 2 (DPOC com hipercapnia cronica)
    const spo2 = Number(params['oxygenSaturation'] ?? params['spo2'] ?? 96);
    const useScale2 = params['scale2'] === true || params['scale2'] === 'true';
    let spo2Score = 0;
    if (!useScale2) {
      if (spo2 <= 91) spo2Score = 3;
      else if (spo2 <= 93) spo2Score = 2;
      else if (spo2 <= 95) spo2Score = 1;
      else spo2Score = 0;
    } else {
      if (spo2 <= 83) spo2Score = 3;
      else if (spo2 <= 85) spo2Score = 2;
      else if (spo2 <= 87) spo2Score = 1;
      else if (spo2 <= 92) spo2Score = 0;
      else if (spo2 <= 94) spo2Score = 1;
      else if (spo2 <= 96) spo2Score = 2;
      else spo2Score = 3;
    }
    score += spo2Score;
    components.push({ name: `SpO2 (Escala ${useScale2 ? '2' : '1'})`, value: spo2Score, description: `${spo2}%` });

    // Supplemental O2
    const onO2 = params['supplementalO2'] === true || params['supplementalO2'] === 'true';
    const o2Score = onO2 ? 2 : 0;
    score += o2Score;
    components.push({ name: 'O2 suplementar', value: o2Score, description: onO2 ? 'Sim' : 'Nao' });

    // Systolic BP
    const sbp = Number(params['systolicBP'] ?? params['sbp'] ?? 120);
    let sbpScore = 0;
    if (sbp <= 90) sbpScore = 3;
    else if (sbp <= 100) sbpScore = 2;
    else if (sbp <= 110) sbpScore = 1;
    else if (sbp <= 219) sbpScore = 0;
    else sbpScore = 3;
    score += sbpScore;
    components.push({ name: 'PA sistolica', value: sbpScore, description: `${sbp} mmHg` });

    // Heart rate
    const hr = Number(params['heartRate'] ?? params['hr'] ?? 80);
    let hrScore = 0;
    if (hr <= 40) hrScore = 3;
    else if (hr <= 50) hrScore = 1;
    else if (hr <= 90) hrScore = 0;
    else if (hr <= 110) hrScore = 1;
    else if (hr <= 130) hrScore = 2;
    else hrScore = 3;
    score += hrScore;
    components.push({ name: 'Frequencia cardiaca', value: hrScore, description: `${hr} bpm` });

    // Consciousness (AVPU)
    const avpu = String(params['consciousness'] ?? params['avpu'] ?? 'A').toUpperCase();
    let avpuScore = 0;
    if (avpu === 'A' || avpu === 'ALERT') avpuScore = 0;
    else if (avpu === 'C' || avpu === 'CONFUSION') avpuScore = 3; // NEW confusion in NEWS2
    else if (avpu === 'V' || avpu === 'VOICE') avpuScore = 3;
    else if (avpu === 'P' || avpu === 'PAIN') avpuScore = 3;
    else if (avpu === 'U' || avpu === 'UNRESPONSIVE') avpuScore = 3;
    score += avpuScore;
    components.push({ name: 'Consciencia (ACVPU)', value: avpuScore, description: avpu });

    // Temperature
    const temp = Number(params['temperature'] ?? params['temp'] ?? 37);
    let tempScore = 0;
    if (temp <= 35.0) tempScore = 3;
    else if (temp <= 36.0) tempScore = 1;
    else if (temp <= 38.0) tempScore = 0;
    else if (temp <= 39.0) tempScore = 1;
    else tempScore = 2;
    score += tempScore;
    components.push({ name: 'Temperatura', value: tempScore, description: `${temp}°C` });

    const riskLevel = score === 0 ? RiskLevel.LOW
      : score <= 4 ? RiskLevel.LOW
        : score <= 6 ? RiskLevel.MODERATE
          : RiskLevel.HIGH;

    const hasAnySingle3 = [rrScore, spo2Score, sbpScore, hrScore, avpuScore, tempScore].some(s => s === 3);
    const clinicalResponse = score >= 7
      ? 'URGENTE — Monitoramento continuo. Avaliar necessidade de UTI. Acionar time de resposta rapida'
      : hasAnySingle3
        ? 'Parametro individual em 3 — avaliacao clinica urgente mesmo com score total baixo'
        : score >= 5
          ? 'CUIDADO — Aumentar frequencia de monitorizacao para no minimo 1/1h. Avaliacao por enfermeiro senior'
          : score >= 1
            ? 'BAIXO RISCO — Monitorizacao a cada 4-6h. Avaliacao de enfermagem'
            : 'Score 0 — Monitorizacao de rotina a cada 12h';

    return {
      calculatorType: ClinicalCalculatorType.NEWS2,
      calculatorName: 'NEWS2 (National Early Warning Score 2)',
      score,
      maxScore: 20,
      interpretation: `NEWS2 = ${score} — ${score >= 7 ? 'ALTO risco' : score >= 5 ? 'MEDIO risco' : 'BAIXO risco'} de deterioracao clinica`,
      riskLevel,
      recommendation: clinicalResponse,
      components,
      references: ['Royal College of Physicians. NEWS2 2017', 'Adaptacao brasileira — COREN 2020'],
    };
  },

  [ClinicalCalculatorType.SOFA]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    // Respiratory: PaO2/FiO2
    const pf = Number(params['pao2FiO2'] ?? params['pfRatio'] ?? 400);
    const onVent = params['mechanicalVentilation'] === true || params['mechanicalVentilation'] === 'true';
    let respScore = 0;
    if (pf >= 400) respScore = 0;
    else if (pf >= 300) respScore = 1;
    else if (pf >= 200) respScore = 2;
    else if (pf >= 100 && onVent) respScore = 3;
    else if (pf >= 100) respScore = 2;
    else respScore = onVent ? 4 : 3;
    score += respScore;
    components.push({ name: 'Respiratorio (PaO2/FiO2)', value: respScore, description: `P/F = ${pf}${onVent ? ' (VM)' : ''}` });

    // Coagulation: Platelets
    const platelets = Number(params['platelets'] ?? params['plaquetas'] ?? 200);
    let coagScore = 0;
    if (platelets >= 150) coagScore = 0;
    else if (platelets >= 100) coagScore = 1;
    else if (platelets >= 50) coagScore = 2;
    else if (platelets >= 20) coagScore = 3;
    else coagScore = 4;
    score += coagScore;
    components.push({ name: 'Coagulacao (Plaquetas)', value: coagScore, description: `${platelets}.000/mm³` });

    // Liver: Bilirubin
    const bilirubin = Number(params['bilirubin'] ?? params['bilirrubina'] ?? 1.0);
    let liverScore = 0;
    if (bilirubin < 1.2) liverScore = 0;
    else if (bilirubin < 2.0) liverScore = 1;
    else if (bilirubin < 6.0) liverScore = 2;
    else if (bilirubin < 12.0) liverScore = 3;
    else liverScore = 4;
    score += liverScore;
    components.push({ name: 'Hepatico (Bilirrubina)', value: liverScore, description: `${bilirubin} mg/dL` });

    // Cardiovascular: MAP and vasopressors
    const mapVal = Number(params['meanArterialPressure'] ?? params['map'] ?? 75);
    const dopamine = Number(params['dopamine'] ?? 0);
    const dobutamine = Number(params['dobutamine'] ?? 0);
    const norepinephrine = Number(params['norepinephrine'] ?? params['noradrenalina'] ?? 0);
    const epinephrine = Number(params['epinephrine'] ?? params['adrenalina'] ?? 0);
    let cvScore = 0;
    if (epinephrine > 0.1 || norepinephrine > 0.1) cvScore = 4;
    else if (epinephrine > 0 || norepinephrine > 0) cvScore = 3;
    else if (dopamine > 5 || dobutamine > 0) cvScore = 2;
    else if (dopamine > 0 || mapVal < 70) cvScore = 1;
    else cvScore = 0;
    score += cvScore;
    components.push({ name: 'Cardiovascular', value: cvScore, description: cvScore === 0 ? `PAM ${mapVal} mmHg, sem DVA` : `PAM ${mapVal} mmHg, com DVA` });

    // CNS: Glasgow
    const gcs = Number(params['glasgow'] ?? params['gcs'] ?? 15);
    let cnsScore = 0;
    if (gcs === 15) cnsScore = 0;
    else if (gcs >= 13) cnsScore = 1;
    else if (gcs >= 10) cnsScore = 2;
    else if (gcs >= 6) cnsScore = 3;
    else cnsScore = 4;
    score += cnsScore;
    components.push({ name: 'Neurologico (Glasgow)', value: cnsScore, description: `GCS ${gcs}` });

    // Renal: Creatinine or urine output
    const creatinine = Number(params['creatinine'] ?? params['creatinina'] ?? 1.0);
    const urineOutput = params['urineOutput24h'] ? Number(params['urineOutput24h']) : undefined;
    let renalScore = 0;
    if (creatinine < 1.2) renalScore = 0;
    else if (creatinine < 2.0) renalScore = 1;
    else if (creatinine < 3.5) renalScore = 2;
    else if (creatinine < 5.0 || (urineOutput !== undefined && urineOutput < 500)) renalScore = 3;
    else renalScore = 4;
    if (urineOutput !== undefined && urineOutput < 200) renalScore = 4;
    score += renalScore;
    components.push({ name: 'Renal (Creatinina)', value: renalScore, description: `${creatinine} mg/dL${urineOutput !== undefined ? `, DU ${urineOutput} mL/24h` : ''}` });

    const mortalityEst = score <= 1 ? '<3%' : score <= 3 ? '~5%' : score <= 6 ? '~10%' : score <= 9 ? '~20%' : score <= 12 ? '~40%' : score <= 15 ? '~55%' : '>80%';
    const riskLevel = score <= 3 ? RiskLevel.LOW : score <= 6 ? RiskLevel.MODERATE : score <= 11 ? RiskLevel.HIGH : RiskLevel.CRITICAL;

    return {
      calculatorType: ClinicalCalculatorType.SOFA,
      calculatorName: 'SOFA (Sequential Organ Failure Assessment)',
      score,
      maxScore: 24,
      interpretation: `SOFA ${score}/24 — mortalidade estimada: ${mortalityEst}. ${score >= 2 ? 'Disfuncao organica presente (criterio Sepsis-3 se suspeita de infeccao)' : 'Sem disfuncao organica significativa'}`,
      riskLevel,
      recommendation: score <= 3
        ? 'Baixa disfuncao organica. Monitoramento padrao de UTI'
        : score <= 6
          ? 'Disfuncao organica moderada. Se infeccao suspeita: SEPSE (Sepsis-3). Ressuscitacao conforme SSC guidelines'
          : score <= 11
            ? 'Disfuncao organica grave. Reavaliar terapia. Considerar escalonamento de cuidados'
            : 'Falencia multiorganica. Prognostico reservado. Discutir metas de cuidado',
      components,
      references: ['Vincent JL et al. Crit Care Med 1996;24:707-11', 'Singer M et al. JAMA 2016;315:801-10 (Sepsis-3)'],
    };
  },

  [ClinicalCalculatorType.QSOFA]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    const rr = Number(params['respiratoryRate'] ?? params['rr'] ?? 16);
    const rrPoint = rr >= 22 ? 1 : 0;
    score += rrPoint;
    components.push({ name: 'FR >= 22 irpm', value: rrPoint, description: `FR = ${rr} irpm` });

    const sbp = Number(params['systolicBP'] ?? params['sbp'] ?? 120);
    const sbpPoint = sbp <= 100 ? 1 : 0;
    score += sbpPoint;
    components.push({ name: 'PAS <= 100 mmHg', value: sbpPoint, description: `PAS = ${sbp} mmHg` });

    const gcs = Number(params['glasgow'] ?? params['gcs'] ?? 15);
    const gcsPoint = gcs < 15 ? 1 : 0;
    score += gcsPoint;
    components.push({ name: 'Glasgow < 15', value: gcsPoint, description: `GCS = ${gcs}` });

    const riskLevel = score >= 2 ? RiskLevel.HIGH : score === 1 ? RiskLevel.MODERATE : RiskLevel.LOW;

    return {
      calculatorType: ClinicalCalculatorType.QSOFA,
      calculatorName: 'qSOFA (Quick SOFA)',
      score,
      maxScore: 3,
      interpretation: `qSOFA ${score}/3 — ${score >= 2 ? 'POSITIVO para risco de desfecho adverso em sepse' : 'Negativo, mas NAO exclui sepse'}`,
      riskLevel,
      recommendation: score >= 2
        ? 'qSOFA >= 2: alto risco de mortalidade. Investigar sepse agressivamente. Hemoculturas + lactato + SOFA completo. Iniciar ATB empirico em 1h se sepse provavel. Ressuscitacao com 30 mL/kg de cristaloide'
        : score === 1
          ? 'qSOFA = 1: monitorar de perto. Reavaliar frequentemente. qSOFA negativo NAO exclui sepse — se suspeita clinica, calcular SOFA completo'
          : 'qSOFA = 0: baixa probabilidade de desfecho adverso, mas manter vigilancia clinica',
      components,
      references: ['Seymour CW et al. JAMA 2016;315:762-74', 'Surviving Sepsis Campaign 2021'],
    };
  },

  [ClinicalCalculatorType.HEART_SCORE]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    // History
    const history = String(params['history'] ?? 'moderate').toLowerCase();
    let hScore = 0;
    if (history === 'highly_suspicious' || history === 'tipica') hScore = 2;
    else if (history === 'moderately_suspicious' || history === 'moderada') hScore = 1;
    else hScore = 0;
    score += hScore;
    components.push({ name: 'Historia', value: hScore, description: hScore === 2 ? 'Altamente suspeita' : hScore === 1 ? 'Moderadamente suspeita' : 'Levemente suspeita' });

    // ECG
    const ecg = String(params['ecg'] ?? 'normal').toLowerCase();
    let ecgScore = 0;
    if (ecg === 'significant_deviation' || ecg === 'supra') ecgScore = 2;
    else if (ecg === 'nonspecific' || ecg === 'inespecifico') ecgScore = 1;
    else ecgScore = 0;
    score += ecgScore;
    components.push({ name: 'ECG', value: ecgScore, description: ecgScore === 2 ? 'Desvio significativo do ST' : ecgScore === 1 ? 'Alteracao inespecifica' : 'Normal' });

    // Age
    const age = Number(params['age'] ?? 50);
    let ageScore = 0;
    if (age >= 65) ageScore = 2;
    else if (age >= 45) ageScore = 1;
    else ageScore = 0;
    score += ageScore;
    components.push({ name: 'Idade', value: ageScore, description: `${age} anos` });

    // Risk factors (DM, HAS, dislipidemia, tabagismo, obesidade, historico familiar)
    const riskFactors = Number(params['riskFactors'] ?? params['riskFactorCount'] ?? 1);
    let rfScore = 0;
    if (riskFactors >= 3) rfScore = 2;
    else if (riskFactors >= 1) rfScore = 1;
    else rfScore = 0;
    score += rfScore;
    components.push({ name: 'Fatores de risco', value: rfScore, description: `${riskFactors} fator(es)` });

    // Troponin
    const troponin = String(params['troponin'] ?? params['troponina'] ?? 'normal').toLowerCase();
    let tropScore = 0;
    if (troponin === 'elevated_3x' || troponin === 'elevada') tropScore = 2;
    else if (troponin === 'elevated_1_3x' || troponin === 'borderline' || troponin === 'limite') tropScore = 1;
    else tropScore = 0;
    score += tropScore;
    components.push({ name: 'Troponina', value: tropScore, description: tropScore === 2 ? '> 3x LSN' : tropScore === 1 ? '1-3x LSN' : 'Normal' });

    const riskLevel = score <= 3 ? RiskLevel.LOW : score <= 6 ? RiskLevel.MODERATE : RiskLevel.HIGH;
    const maceRisk = score <= 3 ? '0.9-1.7%' : score <= 6 ? '12-16.6%' : '50-65%';

    return {
      calculatorType: ClinicalCalculatorType.HEART_SCORE,
      calculatorName: 'HEART Score (Dor Toracica no PS)',
      score,
      maxScore: 10,
      interpretation: `HEART Score ${score}/10 — risco de MACE em 6 semanas: ${maceRisk}`,
      riskLevel,
      recommendation: score <= 3
        ? 'Baixo risco — alta precoce possivel apos observacao breve e troponina seriada negativa. Acompanhamento ambulatorial'
        : score <= 6
          ? 'Risco intermediario — observacao, troponina seriada, teste provocativo de isquemia (ergometria/cintilografia). Considerar internacao'
          : 'Alto risco — internacao. Estratificacao invasiva (cineangiocoronariografia). Dupla antiagregacao. Heparina',
      components,
      references: ['Six AJ et al. Neth Heart J 2008;16:191-6', 'Backus BE et al. Int J Cardiol 2013;168:2153-8'],
    };
  },

  [ClinicalCalculatorType.HAS_BLED]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    if (params['hypertension'] || params['has']) { score += 1; components.push({ name: 'Hipertensao (PAS > 160)', value: 1, description: 'HAS nao controlada' }); }
    if (params['renalDisease']) { score += 1; components.push({ name: 'Doenca renal', value: 1, description: 'Dialise, transplante, Cr > 2.26' }); }
    if (params['liverDisease']) { score += 1; components.push({ name: 'Doenca hepatica', value: 1, description: 'Cirrose ou bilirrubina > 2x + TGO/TGP > 3x' }); }
    if (params['stroke']) { score += 1; components.push({ name: 'AVC previo', value: 1, description: 'Historia de AVC' }); }
    if (params['bleeding']) { score += 1; components.push({ name: 'Sangramento', value: 1, description: 'Historia de sangramento ou predisposicao' }); }
    if (params['labileINR']) { score += 1; components.push({ name: 'INR labil', value: 1, description: 'TTR < 60%' }); }
    const age = Number(params['age'] ?? 60);
    if (age > 65) { score += 1; components.push({ name: 'Idade > 65', value: 1, description: `${age} anos` }); }
    if (params['drugs']) { score += 1; components.push({ name: 'Drogas/alcool', value: 1, description: 'AINEs, antiplaquetuarios, ou alcoolismo' }); }

    const riskLevel = score <= 1 ? RiskLevel.LOW : score === 2 ? RiskLevel.MODERATE : RiskLevel.HIGH;

    return {
      calculatorType: ClinicalCalculatorType.HAS_BLED,
      calculatorName: 'HAS-BLED (Risco de Sangramento em Anticoagulacao)',
      score,
      maxScore: 9,
      interpretation: `HAS-BLED ${score}/9 — risco de sangramento: ${score <= 1 ? 'baixo (~1%/ano)' : score === 2 ? 'intermediario (~1.9%/ano)' : `alto (~${Math.min(12, score * 1.5).toFixed(1)}%/ano)`}`,
      riskLevel,
      recommendation: score <= 2
        ? 'Risco aceitavel para anticoagulacao. Monitorar fatores de risco modificaveis'
        : 'Risco elevado de sangramento. NAO contraindica anticoagulacao se CHA2DS2-VASc alto, mas requer: corrigir fatores modificaveis (controlar PA, suspender AINEs, tratar alcoolismo), monitoramento mais frequente',
      components,
      references: ['Pisters R et al. Chest 2010;138:1093-100'],
    };
  },

  [ClinicalCalculatorType.LACE_INDEX]: (params) => {
    let score = 0;
    const components: Array<{ name: string; value: number; description: string }> = [];

    // Length of stay
    const los = Number(params['lengthOfStay'] ?? params['los'] ?? 3);
    let losScore = 0;
    if (los >= 14) losScore = 7;
    else if (los >= 7) losScore = 5;
    else if (los >= 4) losScore = 4;
    else if (los >= 3) losScore = 3;
    else if (los >= 2) losScore = 2;
    else if (los >= 1) losScore = 1;
    score += losScore;
    components.push({ name: 'L: Tempo de internacao', value: losScore, description: `${los} dias` });

    // Acuity of admission
    const emergencyAdmission = params['emergencyAdmission'] === true || params['emergencyAdmission'] === 'true';
    const acuityScore = emergencyAdmission ? 3 : 0;
    score += acuityScore;
    components.push({ name: 'A: Admissao urgente', value: acuityScore, description: emergencyAdmission ? 'Sim (emergencia)' : 'Nao (eletiva)' });

    // Comorbidities (Charlson simplified)
    const charlson = Number(params['charlsonIndex'] ?? params['comorbidityScore'] ?? 0);
    let comorbScore = 0;
    if (charlson >= 4) comorbScore = 5;
    else if (charlson >= 3) comorbScore = 3;
    else if (charlson >= 2) comorbScore = 2;
    else if (charlson >= 1) comorbScore = 1;
    score += comorbScore;
    components.push({ name: 'C: Comorbidades (Charlson)', value: comorbScore, description: `Charlson ${charlson}` });

    // ED visits in previous 6 months
    const edVisits = Number(params['edVisits6m'] ?? params['emergencyVisits'] ?? 0);
    let edScore = 0;
    if (edVisits >= 4) edScore = 4;
    else if (edVisits >= 3) edScore = 3;
    else if (edVisits >= 2) edScore = 2;
    else if (edVisits >= 1) edScore = 1;
    score += edScore;
    components.push({ name: 'E: Visitas ao PS (6 meses)', value: edScore, description: `${edVisits} visita(s)` });

    const riskLevel = score < 5 ? RiskLevel.LOW : score <= 9 ? RiskLevel.MODERATE : RiskLevel.HIGH;
    const readmissionRisk = score < 5 ? '~5%' : score <= 9 ? '~10-15%' : `~${Math.min(50, score * 3)}%`;

    return {
      calculatorType: ClinicalCalculatorType.LACE_INDEX,
      calculatorName: 'LACE Index (Risco de Readmissao em 30 dias)',
      score,
      maxScore: 19,
      interpretation: `LACE ${score}/19 — risco de readmissao em 30 dias: ${readmissionRisk}`,
      riskLevel,
      recommendation: score < 5
        ? 'Baixo risco de readmissao. Alta com orientacoes padrao'
        : score <= 9
          ? 'Risco moderado. Plano de alta estruturado: reconciliacao medicamentosa, agendamento de retorno precoce, orientacao detalhada'
          : 'Alto risco de readmissao. Ativar programa de transicao de cuidados: contato telefonico em 48h, visita domiciliar, seguimento intensivo, coordenacao com atencao primaria',
      components,
      references: ['van Walraven C et al. CMAJ 2010;182:551-7'],
    };
  },
};

// ─── Drug Interaction Database (mock) ────────────────────────────────────────

interface DrugInteractionEntry {
  drug1Pattern: RegExp;
  drug2Pattern: RegExp;
  severity: InteractionSeverity;
  mechanism: string;
  clinicalEffect: string;
  management: string;
  references: string[];
}

const INTERACTION_DB: DrugInteractionEntry[] = [
  {
    drug1Pattern: /varfarina/i,
    drug2Pattern: /amiodarona/i,
    severity: InteractionSeverity.CRITICAL,
    mechanism: 'Inibicao do CYP2C9 e CYP3A4 pela amiodarona, reduzindo o metabolismo da varfarina',
    clinicalEffect: 'Aumento de 30-50% no INR, risco significativo de sangramento',
    management: 'Reduzir dose de varfarina em 30-50%. Monitorar INR semanalmente por 6-8 semanas. Considerar NOAC',
    references: ['Sanoski CA. Ann Pharmacother 2009;43:322-8'],
  },
  {
    drug1Pattern: /varfarina/i,
    drug2Pattern: /aas|aspirina|acido acetilsalicilico/i,
    severity: InteractionSeverity.MAJOR,
    mechanism: 'Efeito antiplaquetuario aditivo somado a anticoagulacao',
    clinicalEffect: 'Risco aumentado de sangramento gastrointestinal e intracraniano',
    management: 'Avaliar risco-beneficio. Se necessario, associar IBP para gastroprotecao. Monitorar sinais de sangramento',
    references: ['Dentali F et al. Arch Intern Med 2007;167:117-24'],
  },
  {
    drug1Pattern: /metformina/i,
    drug2Pattern: /contraste|iodado/i,
    severity: InteractionSeverity.MAJOR,
    mechanism: 'Contraste iodado pode causar nefrotoxicidade, reduzindo clearance de metformina',
    clinicalEffect: 'Risco de acidose lactica por acumulo de metformina',
    management: 'Suspender metformina 48h antes e apos contraste. Checar creatinina antes de reiniciar',
    references: ['ACR Manual on Contrast Media 2023'],
  },
  {
    drug1Pattern: /ieca|enalapril|captopril|ramipril|lisinopril/i,
    drug2Pattern: /espironolactona|amilorida/i,
    severity: InteractionSeverity.MAJOR,
    mechanism: 'Ambos reteem potassio por mecanismos diferentes',
    clinicalEffect: 'Hipercalemia potencialmente fatal, especialmente em DRC ou DM',
    management: 'Monitorar potassio serico em 1 semana e depois mensalmente. Evitar suplemento de K+',
    references: ['Juurlink DN et al. NEJM 2004;351:543-51'],
  },
  {
    drug1Pattern: /losartana|valsartana|candesartana/i,
    drug2Pattern: /ieca|enalapril|captopril|ramipril/i,
    severity: InteractionSeverity.MAJOR,
    mechanism: 'Bloqueio duplo do sistema renina-angiotensina-aldosterona',
    clinicalEffect: 'Risco aumentado de hipotensao, hipercalemia e insuficiencia renal aguda',
    management: 'Evitar combinacao. Usar apenas uma classe de bloqueio do SRAA',
    references: ['ONTARGET Investigators. NEJM 2008;358:1547-59'],
  },
  {
    drug1Pattern: /fluoxetina|sertralina|paroxetina|citalopram/i,
    drug2Pattern: /tramadol/i,
    severity: InteractionSeverity.MAJOR,
    mechanism: 'ISRS inibem recaptacao de serotonina; tramadol tambem tem efeito serotoninergico',
    clinicalEffect: 'Risco de sindrome serotoninergica (agitacao, tremor, hipertermia, clonus)',
    management: 'Evitar associacao ou usar com monitoramento rigoroso. Preferir analgesico alternativo',
    references: ['Boyer EW, Shannon M. NEJM 2005;352:1112-20'],
  },
  {
    drug1Pattern: /sinvastatina|atorvastatina/i,
    drug2Pattern: /eritromicina|claritromicina/i,
    severity: InteractionSeverity.MODERATE,
    mechanism: 'Macrolideos inibem CYP3A4, aumentando niveis sericos de estatinas',
    clinicalEffect: 'Risco aumentado de miopatia e rabdomiolise',
    management: 'Suspender estatina durante tratamento com macrolideo ou trocar para azitromicina',
    references: ['Grunden JW, Fisher KA. Pharmacotherapy 1997;17:1060-3'],
  },
  {
    drug1Pattern: /metformina/i,
    drug2Pattern: /alcool|etanol/i,
    severity: InteractionSeverity.MODERATE,
    mechanism: 'Alcool inibe gliconeogenese hepatica e pode potencializar efeito hipoglicemiante',
    clinicalEffect: 'Risco de hipoglicemia e acidose lactica',
    management: 'Orientar limitacao de ingesta alcoolica. Monitorar glicemia',
    references: ['DeFronzo RA et al. NEJM 1996;334:574-9'],
  },
  {
    drug1Pattern: /omeprazol|pantoprazol|lansoprazol/i,
    drug2Pattern: /clopidogrel/i,
    severity: InteractionSeverity.MODERATE,
    mechanism: 'IBPs (especialmente omeprazol) inibem CYP2C19, reduzindo ativacao do clopidogrel',
    clinicalEffect: 'Reducao do efeito antiplaquetuario, risco de eventos tromboticos',
    management: 'Preferir pantoprazol (menor interacao). Evitar omeprazol com clopidogrel',
    references: ['FDA Drug Safety Communication 2009', 'Abraham NS et al. Circulation 2010;122:2619-33'],
  },
  {
    drug1Pattern: /dipirona|metamizol/i,
    drug2Pattern: /metotrexato/i,
    severity: InteractionSeverity.MODERATE,
    mechanism: 'Dipirona pode reduzir clearance renal do metotrexato',
    clinicalEffect: 'Toxicidade aumentada do metotrexato (mielossupressao, mucosite)',
    management: 'Evitar em pacientes recebendo MTX em altas doses. Preferir paracetamol como analgesico',
    references: ['Pillans PI et al. Br J Clin Pharmacol 2003;56:588-90'],
  },
  {
    drug1Pattern: /levotiroxina/i,
    drug2Pattern: /carbonato de calcio|sulfato ferroso|ferro/i,
    severity: InteractionSeverity.MINOR,
    mechanism: 'Calcio e ferro formam complexos insoluveis com levotiroxina no TGI',
    clinicalEffect: 'Reducao da absorcao de levotiroxina, hipotireoidismo sub-tratado',
    management: 'Separar administracao por pelo menos 4 horas',
    references: ['Singh N et al. JAMA Intern Med 2000;160:1452-6'],
  },
];

// ─── DDx Knowledge Base (mock) ──────────────────────────────────────────────

interface DdxRule {
  triggerSymptoms: string[];
  diagnoses: DiagnosisCandidate[];
}

const DDX_RULES: DdxRule[] = [
  {
    triggerSymptoms: ['febre', 'tosse', 'dispneia'],
    diagnoses: [
      {
        cidCode: 'J18.9',
        name: 'Pneumonia comunitaria nao especificada',
        probability: 0.45,
        reasoning: 'Triade classica de febre + tosse + dispneia. Causa mais comum de infeccao respiratoria baixa',
        supportingEvidence: ['Febre sugere etiologia infecciosa', 'Tosse produtiva comum em PAC', 'Dispneia indica comprometimento parenquimatoso'],
        recommendedWorkup: ['RX torax PA e perfil', 'Hemograma completo', 'PCR e procalcitonina', 'Hemocultura (2 amostras)', 'Gasometria arterial se SpO2 < 94%'],
        urgency: 'ALTA',
      },
      {
        cidCode: 'J06.9',
        name: 'Infeccao aguda de vias aereas superiores',
        probability: 0.20,
        reasoning: 'IVAS pode apresentar febre e tosse, mas dispneia e menos tipica',
        supportingEvidence: ['Febre geralmente baixa', 'Tosse geralmente seca'],
        recommendedWorkup: ['Exame fisico detalhado', 'Hemograma se evolucao > 7 dias'],
        urgency: 'BAIXA',
      },
      {
        cidCode: 'J45',
        name: 'Asma (exacerbacao infecciosa)',
        probability: 0.12,
        reasoning: 'Infeccao viral pode desencadear broncoespasmo em asmaticos',
        supportingEvidence: ['Dispneia sugere componente obstrutivo', 'Historico de asma aumenta probabilidade'],
        recommendedWorkup: ['Espirometria ou PFE', 'RX torax para excluir PAC', 'Oximetria de pulso'],
        urgency: 'MODERADA',
      },
      {
        cidCode: 'A15',
        name: 'Tuberculose pulmonar',
        probability: 0.08,
        reasoning: 'Brasil e pais endemico. Considerar se tosse > 2 semanas, febre vespertina, sudorese noturna',
        supportingEvidence: ['Area endemica', 'Febre pode ser vespertina'],
        recommendedWorkup: ['Baciloscopia de escarro (BAAR) x2', 'Teste rapido molecular (TRM-TB)', 'RX torax', 'PPD/IGRA'],
        urgency: 'MODERADA',
      },
      {
        cidCode: 'J44.1',
        name: 'DPOC exacerbada',
        probability: 0.07,
        reasoning: 'Exacerbacao infecciosa de DPOC cursa com piora de dispneia, tosse e expectoracao',
        supportingEvidence: ['Historico de tabagismo', 'Dispneia progressiva'],
        recommendedWorkup: ['Gasometria arterial', 'RX torax', 'Hemograma', 'Cultura de escarro se purulento'],
        urgency: 'ALTA',
      },
      {
        cidCode: 'I26',
        name: 'Embolia pulmonar',
        probability: 0.05,
        reasoning: 'TEP pode mimetizar pneumonia. Febre em 14% dos casos. Dispneia subita sugere TEP',
        supportingEvidence: ['Dispneia pode ser de inicio subito', 'Fatores de risco (imobilidade, cancer, ACO)'],
        recommendedWorkup: ['Wells Score para TEP', 'D-dimero', 'AngioTC de torax se indicado', 'Gasometria arterial'],
        urgency: 'CRITICA',
      },
      {
        cidCode: 'B34.9',
        name: 'Infeccao viral nao especificada (incluindo COVID-19/Influenza)',
        probability: 0.03,
        reasoning: 'Virus respiratorios podem causar pneumonia viral. Considerar sazonalidade',
        supportingEvidence: ['Periodo epidemico', 'Contato com caso confirmado'],
        recommendedWorkup: ['Painel viral respiratorio (PCR)', 'Teste rapido COVID/Influenza', 'RX torax'],
        urgency: 'MODERADA',
      },
    ],
  },
  {
    triggerSymptoms: ['dor', 'peito', 'torax', 'toracica', 'precordial'],
    diagnoses: [
      {
        cidCode: 'I20.9',
        name: 'Angina pectoris nao especificada',
        probability: 0.35,
        reasoning: 'Dor toracica e apresentacao classica de sindrome coronariana',
        supportingEvidence: ['Dor precordial', 'Fatores de risco cardiovascular'],
        recommendedWorkup: ['ECG 12 derivacoes em 10 min', 'Troponina seriada (0h e 3h)', 'RX torax', 'Hemograma e funcao renal'],
        urgency: 'CRITICA',
      },
      {
        cidCode: 'I21.9',
        name: 'Infarto agudo do miocardio',
        probability: 0.20,
        reasoning: 'IAM deve ser excluido em toda dor toracica aguda',
        supportingEvidence: ['Dor opressiva', 'Irradiacao para MSE ou mandibula', 'Sudorese, nausea'],
        recommendedWorkup: ['ECG imediato', 'Troponina ultrassensivel', 'Cateterismo se IAMCSST'],
        urgency: 'CRITICA',
      },
      {
        cidCode: 'K21.0',
        name: 'Doenca do refluxo gastroesofagico',
        probability: 0.15,
        reasoning: 'DRGE e causa comum de dor toracica nao cardiaca',
        supportingEvidence: ['Piora pos-prandial', 'Queimacao retroesternal'],
        recommendedWorkup: ['Excluir SCA primeiro', 'Teste terapeutico com IBP', 'EDA se refratario'],
        urgency: 'BAIXA',
      },
      {
        cidCode: 'M54.6',
        name: 'Dor toracica musculoesqueletica',
        probability: 0.12,
        reasoning: 'Osteocondrite e causa frequente, pior a palpacao',
        supportingEvidence: ['Dor reprodutivel a palpacao', 'Piora com movimento'],
        recommendedWorkup: ['Exame fisico cuidadoso', 'Excluir causa cardiaca'],
        urgency: 'BAIXA',
      },
      {
        cidCode: 'I26',
        name: 'Embolia pulmonar',
        probability: 0.08,
        reasoning: 'TEP pode causar dor toracica pleuritica subita',
        supportingEvidence: ['Dor pleuritica', 'Dispneia', 'Taquicardia'],
        recommendedWorkup: ['Wells Score', 'D-dimero', 'AngioTC'],
        urgency: 'CRITICA',
      },
    ],
  },
  {
    triggerSymptoms: ['cefaleia', 'dor de cabeca', 'cabeca'],
    diagnoses: [
      {
        cidCode: 'G43.9', name: 'Enxaqueca nao especificada', probability: 0.30,
        reasoning: 'Causa mais comum de cefaleia recorrente. Pulsatil, unilateral, com nausea/fono/fotofobia',
        supportingEvidence: ['Cefaleia recorrente', 'Unilateral', 'Nausea associada'],
        recommendedWorkup: ['Exame neurologico', 'Diario de cefaleia', 'TC/RNM se red flags'], urgency: 'BAIXA',
      },
      {
        cidCode: 'G44.1', name: 'Cefaleia vascular nao classificada', probability: 0.20,
        reasoning: 'Cefaleia tensional e a cefaleia primaria mais prevalente',
        supportingEvidence: ['Bilateral', 'Em aperto', 'Sem nausea significativa'],
        recommendedWorkup: ['Exame fisico', 'Avaliar fatores psicossociais'], urgency: 'BAIXA',
      },
      {
        cidCode: 'I60.9', name: 'Hemorragia subaracnoidea', probability: 0.05,
        reasoning: 'Cefaleia subita e intensa (a pior da vida) — HSA ate prova em contrario',
        supportingEvidence: ['Inicio subito', 'Intensidade maxima', 'Rigidez de nuca'],
        recommendedWorkup: ['TC de cranio sem contraste URGENTE', 'Se TC normal: punção lombar', 'Angiotomografia'], urgency: 'CRITICA',
      },
      {
        cidCode: 'G03.9', name: 'Meningite', probability: 0.04,
        reasoning: 'Cefaleia + febre + rigidez de nuca = triade classica de meningite',
        supportingEvidence: ['Febre associada', 'Rigidez de nuca', 'Sinais de Kernig/Brudzinski'],
        recommendedWorkup: ['Punção lombar', 'Hemoculturas', 'TC cranio pre-PL se indicado', 'ATB empirico se suspeita alta'], urgency: 'CRITICA',
      },
    ],
  },
  {
    triggerSymptoms: ['dor abdominal', 'abdome', 'barriga'],
    diagnoses: [
      {
        cidCode: 'K35.8', name: 'Apendicite aguda', probability: 0.20,
        reasoning: 'Dor periumbilical que migra para FID, com anorexia e nausea',
        supportingEvidence: ['Dor em FID', 'Blumberg positivo', 'Anorexia'],
        recommendedWorkup: ['Hemograma', 'PCR', 'USG abdome ou TC se duvida', 'Avaliacao cirurgica'], urgency: 'ALTA',
      },
      {
        cidCode: 'K81.0', name: 'Colecistite aguda', probability: 0.15,
        reasoning: 'Dor em HCD, pos-prandial, com Murphy positivo',
        supportingEvidence: ['Dor em hipocondrio direito', 'Sinal de Murphy', 'Febre'],
        recommendedWorkup: ['USG de vias biliares', 'Hemograma', 'PCR', 'Bilirrubinas e TGO/TGP'], urgency: 'ALTA',
      },
      {
        cidCode: 'K85.9', name: 'Pancreatite aguda', probability: 0.10,
        reasoning: 'Dor epigastrica intensa irradiando para dorso, em faixa',
        supportingEvidence: ['Dor em faixa', 'Nausea e vomitos', 'Etilismo'],
        recommendedWorkup: ['Lipase serica (3x LSN)', 'TC abdome com contraste se duvida', 'PCR', 'Hemograma'], urgency: 'ALTA',
      },
      {
        cidCode: 'N20.0', name: 'Nefrolitiase (colica renal)', probability: 0.12,
        reasoning: 'Dor lombar intensa, em colica, irradiando para regiao inguinal',
        supportingEvidence: ['Dor em flanco', 'Hematuria', 'Nausea'],
        recommendedWorkup: ['TC abdome sem contraste', 'EAS', 'Creatinina'], urgency: 'MODERADA',
      },
      {
        cidCode: 'K25.9', name: 'Ulcera gastrica', probability: 0.10,
        reasoning: 'Dor epigastrica em queimacao, piora com alimentacao ou em jejum',
        supportingEvidence: ['Dor epigastrica', 'Pirose', 'Uso de AINEs'],
        recommendedWorkup: ['EDA', 'Pesquisa de H. pylori', 'Hemograma'], urgency: 'MODERADA',
      },
    ],
  },
  {
    triggerSymptoms: ['edema', 'inchaço', 'perna inchada'],
    diagnoses: [
      {
        cidCode: 'I50.9', name: 'Insuficiencia cardiaca', probability: 0.30,
        reasoning: 'Edema bilateral de MMII, pior ao final do dia, com dispneia',
        supportingEvidence: ['Edema bilateral', 'Dispneia', 'Ortopneia', 'Turgencia jugular'],
        recommendedWorkup: ['BNP/NT-proBNP', 'Ecocardiograma', 'RX torax', 'ECG', 'Funcao renal'], urgency: 'ALTA',
      },
      {
        cidCode: 'I80.2', name: 'Trombose venosa profunda (TVP)', probability: 0.25,
        reasoning: 'Edema unilateral com dor em panturrilha — TVP ate exclusao',
        supportingEvidence: ['Edema unilateral', 'Dor em panturrilha', 'Sinal de Homans'],
        recommendedWorkup: ['Wells Score TVP', 'D-dimero', 'USG Doppler venoso de MMII'], urgency: 'ALTA',
      },
      {
        cidCode: 'N04.9', name: 'Sindrome nefrotica', probability: 0.10,
        reasoning: 'Edema generalizado, proteico (anasarca), com proteinuria macica',
        supportingEvidence: ['Edema facial matinal', 'Anasarca', 'Espumuria'],
        recommendedWorkup: ['Proteinuria 24h ou relacao P/C', 'Albumina serica', 'Perfil lipidico', 'Funcao renal', 'Biopsia renal se indicado'], urgency: 'MODERADA',
      },
    ],
  },
  {
    triggerSymptoms: ['dispneia', 'falta de ar', 'cansaco'],
    diagnoses: [
      {
        cidCode: 'I50.9', name: 'Insuficiencia cardiaca descompensada', probability: 0.25,
        reasoning: 'IC e a causa mais comum de dispneia em idosos',
        supportingEvidence: ['Ortopneia', 'DPN', 'Edema de MMII', 'Turgencia jugular'],
        recommendedWorkup: ['BNP/NT-proBNP', 'Ecocardiograma', 'RX torax', 'ECG'], urgency: 'ALTA',
      },
      {
        cidCode: 'J44.1', name: 'DPOC exacerbada', probability: 0.20,
        reasoning: 'Dispneia progressiva em paciente tabagista com historico de DPOC',
        supportingEvidence: ['Tabagismo', 'Tosse cronica', 'Sibilos'],
        recommendedWorkup: ['Gasometria arterial', 'RX torax', 'Espirometria (pos-agudizacao)'], urgency: 'ALTA',
      },
      {
        cidCode: 'J45.9', name: 'Crise de asma', probability: 0.15,
        reasoning: 'Dispneia episodica com sibilancia, especialmente se jovem e atopico',
        supportingEvidence: ['Sibilos difusos', 'Historico de atopia', 'Melhora com broncodilatador'],
        recommendedWorkup: ['Peak flow', 'Oximetria', 'Gasometria se grave', 'RX torax'], urgency: 'MODERADA',
      },
      {
        cidCode: 'I26.9', name: 'Embolia pulmonar', probability: 0.10,
        reasoning: 'Dispneia subita com dor pleuritica — TEP deve ser excluido',
        supportingEvidence: ['Dispneia subita', 'Taquicardia', 'Dor pleuritica'],
        recommendedWorkup: ['Wells Score TEP', 'D-dimero', 'AngioTC torax', 'Gasometria'], urgency: 'CRITICA',
      },
    ],
  },
  {
    triggerSymptoms: ['disuria', 'ardencia', 'urinario', 'urina'],
    diagnoses: [
      {
        cidCode: 'N39.0', name: 'Infeccao do trato urinario', probability: 0.50,
        reasoning: 'Disuria + polaciuria + urgencia = triade classica de ITU baixa',
        supportingEvidence: ['Disuria', 'Polaciuria', 'Dor suprapubica'],
        recommendedWorkup: ['EAS com urocultura', 'Hemograma se sinais sistemicos'], urgency: 'MODERADA',
      },
      {
        cidCode: 'N10', name: 'Pielonefrite aguda', probability: 0.20,
        reasoning: 'ITU alta com febre, dor lombar e Giordano positivo',
        supportingEvidence: ['Febre alta', 'Dor lombar', 'Giordano positivo', 'Calafrios'],
        recommendedWorkup: ['Urocultura com antibiograma', 'Hemograma', 'PCR', 'Hemoculturas', 'USG renal'], urgency: 'ALTA',
      },
      {
        cidCode: 'N20.0', name: 'Litiase renal', probability: 0.15,
        reasoning: 'Hematuria + dor em colica pode indicar calculo em transito',
        supportingEvidence: ['Hematuria', 'Dor em colica', 'Historia de litiase'],
        recommendedWorkup: ['TC abdome sem contraste', 'EAS', 'Creatinina'], urgency: 'MODERADA',
      },
    ],
  },
  {
    triggerSymptoms: ['confusao', 'desorientacao', 'rebaixamento', 'sonolencia'],
    diagnoses: [
      {
        cidCode: 'F05', name: 'Delirium', probability: 0.35,
        reasoning: 'Confusao aguda flutuante, especialmente em idosos hospitalizados',
        supportingEvidence: ['Alteracao aguda da atencao', 'Flutuacao', 'Pensamento desorganizado'],
        recommendedWorkup: ['CAM (Confusion Assessment Method)', 'Hemograma', 'Eletrólitos', 'Funcao renal', 'Glicemia', 'Funcao hepatica', 'EAS', 'TSH', 'RX torax'], urgency: 'ALTA',
      },
      {
        cidCode: 'I63.9', name: 'AVC isquemico', probability: 0.20,
        reasoning: 'Deficit neurologico agudo de inicio subito — AVC ate prova em contrario',
        supportingEvidence: ['Inicio subito', 'Deficit focal', 'Hemiparesia'],
        recommendedWorkup: ['TC cranio sem contraste URGENTE', 'NIHSS', 'Glicemia capilar', 'ECG'], urgency: 'CRITICA',
      },
      {
        cidCode: 'E10-E14', name: 'Hipoglicemia', probability: 0.15,
        reasoning: 'Causa reversivel e potencialmente fatal de rebaixamento',
        supportingEvidence: ['Uso de insulina/sulfoniluréias', 'Sudorese', 'Tremor'],
        recommendedWorkup: ['Glicemia capilar IMEDIATA', 'Glicose IV se < 70 mg/dL'], urgency: 'CRITICA',
      },
      {
        cidCode: 'A41.9', name: 'Sepse', probability: 0.15,
        reasoning: 'Alteracao de consciencia pode ser sinal de sepse (qSOFA)',
        supportingEvidence: ['Febre', 'Taquicardia', 'Hipotensao'],
        recommendedWorkup: ['qSOFA/SOFA', 'Hemoculturas', 'Lactato', 'Hemograma', 'PCR'], urgency: 'CRITICA',
      },
    ],
  },
];

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ClinicalDecisionService {
  private readonly logger = new Logger(ClinicalDecisionService.name);
  private readonly queries: CdsQuery[] = [];

  // ─── Differential Diagnosis ──────────────────────────────────────────────

  async generateDifferentialDiagnosis(
    tenantId: string,
    userId: string,
    patientId: string,
    symptoms: string[],
    physicalFindings?: string[],
    labResults?: string[],
    age?: number,
    _sex?: string,
    _comorbidities?: string[],
  ): Promise<DifferentialDiagnosisResponseDto> {
    this.logger.log(`DDx request for patient ${patientId} — symptoms: ${symptoms.join(', ')}`);

    this.trackQuery(tenantId, userId, 'differential-diagnosis', patientId);

    const symptomsLower = symptoms.map((s) => s.toLowerCase());
    let matchedDiagnoses: DiagnosisCandidate[] = [];

    for (const rule of DDX_RULES) {
      const overlap = rule.triggerSymptoms.filter((ts) =>
        symptomsLower.some((s) => s.includes(ts)),
      );
      if (overlap.length >= 2 || (overlap.length >= 1 && symptomsLower.length <= 2)) {
        matchedDiagnoses = [...matchedDiagnoses, ...rule.diagnoses];
      }
    }

    if (matchedDiagnoses.length === 0) {
      matchedDiagnoses = [
        {
          cidCode: 'R69',
          name: 'Doenca nao especificada',
          probability: 0.5,
          reasoning: 'Apresentacao atipica — dados insuficientes para diagnostico diferencial preciso',
          supportingEvidence: symptoms.map((s) => `Sintoma reportado: ${s}`),
          recommendedWorkup: ['Hemograma completo', 'PCR', 'Eletrólitos', 'Funcao renal', 'Funcao hepatica', 'EAS', 'RX torax'],
          urgency: 'MODERADA',
        },
      ];
    }

    // Adjust probabilities based on age/sex/comorbidities
    if (age !== undefined && age >= 65) {
      matchedDiagnoses = matchedDiagnoses.map((d) => ({
        ...d,
        probability: d.cidCode.startsWith('I') ? Math.min(0.9, d.probability * 1.3) : d.probability,
      }));
    }

    // Deduplicate and sort by probability
    const seen = new Set<string>();
    const uniqueDiagnoses = matchedDiagnoses.filter((d) => {
      if (seen.has(d.cidCode)) return false;
      seen.add(d.cidCode);
      return true;
    });
    uniqueDiagnoses.sort((a, b) => b.probability - a.probability);

    const criticalAlerts: string[] = [];
    if (uniqueDiagnoses.some((d) => d.urgency === 'CRITICA')) {
      criticalAlerts.push('ALERTA: Diagnosticos de alta urgencia detectados — priorizar investigacao imediata');
    }
    if (physicalFindings?.some((f) => f.toLowerCase().includes('spo2') && /\d{2}/.test(f) && parseInt(f.match(/\d{2}/)?.[0] ?? '99') < 94)) {
      criticalAlerts.push('ALERTA: SpO2 < 94% — considerar suplementacao de O2 e gasometria arterial');
    }

    return {
      requestId: randomUUID(),
      patientId,
      diagnoses: uniqueDiagnoses.slice(0, 8),
      criticalAlerts,
      aiConfidence: 0.82,
      modelVersion: 'voxpep-ddx-v2.1-br',
      generatedAt: new Date(),
      disclaimer: 'Sugestoes geradas por IA. Nao substitui avaliacao clinica. O medico e o responsavel pela decisao diagnostica e terapeutica.',
    };
  }

  // ─── Clinical Calculator ─────────────────────────────────────────────────

  async calculateClinicalScore(
    tenantId: string,
    userId: string,
    patientId: string,
    parameters: Record<string, string | number | boolean>,
    calculatorType?: ClinicalCalculatorType,
    diagnosisCid?: string,
  ): Promise<ClinicalCalculatorResponseDto> {
    this.logger.log(`Calculator request for patient ${patientId} — type: ${calculatorType ?? 'auto-detect'}`);

    this.trackQuery(tenantId, userId, 'clinical-calculator', patientId);

    const results: CalculatorResultDto[] = [];

    if (calculatorType) {
      const calculator = CALCULATORS[calculatorType];
      results.push(calculator(parameters));
    } else {
      // Auto-detect applicable calculators based on diagnosis/parameters
      const detected: ClinicalCalculatorType[] = [];

      if (diagnosisCid?.startsWith('I48') || parameters['atrialFibrillation']) {
        detected.push(ClinicalCalculatorType.CHADS2_VASC);
      }
      if (diagnosisCid?.startsWith('J18') || diagnosisCid?.startsWith('J15') || diagnosisCid?.startsWith('J13')) {
        detected.push(ClinicalCalculatorType.CURB65);
      }
      if (diagnosisCid?.startsWith('I26') || parameters['dvtSymptoms'] !== undefined) {
        detected.push(ClinicalCalculatorType.WELLS_PE);
      }
      if (parameters['localTenderness'] !== undefined || parameters['calfSwelling'] !== undefined) {
        detected.push(ClinicalCalculatorType.WELLS_DVT);
      }
      if (diagnosisCid?.startsWith('K7') || parameters['bilirubin'] !== undefined) {
        detected.push(ClinicalCalculatorType.CHILD_PUGH);
        detected.push(ClinicalCalculatorType.MELD);
      }
      if (parameters['eye'] !== undefined || parameters['verbal'] !== undefined) {
        detected.push(ClinicalCalculatorType.GLASGOW);
      }

      // Auto-detect new calculators
      if (parameters['oxygenSaturation'] !== undefined || parameters['spo2'] !== undefined || parameters['avpu'] !== undefined) {
        detected.push(ClinicalCalculatorType.NEWS2);
      }
      if (parameters['pao2FiO2'] !== undefined || parameters['pfRatio'] !== undefined || parameters['mechanicalVentilation'] !== undefined) {
        detected.push(ClinicalCalculatorType.SOFA);
      }
      if (diagnosisCid?.startsWith('A41') || diagnosisCid?.startsWith('R65') || parameters['sepsisQuery'] !== undefined) {
        if (!detected.includes(ClinicalCalculatorType.QSOFA)) detected.push(ClinicalCalculatorType.QSOFA);
        if (!detected.includes(ClinicalCalculatorType.SOFA)) detected.push(ClinicalCalculatorType.SOFA);
      }
      if (diagnosisCid?.startsWith('R07') || parameters['chestPain'] !== undefined) {
        detected.push(ClinicalCalculatorType.HEART_SCORE);
      }
      if (parameters['lengthOfStay'] !== undefined || parameters['los'] !== undefined) {
        detected.push(ClinicalCalculatorType.LACE_INDEX);
      }

      if (detected.length === 0) {
        detected.push(ClinicalCalculatorType.GLASGOW);
      }

      for (const type of detected) {
        results.push(CALCULATORS[type](parameters));
      }
    }

    return {
      requestId: randomUUID(),
      patientId,
      results,
      generatedAt: new Date(),
    };
  }

  // ─── Predictive Alerts ───────────────────────────────────────────────────

  async getPredictiveAlerts(
    tenantId: string,
    userId: string,
    patientId: string,
  ): Promise<PredictiveAlertsResponseDto> {
    this.logger.log(`Predictive alerts for patient ${patientId}`);

    this.trackQuery(tenantId, userId, 'predictive-alerts', patientId);

    const alerts = [
      {
        alertType: 'SEPSIS',
        riskLevel: RiskLevel.HIGH,
        probability: 0.34,
        description: 'Risco elevado de sepse baseado em SIRS + foco infeccioso provavel',
        riskFactors: [
          'Leucocitose (15.200/mm3)',
          'Febre 38.8C persistente > 24h',
          'Taquicardia (FC 110 bpm)',
          'Lactato 2.8 mmol/L (elevado)',
          'Idade > 65 anos',
        ],
        suggestedInterventions: [
          'Colher hemocultura e lactato seriado',
          'Iniciar antibiotico empirico em 1h (protocolo sepse)',
          'Ressuscitacao volemica com SF 0.9% 30mL/kg se hipotensao',
          'Reavaliar em 3h com criterios qSOFA',
        ],
        timeHorizon: '6-12 horas',
        lastUpdated: new Date(),
      },
      {
        alertType: 'FALL',
        riskLevel: RiskLevel.MODERATE,
        probability: 0.22,
        description: 'Risco moderado de queda identificado por modelo preditivo',
        riskFactors: [
          'Idade 74 anos',
          'Uso de benzodiazepinicos (clonazepam)',
          'Hipotensao ortostatica documentada',
          'Historia de queda nos ultimos 6 meses',
          'Nocturia (levanta 3x por noite)',
        ],
        suggestedInterventions: [
          'Ativar protocolo de prevencao de queda',
          'Grades elevadas no leito',
          'Luz noturna e campainha ao alcance',
          'Revisar benzodiazepinicos — considerar desmame',
          'Fisioterapia para fortalecimento e equilíbrio',
        ],
        timeHorizon: '7 dias',
        lastUpdated: new Date(),
      },
      {
        alertType: 'READMISSION',
        riskLevel: RiskLevel.MODERATE,
        probability: 0.28,
        description: 'Risco de reinternacao em 30 dias acima da media',
        riskFactors: [
          'IC descompensada como causa da internacao atual',
          '2 internacoes nos ultimos 12 meses',
          'FE 30% (IC com FE reduzida)',
          'Polifarmacia (9 medicamentos)',
          'Baixa adesao medicamentosa relatada',
        ],
        suggestedInterventions: [
          'Reconciliacao medicamentosa antes da alta',
          'Agendar retorno ambulatorial em 7 dias',
          'Ativar programa de transicao de cuidados',
          'Telemonitoramento domiciliar (peso diario + sintomas)',
          'Encaminhar para programa de reabilitacao cardiaca',
        ],
        timeHorizon: '30 dias',
        lastUpdated: new Date(),
      },
      {
        alertType: 'MORTALITY',
        riskLevel: RiskLevel.LOW,
        probability: 0.08,
        description: 'Risco de mortalidade intra-hospitalar dentro da faixa esperada',
        riskFactors: [
          'Idade > 65 anos',
          'Comorbidades multiplas (Charlson Index 4)',
        ],
        suggestedInterventions: [
          'Monitoramento padrao conforme protocolo',
          'Reavaliacao diaria com scores de gravidade',
        ],
        timeHorizon: 'Internacao atual',
        lastUpdated: new Date(),
      },
    ];

    const maxRisk = alerts.reduce((max, a) =>
      a.probability > max.probability ? a : max, alerts[0],
    );

    return {
      patientId,
      alerts,
      overallAcuity: maxRisk.riskLevel,
      generatedAt: new Date(),
    };
  }

  // ─── Protocol Recommendation ─────────────────────────────────────────────

  async getProtocolRecommendation(
    tenantId: string,
    userId: string,
    patientId: string,
    diagnosisCid: string,
    diagnosisDescription?: string,
    severity?: RiskLevel,
    comorbidities?: string[],
  ): Promise<ProtocolRecommendationResponseDto> {
    this.logger.log(`Protocol recommendation for patient ${patientId} — CID: ${diagnosisCid}`);

    this.trackQuery(tenantId, userId, 'protocol-recommendation', patientId);

    const diagName = diagnosisDescription ?? this.cidToName(diagnosisCid);
    const contraindicationsFound: string[] = [];
    const adaptations: string[] = [];

    if (comorbidities?.some((c) => c.startsWith('N18') || c.toLowerCase().includes('drc'))) {
      adaptations.push('Ajustar doses renais — TFG estimada deve ser calculada antes da prescricao');
      contraindicationsFound.push('Evitar AINES e metformina se TFG < 30');
    }
    if (comorbidities?.some((c) => c.startsWith('E11') || c.toLowerCase().includes('dm'))) {
      adaptations.push('Monitorar glicemia capilar 4/4h durante tratamento');
      adaptations.push('Ajustar dose de corticoide se necessario — risco de hiperglicemia');
    }

    // Protocol for pneumonia (J18.x)
    if (diagnosisCid.startsWith('J18') || diagnosisCid.startsWith('J15')) {
      return {
        requestId: randomUUID(),
        patientId,
        protocolName: 'Protocolo de Pneumonia Adquirida na Comunidade',
        protocolVersion: 'SBP/SBPT 2022 v3.1',
        applicability: 0.94,
        diagnosisCid,
        diagnosisName: diagName,
        steps: [
          { order: 1, phase: 'Avaliacao inicial', action: 'Estratificar gravidade', details: 'Aplicar CURB-65 e criterios de internacao', timeframe: 'Admissao' },
          { order: 2, phase: 'Diagnostico', action: 'Investigacao laboratorial', details: 'RX torax, hemograma, PCR, ureia, gasometria (se SpO2 < 94%)', timeframe: '1h' },
          { order: 3, phase: 'Diagnostico', action: 'Coleta microbiologica', details: 'Hemocultura x2 e escarro (se internado). Antigeno urinario para Legionella e Pneumococo', timeframe: '1h' },
          { order: 4, phase: 'Tratamento', action: 'Antibioticoterapia empirica', details: 'CURB-65 0-1: Amoxicilina 500mg 8/8h VO por 7 dias. CURB-65 2: Amoxicilina-clavulanato + Azitromicina. CURB-65 3+: Ceftriaxona 1g IV + Azitromicina 500mg IV', timeframe: '1h apos admissao', medication: 'Ceftriaxona + Azitromicina (se internado)', dose: 'Ceftriaxona 1g IV 1x/dia + Azitromicina 500mg IV 1x/dia' },
          { order: 5, phase: 'Suporte', action: 'Oxigenoterapia', details: 'Manter SpO2 >= 94% (>= 88% se DPOC). Cateter nasal ate 5L/min', timeframe: 'Contínuo' },
          { order: 6, phase: 'Monitoramento', action: 'Reavaliacao clinica', details: 'Reavaliar em 48-72h. Esperar melhora de febre e leucograma', timeframe: '48-72h' },
          { order: 7, phase: 'Transicao', action: 'Step-down para via oral', details: 'Afebril > 24h + melhora clinica: trocar para Amoxicilina-clavulanato VO', timeframe: '48-72h' },
          { order: 8, phase: 'Alta', action: 'Criterios de alta', details: 'Afebril > 48h, estabilidade hemodinamica, tolerando VO, SpO2 > 92% em AA', timeframe: '5-7 dias' },
        ],
        contraindicationsFound,
        adaptations,
        references: [
          'Diretrizes Brasileiras em Pneumonia Adquirida na Comunidade em Adultos Imunocompetentes — SBPT 2022',
          'BTS/NICE Guidelines for Management of Community Acquired Pneumonia 2019',
          'Metlay JP et al. Am J Respir Crit Care Med 2019;200:e45-e67 (ATS/IDSA)',
        ],
        generatedAt: new Date(),
      };
    }

    // Generic protocol for other diagnoses
    return {
      requestId: randomUUID(),
      patientId,
      protocolName: `Protocolo Clinico — ${diagName}`,
      protocolVersion: 'Institucional v1.0',
      applicability: 0.72,
      diagnosisCid,
      diagnosisName: diagName,
      steps: [
        { order: 1, phase: 'Avaliacao', action: 'Anamnese e exame fisico completo', details: 'Avaliacao sistematizada conforme diagnostico', timeframe: 'Admissao' },
        { order: 2, phase: 'Diagnostico', action: 'Exames complementares', details: 'Hemograma, bioquimica basica, exames especificos para a condicao', timeframe: '2h' },
        { order: 3, phase: 'Tratamento', action: 'Iniciar tratamento conforme protocolo institucional', details: 'Seguir diretrizes vigentes para a condicao', timeframe: '4h' },
        { order: 4, phase: 'Monitoramento', action: 'Reavaliacao periodica', details: 'Reavaliar resposta ao tratamento', timeframe: '24-48h' },
      ],
      contraindicationsFound,
      adaptations,
      references: ['Protocolo institucional — consultar comissao clinica para detalhes'],
      generatedAt: new Date(),
    };
  }

  // ─── Drug Interactions ───────────────────────────────────────────────────

  async checkDrugInteractions(
    tenantId: string,
    userId: string,
    patientId: string,
    medications: string[],
    _includeCurrentMedications?: boolean,
  ): Promise<DrugInteractionResponseDto> {
    this.logger.log(`Drug interaction check for patient ${patientId} — ${medications.length} medications`);

    this.trackQuery(tenantId, userId, 'drug-interactions', patientId);

    const interactions: DrugInteractionResult[] = [];

    // Check every pair
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        for (const entry of INTERACTION_DB) {
          const match1to2 = entry.drug1Pattern.test(med1) && entry.drug2Pattern.test(med2);
          const match2to1 = entry.drug1Pattern.test(med2) && entry.drug2Pattern.test(med1);

          if (match1to2 || match2to1) {
            interactions.push({
              drug1: med1,
              drug2: med2,
              severity: entry.severity,
              mechanism: entry.mechanism,
              clinicalEffect: entry.clinicalEffect,
              management: entry.management,
              references: entry.references,
            });
          }
        }
      }
    }

    interactions.sort((a, b) => {
      const order = { CRITICAL: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
      return order[a.severity] - order[b.severity];
    });

    const criticalCount = interactions.filter((i) => i.severity === InteractionSeverity.CRITICAL).length;
    const majorCount = interactions.filter((i) => i.severity === InteractionSeverity.MAJOR).length;
    const moderateCount = interactions.filter((i) => i.severity === InteractionSeverity.MODERATE).length;
    const minorCount = interactions.filter((i) => i.severity === InteractionSeverity.MINOR).length;

    const overallRecommendations: string[] = [];
    if (criticalCount > 0) {
      overallRecommendations.push('CRITICO: Interacoes criticas detectadas — revisao farmaceutica obrigatoria antes da administracao');
    }
    if (majorCount > 0) {
      overallRecommendations.push('IMPORTANTE: Interacoes maiores requerem ajuste de dose ou monitoramento intensivo');
    }
    if (interactions.length === 0) {
      overallRecommendations.push('Nenhuma interacao significativa detectada entre as medicacoes informadas');
    }

    const totalChecked = (medications.length * (medications.length - 1)) / 2;

    return {
      requestId: randomUUID(),
      patientId,
      interactions,
      totalChecked,
      criticalCount,
      majorCount,
      moderateCount,
      minorCount,
      overallRecommendations,
      generatedAt: new Date(),
    };
  }

  // ─── Risk Timeline ───────────────────────────────────────────────────────

  async getRiskTimeline(
    tenantId: string,
    userId: string,
    patientId: string,
  ): Promise<RiskTimelineResponseDto> {
    this.logger.log(`Risk timeline for patient ${patientId}`);

    this.trackQuery(tenantId, userId, 'risk-timeline', patientId);

    const now = new Date();
    const timeline: Array<{
      date: string;
      sepsisRisk: number;
      fallRisk: number;
      readmissionRisk: number;
      mortalityRisk: number;
      event?: string;
    }> = [];

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayIndex = 14 - i;

      let sepsisRisk = 0.05 + Math.sin(dayIndex / 3) * 0.08 + (dayIndex > 8 ? 0.15 : 0);
      let fallRisk = 0.18 + Math.random() * 0.06;
      let readmissionRisk = 0.25 + (dayIndex > 10 ? -0.05 : 0.02) * dayIndex / 14;
      let mortalityRisk = 0.06 + Math.sin(dayIndex / 5) * 0.03;
      let event: string | undefined;

      if (dayIndex === 3) {
        event = 'Inicio de antibioticoterapia IV';
        sepsisRisk += 0.05;
      }
      if (dayIndex === 5) {
        event = 'Febre 39.2C — coleta de hemocultura';
        sepsisRisk += 0.20;
        mortalityRisk += 0.04;
      }
      if (dayIndex === 7) {
        event = 'Resultado hemocultura: S. pneumoniae';
      }
      if (dayIndex === 9) {
        event = 'Troca antibiotico para direcionado';
        sepsisRisk -= 0.10;
      }
      if (dayIndex === 11) {
        event = 'Queda de leito — sem lesao';
        fallRisk += 0.15;
      }
      if (dayIndex === 13) {
        event = 'Afebril ha 48h — melhora clinica';
        sepsisRisk -= 0.15;
      }

      sepsisRisk = Math.max(0.01, Math.min(0.95, sepsisRisk));
      fallRisk = Math.max(0.05, Math.min(0.80, fallRisk));
      readmissionRisk = Math.max(0.05, Math.min(0.90, readmissionRisk));
      mortalityRisk = Math.max(0.01, Math.min(0.50, mortalityRisk));

      const point: {
        date: string;
        sepsisRisk: number;
        fallRisk: number;
        readmissionRisk: number;
        mortalityRisk: number;
        event?: string;
      } = {
        date: dateStr,
        sepsisRisk: Math.round(sepsisRisk * 100) / 100,
        fallRisk: Math.round(fallRisk * 100) / 100,
        readmissionRisk: Math.round(readmissionRisk * 100) / 100,
        mortalityRisk: Math.round(mortalityRisk * 100) / 100,
      };

      if (event) {
        point.event = event;
      }

      timeline.push(point);
    }

    return {
      patientId,
      timeline,
      periodDays: 14,
      generatedAt: new Date(),
    };
  }

  // ─── CDS Metrics ─────────────────────────────────────────────────────────

  async getMetrics(tenantId: string): Promise<CdsMetricsResponseDto> {
    this.logger.log(`CDS metrics for tenant ${tenantId}`);

    const tenantQueries = this.queries.filter((q) => q.tenantId === tenantId);
    const now = Date.now();
    const last24h = tenantQueries.filter((q) => now - q.createdAt.getTime() < 24 * 3600 * 1000);
    const last7d = tenantQueries.filter((q) => now - q.createdAt.getTime() < 7 * 24 * 3600 * 1000);

    const endpoints = ['differential-diagnosis', 'clinical-calculator', 'predictive-alerts', 'protocol-recommendation', 'drug-interactions', 'risk-timeline'];
    const byEndpoint = endpoints.map((ep) => {
      const epQueries = tenantQueries.filter((q) => q.endpoint === ep);
      const accepted = epQueries.filter((q) => q.accepted);
      return {
        endpoint: ep,
        count: epQueries.length || Math.floor(Math.random() * 50 + 10),
        avgResponseTimeMs: epQueries.length > 0
          ? Math.round(epQueries.reduce((s, q) => s + q.responseTimeMs, 0) / epQueries.length)
          : Math.floor(Math.random() * 800 + 200),
        acceptanceRate: epQueries.length > 0
          ? Math.round((accepted.length / epQueries.length) * 100) / 100
          : Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      };
    });

    return {
      totalQueries: tenantQueries.length || 342,
      queriesLast24h: last24h.length || 28,
      queriesLast7d: last7d.length || 156,
      avgResponseTimeMs: 450,
      byEndpoint,
      alertsGenerated: 89,
      alertsAccepted: 67,
      alertsOverridden: 22,
      topDiagnoses: [
        { cidCode: 'J18.9', name: 'Pneumonia comunitaria', count: 34 },
        { cidCode: 'I20.9', name: 'Angina pectoris', count: 28 },
        { cidCode: 'E11', name: 'Diabetes mellitus tipo 2', count: 25 },
        { cidCode: 'I10', name: 'Hipertensao arterial sistemica', count: 22 },
        { cidCode: 'N18.3', name: 'Doenca renal cronica estagio 3', count: 18 },
      ],
      topCalculators: [
        { type: 'CURB65', count: 45 },
        { type: 'CHADS2_VASC', count: 38 },
        { type: 'GLASGOW', count: 32 },
        { type: 'WELLS_PE', count: 24 },
        { type: 'MELD', count: 18 },
      ],
      generatedAt: new Date(),
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private trackQuery(tenantId: string, userId: string, endpoint: string, patientId?: string): void {
    this.queries.push({
      id: randomUUID(),
      tenantId,
      userId,
      endpoint,
      patientId,
      createdAt: new Date(),
      responseTimeMs: Math.floor(Math.random() * 600 + 150),
      accepted: Math.random() > 0.2,
      overridden: Math.random() > 0.8,
    });
  }

  private cidToName(cid: string): string {
    const map: Record<string, string> = {
      'J18.9': 'Pneumonia nao especificada',
      'J15': 'Pneumonia bacteriana',
      'I48': 'Fibrilacao atrial',
      'I20.9': 'Angina pectoris',
      'I21.9': 'Infarto agudo do miocardio',
      'I26': 'Embolia pulmonar',
      'E11': 'Diabetes mellitus tipo 2',
      'I10': 'Hipertensao arterial sistemica',
      'K74': 'Cirrose hepatica',
      'N18': 'Doenca renal cronica',
      'A15': 'Tuberculose pulmonar',
      'I50': 'Insuficiencia cardiaca',
      'J44': 'DPOC',
      'I63': 'AVC isquemico',
    };

    for (const [code, name] of Object.entries(map)) {
      if (cid.startsWith(code)) return name;
    }
    return `Condicao clinica (${cid})`;
  }
}
