import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApacheIIDto,
  Saps3Dto,
  SofaScoreDto,
  Tiss28Dto,
  VasoactiveDrugDto,
  VasoactiveDrugEnum,
  SedationProtocolDto,
} from './dto/icu-scores.dto';

// ─── APACHE II scoring ────────────────────────────────────────────────────────

function scoreApacheAPS(dto: ApacheIIDto): number {
  let aps = 0;

  // Temperature
  if (dto.temperature >= 41) aps += 4;
  else if (dto.temperature >= 39) aps += 3;
  else if (dto.temperature >= 38.5) aps += 1;
  else if (dto.temperature >= 36) aps += 0;
  else if (dto.temperature >= 34) aps += 1;
  else if (dto.temperature >= 32) aps += 2;
  else if (dto.temperature >= 30) aps += 3;
  else aps += 4;

  // MAP
  if (dto.meanArterialPressure >= 160) aps += 4;
  else if (dto.meanArterialPressure >= 130) aps += 3;
  else if (dto.meanArterialPressure >= 110) aps += 2;
  else if (dto.meanArterialPressure >= 70) aps += 0;
  else if (dto.meanArterialPressure >= 50) aps += 2;
  else aps += 4;

  // Heart rate
  if (dto.heartRate >= 180) aps += 4;
  else if (dto.heartRate >= 140) aps += 3;
  else if (dto.heartRate >= 110) aps += 2;
  else if (dto.heartRate >= 70) aps += 0;
  else if (dto.heartRate >= 55) aps += 2;
  else if (dto.heartRate >= 40) aps += 3;
  else aps += 4;

  // Respiratory rate
  if (dto.respiratoryRate >= 50) aps += 4;
  else if (dto.respiratoryRate >= 35) aps += 3;
  else if (dto.respiratoryRate >= 25) aps += 1;
  else if (dto.respiratoryRate >= 12) aps += 0;
  else if (dto.respiratoryRate >= 10) aps += 1;
  else if (dto.respiratoryRate >= 6) aps += 2;
  else aps += 4;

  // Oxygenation
  if (dto.fio2 >= 50) {
    const gradient = dto.aaGradient ?? 0;
    if (gradient >= 500) aps += 4;
    else if (gradient >= 350) aps += 3;
    else if (gradient >= 200) aps += 2;
    else aps += 0;
  } else {
    if (dto.pao2 > 70) aps += 0;
    else if (dto.pao2 >= 61) aps += 1;
    else if (dto.pao2 >= 55) aps += 3;
    else aps += 4;
  }

  // pH
  if (dto.arterialPh >= 7.7) aps += 4;
  else if (dto.arterialPh >= 7.6) aps += 3;
  else if (dto.arterialPh >= 7.5) aps += 1;
  else if (dto.arterialPh >= 7.33) aps += 0;
  else if (dto.arterialPh >= 7.25) aps += 2;
  else if (dto.arterialPh >= 7.15) aps += 3;
  else aps += 4;

  // Sodium
  if (dto.sodium >= 180) aps += 4;
  else if (dto.sodium >= 160) aps += 3;
  else if (dto.sodium >= 155) aps += 2;
  else if (dto.sodium >= 150) aps += 1;
  else if (dto.sodium >= 130) aps += 0;
  else if (dto.sodium >= 120) aps += 2;
  else if (dto.sodium >= 111) aps += 3;
  else aps += 4;

  // Potassium
  if (dto.potassium >= 7) aps += 4;
  else if (dto.potassium >= 6) aps += 3;
  else if (dto.potassium >= 5.5) aps += 1;
  else if (dto.potassium >= 3.5) aps += 0;
  else if (dto.potassium >= 3) aps += 1;
  else if (dto.potassium >= 2.5) aps += 2;
  else aps += 4;

  // Creatinine
  let creatScore = 0;
  if (dto.creatinine >= 3.5) creatScore = 4;
  else if (dto.creatinine >= 2) creatScore = 3;
  else if (dto.creatinine >= 1.5) creatScore = 2;
  else if (dto.creatinine >= 0.6) creatScore = 0;
  else creatScore = 2;
  aps += dto.acuteRenalFailure ? creatScore * 2 : creatScore;

  // Hematocrit
  if (dto.hematocrit >= 60) aps += 4;
  else if (dto.hematocrit >= 50) aps += 2;
  else if (dto.hematocrit >= 46) aps += 1;
  else if (dto.hematocrit >= 30) aps += 0;
  else if (dto.hematocrit >= 20) aps += 2;
  else aps += 4;

  // WBC
  if (dto.wbc >= 40) aps += 4;
  else if (dto.wbc >= 20) aps += 2;
  else if (dto.wbc >= 15) aps += 1;
  else if (dto.wbc >= 3) aps += 0;
  else if (dto.wbc >= 1) aps += 2;
  else aps += 4;

  // GCS (15 - actual GCS)
  aps += 15 - dto.gcs;

  return aps;
}

