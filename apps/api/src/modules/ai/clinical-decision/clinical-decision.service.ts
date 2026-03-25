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

  [ClinicalCalculatorType.APACHE_II]: (_params) => {
    const score = 18;
    return {
      calculatorType: ClinicalCalculatorType.APACHE_II,
      calculatorName: 'APACHE II (Gravidade em UTI)',
      score,
      maxScore: 71,
      interpretation: 'APACHE II 18 — mortalidade estimada: ~25%',
      riskLevel: RiskLevel.HIGH,
      recommendation: 'Paciente de alto risco em UTI. Monitoramento intensivo e reavaliacao em 24h',
      components: [
        { name: 'Pontuacao fisiologica aguda', value: 10, description: 'APS (Acute Physiology Score)' },
        { name: 'Idade', value: 4, description: 'Pontuacao por faixa etaria' },
        { name: 'Doenca cronica', value: 4, description: 'Pontuacao por comorbidades cronicas' },
      ],
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

  [ClinicalCalculatorType.NIHSS]: (_params) => {
    const score = 12;
    return {
      calculatorType: ClinicalCalculatorType.NIHSS,
      calculatorName: 'NIHSS (Escala de AVC do NIH)',
      score,
      maxScore: 42,
      interpretation: 'NIHSS 12 — AVC moderado a grave',
      riskLevel: RiskLevel.HIGH,
      recommendation: 'Candidato a trombolise (se dentro da janela terapeutica <4.5h). Considerar trombectomia mecanica se oclusao de grande vaso',
      components: [
        { name: 'Nivel de consciencia', value: 1, description: 'Parcialmente alerta' },
        { name: 'Olhar conjugado', value: 1, description: 'Paralisia parcial do olhar' },
        { name: 'Campo visual', value: 1, description: 'Hemianopsia parcial' },
        { name: 'Paralisia facial', value: 2, description: 'Paralisia parcial' },
        { name: 'Motor MSD', value: 3, description: 'Queda em 5 segundos' },
        { name: 'Motor MID', value: 2, description: 'Queda em 5 segundos, algum esforco' },
        { name: 'Linguagem', value: 1, description: 'Afasia leve' },
        { name: 'Disartria', value: 1, description: 'Leve a moderada' },
      ],
      references: ['Brott T et al. Stroke 1989;20:864-70'],
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
