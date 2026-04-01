import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  // Sepsis
  CalculateQSofaDto, QSofaResult,
  CalculateSepsisSOFADto, SofaResult, SofaOrganScore,
  TrackSepsisBundleDto, SepsisBundleResult, SepsisBundleStatus, SepsisBundleItem,
  // Stroke
  CalculateNIHSSDto, NIHSSResult, NIHSSItem,
  CincinnatiScaleDto, CincinnatiResult,
  StrokeTimelineDto, StrokeTimelineResult,
  ThrombolysisCheckDto, ThrombolysisCheckResult, ThrombolysisContraindication,
  // Chest Pain
  CalculateHEARTScoreDto, HEARTScoreResult,
  CalculateTIMIDto, TIMIRiskResult,
  CalculateKillipDto, KillipResult,
  // NEWS2
  CalculateNEWS2Dto, NEWS2Result, NEWS2ParameterResult, NEWS2SpO2Scale, NEWS2Consciousness,
  // ICU Scores
  CalculateGlasgowDto, GlasgowResult,
  CalculateRASSDto, RASSResult,
  CalculateCAMICUDto, CAMICUResult,
  CalculateBradenDto, BradenResult,
  // Nursing
  CalculateMorseFallDto, MorseFallResult,
  CalculateWaterlowDto, WaterlowResult,
} from './dto/clinical-protocols.dto';

/**
 * ClinicalProtocolsService
 *
 * Implements evidence-based clinical scoring systems and protocols used in
 * Brazilian hospitals. Every algorithm follows published guidelines with
 * proper references.
 *
 * Protocols implemented:
 * - Sepsis: qSOFA, SOFA (Sepsis-3), Hour-1 Bundle (SSC 2021)
 * - Stroke: NIHSS, Cincinnati, Thrombolysis eligibility, Timeline tracking
 * - Chest Pain: HEART score, TIMI risk, Killip classification
 * - NEWS2: National Early Warning Score 2 (RCP 2017)
 * - ICU: Glasgow, RASS, CAM-ICU, Braden
 * - Nursing: Morse Fall Scale, Waterlow pressure ulcer risk
 */