function scoreApacheAge(age: number): number {
  if (age >= 75) return 6;
  if (age >= 65) return 5;
  if (age >= 55) return 3;
  if (age >= 45) return 2;
  return 0;
}

function apacheMortality(score: number): number {
  const logit = -3.517 + 0.146 * score;
  return parseFloat((100 / (1 + Math.exp(-logit))).toFixed(1));
}

// ─── SOFA scoring ─────────────────────────────────────────────────────────────

function scoreSofa(dto: SofaScoreDto): number {
  let sofa = 0;

  if (dto.pfRatio < 100 && dto.onVentilator) sofa += 4;
  else if (dto.pfRatio < 200 && dto.onVentilator) sofa += 3;
  else if (dto.pfRatio < 300) sofa += 2;
  else if (dto.pfRatio < 400) sofa += 1;

  if (dto.platelets < 20) sofa += 4;
  else if (dto.platelets < 50) sofa += 3;
  else if (dto.platelets < 100) sofa += 2;
  else if (dto.platelets < 150) sofa += 1;

  if (dto.bilirubin >= 12) sofa += 4;
  else if (dto.bilirubin >= 6) sofa += 3;
  else if (dto.bilirubin >= 2) sofa += 2;
  else if (dto.bilirubin >= 1.2) sofa += 1;

  if (dto.gcs < 6) sofa += 4;
  else if (dto.gcs < 10) sofa += 3;
  else if (dto.gcs < 13) sofa += 2;
  else if (dto.gcs < 15) sofa += 1;

  const norepi = dto.norepinephrineDose ?? 0;
  const epi = dto.epinephrineDose ?? 0;
  const dopa = dto.dopamineDose ?? 0;
  if (norepi > 0.1 || epi > 0.1) sofa += 4;
  else if (norepi > 0 || epi > 0) sofa += 3;
  else if (dopa > 5 || dto.dobutamineUse) sofa += 2;
  else if (dopa > 0) sofa += 1;
  else if (dto.map < 70) sofa += 1;

  if (dto.creatinine >= 5 || (dto.urineOutput !== undefined && dto.urineOutput < 200)) sofa += 4;
  else if (dto.creatinine >= 3.5 || (dto.urineOutput !== undefined && dto.urineOutput < 500)) sofa += 3;
  else if (dto.creatinine >= 2) sofa += 2;
  else if (dto.creatinine >= 1.2) sofa += 1;

  return sofa;
}

// ─── TISS-28 scoring ──────────────────────────────────────────────────────────

