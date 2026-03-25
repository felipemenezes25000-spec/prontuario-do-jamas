import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SpecialtiesEnhancedService {
  private readonly logger = new Logger(SpecialtiesEnhancedService.name);

  // ─── Nephrology ────────────────────────────────────────────────────────

  async calculateCkdEpi(
    _tenantId: string,
    params: { creatinine: number; age: number; gender: string; race?: string },
  ) {
    const { creatinine, age, gender } = params;
    const isFemale = gender === 'F';
    const k = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.329 : -0.411;
    const scr_k = creatinine / k;
    const gfr = 141 * Math.pow(Math.min(scr_k, 1), alpha) * Math.pow(Math.max(scr_k, 1), -1.209) * Math.pow(0.993, age) * (isFemale ? 1.018 : 1);
    const rounded = Math.round(gfr * 10) / 10;

    let stage = 'G1';
    if (rounded < 15) stage = 'G5';
    else if (rounded < 30) stage = 'G4';
    else if (rounded < 45) stage = 'G3b';
    else if (rounded < 60) stage = 'G3a';
    else if (rounded < 90) stage = 'G2';

    return {
      gfr: rounded,
      unit: 'mL/min/1.73m²',
      stage,
      interpretation: `TFG (CKD-EPI): ${rounded} mL/min — Estágio ${stage}`,
      referToNephrology: rounded < 45,
      dialysisPlanning: rounded < 20,
    };
  }

  async getDialysisAccessTracking(_tenantId: string, patientId: string) {
    return {
      patientId,
      currentAccess: {
        type: 'FAV',
        location: 'Antebraço esquerdo (radiocefálica)',
        createdAt: '2025-06-15',
        matureDays: 180,
        status: 'MATURE_FUNCTIONAL',
        lastFlowRate: 350,
        complications: [],
      },
      history: [
        { type: 'CDL', location: 'Jugular interna direita', period: '2025-03-01 a 2025-06-14', complications: ['Infecção linha (1x)'] },
      ],
    };
  }

  // ─── Neurology ─────────────────────────────────────────────────────────

  async calculateMRankin(_tenantId: string, params: { score: number }) {
    const descriptions: Record<number, string> = {
      0: 'Sem sintomas',
      1: 'Sem incapacidade significativa — capaz de realizar atividades habituais',
      2: 'Incapacidade leve — incapaz de realizar todas as atividades prévias, mas cuida de si sem assistência',
      3: 'Incapacidade moderada — requer alguma ajuda, mas caminha sem assistência',
      4: 'Incapacidade moderadamente grave — incapaz de caminhar sem assistência e de atender às necessidades corporais sem ajuda',
      5: 'Incapacidade grave — acamado, incontinente, requer cuidados constantes',
      6: 'Óbito',
    };

    return {
      score: params.score,
      description: descriptions[params.score] ?? 'Score inválido',
      functionalOutcome: params.score <= 2 ? 'FAVORABLE' : 'UNFAVORABLE',
    };
  }

  async calculateEdss(_tenantId: string, params: { pyramidal: number; cerebellar: number; brainstem: number; sensory: number; bowelBladder: number; visual: number; cerebral: number; ambulation: number }) {
    const max = Math.max(params.pyramidal, params.cerebellar, params.brainstem, params.sensory, params.bowelBladder, params.visual, params.cerebral);
    let edss = max;
    if (params.ambulation >= 2) edss = Math.max(edss, 4.0 + (params.ambulation - 2) * 0.5);

    return {
      score: Math.round(edss * 2) / 2,
      functionalSystems: params,
      interpretation: edss <= 3.5 ? 'Incapacidade leve' : edss <= 6.0 ? 'Incapacidade moderada' : 'Incapacidade grave',
      ambulatory: edss < 7.0,
    };
  }

  // ─── Orthopedics ───────────────────────────────────────────────────────

  async classifyFractureAO(_tenantId: string, params: { bone: string; segment: string; type: string; group?: string }) {
    return {
      classification: `${params.bone}${params.segment}.${params.type}${params.group ? `.${params.group}` : ''}`,
      bone: params.bone,
      segment: params.segment,
      type: { A: 'Extra-articular', B: 'Articular parcial', C: 'Articular completa' }[params.type] ?? params.type,
      dvtProphylaxis: {
        recommended: true,
        protocol: 'Enoxaparina 40mg SC 1x/dia por 14 dias (ou até deambulação plena)',
        riskAssessment: 'Alto risco — fratura de extremidade inferior',
        contraindications: ['Sangramento ativo', 'Plaquetas < 50.000', 'Heparina-induzida trombocitopenia'],
      },
    };
  }

  // ─── Gynecology ────────────────────────────────────────────────────────

  async classifyPapanicolaou(_tenantId: string, params: { result: string }) {
    const bethesda: Record<string, { category: string; recommendation: string }> = {
      NILM: { category: 'Negativo para lesão intraepitelial', recommendation: 'Rastreamento de rotina conforme faixa etária' },
      ASCUS: { category: 'Células escamosas atípicas de significado indeterminado', recommendation: 'Repetir citologia em 6 meses OU teste HPV reflexo' },
      ASCH: { category: 'Células escamosas atípicas, não se pode excluir HSIL', recommendation: 'Colposcopia imediata' },
      LSIL: { category: 'Lesão intraepitelial escamosa de baixo grau', recommendation: 'Colposcopia' },
      HSIL: { category: 'Lesão intraepitelial escamosa de alto grau', recommendation: 'Colposcopia + biópsia dirigida' },
      SCC: { category: 'Carcinoma de células escamosas', recommendation: 'Colposcopia + biópsia urgente + encaminhamento oncologia' },
    };

    const classification = bethesda[params.result] ?? { category: 'Resultado não reconhecido', recommendation: 'Reavaliar amostra' };

    return {
      result: params.result,
      bethesdaCategory: classification.category,
      recommendation: classification.recommendation,
      system: 'Bethesda 2014',
    };
  }

  // ─── Ophthalmology ─────────────────────────────────────────────────────

  async recordSnellenAcuity(_tenantId: string, params: { patientId: string; rightEye: string; leftEye: string; corrected: boolean }) {
    const parseAcuity = (v: string) => {
      const parts = v.split('/');
      return parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : 0;
    };
    const odDecimal = parseAcuity(params.rightEye);
    const osDecimal = parseAcuity(params.leftEye);

    return {
      patientId: params.patientId,
      rightEye: { snellen: params.rightEye, decimal: Math.round(odDecimal * 100) / 100, logMAR: Math.round(-Math.log10(odDecimal || 0.01) * 100) / 100 },
      leftEye: { snellen: params.leftEye, decimal: Math.round(osDecimal * 100) / 100, logMAR: Math.round(-Math.log10(osDecimal || 0.01) * 100) / 100 },
      corrected: params.corrected,
      legallyBlind: odDecimal < 0.1 && osDecimal < 0.1,
      drivingEligible: Math.max(odDecimal, osDecimal) >= 0.5,
    };
  }

  // ─── ENT ───────────────────────────────────────────────────────────────

  async recordAudiometry(_tenantId: string, params: { patientId: string; rightEar: number[]; leftEar: number[]; frequencies: number[] }) {
    const avgRight = params.rightEar.reduce((s, v) => s + v, 0) / params.rightEar.length;
    const avgLeft = params.leftEar.reduce((s, v) => s + v, 0) / params.leftEar.length;

    const classify = (avg: number) => {
      if (avg <= 25) return 'Normal';
      if (avg <= 40) return 'Perda leve';
      if (avg <= 55) return 'Perda moderada';
      if (avg <= 70) return 'Perda moderadamente severa';
      if (avg <= 90) return 'Perda severa';
      return 'Perda profunda';
    };

    return {
      patientId: params.patientId,
      frequencies: params.frequencies,
      rightEar: { thresholds: params.rightEar, pta: Math.round(avgRight), classification: classify(avgRight) },
      leftEar: { thresholds: params.leftEar, pta: Math.round(avgLeft), classification: classify(avgLeft) },
      hearingAidRecommended: avgRight > 40 || avgLeft > 40,
    };
  }

  // ─── Endocrinology ─────────────────────────────────────────────────────

  async getInsulinProtocol(_tenantId: string, params: { patientId: string; currentGlycemia: number; weight: number; type: string }) {
    const { currentGlycemia, weight } = params;

    const slidingScale = [
      { range: '< 70 mg/dL', action: 'Suspender insulina. Administrar glicose 15g VO ou IV', dose: 0 },
      { range: '70-139 mg/dL', action: 'Sem correção', dose: 0 },
      { range: '140-179 mg/dL', action: 'Insulina regular SC', dose: 2 },
      { range: '180-219 mg/dL', action: 'Insulina regular SC', dose: 4 },
      { range: '220-259 mg/dL', action: 'Insulina regular SC', dose: 6 },
      { range: '260-299 mg/dL', action: 'Insulina regular SC', dose: 8 },
      { range: '300-349 mg/dL', action: 'Insulina regular SC', dose: 10 },
      { range: '≥ 350 mg/dL', action: 'Insulina regular SC + avisar plantonista', dose: 12 },
    ];

    const basalDose = Math.round(weight * 0.2);
    let correctionDose = 0;
    if (currentGlycemia >= 350) correctionDose = 12;
    else if (currentGlycemia >= 300) correctionDose = 10;
    else if (currentGlycemia >= 260) correctionDose = 8;
    else if (currentGlycemia >= 220) correctionDose = 6;
    else if (currentGlycemia >= 180) correctionDose = 4;
    else if (currentGlycemia >= 140) correctionDose = 2;

    return {
      patientId: params.patientId,
      currentGlycemia,
      basalInsulin: { type: 'Glargina', dose: basalDose, timing: '22h', unit: 'UI' },
      correctionDose: { type: 'Regular', dose: correctionDose, unit: 'UI' },
      slidingScale,
      hba1cTarget: '< 7.0%',
      monitoringSchedule: ['Jejum', 'Pré-almoço', 'Pré-jantar', '22h'],
    };
  }

  // ─── Rheumatology ──────────────────────────────────────────────────────

  async calculateDas28(_tenantId: string, params: { tenderJoints: number; swollenJoints: number; esr: number; patientGlobalAssessment: number }) {
    const { tenderJoints, swollenJoints, esr, patientGlobalAssessment } = params;
    const das28 = 0.56 * Math.sqrt(tenderJoints) + 0.28 * Math.sqrt(swollenJoints) + 0.70 * Math.log(esr) + 0.014 * patientGlobalAssessment;
    const rounded = Math.round(das28 * 100) / 100;

    let activity = 'Remissão';
    if (rounded > 5.1) activity = 'Alta atividade';
    else if (rounded > 3.2) activity = 'Atividade moderada';
    else if (rounded > 2.6) activity = 'Baixa atividade';

    return {
      score: rounded,
      diseaseActivity: activity,
      components: { tenderJoints, swollenJoints, esr, patientGlobalAssessment },
      treatmentEscalation: rounded > 3.2,
    };
  }

  // ─── Pulmonology ───────────────────────────────────────────────────────

  async calculateSpirometry(_tenantId: string, params: { fev1: number; fvc: number; fev1Predicted: number; age: number }) {
    const { fev1, fvc, fev1Predicted } = params;
    const ratio = fev1 / fvc;
    const fev1Percent = (fev1 / fev1Predicted) * 100;

    let goldStage = '';
    let pattern = 'Normal';
    if (ratio < 0.7) {
      pattern = 'Obstrutivo';
      if (fev1Percent >= 80) goldStage = 'GOLD 1 (Leve)';
      else if (fev1Percent >= 50) goldStage = 'GOLD 2 (Moderado)';
      else if (fev1Percent >= 30) goldStage = 'GOLD 3 (Grave)';
      else goldStage = 'GOLD 4 (Muito grave)';
    } else if (fev1Percent < 80) {
      pattern = 'Restritivo (sugestivo)';
    }

    return {
      fev1,
      fvc,
      fev1FvcRatio: Math.round(ratio * 1000) / 1000,
      fev1PercentPredicted: Math.round(fev1Percent * 10) / 10,
      pattern,
      goldStage: goldStage || undefined,
      obstruction: ratio < 0.7,
      bronchodilatorTestRecommended: ratio < 0.7,
    };
  }

  // ─── Dermatology ───────────────────────────────────────────────────────

  async getNevusMapping(_tenantId: string, patientId: string) {
    return {
      patientId,
      totalNevi: 23,
      atypicalNevi: 2,
      lastMapping: '2026-01-15',
      bodyRegions: [
        { region: 'Tronco anterior', neviCount: 8, atypical: 1, description: 'Nevo atípico 12mm em região periumbilical — monitorizar' },
        { region: 'Dorso', neviCount: 6, atypical: 0 },
        { region: 'MMSS', neviCount: 5, atypical: 1, description: 'Nevo atípico 8mm em braço D — ABCDE: assimetria e bordas irregulares' },
        { region: 'MMII', neviCount: 3, atypical: 0 },
        { region: 'Face/Pescoço', neviCount: 1, atypical: 0 },
      ],
      dermoscopyFindings: [
        { location: 'Periumbilical', pattern: 'Rede pigmentar atípica', recommendation: 'Excisão diagnóstica' },
        { location: 'Braço D', pattern: 'Pontos e glóbulos irregulares', recommendation: 'Seguimento dermatoscópico em 3 meses' },
      ],
      nextMappingDate: '2026-07-15',
      melanomRiskScore: 'MODERADO',
    };
  }
}