@Injectable()
export class ClinicalProtocolsService {
  private readonly logger = new Logger(ClinicalProtocolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SEPSIS PROTOCOL — Sepsis-3 (Singer et al. JAMA 2016)
  //    Surviving Sepsis Campaign 2021 Guidelines
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * qSOFA (quick SOFA) — bedside screening tool for sepsis.
   * Positive if ≥ 2 of 3 criteria are met.
   *
   * Reference: Seymour CW et al. JAMA 2016;315(8):762-774
   */
  calculateQSOFA(dto: CalculateQSofaDto): QSofaResult {
    const alteredMentation = dto.gcs < 15;
    const highRespiratoryRate = dto.respiratoryRate >= 22;
    const lowSystolicBP = dto.systolicBP <= 100;

    const score = (alteredMentation ? 1 : 0)
      + (highRespiratoryRate ? 1 : 0)
      + (lowSystolicBP ? 1 : 0);

    const sepsisScreenPositive = score >= 2;

    let recommendation: string;
    if (score === 0) {
      recommendation = 'qSOFA negativo. Baixa probabilidade de sepse. Continuar monitorização clínica.';
    } else if (score === 1) {
      recommendation = 'qSOFA = 1. Manter vigilância. Considerar avaliação laboratorial se suspeita clínica de infecção.';
    } else {
      recommendation = 'qSOFA ≥ 2 — TRIAGEM POSITIVA PARA SEPSE. Solicitar SOFA completo, lactato sérico, hemoculturas. Iniciar bundle de sepse imediatamente.';
    }

    this.logger.log(`qSOFA calculated: score=${score} positive=${sepsisScreenPositive}`);

    return {
      score,
      alteredMentation,
      highRespiratoryRate,
      lowSystolicBP,
      sepsisScreenPositive,
      recommendation,
      reference: 'Seymour CW et al. Assessment of Clinical Criteria for Sepsis. JAMA 2016;315(8):762-774. Sepsis-3 Definition.',
    };
  }

  /**
   * SOFA Score — Sequential Organ Failure Assessment.
   * Sepsis = suspected infection + SOFA ≥ 2.
   * Septic Shock = sepsis + vasopressor needed for MAP ≥ 65 + lactate > 2.
   *
   * Reference: Vincent JL et al. Intensive Care Med 1996;22:707-710
   *            Singer M et al. JAMA 2016;315(8):801-810 (Sepsis-3)
   */
  calculateSepsisSOFA(dto: CalculateSepsisSOFADto): SofaResult {
    const components: SofaOrganScore[] = [];

    // 1. Respiration — PaO2/FiO2
    let respScore: number;
    if (dto.pao2fio2 < 100 && dto.mechanicalVentilation) respScore = 4;
    else if (dto.pao2fio2 < 200 && dto.mechanicalVentilation) respScore = 3;
    else if (dto.pao2fio2 < 300) respScore = 2;
    else if (dto.pao2fio2 < 400) respScore = 1;
    else respScore = 0;
    components.push({ organ: 'Respiratório (PaO2/FiO2)', score: respScore, value: dto.pao2fio2, normal: '≥ 400' });

    // 2. Coagulation — Platelets
    let coagScore: number;
    if (dto.platelets < 20) coagScore = 4;
    else if (dto.platelets < 50) coagScore = 3;
    else if (dto.platelets < 100) coagScore = 2;
    else if (dto.platelets < 150) coagScore = 1;
    else coagScore = 0;
    components.push({ organ: 'Coagulação (Plaquetas ×10³/µL)', score: coagScore, value: dto.platelets, normal: '≥ 150' });

    // 3. Liver — Bilirubin
    let liverScore: number;
    if (dto.bilirubin >= 12) liverScore = 4;
    else if (dto.bilirubin >= 6) liverScore = 3;
    else if (dto.bilirubin >= 2) liverScore = 2;
    else if (dto.bilirubin >= 1.2) liverScore = 1;
    else liverScore = 0;
    components.push({ organ: 'Hepático (Bilirrubina mg/dL)', score: liverScore, value: dto.bilirubin, normal: '< 1.2' });

    // 4. Cardiovascular — MAP and vasopressors
    let cardioScore: number;
    const norepi = dto.norepinephrineDose ?? 0;
    const epi = dto.epinephrineDose ?? 0;
    const dopa = dto.dopamineDose ?? 0;
    if (norepi > 0.1 || epi > 0.1) cardioScore = 4;
    else if (norepi > 0 || epi <= 0.1 && epi > 0) cardioScore = 3;
    else if (dopa > 5 || (dto.dobutamineUse === true)) cardioScore = 2;
    else if (dopa > 0) cardioScore = 1;
    else if (dto.map < 70) cardioScore = 1;
    else cardioScore = 0;
    const cardioValue = norepi > 0 ? `NE ${norepi} mcg/kg/min, PAM ${dto.map}`
      : epi > 0 ? `Epi ${epi} mcg/kg/min, PAM ${dto.map}`
      : `PAM ${dto.map}`;
    components.push({ organ: 'Cardiovascular (PAM/Vasopressores)', score: cardioScore, value: cardioValue, normal: 'PAM ≥ 70, sem DVA' });

    // 5. CNS — Glasgow
    let cnsScore: number;
    if (dto.gcs < 6) cnsScore = 4;
    else if (dto.gcs < 10) cnsScore = 3;
    else if (dto.gcs < 13) cnsScore = 2;
    else if (dto.gcs < 15) cnsScore = 1;
    else cnsScore = 0;
    components.push({ organ: 'Neurológico (Glasgow)', score: cnsScore, value: dto.gcs, normal: '15' });

    // 6. Renal — Creatinine and urine output
    let renalScore: number;
    const uo = dto.urineOutput24h;
    if (dto.creatinine >= 5 || (uo !== undefined && uo < 200)) renalScore = 4;
    else if (dto.creatinine >= 3.5 || (uo !== undefined && uo < 500)) renalScore = 3;
    else if (dto.creatinine >= 2) renalScore = 2;
    else if (dto.creatinine >= 1.2) renalScore = 1;
    else renalScore = 0;
    const renalValue = uo !== undefined ? `Cr ${dto.creatinine}, DU ${uo} mL/24h` : `Cr ${dto.creatinine}`;
    components.push({ organ: 'Renal (Creatinina/Débito urinário)', score: renalScore, value: renalValue, normal: 'Cr < 1.2' });

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    // Sepsis-3: infection + SOFA ≥ 2
    const sepsisPresent = totalScore >= 2;

    // Septic shock: sepsis + vasopressor for MAP ≥ 65 + lactate > 2 mmol/L
    const septicShock = sepsisPresent
      && (dto.vasopressorRequired === true)
      && (dto.lactate !== undefined && dto.lactate > 2);

    // Mortality estimation based on SOFA (Vincent et al. 1996)
    let estimatedMortality: string;
    if (totalScore <= 1) estimatedMortality = '< 10%';
    else if (totalScore <= 5) estimatedMortality = '10-20%';
    else if (totalScore <= 9) estimatedMortality = '20-35%';
    else if (totalScore <= 14) estimatedMortality = '35-60%';
    else if (totalScore <= 19) estimatedMortality = '60-85%';
    else estimatedMortality = '> 85%';

    let recommendation: string;
    if (septicShock) {
      recommendation = 'CHOQUE SÉPTICO — Ressuscitação volumétrica agressiva, otimizar vasopressores para PAM ≥ 65, corticosteroide se vasopressores escalonados, monitorização invasiva.';
    } else if (sepsisPresent) {
      recommendation = `SEPSE CONFIRMADA (SOFA ≥ 2). Bundle hora-1: 1) Medir lactato; 2) Hemoculturas antes do ATB; 3) Antibiótico de amplo espectro; 4) Cristaloide 30 mL/kg se hipotensão ou lactato ≥ 4; 5) Vasopressor se hipotensão pós-volume.`;
    } else {
      recommendation = 'SOFA < 2. Critérios de sepse não preenchidos. Manter vigilância e reavaliar se piora clínica.';
    }

    this.logger.log(`SOFA calculated: score=${totalScore} sepsis=${sepsisPresent} shock=${septicShock}`);

    return {
      totalScore,
      components,
      sepsisPresent,
      septicShock,
      estimatedMortality,
      recommendation,
      reference: 'Singer M et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA 2016;315(8):801-810.',
    };
  }

  /**
   * Sepsis Hour-1 Bundle compliance tracking.
   * Based on SSC 2021 International Guidelines.
   *
   * Bundle items with time targets:
   * - Measure lactate (within 1h)
   * - Blood cultures before antibiotics (within 1h)
   * - Broad-spectrum antibiotics (within 1h — ideally within 45 min)
   * - Crystalloid 30 mL/kg if hypotension or lactate ≥ 4 (within 1h)
   * - Vasopressors if MAP < 65 after fluids (within 1h)
   * - Reassess lactate if initial > 2 (within 2-4h)
   */
  trackSepsisBundle(dto: TrackSepsisBundleDto): SepsisBundleResult {
    const onsetMs = new Date(dto.sepsisOnsetTime).getTime();
    const now = Date.now();

    const calcItem = (
      item: SepsisBundleItem,
      label: string,
      completedAt: string | undefined,
      targetMinutes: number,
    ): SepsisBundleStatus => {
      const completed = !!completedAt;
      let elapsedMinutes: number | null = null;
      let withinTarget: boolean | null = null;

      if (completed) {
        elapsedMinutes = Math.round((new Date(completedAt).getTime() - onsetMs) / 60000);
        withinTarget = elapsedMinutes <= targetMinutes;
      } else {
        // Check if target window has passed
        elapsedMinutes = Math.round((now - onsetMs) / 60000);
        withinTarget = null; // not yet completed
      }

      return { item, label, completed, completedAt: completedAt ?? null, targetMinutes, withinTarget, elapsedMinutes };
    };

    const bundleItems: SepsisBundleStatus[] = [
      calcItem(SepsisBundleItem.MEASURE_LACTATE, 'Coleta de lactato sérico', dto.lactateCollectedAt, 60),
      calcItem(SepsisBundleItem.BLOOD_CULTURES, 'Hemoculturas (2 sets antes do ATB)', dto.bloodCulturesCollectedAt, 60),
      calcItem(SepsisBundleItem.BROAD_SPECTRUM_ANTIBIOTICS, 'Antibiótico de amplo espectro IV', dto.antibioticsStartedAt, 60),
      calcItem(SepsisBundleItem.FLUID_BOLUS, 'Cristaloide 30 mL/kg (se hipotensão ou lactato ≥ 4)', dto.fluidBolusStartedAt, 60),
      calcItem(SepsisBundleItem.VASOPRESSORS, 'Vasopressor se PAM < 65 após volume', dto.vasopressorsStartedAt, 60),
      calcItem(SepsisBundleItem.REASSESS_LACTATE, 'Reavaliação de lactato (se > 2 mmol/L)', dto.lactateReassessedAt, 240),
    ];

    const completedCount = bundleItems.filter((i) => i.completed).length;
    const overallCompliance = Math.round((completedCount / bundleItems.length) * 100);

    // Hour-1 core items (first 5)
    const hour1Items = bundleItems.slice(0, 5);
    const hour1Compliant = hour1Items.every((i) => i.completed && i.withinTarget === true);

    // Hour-3 (all items including lactate reassessment)
    const hour3Compliant = bundleItems.every((i) => i.completed);

    let recommendation: string;
    if (hour1Compliant && hour3Compliant) {
      recommendation = 'Bundle de sepse COMPLETO e DENTRO DO ALVO. Excelente aderência ao protocolo. Manter reavaliação clínica contínua.';
    } else if (!hour1Compliant) {
      const pending = hour1Items.filter((i) => !i.completed).map((i) => i.label);
      recommendation = `ATENÇÃO: Bundle hora-1 INCOMPLETO. Pendências: ${pending.join('; ')}. Priorizar conclusão IMEDIATA.`;
    } else {
      recommendation = 'Bundle hora-1 completo. Pendente reavaliação de lactato. Verificar se lactato inicial > 2 mmol/L requer reavaliação em 2-4h.';
    }

    this.logger.log(`Sepsis bundle: compliance=${overallCompliance}% h1=${hour1Compliant}`);

    return {
      patientId: dto.patientId,
      sepsisOnsetTime: dto.sepsisOnsetTime,
      bundleItems,
      overallCompliance,
      hour1Compliant,
      hour3Compliant,
      recommendation,
      reference: 'Evans L et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Intensive Care Med 2021;47(11):1181-1247.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. STROKE PROTOCOL — AHA/ASA 2019 & ESO 2021
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * NIHSS — National Institutes of Health Stroke Scale.
   * 15-item neurological examination scale (0-42 points).
   *
   * Reference: Brott T et al. Stroke 1989;20(7):864-870
   *            Lyden P et al. Stroke 2001;32(6):1310-1317
   */
  calculateNIHSS(dto: CalculateNIHSSDto): NIHSSResult {
    const items: NIHSSItem[] = [
      { item: '1a', description: 'Nível de consciência', score: dto.consciousness, maxScore: 3 },
      { item: '1b', description: 'Perguntas de orientação (mês e idade)', score: dto.orientationQuestions, maxScore: 2 },
      { item: '1c', description: 'Comandos (abrir/fechar olhos, apertar/soltar mão)', score: dto.commands, maxScore: 2 },
      { item: '2', description: 'Melhor olhar conjugado', score: dto.bestGaze, maxScore: 2 },
      { item: '3', description: 'Campos visuais', score: dto.visualFields, maxScore: 3 },
      { item: '4', description: 'Paralisia facial', score: dto.facialPalsy, maxScore: 3 },
      { item: '5a', description: 'Motricidade MSE (braço esquerdo)', score: dto.motorArmLeft, maxScore: 4 },
      { item: '5b', description: 'Motricidade MSD (braço direito)', score: dto.motorArmRight, maxScore: 4 },
      { item: '6a', description: 'Motricidade MIE (perna esquerda)', score: dto.motorLegLeft, maxScore: 4 },
      { item: '6b', description: 'Motricidade MID (perna direita)', score: dto.motorLegRight, maxScore: 4 },
      { item: '7', description: 'Ataxia de membros', score: dto.limbAtaxia, maxScore: 2 },
      { item: '8', description: 'Sensibilidade', score: dto.sensory, maxScore: 2 },
      { item: '9', description: 'Melhor linguagem', score: dto.bestLanguage, maxScore: 3 },
      { item: '10', description: 'Disartria', score: dto.dysarthria, maxScore: 2 },
      { item: '11', description: 'Extinção e inatenção (negligência)', score: dto.extinctionInattention, maxScore: 2 },
    ];

    const totalScore = items.reduce((sum, i) => sum + i.score, 0);

    let severity: string;
    let recommendation: string;
    if (totalScore === 0) {
      severity = 'Sem déficit';
      recommendation = 'Sem déficit neurológico detectado. Considerar outras etiologias.';
    } else if (totalScore <= 4) {
      severity = 'AVC leve (Minor Stroke)';
      recommendation = 'AVC leve. Considerar trombólise se sintomas incapacitantes. Investigação etiológica com angioTC e RNM.';
    } else if (totalScore <= 15) {
      severity = 'AVC moderado';
      recommendation = 'AVC moderado. Candidato a trombólise IV (se dentro da janela). Considerar trombectomia mecânica se oclusão de grande vaso.';
    } else if (totalScore <= 20) {
      severity = 'AVC moderado a grave';
      recommendation = 'AVC moderado a grave. Trombólise IV + trombectomia mecânica (se LVO). UTI/unidade de AVC. Monitorização neurológica frequente.';
    } else {
      severity = 'AVC grave';
      recommendation = 'AVC GRAVE (NIHSS > 20). Trombólise IV + trombectomia mecânica urgente. Avaliar necessidade de intubação e neuroproteção. Cuidados intensivos neurológicos.';
    }

    this.logger.log(`NIHSS calculated: score=${totalScore} severity=${severity}`);

    return {
      totalScore,
      items,
      severity,
      recommendation,
      reference: 'Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke 1989;20(7):864-870.',
    };
  }

  /**
   * Cincinnati Prehospital Stroke Scale.
   * 3-item rapid screening tool for stroke in prehospital setting.
   * Any single abnormality = 72% probability of stroke.
   *
   * Reference: Kothari RU et al. Ann Emerg Med 1999;33(4):373-378
   */
  calculateCincinnati(dto: CincinnatiScaleDto): CincinnatiResult {
    const positiveFindings = (dto.facialDroop ? 1 : 0)
      + (dto.armDrift ? 1 : 0)
      + (dto.speechAbnormality ? 1 : 0);

    const strokeLikely = positiveFindings >= 1;

    let recommendation: string;
    if (positiveFindings === 0) {
      recommendation = 'Cincinnati negativo. Baixa probabilidade de AVC na triagem pré-hospitalar. Considerar outras causas.';
    } else if (positiveFindings === 1) {
      recommendation = 'Cincinnati com 1 achado positivo. Probabilidade de AVC ~72%. Ativar Código AVC e transportar para centro de referência com TC disponível.';
    } else if (positiveFindings === 2) {
      recommendation = 'Cincinnati com 2 achados positivos. Alta probabilidade de AVC. ATIVAR CÓDIGO AVC IMEDIATAMENTE. Tempo é cérebro.';
    } else {
      recommendation = 'Cincinnati com 3 achados positivos. MUITO ALTA probabilidade de AVC. CÓDIGO AVC — transportar IMEDIATAMENTE para centro com trombólise/trombectomia.';
    }

    return {
      facialDroop: dto.facialDroop,
      armDrift: dto.armDrift,
      speechAbnormality: dto.speechAbnormality,
      strokeLikely,
      positiveFindings,
      recommendation,
      reference: 'Kothari RU et al. Cincinnati Prehospital Stroke Scale: reproducibility and validity. Ann Emerg Med 1999;33(4):373-378.',
    };
  }

  /**
   * Stroke time-to-treatment tracking.
   * Door-to-CT target: ≤ 25 minutes (AHA/ASA 2019)
   * Door-to-needle target: ≤ 60 minutes (AHA/ASA 2019)
   * Thrombolysis window: ≤ 4.5 hours from symptom onset
   */
  calculateStrokeTimeline(dto: StrokeTimelineDto): StrokeTimelineResult {
    const doorMs = new Date(dto.doorTime).getTime();
    const symptomMs = new Date(dto.symptomOnsetTime).getTime();

    let doorToCTMinutes: number | null = null;
    let ctWithinTarget: boolean | null = null;
    if (dto.ctCompletedTime) {
      doorToCTMinutes = Math.round((new Date(dto.ctCompletedTime).getTime() - doorMs) / 60000);
      ctWithinTarget = doorToCTMinutes <= 25;
    }

    let doorToNeedleMinutes: number | null = null;
    let needleWithinTarget: boolean | null = null;
    let symptomToNeedleMinutes: number | null = null;
    if (dto.needleTime) {
      const needleMs = new Date(dto.needleTime).getTime();
      doorToNeedleMinutes = Math.round((needleMs - doorMs) / 60000);
      needleWithinTarget = doorToNeedleMinutes <= 60;
      symptomToNeedleMinutes = Math.round((needleMs - symptomMs) / 60000);
    }

    // Thrombolysis window: 4.5 hours = 270 minutes from symptom onset
    const timeSinceOnsetMinutes = Math.round((Date.now() - symptomMs) / 60000);
    const withinThrombolysisWindow = timeSinceOnsetMinutes <= 270;
    const windowRemainingMinutes = withinThrombolysisWindow ? 270 - timeSinceOnsetMinutes : null;

    let recommendation: string;
    if (!withinThrombolysisWindow) {
      recommendation = 'FORA DA JANELA de trombólise IV (> 4,5h). Considerar trombectomia mecânica se oclusão de grande vaso (janela até 24h em casos selecionados).';
    } else if (windowRemainingMinutes !== null && windowRemainingMinutes < 30) {
      recommendation = `URGENTE: Apenas ${windowRemainingMinutes} min restantes na janela de trombólise! Decisão sobre rt-PA deve ser IMEDIATA.`;
    } else {
      recommendation = `Dentro da janela de trombólise (${windowRemainingMinutes} min restantes). Completar avaliação (TC, labs, NIHSS) e decidir sobre rt-PA.`;
    }

    return {
      patientId: dto.patientId,
      symptomOnsetTime: dto.symptomOnsetTime,
      doorTime: dto.doorTime,
      ctCompletedTime: dto.ctCompletedTime ?? null,
      doorToCTMinutes,
      ctTarget: 25,
      ctWithinTarget,
      needleTime: dto.needleTime ?? null,
      doorToNeedleMinutes,
      needleTarget: 60,
      needleWithinTarget,
      symptomToNeedleMinutes,
      withinThrombolysisWindow,
      windowRemainingMinutes,
      recommendation,
      reference: 'Powers WJ et al. 2019 AHA/ASA Guidelines for the Early Management of Patients with Acute Ischemic Stroke. Stroke 2019;50:e344-e418.',
    };
  }

  /**
   * Thrombolysis (rt-PA) eligibility checklist.
   * Based on AHA/ASA 2019 inclusion/exclusion criteria.
   * Alteplase dose: 0.9 mg/kg (max 90 mg), 10% bolus, 90% over 60 min.
   */
  checkThrombolysisEligibility(dto: ThrombolysisCheckDto): ThrombolysisCheckResult {
    const absolute: ThrombolysisContraindication[] = [];
    const relative: ThrombolysisContraindication[] = [];

    // Absolute contraindications
    const addAbsolute = (desc: string, present: boolean) => {
      absolute.push({ category: 'Absoluta', description: desc, present, absolute: true });
    };

    addAbsolute('Hemorragia intracraniana prévia', dto.historyICH);
    addAbsolute('Neoplasia intracraniana, MAV ou aneurisma cerebral', dto.intracranialNeoplasm);
    addAbsolute('AVC isquêmico ou TCE grave nos últimos 3 meses', dto.recentStrokeOrHeadTrauma);
    addAbsolute('Cirurgia intracraniana ou espinhal nos últimos 3 meses', dto.recentMajorSurgery);
    addAbsolute('Sangramento ativo ou suspeita de dissecção aórtica', dto.activeBleedingOrDissection);
    addAbsolute('Plaquetas < 100.000/µL', dto.platelets < 100);
    addAbsolute('INR > 1.7', dto.inr > 1.7);
    addAbsolute('Glicemia < 50 mg/dL', dto.glucose < 50);
    addAbsolute('PA sistólica > 185 mmHg (não controlada)', dto.systolicBP > 185);
    addAbsolute('PA diastólica > 110 mmHg (não controlada)', dto.diastolicBP > 110);
    addAbsolute('Fora da janela terapêutica (> 4,5h)', dto.minutesSinceOnset > 270);

    // Relative contraindications (janela 3-4.5h / específicas)
    const addRelative = (desc: string, present: boolean) => {
      relative.push({ category: 'Relativa', description: desc, present, absolute: false });
    };

    addRelative('Idade > 80 anos (janela 3-4,5h)', (dto.age > 80) && (dto.minutesSinceOnset > 180));
    addRelative('Sangramento GI ou urinário nos últimos 21 dias', dto.recentGIBleed);
    addRelative('Punção arterial em sítio não compressível nos últimos 7 dias', dto.recentArterialPuncture);
    addRelative('Convulsão no início dos sintomas', dto.seizureAtOnset === true);
    addRelative('IAM nos últimos 3 meses', dto.recentMI === true);
    addRelative('Uso de anticoagulantes orais', dto.onAnticoagulants === true);

    const hasAbsoluteContraindication = absolute.some((c) => c.present);
    const hasRelativeContraindication = relative.some((c) => c.present);
    const withinTimeWindow = dto.minutesSinceOnset <= 270;

    const eligible = !hasAbsoluteContraindication && withinTimeWindow;

    // Alteplase dosing: 0.9 mg/kg, max 90 mg
    let alteplaseDose: ThrombolysisCheckResult['alteplaseDose'] = null;
    if (eligible) {
      const totalDose = Math.min(dto.weight * 0.9, 90);
      const bolusDose = Math.round(totalDose * 0.1 * 100) / 100;
      const infusionDose = Math.round((totalDose - bolusDose) * 100) / 100;
      alteplaseDose = {
        totalDose: Math.round(totalDose * 100) / 100,
        bolusDose,
        infusionDose,
        weight: dto.weight,
      };
    }

    let recommendation: string;
    if (!withinTimeWindow) {
      recommendation = 'FORA DA JANELA TERAPÊUTICA. Trombólise IV contraindicada. Considerar trombectomia mecânica se LVO dentro da janela estendida.';
    } else if (hasAbsoluteContraindication) {
      const reasons = absolute.filter((c) => c.present).map((c) => c.description).join('; ');
      recommendation = `TROMBÓLISE IV CONTRAINDICADA — Contraindicações absolutas: ${reasons}. Considerar trombectomia mecânica se oclusão de grande vaso.`;
    } else if (hasRelativeContraindication) {
      const reasons = relative.filter((c) => c.present).map((c) => c.description).join('; ');
      recommendation = `ELEGÍVEL com ressalvas. Contraindicações relativas: ${reasons}. Decisão individualizada com equipe de neurologia.`;
    } else {
      recommendation = `ELEGÍVEL para trombólise IV com alteplase. Dose: ${alteplaseDose?.totalDose} mg total (${alteplaseDose?.bolusDose} mg bolus + ${alteplaseDose?.infusionDose} mg em 60 min). Administrar o mais rápido possível.`;
    }

    this.logger.log(`Thrombolysis check: eligible=${eligible} absolute=${hasAbsoluteContraindication} relative=${hasRelativeContraindication}`);

    return {
      eligible,
      absoluteContraindications: absolute,
      relativeContraindications: relative,
      withinTimeWindow,
      recommendation,
      alteplaseDose,
      reference: 'Powers WJ et al. 2019 AHA/ASA Guidelines for the Early Management of Patients with Acute Ischemic Stroke. Stroke 2019;50:e344-e418.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CHEST PAIN PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * HEART Score — History, ECG, Age, Risk factors, Troponin.
   * Validated for risk stratification of chest pain in the ED.
   *
   * Reference: Six AJ et al. Chest pain in the emergency room: value of the
   *            HEART score. Neth Heart J 2008;16(6):191-196.
   *            Backus BE et al. Am Heart J 2013;166(4):689-697.
   */
  calculateHEARTScore(dto: CalculateHEARTScoreDto): HEARTScoreResult {
    // Age scoring
    let ageScore: number;
    if (dto.age < 45) ageScore = 0;
    else if (dto.age <= 64) ageScore = 1;
    else ageScore = 2;

    // Risk factors scoring
    let riskScore: number;
    if (dto.riskFactorCount === 0) riskScore = 0;
    else if (dto.riskFactorCount <= 2) riskScore = 1;
    else riskScore = 2;

    const components = [
      { name: 'History (História)', score: dto.history, maxScore: 2 },
      { name: 'ECG', score: dto.ecg, maxScore: 2 },
      { name: 'Age (Idade)', score: ageScore, maxScore: 2 },
      { name: 'Risk Factors (Fatores de risco)', score: riskScore, maxScore: 2 },
      { name: 'Troponin (Troponina)', score: dto.troponin, maxScore: 2 },
    ];

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    let riskCategory: string;
    let maceRisk6Weeks: string;
    let recommendation: string;

    if (totalScore <= 3) {
      riskCategory = 'Baixo risco';
      maceRisk6Weeks = '0,9-1,7%';
      recommendation = 'HEART ≤ 3: Baixo risco de MACE. Considerar alta precoce com acompanhamento ambulatorial. Troponina seriada pode não ser necessária.';
    } else if (totalScore <= 6) {
      riskCategory = 'Risco intermediário';
      maceRisk6Weeks = '12-16,6%';
      recommendation = 'HEART 4-6: Risco intermediário. Observação na unidade de dor torácica. Troponina seriada (0h e 3h). Considerar teste provocativo ou angioTC coronariana.';
    } else {
      riskCategory = 'Alto risco';
      maceRisk6Weeks = '50-65%';
      recommendation = 'HEART ≥ 7: ALTO RISCO de MACE. Internação. Cateterismo cardíaco precoce. Anticoagulação e dupla antiagregação conforme protocolo SCA.';
    }

    this.logger.log(`HEART score: ${totalScore} risk=${riskCategory}`);

    return {
      totalScore,
      components,
      riskCategory,
      maceRisk6Weeks,
      recommendation,
      reference: 'Six AJ et al. Chest pain in the emergency room: value of the HEART score. Neth Heart J 2008;16(6):191-196.',
    };
  }

  /**
   * TIMI Risk Score for Unstable Angina / NSTEMI.
   * 7 binary variables, each worth 1 point.
   *
   * Reference: Antman EM et al. JAMA 2000;284(7):835-842.
   */
  calculateTIMI(dto: CalculateTIMIDto): TIMIRiskResult {
    const components = [
      { name: 'Idade ≥ 65 anos', present: dto.age65OrOlder, points: dto.age65OrOlder ? 1 : 0 },
      { name: '≥ 3 fatores de risco para DAC', present: dto.threeOrMoreRiskFactors, points: dto.threeOrMoreRiskFactors ? 1 : 0 },
      { name: 'Estenose coronariana ≥ 50% conhecida', present: dto.knownCoronaryStenosis, points: dto.knownCoronaryStenosis ? 1 : 0 },
      { name: 'Uso de AAS nos últimos 7 dias', present: dto.aspirinUseLast7Days, points: dto.aspirinUseLast7Days ? 1 : 0 },
      { name: '≥ 2 episódios de angina nas últimas 24h', present: dto.twoOrMoreAnginaEpisodes, points: dto.twoOrMoreAnginaEpisodes ? 1 : 0 },
      { name: 'Desvio ST ≥ 0,5mm', present: dto.stDeviationHalfMm, points: dto.stDeviationHalfMm ? 1 : 0 },
      { name: 'Elevação de marcadores cardíacos', present: dto.elevatedCardiacMarkers, points: dto.elevatedCardiacMarkers ? 1 : 0 },
    ];

    const totalScore = components.reduce((sum, c) => sum + c.points, 0);

    // TIMI risk stratification (event rates from original study)
    let riskCategory: string;
    let eventRisk14Days: string;
    let recommendation: string;

    if (totalScore <= 1) {
      riskCategory = 'Baixo risco';
      eventRisk14Days = '~5%';
      recommendation = 'TIMI 0-1: Baixo risco. Considerar estratégia conservadora. Teste funcional não invasivo ambulatorial.';
    } else if (totalScore <= 2) {
      riskCategory = 'Baixo risco';
      eventRisk14Days = '~8%';
      recommendation = 'TIMI 2: Risco baixo-moderado. Observação breve, troponina seriada. Teste provocativo antes da alta.';
    } else if (totalScore <= 4) {
      riskCategory = 'Risco intermediário';
      eventRisk14Days = '13-20%';
      recommendation = 'TIMI 3-4: Risco intermediário. Internação. Anticoagulação + dupla antiagregação. Estratégia invasiva precoce (cateterismo em 24-72h).';
    } else {
      riskCategory = 'Alto risco';
      eventRisk14Days = '26-41%';
      recommendation = 'TIMI 5-7: ALTO RISCO. Internação em unidade coronariana. Estratégia invasiva URGENTE (cateterismo em < 24h). Anticoagulação plena + dupla antiagregação.';
    }

    this.logger.log(`TIMI score: ${totalScore} risk=${riskCategory}`);

    return {
      totalScore,
      components,
      riskCategory,
      eventRisk14Days,
      recommendation,
      reference: 'Antman EM et al. The TIMI Risk Score for Unstable Angina/Non-ST Elevation MI. JAMA 2000;284(7):835-842.',
    };
  }

  /**
   * Killip Classification — Hemodynamic assessment in acute MI.
   *
   * Reference: Killip T, Kimball JT. Treatment of myocardial infarction
   *            in a coronary care unit. Am J Cardiol 1967;20(4):457-464.
   */
  calculateKillip(dto: CalculateKillipDto): KillipResult {
    let killipClass: number;
    let description: string;
    let mortality: string;
    const findings: string[] = [];
    let recommendation: string;

    if (dto.cardiogenicShock) {
      killipClass = 4;
      description = 'Choque cardiogênico';
      mortality = '60-80%';
      findings.push('Hipotensão', 'Hipoperfusão periférica', 'Oligúria', 'Confusão mental');
      recommendation = 'KILLIP IV — CHOQUE CARDIOGÊNICO. Suporte inotrópico/vasopressor. Balão intra-aórtico ou Impella. Cateterismo de emergência. Considerar ECMO.';
    } else if (dto.pulmonaryEdema) {
      killipClass = 3;
      description = 'Edema pulmonar agudo';
      mortality = '35-45%';
      findings.push('Edema pulmonar franco', 'Dispneia intensa');
      if (dto.rales) findings.push('Estertores difusos');
      recommendation = 'KILLIP III — EDEMA PULMONAR. VNI (CPAP/BiPAP). Furosemida IV. Nitroglicerina IV. Morfina se necessário. Monitorização intensiva. Cateterismo urgente.';
    } else if (dto.rales || dto.s3Gallop || dto.jugularVenousDistension) {
      killipClass = 2;
      description = 'Insuficiência cardíaca moderada';
      mortality = '15-20%';
      if (dto.rales) findings.push('Estertores crepitantes (< 50% campos pulmonares)');
      if (dto.s3Gallop) findings.push('B3 (terceira bulha cardíaca)');
      if (dto.jugularVenousDistension) findings.push('Estase jugular');
      recommendation = 'KILLIP II — IC moderada. Diurético IV. Monitorização em unidade coronariana. Ecocardiograma urgente. Avaliar necessidade de cateterismo.';
    } else {
      killipClass = 1;
      description = 'Sem sinais de insuficiência cardíaca';
      mortality = '5-8%';
      findings.push('Sem estertores', 'Sem B3', 'Sem estase jugular');
      recommendation = 'KILLIP I — Sem IC. Monitorização padrão. Tratamento conforme protocolo SCA (antiplaquetários, anticoagulação, betabloqueador, estatina).';
    }

    this.logger.log(`Killip class: ${killipClass}`);

    return {
      class: killipClass,
      description,
      inHospitalMortality: mortality,
      findings,
      recommendation,
      reference: 'Killip T, Kimball JT. Treatment of myocardial infarction in a coronary care unit. Am J Cardiol 1967;20(4):457-464.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. NEWS2 — National Early Warning Score 2
  //    Royal College of Physicians 2017
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * NEWS2 — Proper implementation with Scale 1 and Scale 2 for SpO2.
   * Scale 2 is used for patients with confirmed hypercapnic respiratory
   * failure (e.g., COPD) with target SpO2 88-92%.
   *
   * Reference: Royal College of Physicians. National Early Warning Score
   *            (NEWS) 2. London: RCP, 2017.
   */
  calculateNEWS2(dto: CalculateNEWS2Dto): NEWS2Result {
    const parameters: NEWS2ParameterResult[] = [];

    // 1. Respiratory Rate
    let rrScore: number;
    const rr = dto.respiratoryRate;
    if (rr <= 8) rrScore = 3;
    else if (rr <= 11) rrScore = 1;
    else if (rr <= 20) rrScore = 0;
    else if (rr <= 24) rrScore = 2;
    else rrScore = 3;
    parameters.push({ parameter: 'Frequência Respiratória', value: rr, score: rrScore, range: '12-20 irpm' });

    // 2. SpO2 — Scale 1 or Scale 2
    let spo2Score: number;
    if (dto.spO2Scale === NEWS2SpO2Scale.SCALE_1) {
      // Scale 1 — standard patients
      if (dto.spO2 <= 91) spo2Score = 3;
      else if (dto.spO2 <= 93) spo2Score = 2;
      else if (dto.spO2 <= 95) spo2Score = 1;
      else spo2Score = 0;
      parameters.push({ parameter: 'SpO2 (Escala 1)', value: dto.spO2, score: spo2Score, range: '≥ 96%' });
    } else {
      // Scale 2 — COPD / hypercapnic patients
      // Target SpO2: 88-92%
      if (dto.spO2 <= 83) spo2Score = 3;
      else if (dto.spO2 <= 85) spo2Score = 2;
      else if (dto.spO2 <= 87) spo2Score = 1;
      else if (dto.spO2 <= 92) spo2Score = 0; // target range
      else if (dto.spO2 <= 94 && dto.supplementalOxygen) spo2Score = 1;
      else if (dto.spO2 <= 96 && dto.supplementalOxygen) spo2Score = 2;
      else if (dto.spO2 >= 97 && dto.supplementalOxygen) spo2Score = 3;
      else spo2Score = 0;
      parameters.push({ parameter: 'SpO2 (Escala 2 — DPOC)', value: dto.spO2, score: spo2Score, range: '88-92% (alvo DPOC)' });
    }

    // 3. Supplemental oxygen
    const o2Score = dto.supplementalOxygen ? 2 : 0;
    parameters.push({ parameter: 'O2 Suplementar', value: dto.supplementalOxygen ? 'Sim' : 'Não', score: o2Score, range: 'Ar ambiente' });

    // 4. Systolic BP
    let sbpScore: number;
    const sbp = dto.systolicBP;
    if (sbp <= 90) sbpScore = 3;
    else if (sbp <= 100) sbpScore = 2;
    else if (sbp <= 110) sbpScore = 1;
    else if (sbp <= 219) sbpScore = 0;
    else sbpScore = 3;
    parameters.push({ parameter: 'PA Sistólica', value: sbp, score: sbpScore, range: '111-219 mmHg' });

    // 5. Heart Rate
    let hrScore: number;
    const hr = dto.heartRate;
    if (hr <= 40) hrScore = 3;
    else if (hr <= 50) hrScore = 1;
    else if (hr <= 90) hrScore = 0;
    else if (hr <= 110) hrScore = 1;
    else if (hr <= 130) hrScore = 2;
    else hrScore = 3;
    parameters.push({ parameter: 'Frequência Cardíaca', value: hr, score: hrScore, range: '51-90 bpm' });

    // 6. Consciousness (ACVPU)
    let locScore: number;
    switch (dto.consciousness) {
      case NEWS2Consciousness.ALERT:
        locScore = 0;
        break;
      case NEWS2Consciousness.CONFUSION:
        locScore = 3; // NEWS2 treats new confusion as score 3
        break;
      case NEWS2Consciousness.VOICE:
        locScore = 3;
        break;
      case NEWS2Consciousness.PAIN:
        locScore = 3;
        break;
      case NEWS2Consciousness.UNRESPONSIVE:
        locScore = 3;
        break;
      default:
        locScore = 0;
    }
    parameters.push({ parameter: 'Nível de Consciência (ACVPU)', value: dto.consciousness, score: locScore, range: 'Alerta' });

    // 7. Temperature
    let tempScore: number;
    const temp = dto.temperature;
    if (temp <= 35.0) tempScore = 3;
    else if (temp <= 36.0) tempScore = 1;
    else if (temp <= 38.0) tempScore = 0;
    else if (temp <= 39.0) tempScore = 1;
    else tempScore = 2;
    parameters.push({ parameter: 'Temperatura', value: temp, score: tempScore, range: '36.1-38.0 °C' });

    const totalScore = parameters.reduce((sum, p) => sum + p.score, 0);
    const hasExtremeScore = parameters.some((p) => p.score === 3);

    // Clinical response based on NEWS2 thresholds
    let clinicalRisk: string;
    let clinicalResponse: string;
    let monitoringFrequency: string;
    let escalation: string;

    if (totalScore === 0) {
      clinicalRisk = 'Baixo';
      clinicalResponse = 'Manter monitorização de rotina.';
      monitoringFrequency = 'Mínimo a cada 12 horas';
      escalation = 'Nenhuma';
    } else if (totalScore <= 4 && !hasExtremeScore) {
      clinicalRisk = 'Baixo';
      clinicalResponse = 'Informar enfermeiro responsável. Avaliar necessidade de aumento de frequência de monitorização.';
      monitoringFrequency = 'Mínimo a cada 4-6 horas';
      escalation = 'Enfermeiro responsável';
    } else if (totalScore <= 4 && hasExtremeScore) {
      clinicalRisk = 'Baixo-Médio (parâmetro extremo)';
      clinicalResponse = 'ATENÇÃO: Parâmetro individual em nível 3. Avaliação clínica URGENTE pelo enfermeiro e informar equipe médica.';
      monitoringFrequency = 'Mínimo a cada 1 hora';
      escalation = 'Enfermeiro sênior + Equipe médica';
    } else if (totalScore <= 6) {
      clinicalRisk = 'Médio';
      clinicalResponse = 'Avaliação clínica URGENTE. Médico assistente deve ser informado. Considerar se requer cuidados de nível superior.';
      monitoringFrequency = 'Mínimo a cada 1 hora';
      escalation = 'Médico assistente + Enfermeiro sênior';
    } else {
      clinicalRisk = 'Alto';
      clinicalResponse = 'EMERGÊNCIA CLÍNICA. Ativar Time de Resposta Rápida (TRR) ou equipe de emergência. Transferência para unidade de cuidados intensivos/semi-intensivos.';
      monitoringFrequency = 'Monitorização contínua';
      escalation = 'TRR / Equipe de emergência / UTI';
    }

    this.logger.log(`NEWS2 calculated: score=${totalScore} risk=${clinicalRisk}`);

    return {
      totalScore,
      parameters,
      clinicalRisk,
      clinicalResponse,
      monitoringFrequency,
      escalation,
      hasExtremeScore,
      reference: 'Royal College of Physicians. National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. London: RCP, 2017.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ICU SCORES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Glasgow Coma Scale (GCS) — Teasdale & Jennett 1974.
   * Eye (1-4), Verbal (1-5), Motor (1-6). Total: 3-15.
   */
  calculateGlasgow(dto: CalculateGlasgowDto): GlasgowResult {
    const total = dto.eye + dto.verbal + dto.motor;

    let severity: string;
    let recommendation: string;

    if (total <= 8) {
      severity = 'Grave (TCE grave / Coma)';
      recommendation = 'GCS ≤ 8: Proteger via aérea (intubação orotraqueal). Avaliar pupilas. TC de crânio urgente. Monitorização em UTI. Consultar neurocirurgia.';
    } else if (total <= 12) {
      severity = 'Moderado';
      recommendation = 'GCS 9-12: Monitorização neurológica frequente (a cada 1h). TC de crânio. Observação em unidade semi-intensiva ou UTI.';
    } else if (total <= 14) {
      severity = 'Leve';
      recommendation = 'GCS 13-14: Observação neurológica por 24h. TC de crânio se indicado (mecanismo de trauma, uso de anticoagulantes, idade > 65).';
    } else {
      severity = 'Normal';
      recommendation = 'GCS 15: Nível de consciência preservado. Monitorização de rotina.';
    }

    return {
      eye: dto.eye,
      verbal: dto.verbal,
      motor: dto.motor,
      total,
      severity,
      intubated: dto.intubated ?? false,
      recommendation,
      reference: 'Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet 1974;2(7872):81-84.',
    };
  }

  /**
   * RASS — Richmond Agitation-Sedation Scale.
   * -5 (unarousable) to +4 (combative). Target usually -2 to 0.
   *
   * Reference: Sessler CN et al. Am J Respir Crit Care Med 2002;166:1338-1344
   */
  calculateRASS(dto: CalculateRASSDto): RASSResult {
    const descriptions: Record<number, string> = {
      [-5]: 'Irresponsivo — sem resposta a voz ou estímulo físico',
      [-4]: 'Sedação profunda — sem resposta a voz, mas com movimento a estímulo físico',
      [-3]: 'Sedação moderada — movimento ou abertura ocular a voz (sem contato visual)',
      [-2]: 'Sedação leve — despertar breve com contato visual a voz (<10s)',
      [-1]: 'Sonolento — não totalmente alerta, mas despertar sustentado a voz (>10s)',
      [0]: 'Alerta e calmo',
      [1]: 'Inquieto — movimentos frequentes, não agressivos',
      [2]: 'Agitado — movimentos frequentes sem propósito, briga com ventilador',
      [3]: 'Muito agitado — puxa ou remove tubos/cateteres, agressivo',
      [4]: 'Combativo — claramente combativo, perigo para equipe',
    };

    const description = descriptions[dto.score] ?? `RASS ${dto.score}`;
    const targetRass = dto.targetRass ?? -2;
    const atTarget = dto.score >= targetRass && dto.score <= 0;
    const targetRange = `${targetRass} a 0`;

    let category: string;
    if (dto.score >= 1) category = 'Agitação';
    else if (dto.score >= -2) category = 'Sedação leve / Alerta';
    else category = 'Sedação profunda';

    let recommendation: string;
    if (dto.score >= 3) {
      recommendation = 'Agitação grave. Avaliar causas tratáveis (dor, delirium, hipóxia, retenção urinária). Considerar bolus de sedativo. Garantir segurança.';
    } else if (dto.score >= 1) {
      recommendation = 'Agitação leve-moderada. Avaliar CAM-ICU para delirium. Medidas não farmacológicas. Ajustar alvo de sedação.';
    } else if (atTarget) {
      recommendation = 'No alvo de sedação. Manter protocolo atual. Reavaliar a cada 4h. Considerar despertar diário (SAT).';
    } else if (dto.score <= -3) {
      recommendation = 'Sedação excessiva. Considerar redução/suspensão de sedativo. Avaliar causa neurológica se despertar não ocorrer após 30 min sem sedação.';
    } else {
      recommendation = 'Sedação leve abaixo do alvo. Ajustar infusão conforme protocolo.';
    }

    return {
      score: dto.score,
      description,
      targetRange,
      atTarget,
      category,
      recommendation,
      reference: 'Sessler CN et al. The Richmond Agitation-Sedation Scale. Am J Respir Crit Care Med 2002;166(10):1338-1344.',
    };
  }

  /**
   * CAM-ICU — Confusion Assessment Method for the ICU.
   * Gold standard for delirium screening in critical care.
   * Positive if Feature 1 + Feature 2 + (Feature 3 OR Feature 4).
   *
   * Reference: Ely EW et al. JAMA 2001;286(21):2703-2710
   */
  calculateCAMICU(dto: CalculateCAMICUDto): CAMICUResult {
    // Cannot assess if RASS ≤ -4 (too sedated)
    if (dto.currentRass <= -4) {
      return {
        deliriumPresent: false,
        feature1_acuteOnset: dto.acuteOnsetOrFluctuating,
        feature2_inattention: dto.inattention,
        feature3_alteredConsciousness: dto.alteredConsciousness,
        feature4_disorganizedThinking: dto.disorganizedThinking,
        algorithm: 'Não avaliável — RASS ≤ -4 (paciente muito sedado para avaliação de delirium)',
        recommendation: 'Paciente com RASS ≤ -4. Reduzir sedação e reavaliar CAM-ICU quando RASS ≥ -3.',
        reference: 'Ely EW et al. Delirium in mechanically ventilated patients. JAMA 2001;286(21):2703-2710.',
      };
    }

    // CAM-ICU algorithm:
    // Feature 1 (acute onset or fluctuating) AND Feature 2 (inattention)
    // AND (Feature 3 (altered LOC) OR Feature 4 (disorganized thinking))
    const deliriumPresent = dto.acuteOnsetOrFluctuating
      && dto.inattention
      && (dto.alteredConsciousness || dto.disorganizedThinking);

    let algorithm: string;
    if (!dto.acuteOnsetOrFluctuating) {
      algorithm = 'Feature 1 negativa (sem início agudo ou flutuação). CAM-ICU NEGATIVO.';
    } else if (!dto.inattention) {
      algorithm = 'Feature 1 positiva, Feature 2 negativa (atenção preservada). CAM-ICU NEGATIVO.';
    } else if (dto.alteredConsciousness) {
      algorithm = 'Features 1 + 2 + 3 positivas. CAM-ICU POSITIVO — DELIRIUM PRESENTE.';
    } else if (dto.disorganizedThinking) {
      algorithm = 'Features 1 + 2 + 4 positivas. CAM-ICU POSITIVO — DELIRIUM PRESENTE.';
    } else {
      algorithm = 'Features 1 + 2 positivas, mas Features 3 e 4 negativas. CAM-ICU NEGATIVO.';
    }

    let recommendation: string;
    if (deliriumPresent) {
      recommendation = 'DELIRIUM DETECTADO. 1) Identificar e tratar causas reversíveis (infecção, dor, desidratação, medicações, distúrbios metabólicos); 2) Medidas não farmacológicas (orientação, mobilização precoce, higiene do sono, retirada de contenção); 3) Evitar benzodiazepínicos; 4) Considerar haloperidol ou dexmedetomidina se agitação; 5) Reavaliar a cada 8h.';
    } else {
      recommendation = 'CAM-ICU negativo. Sem delirium no momento. Continuar rastreio a cada 8-12h. Manter medidas preventivas (mobilização, orientação, higiene do sono).';
    }

    this.logger.log(`CAM-ICU: delirium=${deliriumPresent}`);

    return {
      deliriumPresent,
      feature1_acuteOnset: dto.acuteOnsetOrFluctuating,
      feature2_inattention: dto.inattention,
      feature3_alteredConsciousness: dto.alteredConsciousness,
      feature4_disorganizedThinking: dto.disorganizedThinking,
      algorithm,
      recommendation,
      reference: 'Ely EW et al. Delirium in mechanically ventilated patients: validity and reliability of the Confusion Assessment Method for the ICU (CAM-ICU). JAMA 2001;286(21):2703-2710.',
    };
  }

  /**
   * Braden Scale — Pressure injury risk assessment.
   * 6 subscales, total 6-23 points. Lower = higher risk.
   *
   * Reference: Bergstrom N et al. Nurs Res 1987;36(4):205-210
   */
  calculateBraden(dto: CalculateBradenDto): BradenResult {
    const components = [
      { name: 'Percepção sensorial', score: dto.sensoryPerception, maxScore: 4 },
      { name: 'Umidade', score: dto.moisture, maxScore: 4 },
      { name: 'Atividade', score: dto.activity, maxScore: 4 },
      { name: 'Mobilidade', score: dto.mobility, maxScore: 4 },
      { name: 'Nutrição', score: dto.nutrition, maxScore: 4 },
      { name: 'Fricção e cisalhamento', score: dto.frictionShear, maxScore: 3 },
    ];

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    let riskLevel: string;
    let recommendation: string;
    const interventions: string[] = [];

    if (totalScore <= 9) {
      riskLevel = 'Risco muito alto';
      recommendation = 'Braden ≤ 9: RISCO MUITO ALTO de lesão por pressão.';
      interventions.push(
        'Mudança de decúbito a cada 2 horas (registrar posição)',
        'Colchão pneumático ou viscoelástico',
        'Avaliação nutricional — dieta hiperproteica e hipercalórica',
        'Proteção com placas de hidrocolóide em proeminências ósseas',
        'Hidratação da pele com AGE (ácidos graxos essenciais)',
        'Avaliação diária da integridade cutânea',
        'Mobilização precoce quando possível',
        'Elevação de calcâneos com coxins',
      );
    } else if (totalScore <= 12) {
      riskLevel = 'Risco alto';
      recommendation = 'Braden 10-12: RISCO ALTO de lesão por pressão.';
      interventions.push(
        'Mudança de decúbito a cada 2 horas',
        'Colchão especial (pneumático ou viscoelástico)',
        'Suplementação nutricional proteica',
        'Hidratação da pele',
        'Avaliação diária da pele',
        'Proteção de proeminências ósseas',
      );
    } else if (totalScore <= 14) {
      riskLevel = 'Risco moderado';
      recommendation = 'Braden 13-14: Risco moderado de lesão por pressão.';
      interventions.push(
        'Mudança de decúbito a cada 2-3 horas',
        'Hidratação da pele',
        'Avaliação nutricional',
        'Colchão adequado',
        'Inspeção regular da pele',
      );
    } else if (totalScore <= 18) {
      riskLevel = 'Risco leve';
      recommendation = 'Braden 15-18: Risco leve de lesão por pressão.';
      interventions.push(
        'Mudança de decúbito a cada 4 horas',
        'Manter hidratação da pele',
        'Dieta equilibrada',
        'Monitorar integridade cutânea',
      );
    } else {
      riskLevel = 'Sem risco significativo';
      recommendation = 'Braden > 18: Sem risco significativo. Manter cuidados preventivos de rotina.';
      interventions.push(
        'Cuidados preventivos de rotina',
        'Monitorização periódica',
      );
    }

    this.logger.log(`Braden score: ${totalScore} risk=${riskLevel}`);

    return {
      totalScore,
      components,
      riskLevel,
      recommendation,
      interventions,
      reference: 'Bergstrom N et al. The Braden Scale for predicting pressure sore risk. Nurs Res 1987;36(4):205-210.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. NURSING SCALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Morse Fall Scale — Fall risk assessment.
   * 6 items, total 0-125 points.
   *
   * Reference: Morse JM et al. Fall Prevention in the Elderly. Western J
   *            Nurs Res 1989;11(1):128-136.
   */
  calculateMorseFall(dto: CalculateMorseFallDto): MorseFallResult {
    const components = [
      { name: 'História de queda (últimos 3 meses)', value: dto.historyOfFalling ? 'Sim' : 'Não', score: dto.historyOfFalling ? 25 : 0 },
      { name: 'Diagnóstico secundário', value: dto.secondaryDiagnosis ? 'Sim' : 'Não', score: dto.secondaryDiagnosis ? 15 : 0 },
      { name: 'Auxílio para deambulação', value: dto.ambulatoryAid === 0 ? 'Nenhum/Acamado/Andador' : dto.ambulatoryAid === 15 ? 'Muleta/Bengala' : 'Apoia-se em móveis', score: dto.ambulatoryAid },
      { name: 'Terapia IV / Heparina lock', value: dto.ivTherapy ? 'Sim' : 'Não', score: dto.ivTherapy ? 20 : 0 },
      { name: 'Marcha', value: dto.gait === 0 ? 'Normal' : dto.gait === 10 ? 'Fraca' : 'Comprometida', score: dto.gait },
      { name: 'Estado mental', value: dto.mentalStatus === 0 ? 'Orientado' : 'Superestima capacidade', score: dto.mentalStatus },
    ];

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    let riskLevel: string;
    let recommendation: string;
    const interventions: string[] = [];

    if (totalScore <= 24) {
      riskLevel = 'Sem risco (0-24)';
      recommendation = 'Morse ≤ 24: Sem risco significativo de queda. Manter medidas universais de prevenção.';
      interventions.push(
        'Orientação ao paciente e família sobre prevenção de quedas',
        'Ambiente seguro (iluminação, piso seco)',
        'Calçado antiderrapante',
      );
    } else if (totalScore <= 44) {
      riskLevel = 'Baixo risco (25-44)';
      recommendation = 'Morse 25-44: Baixo risco de queda. Implementar medidas padrão de prevenção.';
      interventions.push(
        'Pulseira de identificação de risco (amarela)',
        'Grades laterais elevadas',
        'Campainha ao alcance',
        'Ambiente iluminado',
        'Orientação sobre limitações',
        'Calçado antiderrapante',
      );
    } else {
      riskLevel = 'Alto risco (≥ 45)';
      recommendation = 'Morse ≥ 45: ALTO RISCO DE QUEDA. Implementar protocolo intensivo de prevenção.';
      interventions.push(
        'Pulseira de identificação de risco (amarela)',
        'Placa de sinalização no leito',
        'Grades laterais SEMPRE elevadas',
        'Campainha ao alcance do paciente',
        'Acompanhamento contínuo (familiar ou profissional)',
        'Revisão de medicações (sedativos, anti-hipertensivos, opioides)',
        'Avaliação de calçado e vestimenta',
        'Auxiliar deambulação — NUNCA deixar deambular sozinho',
        'Alarme de leito se disponível',
        'Reavaliação Morse a cada turno',
        'Fisioterapia para fortalecimento e equilíbrio',
      );
    }

    this.logger.log(`Morse Fall Scale: score=${totalScore} risk=${riskLevel}`);

    return {
      totalScore,
      components,
      riskLevel,
      recommendation,
      interventions,
      reference: 'Morse JM et al. Development of a scale to identify the fall-prone patient. Can J Aging 1989;8(4):366-377.',
    };
  }

  /**
   * Waterlow Pressure Ulcer Risk Assessment.
   * Total score determines risk level.
   *
   * Reference: Waterlow J. Pressure sores: a risk assessment card.
   *            Nurs Times 1985;81(48):49-55.
   */
  calculateWaterlow(dto: CalculateWaterlowDto): WaterlowResult {
    const components = [
      { category: 'IMC/Constituição', value: ['Média', 'Acima da média', 'Obeso', 'Abaixo da média'][dto.buildBMI], score: dto.buildBMI },
      { category: 'Tipo de pele em áreas de risco', value: ['Saudável', 'Papel fino', 'Seca', 'Edemaciada/Úmida/Descorada'][dto.skinType], score: dto.skinType },
      { category: 'Sexo/Idade', value: `Score ${dto.sexAge}`, score: dto.sexAge },
      { category: 'Continência', value: ['Completa', 'Cateterizado', 'Incontinência ocasional', 'Dupla incontinência'][dto.continence], score: dto.continence },
      { category: 'Mobilidade', value: ['Total', 'Inquieto/Fidget', 'Apático', 'Restrito', 'Inerte/Tração', 'Cadeira de rodas'][dto.mobility], score: dto.mobility },
      { category: 'Apetite/Nutrição', value: ['Média', 'Pobre', 'Sonda NG', 'NPO/Fluidos'][dto.appetite], score: dto.appetite },
    ];

    // Special risks
    if (dto.neurologicalDeficit) {
      components.push({ category: 'Risco especial: Déficit neurológico', value: 'Sim', score: 4 });
    }
    if (dto.majorSurgeryTrauma) {
      components.push({ category: 'Risco especial: Cirurgia de grande porte/Trauma', value: 'Sim', score: 5 });
    }
    if (dto.medicationRisk) {
      components.push({ category: 'Risco especial: Medicações (esteroides, citotóxicos)', value: 'Sim', score: 4 });
    }

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    let riskLevel: string;
    let recommendation: string;
    const interventions: string[] = [];

    if (totalScore < 10) {
      riskLevel = 'Em risco (< 10)';
      recommendation = 'Waterlow < 10: Em risco. Implementar medidas preventivas básicas.';
      interventions.push(
        'Monitorizar integridade cutânea',
        'Hidratação adequada',
        'Nutrição balanceada',
      );
    } else if (totalScore <= 14) {
      riskLevel = 'Em risco (10-14)';
      recommendation = 'Waterlow 10-14: Em risco. Cuidados preventivos ativos.';
      interventions.push(
        'Mudança de decúbito a cada 3-4h',
        'Hidratação da pele com AGE',
        'Avaliação nutricional',
        'Colchão adequado',
        'Inspeção regular da pele',
      );
    } else if (totalScore <= 19) {
      riskLevel = 'Alto risco (15-19)';
      recommendation = 'Waterlow 15-19: ALTO RISCO de úlcera por pressão.';
      interventions.push(
        'Mudança de decúbito a cada 2h',
        'Colchão especial (pneumático/viscoelástico)',
        'Suplementação nutricional',
        'Proteção de proeminências ósseas',
        'Hidratação intensiva da pele',
        'Avaliação diária pelo enfermeiro',
      );
    } else {
      riskLevel = 'Risco muito alto (≥ 20)';
      recommendation = 'Waterlow ≥ 20: RISCO MUITO ALTO de úlcera por pressão. Protocolo intensivo.';
      interventions.push(
        'Mudança de decúbito a cada 2h (registrar)',
        'Colchão pneumático de alternância de pressão',
        'Suporte nutricional especializado (nutricionista)',
        'Proteção com placas de hidrocolóide',
        'Elevação de calcâneos com coxins',
        'Hidratação intensiva com AGE',
        'Avaliação diária de integridade cutânea',
        'Documentação fotográfica de áreas de risco',
        'Avaliar necessidade de suporte especializado de feridas',
      );
    }

    this.logger.log(`Waterlow score: ${totalScore} risk=${riskLevel}`);

    return {
      totalScore,
      components,
      riskLevel,
      recommendation,
      interventions,
      reference: 'Waterlow J. Pressure sores: a risk assessment card. Nurs Times 1985;81(48):49-55.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE — Save protocol results to clinical documents
  // ═══════════════════════════════════════════════════════════════════════════

  async saveProtocolResult(
    tenantId: string,
    authorId: string,
    patientId: string,
    protocolType: string,
    title: string,
    result: Record<string, unknown>,
    encounterId?: string,
  ) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId,
        encounterId: encounterId ?? null,
        type: 'CUSTOM',
        title: `[PROTOCOL:${protocolType}] ${title}`,
        content: JSON.stringify({
          ...result,
          calculatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });
  }
}