function scoreTiss28(dto: Tiss28Dto): number {
  const weights: Array<[boolean, number]> = [
    [dto.monitoringStandardVitals, 2],
    [dto.laboratoryInvestigations, 1],
    [dto.singleMedication, 1],
    [dto.intravenousMedications, 3],
    [dto.routineHygiene, 4],
    [dto.woundCare, 1],
    [dto.drainsManagement, 3],
    [dto.mechanicalVentilation, 5],
    [dto.weaning, 2],
    [dto.noninvasiveVentilation, 2],
    [dto.supplementalO2, 1],
    [dto.singleVasoactiveAgent, 3],
    [dto.multipleVasoactiveAgents, 4],
    [dto.iabp, 8],
    [dto.pacingCatheter, 3],
    [dto.hemofiltration, 3],
    [dto.arterialLine, 5],
    [dto.pulmonaryArteryCatheter, 8],
    [dto.cvp, 2],
    [dto.cpr, 8],
    [dto.renalReplacement, 3],
    [dto.icpMonitoring, 4],
    [dto.acidosisAlkalosisManagement, 4],
    [dto.parenteralNutrition, 3],
    [dto.enteralNutrition, 2],
    [dto.specificInterventionsInICU, 5],
    [dto.specificInterventionsOutsideICU, 7],
  ];
  return weights.reduce((acc, [flag, w]) => acc + (flag ? w : 0), 0);
}

// ─── Vasoactive drug ranges ───────────────────────────────────────────────────

const DRUG_DOSE_RANGES: Record<VasoactiveDrugEnum, { minMcgKgMin: number; maxMcgKgMin: number; unit: string }> = {
  [VasoactiveDrugEnum.NOREPINEPHRINE]: { minMcgKgMin: 0.01, maxMcgKgMin: 3.0,  unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.DOBUTAMINE]:     { minMcgKgMin: 2.5,  maxMcgKgMin: 20.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.DOPAMINE]:       { minMcgKgMin: 2.0,  maxMcgKgMin: 20.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.NITROPRUSSIDE]:  { minMcgKgMin: 0.3,  maxMcgKgMin: 10.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.EPINEPHRINE]:    { minMcgKgMin: 0.01, maxMcgKgMin: 1.0,  unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.VASOPRESSIN]:    { minMcgKgMin: 0.01, maxMcgKgMin: 0.04, unit: 'units/min'   },
  [VasoactiveDrugEnum.MILRINONE]:      { minMcgKgMin: 0.375,maxMcgKgMin: 0.75, unit: 'mcg/kg/min' },
  [VasoactiveDrugEnum.PHENYLEPHRINE]:  { minMcgKgMin: 0.5,  maxMcgKgMin: 5.0,  unit: 'mcg/kg/min' },
};

