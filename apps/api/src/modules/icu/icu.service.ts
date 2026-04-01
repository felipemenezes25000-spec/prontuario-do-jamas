import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CalculateApacheIIDto,
  CalculateSofaDto,
  CalculateSaps3Dto,
  CalculateTiss28Dto,
  VasoactiveDrugCalculatorDto,
  CreateSedationAssessmentDto,
  CreateVentilationRecordDto,
  CreateDialysisPrescriptionDto,
  CreateInvasiveDeviceDto,
  UpdateDeviceBundleChecklistDto,
  CreateBundleChecklistDto,
  CreateProneSessionDto,
  CreateDailyGoalsDto,
  CreateEcmoRecordDto,
  CreateEnteralNutritionDto,
  VASOACTIVE_DRUG_RANGES,
  BundleTypeEnum,
  CVC_BUNDLE_ITEMS,
  VAP_BUNDLE_ITEMS,
  CAUTI_BUNDLE_ITEMS,
  WeaningAssessmentResult,
  WeaningCriteria,
} from './dto/icu.dto';
import {
  CreateHypothermiaSessionDto,
  PredictSepsisDto,
  PredictExtubationDto,
  SuggestVasopressorTitrationDto,
  HypothermiaPhase,
} from './dto/icu-advanced.dto';
import {
  CreateRassAssessmentDto,
  CreateCamIcuDto,
  RecordBisDto,
} from './dto/icu-assessments.dto';