@Injectable()
export class IcuScoresService {
  private readonly logger = new Logger(IcuScoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── APACHE II ──────────────────────────────────────────────────────────────

  async calculateApacheII(tenantId: string, authorId: string, dto: ApacheIIDto) {
    this.logger.log(`APACHE II calc patient=${dto.patientId}`);
    const apsScore = scoreApacheAPS(dto);
    const agePoints = scoreApacheAge(dto.age);
    const totalScore = apsScore + agePoints + dto.chronicHealthPoints;
    const estimatedMortality = apacheMortality(totalScore);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:APACHE_II] APACHE II Score — ${totalScore} pts (${estimatedMortality}% mortalidade)`,
        content: JSON.stringify({ apsScore, agePoints, chronicHealthPoints: dto.chronicHealthPoints, totalScore, estimatedMortality }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      apsScore,
      agePoints,
      chronicHealthPoints: dto.chronicHealthPoints,
      totalScore,
      estimatedMortality,
      interpretation: totalScore >= 25 ? 'Alto risco (>25)' : totalScore >= 15 ? 'Risco moderado (15-24)' : 'Baixo risco (<15)',
    };
  }

  // ─── SAPS 3 ─────────────────────────────────────────────────────────────────

  async calculateSaps3(tenantId: string, authorId: string, dto: Saps3Dto) {
    this.logger.log(`SAPS 3 calc patient=${dto.patientId}`);

    let ageScore = 0;
    if (dto.age >= 80) ageScore = 18;
    else if (dto.age >= 75) ageScore = 15;
    else if (dto.age >= 70) ageScore = 13;
    else if (dto.age >= 60) ageScore = 9;
    else if (dto.age >= 40) ageScore = 5;

    let gcsScore = 0;
    if (dto.gcs <= 5) gcsScore = 15;
    else if (dto.gcs <= 7) gcsScore = 12;
    else if (dto.gcs <= 11) gcsScore = 6;
    else if (dto.gcs <= 14) gcsScore = 4;

    let bilirubinScore = 0;
    if (dto.bilirubin >= 6) bilirubinScore = 5;
    else if (dto.bilirubin >= 4) bilirubinScore = 4;
    else if (dto.bilirubin >= 2) bilirubinScore = 2;

    let tempScore = 0;
    if (dto.temperature < 35) tempScore = 4;
    else if (dto.temperature >= 39.9) tempScore = 3;

    let creatScore = 0;
    if (dto.creatinine >= 3.5) creatScore = 8;
    else if (dto.creatinine >= 2) creatScore = 5;
    else if (dto.creatinine >= 1.2) creatScore = 2;

    let hrScore = 0;
    if (dto.heartRate >= 160) hrScore = 5;
    else if (dto.heartRate >= 120) hrScore = 3;
    else if (dto.heartRate < 40) hrScore = 11;

    let sbpScore = 0;
    if (dto.systolicBP < 40) sbpScore = 13;
    else if (dto.systolicBP < 70) sbpScore = 7;
    else if (dto.systolicBP < 90) sbpScore = 4;

    let pfScore = 0;
    if (dto.pfRatio < 100) pfScore = 11;
    else if (dto.pfRatio < 200) pfScore = 7;
    else if (dto.pfRatio < 300) pfScore = 5;

    let wbcScore = 0;
    if (dto.wbc >= 15) wbcScore = 3;
    else if (dto.wbc < 1) wbcScore = 3;

    let plateletsScore = 0;
    if (dto.platelets < 50) plateletsScore = 4;
    else if (dto.platelets < 100) plateletsScore = 2;

    const phScore = dto.ph < 7.25 ? 3 : 0;

    const totalScore =
      ageScore + dto.comorbiditiesScore + (dto.priorHospitalization ? 5 : 0) +
      dto.admissionReasonScore + dto.surgeryScore + gcsScore + bilirubinScore +
      tempScore + creatScore + hrScore + sbpScore + pfScore + wbcScore +
      plateletsScore + phScore + (dto.vasopressorUse ? 8 : 0);

    const logit = -32.6659 + Math.log(totalScore + 20.5958) * 7.3068;
    const estimatedMortality = parseFloat((100 / (1 + Math.exp(-logit))).toFixed(1));

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:SAPS3] SAPS 3 Score — ${totalScore} pts (${estimatedMortality}% mortalidade)`,
        content: JSON.stringify({ totalScore, estimatedMortality }),
        status: 'FINAL',
      },
    });

    return { id: doc.id, totalScore, estimatedMortality };
  }

  // ─── SOFA ───────────────────────────────────────────────────────────────────

  async calculateSofa(tenantId: string, authorId: string, dto: SofaScoreDto) {
    this.logger.log(`SOFA calc patient=${dto.patientId}`);
    const totalScore = scoreSofa(dto);

    const mortalityMap: Record<string, string> = {
      low: '< 10%',
      moderate: '15-20%',
      high: '40-50%',
      very_high: '> 80%',
    };
    const severity =
      totalScore < 6 ? 'low' : totalScore < 10 ? 'moderate' : totalScore < 14 ? 'high' : 'very_high';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:SOFA] SOFA Score — ${totalScore} pts`,
        content: JSON.stringify({ totalScore, severity, estimatedMortality: mortalityMap[severity] }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      severity,
      estimatedMortality: mortalityMap[severity],
      organDysfunction: totalScore >= 2 ? 'Disfunção orgânica presente (critério Sepsis-3)' : 'Sem disfunção orgânica significativa',
    };
  }

  // ─── TISS-28 ────────────────────────────────────────────────────────────────

  async calculateTiss28(tenantId: string, authorId: string, dto: Tiss28Dto) {
    this.logger.log(`TISS-28 calc patient=${dto.patientId}`);
    const totalScore = scoreTiss28(dto);
    const nursingWorkload = parseFloat((totalScore / 46.8).toFixed(2));

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:TISS28] TISS-28 Score — ${totalScore} pts`,
        content: JSON.stringify({ totalScore, nursingWorkload }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      nursingWorkload,
      interpretation:
        totalScore >= 40 ? 'Alta complexidade assistencial' : totalScore >= 20 ? 'Complexidade moderada' : 'Baixa complexidade',
    };
  }

  // ─── Vasoactive drug calculator ─────────────────────────────────────────────

  calculateVasoactiveDrug(dto: VasoactiveDrugDto) {
    this.logger.log(`Vasoactive calc drug=${dto.drug} weight=${dto.weight}kg`);

    let resultDose: number | null = null;
    let resultPumpRate: number | null = null;

    if (dto.desiredDoseMcgKgMin !== undefined) {
      resultPumpRate = parseFloat(
        ((dto.desiredDoseMcgKgMin * dto.weight * 60) / dto.concentration).toFixed(2),
      );
      resultDose = dto.desiredDoseMcgKgMin;
    } else if (dto.pumpRateMlH !== undefined) {
      resultDose = parseFloat(
        ((dto.pumpRateMlH * dto.concentration) / (dto.weight * 60)).toFixed(4),
      );
      resultPumpRate = dto.pumpRateMlH;
    }

    const range = DRUG_DOSE_RANGES[dto.drug];
    const withinRange =
      resultDose !== null ? resultDose >= range.minMcgKgMin && resultDose <= range.maxMcgKgMin : null;

    return {
      drug: dto.drug,
      weight: dto.weight,
      concentration: dto.concentration,
      dilutionVolume: dto.dilutionVolume,
      calculatedDoseMcgKgMin: resultDose,
      calculatedPumpRateMlH: resultPumpRate,
      therapeuticRange: range,
      withinTherapeuticRange: withinRange,
      warning: withinRange === false
        ? `Dose fora da faixa terapêutica (${range.minMcgKgMin}–${range.maxMcgKgMin} ${range.unit})`
        : null,
    };
  }

  // ─── Sedation Protocol ──────────────────────────────────────────────────────

  async recordSedationProtocol(tenantId: string, authorId: string, dto: SedationProtocolDto) {
    this.logger.log(`Sedation protocol patient=${dto.patientId} drug=${dto.drug} RASS=${dto.currentRass}`);

    const atTarget = dto.currentRass === dto.targetRass;
    const titrationDirection = dto.currentRass > dto.targetRass ? 'increase' : 'decrease';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:SEDATION] Protocolo de Sedação — ${dto.drug} | RASS ${dto.currentRass}→${dto.targetRass}`,
        content: JSON.stringify({ ...dto, atTarget, titrationDirection }),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      drug: dto.drug,
      dose: dto.dose,
      targetRass: dto.targetRass,
      currentRass: dto.currentRass,
      atTarget,
      recommendation: atTarget
        ? 'Sedação no nível alvo — manter dose atual'
        : `Sedação fora do alvo — ${titrationDirection === 'increase' ? 'aumentar' : 'diminuir'} dose`,
      dailyAwakening: dto.dailyAwakening,
      satResult: dto.satResult,
      bpsScore: dto.bpsScore,
      cpotScore: dto.cpotScore,
      createdAt: doc.createdAt,
    };
  }
}