@Injectable()
export class IcuService {
  private readonly logger = new Logger(IcuService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── APACHE II Score ────────────────────────────────────────────────────

  async calculateApacheII(tenantId: string, authorId: string, dto: CalculateApacheIIDto) {
    const apsScore = this.computeAPS(dto);
    const agePoints = this.computeAgePoints(dto.age);
    const totalScore = apsScore + agePoints + dto.chronicHealthPoints;
    const estimatedMortality = this.apacheIIMortality(totalScore);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:APACHE_II] APACHE II Score',
        content: JSON.stringify({
          scoreType: 'APACHE_II',
          apsScore,
          agePoints,
          chronicHealthPoints: dto.chronicHealthPoints,
          totalScore,
          estimatedMortality,
          parameters: {
            temperature: dto.temperature,
            meanArterialPressure: dto.meanArterialPressure,
            heartRate: dto.heartRate,
            respiratoryRate: dto.respiratoryRate,
            fio2: dto.fio2,
            pao2: dto.pao2,
            arterialPh: dto.arterialPh,
            sodium: dto.sodium,
            potassium: dto.potassium,
            creatinine: dto.creatinine,
            hematocrit: dto.hematocrit,
            wbc: dto.wbc,
            gcs: dto.gcs,
            age: dto.age,
          },
          calculatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      apsScore,
      agePoints,
      chronicHealthPoints: dto.chronicHealthPoints,
      estimatedMortality,
      createdAt: doc.createdAt,
    };
  }

  private computeAPS(dto: CalculateApacheIIDto): number {
    let score = 0;
    // Temperature
    const t = dto.temperature;
    if (t >= 41 || t <= 29.9) score += 4;
    else if (t >= 39 || t <= 31.9) score += 3;
    else if (t <= 33.9) score += 2;
    else if (t >= 38.5 || t <= 35.9) score += 1;

    // MAP
    const map = dto.meanArterialPressure;
    if (map >= 160 || map <= 49) score += 4;
    else if (map >= 130 || map <= 59) score += 3;
    else if (map >= 110) score += 2;
    else if (map <= 69) score += 2;

    // Heart Rate
    const hr = dto.heartRate;
    if (hr >= 180 || hr <= 39) score += 4;
    else if (hr >= 140 || hr <= 54) score += 3;
    else if (hr >= 110 || hr <= 69) score += 2;

    // Respiratory Rate
    const rr = dto.respiratoryRate;
    if (rr >= 50 || rr <= 5) score += 4;
    else if (rr >= 35) score += 3;
    else if (rr <= 9) score += 2;
    else if (rr >= 25 || rr <= 11) score += 1;

    // Oxygenation (A-a gradient or PaO2)
    if (dto.fio2 >= 50) {
      const aaGradient = (dto.fio2 / 100) * 713 - dto.pao2 / 0.8 - dto.pao2;
      if (aaGradient >= 500) score += 4;
      else if (aaGradient >= 350) score += 3;
      else if (aaGradient >= 200) score += 2;
    } else {
      if (dto.pao2 <= 55) score += 4;
      else if (dto.pao2 <= 60) score += 3;
      else if (dto.pao2 <= 70) score += 1;
    }

    // Arterial pH
    const ph = dto.arterialPh;
    if (ph >= 7.7 || ph < 7.15) score += 4;
    else if (ph >= 7.6 || ph < 7.25) score += 3;
    else if (ph < 7.33) score += 2;
    else if (ph >= 7.5) score += 1;

    // Sodium
    const na = dto.sodium;
    if (na >= 180 || na <= 110) score += 4;
    else if (na >= 160 || na <= 119) score += 3;
    else if (na >= 155 || na <= 129) score += 2;
    else if (na >= 150) score += 1;

    // Potassium
    const k = dto.potassium;
    if (k >= 7 || k < 2.5) score += 4;
    else if (k >= 6) score += 3;
    else if (k < 3) score += 2;
    else if (k >= 5.5 || k < 3.5) score += 1;

    // Creatinine
    const cr = dto.creatinine;
    const crMult = dto.acuteRenalFailure ? 2 : 1;
    if (cr >= 3.5) score += 4 * crMult;
    else if (cr >= 2) score += 3 * crMult;
    else if (cr >= 1.5 || cr < 0.6) score += 2 * crMult;

    // Hematocrit
    const hct = dto.hematocrit;
    if (hct >= 60 || hct < 20) score += 4;
    else if (hct >= 50 || hct < 30) score += 2;
    else if (hct >= 46) score += 1;

    // WBC
    const wbc = dto.wbc;
    if (wbc >= 40 || wbc < 1) score += 4;
    else if (wbc >= 20 || wbc < 3) score += 2;
    else if (wbc >= 15) score += 1;

    // GCS
    score += (15 - dto.gcs);

    return score;
  }

  private computeAgePoints(age: number): number {
    if (age <= 44) return 0;
    if (age <= 54) return 2;
    if (age <= 64) return 3;
    if (age <= 74) return 5;
    return 6;
  }

  private apacheIIMortality(score: number): number {
    // Approximate logistic regression mortality estimation
    const ln = -3.517 + score * 0.146;
    return Math.round((Math.exp(ln) / (1 + Math.exp(ln))) * 100 * 10) / 10;
  }

  // ─── SOFA Score ─────────────────────────────────────────────────────────

  async calculateSofa(tenantId: string, authorId: string, dto: CalculateSofaDto) {
    const respiration = this.sofaRespiration(dto.pao2fio2, dto.mechanicalVentilation);
    const coagulation = this.sofaCoagulation(dto.platelets);
    const liver = this.sofaLiver(dto.bilirubin);
    const cardiovascular = this.sofaCardiovascular(dto);
    const cns = this.sofaCns(dto.gcs);
    const renal = this.sofaRenal(dto.creatinine, dto.urineOutput);
    const totalScore = respiration + coagulation + liver + cardiovascular + cns + renal;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:SOFA] SOFA Score',
        content: JSON.stringify({
          scoreType: 'SOFA',
          totalScore,
          components: { respiration, coagulation, liver, cardiovascular, cns, renal },
          parameters: dto,
          calculatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      components: { respiration, coagulation, liver, cardiovascular, cns, renal },
      createdAt: doc.createdAt,
    };
  }

  /**
   * SOFA respiratory component.
   * Scores 3 and 4 require mechanical ventilation per SOFA definition.
   */
  private sofaRespiration(pf: number, onMV?: boolean): number {
    if (pf < 100 && onMV) return 4;
    if (pf < 200 && onMV) return 3;
    if (pf < 200) return 2; // <200 without MV treated as 2
    if (pf < 300) return 2;
    if (pf < 400) return 1;
    return 0;
  }

  private sofaCoagulation(platelets: number): number {
    if (platelets < 20) return 4;
    if (platelets < 50) return 3;
    if (platelets < 100) return 2;
    if (platelets < 150) return 1;
    return 0;
  }

  private sofaLiver(bilirubin: number): number {
    if (bilirubin >= 12) return 4;
    if (bilirubin >= 6) return 3;
    if (bilirubin >= 2) return 2;
    if (bilirubin >= 1.2) return 1;
    return 0;
  }

  private sofaCardiovascular(dto: CalculateSofaDto): number {
    if ((dto.epinephrineDose ?? 0) > 0.1 || (dto.norepinephrineDose ?? 0) > 0.1) return 4;
    if ((dto.epinephrineDose ?? 0) > 0 || (dto.norepinephrineDose ?? 0) > 0) return 3;
    if ((dto.dopamineDose ?? 0) > 0 || (dto.dobutamineDose ?? 0) > 0) return 2;
    if (dto.cardiovascular < 70) return 1;
    return 0;
  }

  private sofaCns(gcs: number): number {
    if (gcs < 6) return 4;
    if (gcs < 10) return 3;
    if (gcs < 13) return 2;
    if (gcs < 15) return 1;
    return 0;
  }

  private sofaRenal(creatinine: number, urineOutput?: number): number {
    if (creatinine >= 5 || (urineOutput !== undefined && urineOutput < 200)) return 4;
    if (creatinine >= 3.5 || (urineOutput !== undefined && urineOutput < 500)) return 3;
    if (creatinine >= 2) return 2;
    if (creatinine >= 1.2) return 1;
    return 0;
  }

  // ─── SAPS 3 ─────────────────────────────────────────────────────────────

  async calculateSaps3(tenantId: string, authorId: string, dto: CalculateSaps3Dto) {
    let score = 0;

    // Age points
    if (dto.age < 40) score += 0;
    else if (dto.age < 60) score += 5;
    else if (dto.age < 70) score += 9;
    else if (dto.age < 75) score += 13;
    else if (dto.age < 80) score += 15;
    else score += 18;

    // Heart rate
    if (dto.heartRate < 40) score += 11;
    else if (dto.heartRate < 70) score += 2;
    else if (dto.heartRate < 120) score += 0;
    else if (dto.heartRate < 160) score += 4;
    else score += 7;

    // Systolic BP
    if (dto.systolicBp < 40) score += 11;
    else if (dto.systolicBp < 70) score += 8;
    else if (dto.systolicBp < 120) score += 3;
    else score += 0;

    // GCS
    if (dto.gcs < 6) score += 15;
    else if (dto.gcs < 9) score += 7;
    else if (dto.gcs < 11) score += 5;
    else if (dto.gcs < 14) score += 2;

    // Temperature
    if (dto.temperature < 35) score += 7;

    // Creatinine
    if (dto.creatinine >= 3.5) score += 8;
    else if (dto.creatinine >= 2) score += 5;

    // Bilirubin
    if (dto.bilirubin >= 6) score += 5;
    else if (dto.bilirubin >= 2) score += 3;

    // Platelets
    if (dto.platelets < 20) score += 13;
    else if (dto.platelets < 50) score += 8;
    else if (dto.platelets < 100) score += 5;

    // PaO2/FiO2
    if (dto.pao2fio2 < 100) score += 11;
    else if (dto.pao2fio2 < 200) score += 7;

    if (dto.mechanicalVentilation) score += 3;
    if (!dto.scheduledAdmission) score += 3;
    score += dto.comorbiditiesScore;

    const logit = -32.6659 + Math.log(score + 1) * 7.3068;
    const estimatedMortality = Math.round((Math.exp(logit) / (1 + Math.exp(logit))) * 100 * 10) / 10;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:SAPS_3] SAPS 3 Score',
        content: JSON.stringify({
          scoreType: 'SAPS_3',
          totalScore: score,
          estimatedMortality,
          parameters: dto,
          calculatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, totalScore: score, estimatedMortality, createdAt: doc.createdAt };
  }

  // ─── TISS-28 ────────────────────────────────────────────────────────────

  /**
   * TISS-28 calculation supporting both boolean fields (new) and legacy items[] (backward compat).
   *
   * Workload classification:
   * - Class I (< 10): Observation
   * - Class II (10-19): Prophylactic measures
   * - Class III (20-39): Intensive nursing/medical care
   * - Class IV (>= 40): Maximum intensive treatment
   *
   * 1 TISS point ~ 10.6 minutes of nursing time.
   */
  async calculateTiss28(tenantId: string, authorId: string, dto: CalculateTiss28Dto) {
    let totalScore: number;
    let components: Record<string, number> | undefined;

    // Use boolean fields if any are provided, otherwise fall back to legacy items[]
    if (dto.standardMonitoring !== undefined) {
      components = {};
      components.standardMonitoring = dto.standardMonitoring ? 5 : 0;
      components.labStudies = dto.labStudies ? 1 : 0;
      components.singleMedication = dto.singleMedication ? 2 : 0;
      components.multipleIVMedications = dto.multipleIVMedications ? 3 : 0;
      components.routineDressingChanges = dto.routineDressingChanges ? 1 : 0;
      components.frequentDressingChanges = dto.frequentDressingChanges ? 1 : 0;
      components.drainCare = dto.drainCare ? 3 : 0;
      components.mechanicalVentilation = dto.mechanicalVentilation ? 5 : 0;
      components.supplementaryVentCare = dto.supplementaryVentCare ? 2 : 0;
      components.artificialAirwayCare = dto.artificialAirwayCare ? 1 : 0;
      components.singleVasoactiveMed = dto.singleVasoactiveMed ? 3 : 0;
      components.multipleVasoactiveMeds = dto.multipleVasoactiveMeds ? 4 : 0;
      components.largeFluidReplacement = dto.largeFluidReplacement ? 4 : 0;
      components.peripheralArterialCatheter = dto.peripheralArterialCatheter ? 5 : 0;
      components.cvpMonitoring = dto.cvpMonitoring ? 2 : 0;
      components.pulmonaryArteryCatheter = dto.pulmonaryArteryCatheter ? 8 : 0;
      components.activeDiuresis = dto.activeDiuresis ? 3 : 0;
      components.renalReplacementTherapy = dto.renalReplacementTherapy ? 3 : 0;
      components.urineOutputMeasurement = dto.urineOutputMeasurement ? 2 : 0;
      components.icpMonitoring = dto.icpMonitoring ? 4 : 0;
      components.metabolicTreatment = dto.metabolicTreatment ? 4 : 0;
      components.ivHyperalimentation = dto.ivHyperalimentation ? 3 : 0;
      components.enteralFeeding = dto.enteralFeeding ? 2 : 0;
      components.singleSpecificIntervention = dto.singleSpecificIntervention ? 3 : 0;
      components.multipleSpecificInterventions = dto.multipleSpecificInterventions ? 5 : 0;
      components.interventionsOutsideICU = dto.interventionsOutsideICU ? 5 : 0;
      totalScore = Object.values(components).reduce((sum, v) => sum + v, 0);
    } else if (dto.items) {
      totalScore = dto.items.reduce((sum, val) => sum + val, 0);
    } else {
      totalScore = 0;
    }

    let workloadClass: string;
    if (totalScore < 10) workloadClass = 'CLASS_I';
    else if (totalScore < 20) workloadClass = 'CLASS_II';
    else if (totalScore < 40) workloadClass = 'CLASS_III';
    else workloadClass = 'CLASS_IV';

    const estimatedNursingMinutes = Math.round(totalScore * 10.6);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:TISS_28] TISS-28 Score',
        content: JSON.stringify({
          scoreType: 'TISS_28',
          totalScore,
          classification: workloadClass,
          components,
          items: dto.items,
          estimatedNursingMinutes,
          calculatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      totalScore,
      classification: workloadClass,
      components,
      estimatedNursingMinutes,
      createdAt: doc.createdAt,
    };
  }

  // ─── Vasoactive Drug Calculator ─────────────────────────────────────────

  /**
   * Bidirectional vasoactive drug dose calculator.
   *
   * Dose (mcg/kg/min) = (concentration_mg_per_mL * rate_mL_per_h * 1000) / (weight_kg * 60)
   * Rate (mL/h) = (dose_mcg_kg_min * weight_kg * 60) / (concentration_mg_per_mL * 1000)
   *
   * Provide targetDoseMcgKgMin to get required pump rate, OR
   * provide currentRateMlH to get current dose. Both can be provided.
   */
  calculateVasoactiveDrug(dto: VasoactiveDrugCalculatorDto) {
    let currentDoseMcgKgMin: number | null = null;
    let targetRateMlH: number | null = null;

    // Calculate current dose from pump rate
    if (dto.currentRateMlH !== undefined && dto.currentRateMlH > 0) {
      currentDoseMcgKgMin =
        (dto.concentrationMgMl * dto.currentRateMlH * 1000) / (dto.weightKg * 60);
      currentDoseMcgKgMin = Math.round(currentDoseMcgKgMin * 10000) / 10000;
    }

    // Calculate required pump rate from target dose
    if (dto.targetDoseMcgKgMin !== undefined && dto.targetDoseMcgKgMin > 0) {
      targetRateMlH =
        (dto.targetDoseMcgKgMin * dto.weightKg * 60) / (dto.concentrationMgMl * 1000);
      targetRateMlH = Math.round(targetRateMlH * 100) / 100;
    }

    // Legacy: if only targetDoseMcgKgMin provided without currentRateMlH, set pumpRateMlH for backward compat
    const effectiveDose = currentDoseMcgKgMin ?? dto.targetDoseMcgKgMin ?? 0;
    const drugRange = VASOACTIVE_DRUG_RANGES[dto.drug];
    const doseInRange = effectiveDose >= drugRange.min && effectiveDose <= drugRange.max;

    // Legacy fields for backward compatibility
    const dosePerMinute = (dto.targetDoseMcgKgMin ?? effectiveDose) * dto.weightKg;
    const dosePerHour = dosePerMinute * 60;
    const pumpRateMlH = targetRateMlH ?? (dosePerHour / 1000 / dto.concentrationMgMl);

    return {
      drug: dto.drug,
      weightKg: dto.weightKg,
      concentrationMgMl: dto.concentrationMgMl,
      targetDoseMcgKgMin: dto.targetDoseMcgKgMin,
      currentRateMlH: dto.currentRateMlH,
      // New bidirectional results
      calculatedDoseMcgKgMin: currentDoseMcgKgMin,
      calculatedRateMlH: targetRateMlH,
      doseInRange,
      recommendedRange: drugRange,
      targetMAP: dto.targetMAP,
      // Legacy results
      dosePerMinuteMcg: Math.round(dosePerMinute * 100) / 100,
      dosePerHourMcg: Math.round(dosePerHour * 100) / 100,
      pumpRateMlH: Math.round(pumpRateMlH * 100) / 100,
    };
  }

  // ─── Sedation Assessment ────────────────────────────────────────────────

  async createSedationAssessment(tenantId: string, authorId: string, dto: CreateSedationAssessmentDto) {
    const onTarget = dto.rass === dto.rassTarget;
    const rassDescription = this.rassDescription(dto.rass);
    const recommendations: string[] = [];

    // Sedation protocol recommendations
    if (dto.rass < dto.rassTarget) {
      const diff = dto.rassTarget - dto.rass;
      if (diff >= 2) {
        recommendations.push('Paciente significativamente mais sedado que o alvo. Considerar reducao de sedativos.');
      } else {
        recommendations.push('Paciente levemente mais sedado que o alvo. Avaliar reducao gradual.');
      }
    }

    if (dto.rass > dto.rassTarget) {
      if (dto.rass >= 2) {
        recommendations.push('Paciente agitado. Verificar causas reversiveis (dor, delirium, hipoxia, retencao urinaria).');
      }
      recommendations.push('Considerar aumento de sedacao ou troca de agente.');
    }

    if (dto.bps !== undefined && dto.bps > 5) {
      recommendations.push('Dor significativa detectada (BPS > 5). Priorizar analgesia antes de aumentar sedacao.');
    }

    if (dto.camIcuPositive === true) {
      recommendations.push('CAM-ICU positivo: delirium presente. Avaliar causas, considerar haloperidol/quetiapina.');
    }

    if (!dto.satPerformed && !dto.satNotPerformedReason) {
      recommendations.push('SAT nao realizado sem justificativa. Protocolo recomenda SAT diario.');
    } else if (dto.satPerformed && dto.satPassed) {
      recommendations.push('SAT bem-sucedido. Avaliar SBT se em ventilacao mecanica.');
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:SEDATION] Sedation Assessment',
        content: JSON.stringify({
          assessmentType: 'SEDATION',
          rass: dto.rass,
          rassDescription,
          rassTarget: dto.rassTarget,
          onTarget,
          bps: dto.bps,
          cpot: dto.cpot,
          camIcuPositive: dto.camIcuPositive,
          satPerformed: dto.satPerformed,
          satPassed: dto.satPassed,
          satNotPerformedReason: dto.satNotPerformedReason,
          satOutcome: dto.satOutcome,
          sedationDrugs: dto.sedationDrugs,
          sedativeDrug: dto.sedativeDrug,
          sedativeDose: dto.sedativeDose,
          analgesicDrug: dto.analgesicDrug,
          analgesicDose: dto.analgesicDose,
          recommendations,
          observations: dto.observations,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      rass: dto.rass,
      rassDescription,
      onTarget,
      recommendations,
      createdAt: doc.createdAt,
    };
  }

  private rassDescription(rass: number): string {
    const descriptions: Record<number, string> = {
      [-5]: 'Irresponsivo',
      [-4]: 'Sedacao profunda',
      [-3]: 'Sedacao moderada',
      [-2]: 'Sedacao leve',
      [-1]: 'Sonolento',
      [0]: 'Alerta e calmo',
      [1]: 'Inquieto',
      [2]: 'Agitado',
      [3]: 'Muito agitado',
      [4]: 'Combativo',
    };
    return descriptions[rass] ?? `RASS ${rass}`;
  }

  // ─── Mechanical Ventilation ─────────────────────────────────────────────

  /**
   * Record ventilator parameters with auto-calculated derived values and lung-protective alerts.
   *
   * Auto-calculates:
   * - P/F ratio = PaO2 / (FiO2/100)
   * - Driving pressure = Plateau pressure - PEEP
   * - Static compliance = Tidal volume / Driving pressure
   * - Tidal volume per IBW = Tidal volume / Ideal body weight
   */
  async createVentilationRecord(tenantId: string, authorId: string, dto: CreateVentilationRecordDto) {
    const alerts: string[] = [];

    // Auto-calculate driving pressure
    let drivingPressure: number | undefined;
    if (dto.plateauPressure !== undefined && dto.peep !== undefined) {
      drivingPressure = dto.plateauPressure - dto.peep;
    }

    // Auto-calculate P/F ratio
    let pfRatio: number | undefined;
    if (dto.pao2 !== undefined && dto.fio2 !== undefined && dto.fio2 > 0) {
      pfRatio = Math.round((dto.pao2 / (dto.fio2 / 100)) * 10) / 10;
    }

    // Auto-calculate static compliance
    let staticCompliance: number | undefined;
    if (dto.tidalVolume !== undefined && drivingPressure !== undefined && drivingPressure > 0) {
      staticCompliance = Math.round((dto.tidalVolume / drivingPressure) * 10) / 10;
    }

    // Auto-calculate tidal volume per IBW
    let tidalVolumePerIBW: number | undefined;
    if (dto.tidalVolume !== undefined && dto.idealBodyWeightKg !== undefined) {
      tidalVolumePerIBW = Math.round((dto.tidalVolume / dto.idealBodyWeightKg) * 10) / 10;
    }

    // Lung-protective ventilation alerts
    if (tidalVolumePerIBW !== undefined && tidalVolumePerIBW > 8) {
      alerts.push(`Volume corrente elevado (${tidalVolumePerIBW} mL/kg IBW). Alvo: 6-8 mL/kg IBW.`);
    }
    if (dto.plateauPressure !== undefined && dto.plateauPressure > 30) {
      alerts.push(`Pressao de plato elevada (${dto.plateauPressure} cmH2O). Manter < 30 cmH2O.`);
    }
    if (drivingPressure !== undefined && drivingPressure > 15) {
      alerts.push(`Driving pressure elevada (${drivingPressure} cmH2O). Manter < 15 cmH2O.`);
    }
    if (pfRatio !== undefined && pfRatio < 150) {
      alerts.push(`P/F ratio < 150: ARDS moderado/grave. Considerar pronacao, PEEP elevado.`);
    }
    if (dto.fio2 !== undefined && dto.fio2 > 60) {
      alerts.push(`FiO2 > 60%. Titular PEEP para reduzir FiO2. Alvo SpO2 92-96%.`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:VENTILATION] Mechanical Ventilation Record',
        content: JSON.stringify({
          recordType: 'VENTILATION',
          mode: dto.mode,
          tidalVolume: dto.tidalVolume,
          respiratoryRate: dto.respiratoryRate,
          measuredRR: dto.measuredRR,
          fio2: dto.fio2,
          peep: dto.peep,
          pressureSupport: dto.pressureSupport,
          pressureControl: dto.pressureControl,
          plateauPressure: dto.plateauPressure,
          peakPressure: dto.peakPressure,
          meanAirwayPressure: dto.meanAirwayPressure,
          drivingPressure,
          staticCompliance,
          tidalVolumePerIBW,
          compliance: dto.compliance,
          resistance: dto.resistance,
          pao2: dto.pao2,
          paco2: dto.paco2,
          spo2: dto.spo2,
          pfRatio,
          idealBodyWeightKg: dto.idealBodyWeightKg,
          minuteVentilation: dto.minuteVentilation,
          ieRatio: dto.ieRatio,
          autoPeep: dto.autoPeep,
          alerts,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      mode: dto.mode,
      drivingPressure,
      pfRatio,
      staticCompliance,
      tidalVolumePerIBW,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  // ─── Dialysis / CRRT ────────────────────────────────────────────────────

  async createDialysisPrescription(tenantId: string, authorId: string, dto: CreateDialysisPrescriptionDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:DIALYSIS] ${dto.modality} Prescription`,
        content: JSON.stringify({
          prescriptionType: 'DIALYSIS',
          modality: dto.modality,
          accessType: dto.accessType,
          accessSite: dto.accessSite,
          anticoagulation: dto.anticoagulation,
          anticoagulationDose: dto.anticoagulationDose,
          qb: dto.qb,
          qd: dto.qd,
          qr: dto.qr,
          uf: dto.uf,
          durationHours: dto.durationHours,
          targetKtV: dto.targetKtV,
          observations: dto.observations,
          prescribedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, modality: dto.modality, createdAt: doc.createdAt };
  }

  // ─── Invasive Devices ───────────────────────────────────────────────────

  async createInvasiveDevice(tenantId: string, authorId: string, dto: CreateInvasiveDeviceDto) {
    const insertedAt = new Date(dto.insertedAt);
    const daysInserted = Math.floor((Date.now() - insertedAt.getTime()) / (1000 * 60 * 60 * 24));

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:DEVICE] ${dto.deviceType} - ${dto.site}`,
        content: JSON.stringify({
          recordType: 'INVASIVE_DEVICE',
          deviceType: dto.deviceType,
          site: dto.site,
          insertedAt: dto.insertedAt,
          insertedById: dto.insertedById,
          daysInserted,
          removed: false,
          bundleChecklist: {},
          observations: dto.observations,
          registeredAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, deviceType: dto.deviceType, daysInserted, createdAt: doc.createdAt };
  }

  async updateDeviceBundleChecklist(tenantId: string, authorId: string, dto: UpdateDeviceBundleChecklistDto) {
    const existing = await this.prisma.clinicalDocument.findUnique({
      where: { id: dto.deviceDocumentId },
    });
    if (!existing) throw new NotFoundException(`Device document "${dto.deviceDocumentId}" not found`);

    const content = JSON.parse(existing.content as string);
    content.bundleChecklist = dto.checklist;
    content.lastBundleCheckAt = new Date().toISOString();
    content.lastBundleCheckBy = authorId;

    await this.prisma.clinicalDocument.update({
      where: { id: dto.deviceDocumentId },
      data: { content: JSON.stringify(content) },
    });

    return { id: dto.deviceDocumentId, checklist: dto.checklist };
  }

  async getActiveDevices(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:DEVICE]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => {
      const content = JSON.parse(doc.content as string);
      const insertedAt = new Date(content.insertedAt);
      const daysInserted = Math.floor((Date.now() - insertedAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: doc.id,
        ...content,
        daysInserted,
        createdAt: doc.createdAt,
      };
    }).filter((d) => !d.removed);
  }

  // ─── Prevention Bundles ─────────────────────────────────────────────────

  async createBundleChecklist(tenantId: string, authorId: string, dto: CreateBundleChecklistDto) {
    const completedCount = Object.values(dto.items).filter(Boolean).length;
    const totalCount = Object.keys(dto.items).length;
    const compliance = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:BUNDLE] ${dto.bundleType}`,
        content: JSON.stringify({
          bundleType: dto.bundleType,
          items: dto.items,
          completedCount,
          totalCount,
          compliance,
          observations: dto.observations,
          checkedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, bundleType: dto.bundleType, compliance, createdAt: doc.createdAt };
  }

  async getBundleHistory(tenantId: string, patientId: string, bundleType?: string) {
    const titleFilter = bundleType ? `[ICU:BUNDLE] ${bundleType}` : '[ICU:BUNDLE]';

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: titleFilter },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ─── Prone Positioning ──────────────────────────────────────────────────

  async createProneSession(tenantId: string, authorId: string, dto: CreateProneSessionDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:PRONE] Prone Positioning Session',
        content: JSON.stringify({
          sessionType: 'PRONE_POSITIONING',
          startedAt: dto.startedAt,
          endedAt: dto.endedAt,
          pfBefore: dto.pfBefore,
          pfAfter: dto.pfAfter,
          pfImprovement: dto.pfAfter ? Math.round(((dto.pfAfter - dto.pfBefore) / dto.pfBefore) * 100) : null,
          safetyChecklist: dto.safetyChecklist,
          complications: dto.complications,
          observations: dto.observations,
          registeredAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async endProneSession(tenantId: string, authorId: string, sessionId: string, pfAfter: number) {
    const existing = await this.prisma.clinicalDocument.findUnique({ where: { id: sessionId } });
    if (!existing) throw new NotFoundException(`Prone session "${sessionId}" not found`);

    const content = JSON.parse(existing.content as string);
    content.endedAt = new Date().toISOString();
    content.pfAfter = pfAfter;
    content.pfImprovement = Math.round(((pfAfter - content.pfBefore) / content.pfBefore) * 100);

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify(content) },
    });

    return { id: sessionId, pfAfter, pfImprovement: content.pfImprovement };
  }

  // ─── Daily Goals ────────────────────────────────────────────────────────

  async createDailyGoals(tenantId: string, authorId: string, dto: CreateDailyGoalsDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:DAILY_GOALS] Daily Goals Checklist',
        content: JSON.stringify({
          goalType: 'DAILY_GOALS',
          sedationGoal: dto.sedationGoal,
          ventilationGoal: dto.ventilationGoal,
          nutritionGoal: dto.nutritionGoal,
          prophylaxisGoal: dto.prophylaxisGoal,
          examsGoal: dto.examsGoal,
          mobilityGoal: dto.mobilityGoal,
          planForDay: dto.planForDay,
          dvtProphylaxis: dto.dvtProphylaxis ?? false,
          stressUlcerProphylaxis: dto.stressUlcerProphylaxis ?? false,
          headOfBed30: dto.headOfBed30 ?? false,
          glycemicControl: dto.glycemicControl ?? false,
          additionalNotes: dto.additionalNotes,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── ECMO ───────────────────────────────────────────────────────────────

  async createEcmoRecord(tenantId: string, authorId: string, dto: CreateEcmoRecordDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[ICU:ECMO] ${dto.ecmoType} ECMO Record`,
        content: JSON.stringify({
          recordType: 'ECMO',
          ecmoType: dto.ecmoType,
          flow: dto.flow,
          sweep: dto.sweep,
          fdo2: dto.fdo2,
          rpm: dto.rpm,
          anticoagulationValue: dto.anticoagulationValue,
          heparinDose: dto.heparinDose,
          preMembranePressure: dto.preMembranePressure,
          postMembranePressure: dto.postMembranePressure,
          transmembranePressure: dto.transmembranePressure,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, ecmoType: dto.ecmoType, createdAt: doc.createdAt };
  }

  // ─── Enteral Nutrition ──────────────────────────────────────────────────

  async createEnteralNutrition(tenantId: string, authorId: string, dto: CreateEnteralNutritionDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:ENTERAL_NUTRITION] Enteral Nutrition Prescription',
        content: JSON.stringify({
          prescriptionType: 'ENTERAL_NUTRITION',
          formula: dto.formula,
          rateMlH: dto.rateMlH,
          targetVolume24h: dto.targetVolume24h,
          currentVolumeInfused: dto.currentVolumeInfused,
          gastricResidual: dto.gastricResidual,
          route: dto.route,
          paused: dto.paused ?? false,
          pauseReason: dto.pauseReason,
          observations: dto.observations,
          prescribedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── ICU Flowsheet ──────────────────────────────────────────────────────

  async getFlowsheet(tenantId: string, patientId: string, encounterId?: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const whereBase: Record<string, unknown> = { tenantId, patientId };
    if (encounterId) whereBase.encounterId = encounterId;

    // Fetch vitals
    const vitals = await this.prisma.vitalSigns.findMany({
      where: { ...whereBase, recordedAt: { gte: from, lte: to } },
      orderBy: { recordedAt: 'asc' },
      select: {
        id: true, recordedAt: true, systolicBP: true, diastolicBP: true,
        meanArterialPressure: true, heartRate: true, respiratoryRate: true,
        temperature: true, oxygenSaturation: true, gcs: true, diuresis24h: true,
      },
    });

    // Fetch ICU documents for this patient in the time range
    const icuDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        ...whereBase,
        title: { startsWith: '[ICU:' },
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
    });

    const ventilationRecords = icuDocs
      .filter((d) => d.title.includes('[ICU:VENTILATION]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const sedationRecords = icuDocs
      .filter((d) => d.title.includes('[ICU:SEDATION]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const devices = icuDocs
      .filter((d) => d.title.includes('[ICU:DEVICE]'))
      .map((d) => {
        const content = JSON.parse(d.content as string);
        const insertedAt = new Date(content.insertedAt);
        return {
          id: d.id,
          ...content,
          daysInserted: Math.floor((Date.now() - insertedAt.getTime()) / (1000 * 60 * 60 * 24)),
          createdAt: d.createdAt,
        };
      })
      .filter((d) => !d.removed);

    const scores = icuDocs
      .filter((d) =>
        d.title.includes('[ICU:APACHE_II]') ||
        d.title.includes('[ICU:SOFA]') ||
        d.title.includes('[ICU:SAPS_3]') ||
        d.title.includes('[ICU:TISS_28]'),
      )
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const bundles = icuDocs
      .filter((d) => d.title.includes('[ICU:BUNDLE]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const nutrition = icuDocs
      .filter((d) => d.title.includes('[ICU:ENTERAL_NUTRITION]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const ecmo = icuDocs
      .filter((d) => d.title.includes('[ICU:ECMO]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    return {
      patientId,
      period: { from: from.toISOString(), to: to.toISOString() },
      vitals,
      ventilation: ventilationRecords,
      sedation: sedationRecords,
      devices,
      scores,
      bundles,
      nutrition,
      ecmo,
    };
  }

  // ─── Hypothermia Session ─────────────────────────────────────────────────

  async createHypothermiaSession(tenantId: string, authorId: string, dto: CreateHypothermiaSessionDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const phaseDurations: Record<HypothermiaPhase, number> = {
      [HypothermiaPhase.INDUCTION]: 4,
      [HypothermiaPhase.MAINTENANCE]: 24,
      [HypothermiaPhase.REWARMING]: Math.ceil((37 - dto.targetTemperatureCelsius) / (dto.rewarmingRateCelsiusPerHour ?? 0.25)),
      [HypothermiaPhase.COMPLETED]: 0,
    };

    const estimatedDuration = phaseDurations[HypothermiaPhase.INDUCTION]
      + phaseDurations[HypothermiaPhase.MAINTENANCE]
      + phaseDurations[HypothermiaPhase.REWARMING];

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId,
        type: 'CUSTOM',
        title: `[ICU:HYPOTHERMIA] Hipotermia Terapêutica — Alvo ${dto.targetTemperatureCelsius}°C`,
        content: JSON.stringify({
          ...dto,
          currentPhase: dto.phase,
          phaseStartedAt: new Date().toISOString(),
          estimatedTotalHours: estimatedDuration,
          monitoringAlerts: [
            'Monitorar temperatura central a cada 30 min',
            'ECG contínuo (risco de arritmia)',
            'Eletrólitos a cada 4h (K+, Mg2+)',
            'Coagulação a cada 6h',
            'Controle de tremores (sedação/BNM)',
          ],
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      targetTemperature: dto.targetTemperatureCelsius,
      indication: dto.indication,
      currentPhase: dto.phase,
      estimatedTotalHours: estimatedDuration,
      createdAt: doc.createdAt,
    };
  }

  // ─── AI: Sepsis Prediction ────────────────────────────────────────────────

  async predictSepsis(tenantId: string, patientId: string, dto: PredictSepsisDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${patientId}" not found`);

    let riskScore = 0;
    const triggers: string[] = [];

    // SIRS-like criteria
    if (dto.temperature !== undefined && (dto.temperature > 38.3 || dto.temperature < 36)) {
      riskScore += 15;
      triggers.push(`Temperatura anormal: ${dto.temperature}°C`);
    }
    if (dto.heartRate !== undefined && dto.heartRate > 90) {
      riskScore += 10;
      triggers.push(`Taquicardia: ${dto.heartRate} bpm`);
    }
    if (dto.respiratoryRate !== undefined && dto.respiratoryRate > 20) {
      riskScore += 10;
      triggers.push(`Taquipneia: ${dto.respiratoryRate} ipm`);
    }
    if (dto.wbc !== undefined && (dto.wbc > 12 || dto.wbc < 4)) {
      riskScore += 15;
      triggers.push(`WBC alterado: ${dto.wbc} x10³/μL`);
    }
    // Organ dysfunction markers
    if (dto.systolicBp !== undefined && dto.systolicBp < 90) {
      riskScore += 20;
      triggers.push(`Hipotensão: PAS ${dto.systolicBp} mmHg`);
    }
    if (dto.lactate !== undefined && dto.lactate > 2) {
      riskScore += 20;
      triggers.push(`Hiperlactacidemia: ${dto.lactate} mmol/L`);
    }
    if (dto.creatinine !== undefined && dto.creatinine > 2.0) {
      riskScore += 10;
      triggers.push(`Disfunção renal: creatinina ${dto.creatinine} mg/dL`);
    }
    if (dto.bilirubin !== undefined && dto.bilirubin > 2) {
      riskScore += 10;
      triggers.push(`Disfunção hepática: bilirrubina ${dto.bilirubin} mg/dL`);
    }
    if (dto.spo2 !== undefined && dto.spo2 < 94) {
      riskScore += 10;
      triggers.push(`SpO2 baixa: ${dto.spo2}%`);
    }

    const risk = riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';
    const recommendation = risk === 'HIGH'
      ? 'ALTO RISCO — Iniciar protocolo de sepse imediatamente: hemoculturas, ATB em 1h, reposição volêmica'
      : risk === 'MEDIUM'
        ? 'RISCO MODERADO — Monitorar de perto, considerar culturas e exames de screening'
        : 'Baixo risco atual — Continuar monitoramento de rotina';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        encounterId: dto.encounterId ?? null,
        authorId: 'AI_SYSTEM',
        type: 'CUSTOM',
        title: `[ICU:AI_SEPSIS] Predição de Sepse — Risco ${risk}`,
        content: JSON.stringify({ riskScore, risk, triggers, recommendation, inputs: dto }),
        generatedByAI: true,
        status: 'DRAFT',
      },
    });

    return {
      documentId: doc.id,
      patientId,
      riskScore,
      risk,
      triggers,
      recommendation,
      disclaimer: 'Predição assistida por IA — diagnóstico de sepse é clínico. Revisão médica obrigatória.',
    };
  }

  // ─── AI: Extubation Prediction ────────────────────────────────────────────

  async predictExtubation(tenantId: string, patientId: string, dto: PredictExtubationDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${patientId}" not found`);

    let successScore = 0;
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];

    // RSBI: best predictor, threshold 105
    if (dto.rsbi !== undefined) {
      if (dto.rsbi < 80) { successScore += 25; positiveFactors.push(`RSBI favorável: ${dto.rsbi}`); }
      else if (dto.rsbi <= 105) { successScore += 10; positiveFactors.push(`RSBI aceitável: ${dto.rsbi}`); }
      else { successScore -= 20; negativeFactors.push(`RSBI elevado: ${dto.rsbi} (>105 — alto risco de falha)`); }
    }
    if (dto.pao2fio2 !== undefined) {
      if (dto.pao2fio2 >= 200) { successScore += 20; positiveFactors.push(`P/F ratio adequado: ${dto.pao2fio2}`); }
      else { successScore -= 15; negativeFactors.push(`P/F ratio baixo: ${dto.pao2fio2}`); }
    }
    if (dto.fio2 !== undefined && dto.fio2 <= 0.4) {
      successScore += 10; positiveFactors.push(`FiO2 baixa: ${dto.fio2 * 100}%`);
    }
    if (dto.peep !== undefined && dto.peep <= 5) {
      successScore += 10; positiveFactors.push(`PEEP baixa: ${dto.peep} cmH2O`);
    }
    if (dto.gcs !== undefined) {
      if (dto.gcs >= 13) { successScore += 15; positiveFactors.push(`GCS adequado: ${dto.gcs}`); }
      else { successScore -= 20; negativeFactors.push(`GCS baixo: ${dto.gcs}`); }
    }
    if (dto.coughStrength !== undefined && dto.coughStrength >= 3) {
      successScore += 10; positiveFactors.push(`Tosse efetiva (${dto.coughStrength}/5)`);
    }
    if (dto.nif !== undefined && dto.nif <= -20) {
      successScore += 10; positiveFactors.push(`NIF adequada: ${dto.nif} cmH2O`);
    }
    if (dto.ventilationDays !== undefined && dto.ventilationDays > 14) {
      successScore -= 10; negativeFactors.push(`VM prolongada: ${dto.ventilationDays} dias`);
    }

    const probability = Math.max(0, Math.min(100, 50 + successScore));
    const prediction = probability >= 70 ? 'SUCCESS' : probability >= 40 ? 'UNCERTAIN' : 'FAILURE';
    const recommendation = prediction === 'SUCCESS'
      ? 'Alta probabilidade de sucesso — considerar TRE (Trial de Respiração Espontânea)'
      : prediction === 'UNCERTAIN'
        ? 'Prognóstico incerto — otimizar parâmetros antes de extubar'
        : 'Alta probabilidade de falha — aguardar melhora dos parâmetros';

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        encounterId: dto.encounterId ?? null,
        authorId: 'AI_SYSTEM',
        type: 'CUSTOM',
        title: `[ICU:AI_EXTUBATION] Predição de Extubação — ${prediction}`,
        content: JSON.stringify({ probability, prediction, positiveFactors, negativeFactors, recommendation, inputs: dto }),
        generatedByAI: true,
        status: 'DRAFT',
      },
    });

    return {
      documentId: doc.id,
      patientId,
      probability,
      prediction,
      positiveFactors,
      negativeFactors,
      recommendation,
      disclaimer: 'Predição assistida por IA — decisão de extubação é clínica. Revisão médica obrigatória.',
    };
  }

  // ─── AI: Vasopressor Titration ────────────────────────────────────────────

  async suggestVasopressorTitration(tenantId: string, patientId: string, dto: SuggestVasopressorTitrationDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${patientId}" not found`);

    const mapDiff = dto.currentMap - dto.targetMap;
    const suggestions: string[] = [];
    const alerts: string[] = [];
    let norepinephrineSuggestion = dto.norepinephrineDose;

    if (mapDiff < -10) {
      // MAP critically low — increase vasopressors
      const increment = Math.min(0.05, Math.abs(mapDiff) * 0.002);
      norepinephrineSuggestion = Math.round((dto.norepinephrineDose + increment) * 1000) / 1000;
      suggestions.push(`Aumentar noradrenalina: ${dto.norepinephrineDose} → ${norepinephrineSuggestion} mcg/kg/min`);
      if (dto.norepinephrineDose >= 0.25 && !dto.vasopressinDose) {
        suggestions.push('Considerar adicionar vasopressina 0.03 unidades/min (noradrenalina alta)');
      }
      alerts.push(`PAM ${dto.currentMap} mmHg — ABAIXO do alvo ${dto.targetMap} mmHg`);
    } else if (mapDiff > 15) {
      // MAP above target — wean vasopressors
      const decrement = Math.min(0.02, mapDiff * 0.001);
      norepinephrineSuggestion = Math.max(0, Math.round((dto.norepinephrineDose - decrement) * 1000) / 1000);
      suggestions.push(`Reduzir noradrenalina: ${dto.norepinephrineDose} → ${norepinephrineSuggestion} mcg/kg/min`);
    } else {
      suggestions.push(`PAM no alvo (${dto.currentMap} mmHg) — manter dose atual`);
    }

    if (dto.lactateTrend === 'WORSENING') {
      alerts.push('Lactato em piora — revisar débito cardíaco e considerar dobutamina');
    }
    if (dto.urineOutputMlH !== undefined && dto.urineOutputMlH < 0.5 * dto.weightKg) {
      alerts.push(`Débito urinário baixo: ${dto.urineOutputMlH} mL/h — investigar hipovolemia/hipoperfusão renal`);
    }
    if (dto.norepinephrineDose > 1.0) {
      alerts.push('Noradrenalina > 1 mcg/kg/min — considerar hidrocortisona 200 mg/dia (choque refratário)');
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        encounterId: dto.encounterId ?? null,
        authorId: 'AI_SYSTEM',
        type: 'CUSTOM',
        title: `[ICU:AI_VASOPRESSOR] Titulação de Vasopressores — PAM ${dto.currentMap} → alvo ${dto.targetMap}`,
        content: JSON.stringify({ suggestions, alerts, norepinephrineSuggestion, inputs: dto }),
        generatedByAI: true,
        status: 'DRAFT',
      },
    });

    return {
      documentId: doc.id,
      patientId,
      currentMap: dto.currentMap,
      targetMap: dto.targetMap,
      suggestions,
      alerts,
      norepinephrineSuggestion,
      disclaimer: 'Sugestão assistida por IA — titulação de vasopressores é decisão médica. Revisão obrigatória.',
    };
  }

  // ─── Weaning Assessment ──────────────────────────────────────────────────

  /**
   * Assess readiness for ventilator weaning based on latest ventilation and sedation data.
   *
   * SBT criteria:
   * 1. FiO2 <= 40% and PEEP <= 8
   * 2. Hemodynamically stable (no/low vasopressors)
   * 3. Adequate consciousness (follows commands, RASS >= -1)
   * 4. Adequate cough reflex
   * 5. Minimal secretions
   * 6. Resolved acute phase
   *
   * RSBI = RR / Vt(L) < 105 predicts successful extubation.
   */
  async assessWeaningReadiness(tenantId: string, patientId: string, encounterId?: string): Promise<WeaningAssessmentResult> {
    const whereBase: Record<string, unknown> = { tenantId, patientId };
    if (encounterId) whereBase.encounterId = encounterId;

    // Get latest ventilation record
    const latestVent = await this.prisma.clinicalDocument.findFirst({
      where: { ...whereBase, title: { startsWith: '[ICU:VENTILATION]' }, status: 'FINAL' },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest sedation record
    const latestSedation = await this.prisma.clinicalDocument.findFirst({
      where: { ...whereBase, title: { startsWith: '[ICU:SEDATION]' }, status: 'FINAL' },
      orderBy: { createdAt: 'desc' },
    });

    const ventContent = latestVent ? JSON.parse(latestVent.content as string) : {};
    const sedContent = latestSedation ? JSON.parse(latestSedation.content as string) : {};

    const fio2 = ventContent.fio2 ?? 100;
    const peep = ventContent.peep ?? 20;
    const pfRatio = ventContent.pfRatio ?? 0;
    const rass = sedContent.rass ?? -5;
    const measuredRR = ventContent.measuredRR;
    const tidalVolume = ventContent.tidalVolume;

    // Calculate RSBI if data available
    let rsbi: number | undefined;
    if (measuredRR && tidalVolume && tidalVolume > 0) {
      rsbi = measuredRR / (tidalVolume / 1000);
    }

    const criteria: WeaningCriteria = {
      adequateOxygenation: pfRatio >= 150,
      hemodynamicallyStable: true, // Would need vasopressor data
      adequateConsciousness: rass >= -1,
      adequateCoughReflex: true, // Clinical assessment
      minimalSecretions: true, // Clinical assessment
      resolvedAcutePhase: true, // Clinical assessment
      fiO2LessOrEqual40: fio2 <= 40,
      peepLessOrEqual8: peep <= 8,
      noHighVasopressors: true, // Would need vasopressor data
      rapidShallowBreathingIndex: rsbi,
      rsbiAcceptable: rsbi !== undefined ? rsbi < 105 : false,
    };

    const readyForSBT = criteria.fiO2LessOrEqual40
      && criteria.peepLessOrEqual8
      && criteria.adequateConsciousness
      && criteria.adequateOxygenation;

    const recommendations: string[] = [];
    if (readyForSBT) {
      recommendations.push('Paciente preenche criterios para SBT. Iniciar teste de respiracao espontanea.');
      if (rsbi !== undefined && rsbi < 105) {
        recommendations.push(`RSBI ${Math.round(rsbi)}: favoravel para extubacao.`);
      }
    } else {
      if (!criteria.fiO2LessOrEqual40) {
        recommendations.push(`FiO2 ${Math.round(fio2)}% > 40%. Otimizar PEEP e titular FiO2.`);
      }
      if (!criteria.peepLessOrEqual8) {
        recommendations.push(`PEEP ${peep} > 8 cmH2O. Reduzir gradualmente.`);
      }
      if (!criteria.adequateConsciousness) {
        recommendations.push('Nivel de consciencia insuficiente. Realizar SAT e reavaliar.');
      }
      if (!criteria.adequateOxygenation) {
        recommendations.push('P/F ratio insuficiente. Otimizar ventilacao antes de desmame.');
      }
    }

    return { readyForSBT, criteria, recommendations };
  }

  // ─── Enhanced Device Tracking ──────────────────────────────────────────────

  /**
   * Get days a device has been in situ.
   */
  getDaysInSitu(insertionDate: string | Date, referenceDate: Date = new Date()): number {
    const insertedAt = typeof insertionDate === 'string' ? new Date(insertionDate) : insertionDate;
    return Math.floor((referenceDate.getTime() - insertedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check bundle compliance against standard template items.
   */
  checkBundleComplianceDetailed(
    bundleType: BundleTypeEnum,
    items: Array<{ item: string; compliant: boolean }>,
  ): { compliant: boolean; complianceRate: number; missingItems: string[] } {
    let templateItems: readonly string[];
    switch (bundleType) {
      case BundleTypeEnum.CVC_BUNDLE: templateItems = CVC_BUNDLE_ITEMS; break;
      case BundleTypeEnum.VAP_BUNDLE: templateItems = VAP_BUNDLE_ITEMS; break;
      case BundleTypeEnum.CAUTI_BUNDLE: templateItems = CAUTI_BUNDLE_ITEMS; break;
    }
    const checkedItemNames = new Set(items.map((i) => i.item));
    const missingItems = templateItems.filter((t) => !checkedItemNames.has(t));
    const totalItems = items.length + missingItems.length;
    const compliantCount = items.filter((i) => i.compliant).length;
    const complianceRate = totalItems > 0 ? Math.round((compliantCount / totalItems) * 100) : 0;
    return {
      compliant: missingItems.length === 0 && items.every((i) => i.compliant),
      complianceRate,
      missingItems,
    };
  }

  // ─── Score History ──────────────────────────────────────────────────────

  async getScoreHistory(tenantId: string, patientId: string, scoreType?: string) {
    const titleFilter = scoreType ? `[ICU:${scoreType}]` : '[ICU:';

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: titleFilter },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ICU Clinical Assessments: RASS, CAM-ICU, BIS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── RASS (Richmond Agitation-Sedation Scale) ─────────────────────────────

  private readonly RASS_DESCRIPTIONS: Record<number, string> = {
    [-5]: 'Irresponsivo (Unarousable)',
    [-4]: 'Sedação profunda (Deep sedation)',
    [-3]: 'Sedação moderada (Moderate sedation)',
    [-2]: 'Sedação leve (Light sedation)',
    [-1]: 'Sonolento (Drowsy)',
    [0]: 'Alerta e calmo (Alert and calm)',
    [1]: 'Inquieto (Restless)',
    [2]: 'Agitado (Agitated)',
    [3]: 'Muito agitado (Very agitated)',
    [4]: 'Combativo (Combative)',
  };

  private interpretRass(score: number): { interpretation: string; alert: boolean; alertMessage: string | null } {
    let interpretation: string;
    let alert = false;
    let alertMessage: string | null = null;

    if (score < -3) {
      interpretation = 'Sedação profunda - considerar reduzir sedativo';
      alert = true;
      alertMessage = `ALERTA: RASS ${score} — Sedação profunda. Avaliar necessidade de redução de sedativo.`;
    } else if (score > 1) {
      interpretation = 'Agitação - avaliar causa e considerar medicação';
      alert = true;
      alertMessage = `ALERTA: RASS +${score} — Agitação significativa. Avaliar causa subjacente e considerar intervenção.`;
    } else if (score === 0) {
      interpretation = 'Nível ideal - alerta e calmo';
    } else if (score < 0) {
      interpretation = 'Sedação leve a moderada';
    } else {
      interpretation = 'Leve inquietação';
    }

    return { interpretation, alert, alertMessage };
  }

  async recordRass(tenantId: string, authorId: string, dto: CreateRassAssessmentDto) {
    const description = this.RASS_DESCRIPTIONS[dto.score] ?? `RASS ${dto.score}`;
    const { interpretation, alert, alertMessage } = this.interpretRass(dto.score);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:RASS] RASS Assessment',
        content: JSON.stringify({
          assessmentType: 'RASS',
          score: dto.score,
          description,
          interpretation,
          alert,
          alertMessage,
          userDescription: dto.description,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (alert) {
      this.logger.warn(`RASS Alert for patient ${dto.patientId}: ${alertMessage}`);
    }

    return {
      id: doc.id,
      score: dto.score,
      description,
      interpretation,
      alert,
      alertMessage,
      createdAt: doc.createdAt,
    };
  }

  async getRassHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:RASS]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const assessments = docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));

    // Calculate trend
    const scores = assessments.map((a) => a.score as number);
    let trend: 'IMPROVING' | 'STABLE' | 'WORSENING' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (scores.length >= 3) {
      const recent = scores.slice(0, 3);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const older = scores.slice(3, 6);
      if (older.length > 0) {
        const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
        const diff = Math.abs(avgRecent) - Math.abs(avgOlder);
        if (diff < -0.5) trend = 'IMPROVING';
        else if (diff > 0.5) trend = 'WORSENING';
        else trend = 'STABLE';
      }
    }

    return { assessments, trend, total: assessments.length };
  }

  async getLatestRass(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:RASS]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException('No RASS assessment found for this patient');
    }

    const content = JSON.parse(doc.content as string);
    return {
      id: doc.id,
      ...content,
      createdAt: doc.createdAt,
    };
  }

  // ─── CAM-ICU (Confusion Assessment Method for ICU) ────────────────────────

  private evaluateCamIcu(dto: CreateCamIcuDto): { deliriumPositive: boolean; reasoning: string } {
    // Positive for delirium if: Feature1 AND Feature2 AND (Feature3 OR Feature4)
    const deliriumPositive =
      dto.feature1_acuteOnset &&
      dto.feature2_inattention &&
      (dto.feature3_alteredLoc || dto.feature4_disorganizedThinking);

    const featuresPresent: string[] = [];
    if (dto.feature1_acuteOnset) featuresPresent.push('Início agudo/curso flutuante');
    if (dto.feature2_inattention) featuresPresent.push('Desatenção');
    if (dto.feature3_alteredLoc) featuresPresent.push('Nível de consciência alterado');
    if (dto.feature4_disorganizedThinking) featuresPresent.push('Pensamento desorganizado');

    let reasoning: string;
    if (deliriumPositive) {
      reasoning = `DELIRIUM POSITIVO — Features presentes: ${featuresPresent.join(', ')}. ` +
        'Critério: Feature 1 + Feature 2 + (Feature 3 OU Feature 4) satisfeito.';
    } else {
      reasoning = `DELIRIUM NEGATIVO — Features presentes: ${featuresPresent.length > 0 ? featuresPresent.join(', ') : 'nenhuma'}. ` +
        'Critério não satisfeito.';
    }

    return { deliriumPositive, reasoning };
  }

  async recordCamIcu(tenantId: string, authorId: string, dto: CreateCamIcuDto) {
    const { deliriumPositive, reasoning } = this.evaluateCamIcu(dto);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:CAM-ICU] CAM-ICU Assessment',
        content: JSON.stringify({
          assessmentType: 'CAM_ICU',
          feature1_acuteOnset: dto.feature1_acuteOnset,
          feature2_inattention: dto.feature2_inattention,
          feature3_alteredLoc: dto.feature3_alteredLoc,
          feature4_disorganizedThinking: dto.feature4_disorganizedThinking,
          rassScore: dto.rassScore,
          deliriumPositive,
          reasoning,
          assessedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (deliriumPositive) {
      this.logger.warn(`CAM-ICU POSITIVE for patient ${dto.patientId}: Delirium detected`);
    }

    return {
      id: doc.id,
      deliriumPositive,
      reasoning,
      features: {
        feature1_acuteOnset: dto.feature1_acuteOnset,
        feature2_inattention: dto.feature2_inattention,
        feature3_alteredLoc: dto.feature3_alteredLoc,
        feature4_disorganizedThinking: dto.feature4_disorganizedThinking,
      },
      rassScore: dto.rassScore,
      createdAt: doc.createdAt,
    };
  }

  async getCamIcuHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:CAM-ICU]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const assessments = docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));

    // Delirium trend
    const positiveCount = assessments.filter((a) => a.deliriumPositive === true).length;
    const negativeCount = assessments.filter((a) => a.deliriumPositive === false).length;

    return {
      assessments,
      total: assessments.length,
      deliriumStats: {
        positiveCount,
        negativeCount,
        positiveRate: assessments.length > 0
          ? Math.round((positiveCount / assessments.length) * 100)
          : 0,
      },
    };
  }

  async getDeliriumStatus(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:CAM-ICU]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException('No CAM-ICU assessment found for this patient');
    }

    const content = JSON.parse(doc.content as string);
    return {
      id: doc.id,
      deliriumPositive: content.deliriumPositive as boolean,
      reasoning: content.reasoning as string,
      rassScore: content.rassScore as number | undefined,
      assessedAt: content.assessedAt as string,
      createdAt: doc.createdAt,
    };
  }

  // ─── BIS (Bispectral Index) ───────────────────────────────────────────────

  private interpretBis(bisValue: number): {
    interpretation: string;
    zone: string;
    alert: boolean;
    alertMessage: string | null;
  } {
    let interpretation: string;
    let zone: string;
    let alert = false;
    let alertMessage: string | null = null;

    if (bisValue === 0) {
      interpretation = 'EEG isoelétrico (Flat EEG)';
      zone = 'FLAT_EEG';
      alert = true;
      alertMessage = 'ALERTA CRÍTICO: BIS 0 — EEG isoelétrico detectado.';
    } else if (bisValue <= 20) {
      interpretation = 'Hipnose profunda / supressão de surto (Burst suppression)';
      zone = 'BURST_SUPPRESSION';
      alert = true;
      alertMessage = `ALERTA: BIS ${bisValue} — Supressão cerebral profunda. Considerar redução anestésica.`;
    } else if (bisValue <= 40) {
      interpretation = 'Hipnose profunda (Deep hypnosis)';
      zone = 'DEEP_HYPNOSIS';
    } else if (bisValue <= 60) {
      interpretation = 'Anestesia geral — faixa alvo (General anesthesia - target range)';
      zone = 'GENERAL_ANESTHESIA';
    } else if (bisValue <= 80) {
      interpretation = 'Sedação (Sedation)';
      zone = 'SEDATION';
      alert = true;
      alertMessage = `ALERTA: BIS ${bisValue} — Risco de awareness durante procedimento cirúrgico.`;
    } else {
      interpretation = 'Acordado (Awake)';
      zone = 'AWAKE';
      alert = true;
      alertMessage = `ALERTA: BIS ${bisValue} — Paciente acordado. Alto risco de awareness intraoperatória.`;
    }

    return { interpretation, zone, alert, alertMessage };
  }

  async recordBis(tenantId: string, authorId: string, dto: RecordBisDto) {
    const { interpretation, zone, alert, alertMessage } = this.interpretBis(dto.bisValue);

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[ICU:BIS] BIS Monitoring',
        content: JSON.stringify({
          assessmentType: 'BIS',
          bisValue: dto.bisValue,
          emgValue: dto.emgValue,
          sqiValue: dto.sqiValue,
          anestheticAgent: dto.anestheticAgent,
          notes: dto.notes,
          interpretation,
          zone,
          alert,
          alertMessage,
          targetRange: { min: 40, max: 60 },
          inTargetRange: dto.bisValue >= 40 && dto.bisValue <= 60,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (alert) {
      this.logger.warn(`BIS Alert for patient ${dto.patientId}: ${alertMessage}`);
    }

    return {
      id: doc.id,
      bisValue: dto.bisValue,
      interpretation,
      zone,
      alert,
      alertMessage,
      inTargetRange: dto.bisValue >= 40 && dto.bisValue <= 60,
      createdAt: doc.createdAt,
    };
  }

  async getBisHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:BIS]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const records = docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content as string),
      createdAt: doc.createdAt,
    }));

    // Trend: average of last 5 vs previous 5
    const values = records.map((r) => r.bisValue as number);
    let trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (values.length >= 4) {
      const half = Math.floor(values.length / 2);
      const recentAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const olderAvg = values.slice(half, half * 2).reduce((a, b) => a + b, 0) / half;
      const diff = recentAvg - olderAvg;
      if (diff > 5) trend = 'INCREASING';
      else if (diff < -5) trend = 'DECREASING';
      else trend = 'STABLE';
    }

    return { records, trend, total: records.length };
  }

  async getBisTarget(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[ICU:BIS]' },
        status: 'FINAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      throw new NotFoundException('No BIS record found for this patient');
    }

    const content = JSON.parse(doc.content as string);
    return {
      id: doc.id,
      currentBis: content.bisValue as number,
      targetRange: { min: 40, max: 60 },
      inTargetRange: content.inTargetRange as boolean,
      interpretation: content.interpretation as string,
      zone: content.zone as string,
      deviation: content.bisValue < 40
        ? content.bisValue - 40
        : content.bisValue > 60
          ? content.bisValue - 60
          : 0,
      recordedAt: content.recordedAt as string,
      createdAt: doc.createdAt,
    };
  }
}
