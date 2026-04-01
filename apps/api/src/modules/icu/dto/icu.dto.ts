import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VasoactiveDrugName {
  NOREPINEPHRINE = 'NOREPINEPHRINE',
  DOBUTAMINE = 'DOBUTAMINE',
  DOPAMINE = 'DOPAMINE',
  NITROPRUSSIDE = 'NITROPRUSSIDE',
  EPINEPHRINE = 'EPINEPHRINE',
  VASOPRESSIN = 'VASOPRESSIN',
  MILRINONE = 'MILRINONE',
  PHENYLEPHRINE = 'PHENYLEPHRINE',
}

export enum SedationDrugName {
  MIDAZOLAM = 'MIDAZOLAM',
  PROPOFOL = 'PROPOFOL',
  DEXMEDETOMIDINE = 'DEXMEDETOMIDINE',
  KETAMINE = 'KETAMINE',
  FENTANYL = 'FENTANYL',
  REMIFENTANIL = 'REMIFENTANIL',
  MORPHINE = 'MORPHINE',
}

export enum VentilationModeEnum {
  VCV = 'VCV',
  PCV = 'PCV',
  PSV = 'PSV',
  APRV = 'APRV',
  CPAP = 'CPAP',
  SIMV_VC = 'SIMV_VC',
  SIMV_PC = 'SIMV_PC',
  PRVC = 'PRVC',
  BIPAP = 'BIPAP',
  HFOV = 'HFOV',
  HFNC = 'HFNC',
}

export enum InvasiveDeviceTypeEnum {
  CVC = 'CVC',
  SVD = 'SVD',
  TOT = 'TOT',
  ARTERIAL_LINE = 'ARTERIAL_LINE',
  DRAIN = 'DRAIN',
  CHEST_TUBE = 'CHEST_TUBE',
  PICC = 'PICC',
  NASOGASTRIC_TUBE = 'NASOGASTRIC_TUBE',
  TRACHEOSTOMY = 'TRACHEOSTOMY',
  DIALYSIS_CATHETER = 'DIALYSIS_CATHETER',
  EXTERNAL_VENTRICULAR_DRAIN = 'EXTERNAL_VENTRICULAR_DRAIN',
  SWAN_GANZ = 'SWAN_GANZ',
}

export enum BundleTypeEnum {
  CVC_BUNDLE = 'CVC_BUNDLE',
  VAP_BUNDLE = 'VAP_BUNDLE',
  CAUTI_BUNDLE = 'CAUTI_BUNDLE',
}

export enum DialysisModalityEnum {
  HD = 'HD',
  CRRT_CVVH = 'CRRT_CVVH',
  CRRT_CVVHD = 'CRRT_CVVHD',
  CRRT_CVVHDF = 'CRRT_CVVHDF',
  PD = 'PD',
  SLED = 'SLED',
  SCUF = 'SCUF',
}

export enum DialysisAnticoagulationEnum {
  HEPARIN = 'HEPARIN',
  CITRATE = 'CITRATE',
  NONE = 'NONE',
}

export enum ICUScoreTypeEnum {
  APACHE_II = 'APACHE_II',
  SAPS_3 = 'SAPS_3',
  SOFA = 'SOFA',
  TISS_28 = 'TISS_28',
}

export enum DeviceRemovalReasonEnum {
  NO_LONGER_NEEDED = 'NO_LONGER_NEEDED',
  INFECTION_SUSPECTED = 'INFECTION_SUSPECTED',
  MALFUNCTION = 'MALFUNCTION',
  ROUTINE_REPLACEMENT = 'ROUTINE_REPLACEMENT',
  ACCIDENTAL_REMOVAL = 'ACCIDENTAL_REMOVAL',
  DEATH = 'DEATH',
  DISCHARGE = 'DISCHARGE',
}

export enum NutritionFormulaEnum {
  STANDARD_1_0 = 'STANDARD_1_0',
  STANDARD_1_5 = 'STANDARD_1_5',
  HIGH_PROTEIN = 'HIGH_PROTEIN',
  RENAL = 'RENAL',
  HEPATIC = 'HEPATIC',
  DIABETIC = 'DIABETIC',
  PULMONARY = 'PULMONARY',
  IMMUNE_MODULATING = 'IMMUNE_MODULATING',
  SEMI_ELEMENTAL = 'SEMI_ELEMENTAL',
  FIBER_ENRICHED = 'FIBER_ENRICHED',
}

// ─── Standard bundle checklist templates ──────────────────────────────────────

export const CVC_BUNDLE_ITEMS = [
  'Hand hygiene performed',
  'Maximum sterile barrier precautions',
  'Chlorhexidine skin antisepsis',
  'Optimal catheter site selection (subclavian preferred)',
  'Daily review of line necessity',
  'Dressing intact and clean',
  'No unnecessary stopcocks',
] as const;

export const VAP_BUNDLE_ITEMS = [
  'Head of bed elevation 30-45 degrees',
  'Daily sedation interruption (SAT)',
  'Daily spontaneous breathing trial (SBT)',
  'DVT prophylaxis administered',
  'Oral care with chlorhexidine',
  'Subglottic suctioning (if available)',
  'Cuff pressure 20-30 cmH2O',
  'Circuit not routinely changed',
] as const;

export const CAUTI_BUNDLE_ITEMS = [
  'Catheter insertion indication documented',
  'Daily review of catheter necessity',
  'Aseptic insertion technique',
  'Closed drainage system intact',
  'Drainage bag below bladder level',
  'Perineal hygiene performed',
  'No routine catheter irrigation',
] as const;

// ─── APACHE II (12 physiological variables + age + chronic health) ──────────

export class CalculateApacheIIDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'Temperature (C)' }) @IsNumber() @Min(20) @Max(45) temperature!: number;
  @ApiProperty({ description: 'Mean Arterial Pressure (mmHg)' }) @IsNumber() @Min(0) @Max(300) meanArterialPressure!: number;
  @ApiProperty({ description: 'Heart rate (bpm)' }) @IsNumber() @Min(0) @Max(300) heartRate!: number;
  @ApiProperty({ description: 'Respiratory rate (rpm)' }) @IsNumber() @Min(0) @Max(80) respiratoryRate!: number;
  @ApiProperty({ description: 'FiO2 (percentage 21-100). >=50: uses A-a gradient; <50: uses PaO2' }) @IsNumber() @Min(21) @Max(100) fio2!: number;
  @ApiProperty({ description: 'PaO2 mmHg' }) @IsNumber() @Min(0) pao2!: number;
  @ApiPropertyOptional({ description: 'A-a gradient (mmHg). Auto-calculated if not provided when FiO2>=50' })
  @IsOptional() @IsNumber() @Min(0) aaGradient?: number;
  @ApiProperty({ description: 'Arterial pH' }) @IsNumber() @Min(6.5) @Max(8.0) arterialPh!: number;
  @ApiProperty({ description: 'Serum sodium (mEq/L)' }) @IsNumber() @Min(100) @Max(200) sodium!: number;
  @ApiProperty({ description: 'Serum potassium (mEq/L)' }) @IsNumber() @Min(1.0) @Max(10.0) potassium!: number;
  @ApiProperty({ description: 'Serum creatinine (mg/dL)' }) @IsNumber() @Min(0) @Max(20) creatinine!: number;
  @ApiProperty({ description: 'Acute renal failure (doubles creatinine points)' }) @IsBoolean() acuteRenalFailure!: boolean;
  @ApiProperty({ description: 'Hematocrit (%)' }) @IsNumber() @Min(0) @Max(80) hematocrit!: number;
  @ApiProperty({ description: 'WBC (x1000/mm3)' }) @IsNumber() @Min(0) @Max(200) wbc!: number;
  @ApiProperty({ description: 'Glasgow Coma Scale (3-15)' }) @IsNumber() @Min(3) @Max(15) gcs!: number;
  @ApiProperty({ description: 'Age in years' }) @IsNumber() @Min(0) @Max(130) age!: number;
  @ApiProperty({ description: 'Chronic health points (0-5). 2 if elective postop with severe organ insufficiency, 5 if emergency/non-op with severe organ insufficiency' })
  @IsNumber() @Min(0) @Max(5) chronicHealthPoints!: number;
}

/**
 * SOFA - Sequential Organ Failure Assessment (6 organ systems, each scored 0-4, max 24)
 * - Respiratory: PaO2/FiO2 ratio
 * - Coagulation: Platelet count
 * - Liver: Bilirubin
 * - Cardiovascular: MAP and vasopressor requirements
 * - CNS: Glasgow Coma Scale
 * - Renal: Creatinine or urine output
 */
export class CalculateSofaDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'PaO2/FiO2 ratio' }) @IsNumber() @Min(0) pao2fio2!: number;
  @ApiProperty({ description: 'On mechanical ventilation (required for respiratory score 3/4)' }) @IsBoolean() mechanicalVentilation!: boolean;
  @ApiProperty({ description: 'Platelets x10^3/uL' }) @IsNumber() @Min(0) platelets!: number;
  @ApiProperty({ description: 'Bilirubin mg/dL' }) @IsNumber() @Min(0) bilirubin!: number;
  @ApiProperty({ description: 'Mean Arterial Pressure (mmHg)' }) @IsNumber() @Min(0) cardiovascular!: number;
  @ApiProperty({ description: 'GCS (3-15)' }) @IsNumber() @Min(3) @Max(15) gcs!: number;
  @ApiProperty({ description: 'Creatinine mg/dL' }) @IsNumber() @Min(0) creatinine!: number;
  @ApiPropertyOptional({ description: 'Urine output mL/day' }) @IsOptional() @IsNumber() @Min(0) urineOutput?: number;
  @ApiPropertyOptional({ description: 'Norepinephrine dose mcg/kg/min' }) @IsOptional() @IsNumber() @Min(0) norepinephrineDose?: number;
  @ApiPropertyOptional({ description: 'Dobutamine dose mcg/kg/min' }) @IsOptional() @IsNumber() @Min(0) dobutamineDose?: number;
  @ApiPropertyOptional({ description: 'Dopamine dose mcg/kg/min' }) @IsOptional() @IsNumber() @Min(0) dopamineDose?: number;
  @ApiPropertyOptional({ description: 'Epinephrine dose mcg/kg/min' }) @IsOptional() @IsNumber() @Min(0) epinephrineDose?: number;
}

export class CalculateSaps3Dto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) age: number;
  @ApiProperty() @IsNumber() heartRate: number;
  @ApiProperty() @IsNumber() systolicBp: number;
  @ApiProperty() @IsNumber() @Min(3) @Max(15) gcs: number;
  @ApiProperty() @IsNumber() temperature: number;
  @ApiProperty() @IsNumber() creatinine: number;
  @ApiProperty() @IsNumber() bilirubin: number;
  @ApiProperty() @IsNumber() platelets: number;
  @ApiProperty() @IsNumber() pao2fio2: number;
  @ApiProperty() @IsBoolean() mechanicalVentilation: boolean;
  @ApiProperty() @IsBoolean() scheduledAdmission: boolean;
  @ApiProperty() @IsNumber() comorbiditiesScore: number;
  @ApiProperty() @IsString() admissionSource: string;
}

/**
 * TISS-28 - Therapeutic Intervention Scoring System (28 items).
 * Each boolean represents whether the intervention was performed.
 * Points per item are fixed and computed by the service.
 *
 * Workload classification:
 * - Class I (< 10): Observation
 * - Class II (10-19): Prophylactic measures
 * - Class III (20-39): Intensive nursing/medical care
 * - Class IV (>= 40): Maximum intensive treatment
 *
 * 1 TISS point ~ 10.6 minutes of nursing time.
 */
export class CalculateTiss28Dto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  // Basic activities
  @ApiProperty({ description: 'Standard monitoring (HR, RR, neuro, fluid balance) — 5 pts' }) @IsBoolean() standardMonitoring!: boolean;
  @ApiProperty({ description: 'Laboratory studies — 1 pt' }) @IsBoolean() labStudies!: boolean;
  @ApiProperty({ description: 'Single medication (IV/IM/SC/enteral) — 2 pts' }) @IsBoolean() singleMedication!: boolean;
  @ApiProperty({ description: 'Multiple IV medications — 3 pts' }) @IsBoolean() multipleIVMedications!: boolean;
  @ApiProperty({ description: 'Routine dressing changes — 1 pt' }) @IsBoolean() routineDressingChanges!: boolean;
  @ApiProperty({ description: 'Frequent dressing changes — 1 pt' }) @IsBoolean() frequentDressingChanges!: boolean;
  @ApiProperty({ description: 'Drain care — 3 pts' }) @IsBoolean() drainCare!: boolean;

  // Ventilatory support
  @ApiProperty({ description: 'Mechanical ventilation — 5 pts' }) @IsBoolean() mechanicalVentilation!: boolean;
  @ApiProperty({ description: 'Supplementary ventilatory care (PEEP, prone, iNO) — 2 pts' }) @IsBoolean() supplementaryVentCare!: boolean;
  @ApiProperty({ description: 'Care of artificial airways (TOT/trach) — 1 pt' }) @IsBoolean() artificialAirwayCare!: boolean;

  // Cardiovascular support
  @ApiProperty({ description: 'Single vasoactive medication — 3 pts' }) @IsBoolean() singleVasoactiveMed!: boolean;
  @ApiProperty({ description: 'Multiple vasoactive medications — 4 pts' }) @IsBoolean() multipleVasoactiveMeds!: boolean;
  @ApiProperty({ description: 'IV replacement of large fluid losses — 4 pts' }) @IsBoolean() largeFluidReplacement!: boolean;
  @ApiProperty({ description: 'Peripheral arterial catheter — 5 pts' }) @IsBoolean() peripheralArterialCatheter!: boolean;
  @ApiProperty({ description: 'CVP monitoring — 2 pts' }) @IsBoolean() cvpMonitoring!: boolean;
  @ApiProperty({ description: 'Pulmonary artery catheter (Swan-Ganz) — 8 pts' }) @IsBoolean() pulmonaryArteryCatheter!: boolean;

  // Renal support
  @ApiProperty({ description: 'Active diuresis (furosemide > 0.5 mg/kg/day) — 3 pts' }) @IsBoolean() activeDiuresis!: boolean;
  @ApiProperty({ description: 'Active renal replacement therapy — 3 pts' }) @IsBoolean() renalReplacementTherapy!: boolean;
  @ApiProperty({ description: 'Urine output measurement (SVD) — 2 pts' }) @IsBoolean() urineOutputMeasurement!: boolean;

  // Neurological support
  @ApiProperty({ description: 'ICP monitoring — 4 pts' }) @IsBoolean() icpMonitoring!: boolean;

  // Metabolic support
  @ApiProperty({ description: 'Treatment of metabolic acidosis/alkalosis — 4 pts' }) @IsBoolean() metabolicTreatment!: boolean;
  @ApiProperty({ description: 'IV hyperalimentation (TPN) — 3 pts' }) @IsBoolean() ivHyperalimentation!: boolean;
  @ApiProperty({ description: 'Enteral feeding via tube — 2 pts' }) @IsBoolean() enteralFeeding!: boolean;

  // Specific interventions
  @ApiProperty({ description: 'Single specific intervention (intubation, pacing, etc.) — 3 pts' }) @IsBoolean() singleSpecificIntervention!: boolean;
  @ApiProperty({ description: 'Multiple specific interventions — 5 pts' }) @IsBoolean() multipleSpecificInterventions!: boolean;
  @ApiProperty({ description: 'Specific interventions outside ICU — 5 pts' }) @IsBoolean() interventionsOutsideICU!: boolean;

  /**
   * Legacy support: if provided, items[] values are summed directly (backward compatibility).
   * When both boolean fields and items are provided, boolean fields take precedence.
   */
  @ApiPropertyOptional({ description: 'Legacy: array of TISS-28 item scores (deprecated, use boolean fields)' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  items?: number[];
}

// ─── Vasoactive Drugs Calculator ──────────────────────────────────────────

/**
 * Vasoactive drug dose calculator.
 *
 * Formulas:
 * - Dose (mcg/kg/min) = (concentration_mg_per_mL * rate_mL_per_h * 1000) / (weight_kg * 60)
 * - Rate (mL/h) = (dose_mcg_kg_min * weight_kg * 60) / (concentration_mg_per_mL * 1000)
 *
 * Provide targetDoseMcgKgMin to get required pump rate, OR
 * provide currentRateMlH to get current dose.
 */
export class VasoactiveDrugCalculatorDto {
  @ApiProperty({ enum: VasoactiveDrugName, description: 'Drug name' })
  @IsEnum(VasoactiveDrugName)
  drug!: VasoactiveDrugName;

  @ApiProperty({ description: 'Patient weight (kg)' }) @IsNumber() @Min(1) @Max(500) weightKg!: number;
  @ApiProperty({ description: 'Dilution concentration (mg/mL)' }) @IsNumber() @Min(0.001) concentrationMgMl!: number;

  @ApiPropertyOptional({ description: 'Target dose (mcg/kg/min) — set this to calculate required pump rate' })
  @IsOptional() @IsNumber() @Min(0) targetDoseMcgKgMin?: number;

  @ApiPropertyOptional({ description: 'Current pump rate (mL/h) — set this to calculate current dose' })
  @IsOptional() @IsNumber() @Min(0) currentRateMlH?: number;

  @ApiPropertyOptional({ description: 'Target MAP (mmHg)' })
  @IsOptional() @IsNumber() @Min(30) @Max(200) targetMAP?: number;
}

// ─── Sedation Protocol ────────────────────────────────────────────────────

/**
 * Sedation protocol assessment including RASS, BPS pain score, SAT trial, CAM-ICU.
 *
 * RASS (Richmond Agitation-Sedation Scale): -5 to +4
 * BPS (Behavioral Pain Scale): 3-12 (>5 = significant pain)
 * SAT (Spontaneous Awakening Trial): daily sedation interruption
 */
export class SedationDrugEntryDto {
  @ApiProperty({ enum: SedationDrugName }) @IsEnum(SedationDrugName) drug!: SedationDrugName;
  @ApiProperty({ description: 'Current dose/rate' }) @IsNumber() @Min(0) dose!: number;
  @ApiProperty({ description: 'Dose unit (e.g., mcg/kg/h, mg/h)' }) @IsString() doseUnit!: string;
}

export class CreateSedationAssessmentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ description: 'RASS score (-5 to +4)' }) @IsNumber() @Min(-5) @Max(4) rass!: number;
  @ApiProperty({ description: 'RASS target' }) @IsNumber() @Min(-5) @Max(4) rassTarget!: number;
  @ApiPropertyOptional({ description: 'BPS pain score (3-12)' }) @IsOptional() @IsNumber() @Min(3) @Max(12) bps?: number;
  @ApiPropertyOptional({ description: 'CPOT pain score (0-8)' }) @IsOptional() @IsNumber() @Min(0) @Max(8) cpot?: number;
  @ApiPropertyOptional({ description: 'CAM-ICU result (positive = delirium)' }) @IsOptional() @IsBoolean() camIcuPositive?: boolean;
  @ApiProperty({ description: 'SAT (Spontaneous Awakening Trial) performed today' }) @IsBoolean() satPerformed!: boolean;
  @ApiPropertyOptional({ description: 'SAT passed (patient tolerates awakening)' }) @IsOptional() @IsBoolean() satPassed?: boolean;
  @ApiPropertyOptional({ description: 'Reason SAT not performed' }) @IsOptional() @IsString() satNotPerformedReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() satOutcome?: string;
  @ApiPropertyOptional({ description: 'Current sedation drugs' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SedationDrugEntryDto)
  sedationDrugs?: SedationDrugEntryDto[];
  // Legacy fields kept for backward compatibility
  @ApiPropertyOptional() @IsOptional() @IsString() sedativeDrug?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sedativeDose?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() analgesicDrug?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() analgesicDose?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Mechanical Ventilation ───────────────────────────────────────────────

/**
 * Mechanical ventilation parameters including all modes and calculated values.
 * Auto-calculates: P/F ratio, driving pressure, static compliance, Vt/IBW.
 * Provides lung-protective ventilation alerts.
 */
export class CreateVentilationRecordDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: VentilationModeEnum, description: 'Ventilation mode' })
  @IsEnum(VentilationModeEnum) mode!: VentilationModeEnum;

  @ApiPropertyOptional({ description: 'Tidal volume (mL)' }) @IsOptional() @IsNumber() @Min(50) @Max(2000) tidalVolume?: number;
  @ApiPropertyOptional({ description: 'Set respiratory rate (rpm)' }) @IsOptional() @IsNumber() @Min(4) @Max(60) respiratoryRate?: number;
  @ApiPropertyOptional({ description: 'Measured respiratory rate (rpm)' }) @IsOptional() @IsNumber() measuredRR?: number;
  @ApiPropertyOptional({ description: 'FiO2 (percentage 21-100)' }) @IsOptional() @IsNumber() @Min(21) @Max(100) fio2?: number;
  @ApiPropertyOptional({ description: 'PEEP (cmH2O)' }) @IsOptional() @IsNumber() @Min(0) @Max(30) peep?: number;
  @ApiPropertyOptional({ description: 'Pressure support (cmH2O)' }) @IsOptional() @IsNumber() @Min(0) @Max(40) pressureSupport?: number;
  @ApiPropertyOptional({ description: 'Pressure control (cmH2O)' }) @IsOptional() @IsNumber() pressureControl?: number;
  @ApiPropertyOptional({ description: 'Plateau pressure (cmH2O)' }) @IsOptional() @IsNumber() @Min(0) @Max(60) plateauPressure?: number;
  @ApiPropertyOptional({ description: 'Peak inspiratory pressure (cmH2O)' }) @IsOptional() @IsNumber() peakPressure?: number;
  @ApiPropertyOptional({ description: 'Mean airway pressure (cmH2O)' }) @IsOptional() @IsNumber() meanAirwayPressure?: number;
  @ApiPropertyOptional({ description: 'Compliance (mL/cmH2O)' }) @IsOptional() @IsNumber() compliance?: number;
  @ApiPropertyOptional({ description: 'Resistance (cmH2O/L/s)' }) @IsOptional() @IsNumber() resistance?: number;
  @ApiPropertyOptional({ description: 'PaO2 (mmHg) for P/F calculation' }) @IsOptional() @IsNumber() @Min(0) pao2?: number;
  @ApiPropertyOptional({ description: 'PaCO2 (mmHg)' }) @IsOptional() @IsNumber() paco2?: number;
  @ApiPropertyOptional({ description: 'SpO2 (%)' }) @IsOptional() @IsNumber() spo2?: number;
  @ApiPropertyOptional({ description: 'Ideal body weight (kg) for mL/kg calculation' }) @IsOptional() @IsNumber() @Min(1) idealBodyWeightKg?: number;
  @ApiPropertyOptional({ description: 'Minute ventilation (L/min)' }) @IsOptional() @IsNumber() minuteVentilation?: number;
  @ApiPropertyOptional({ description: 'I:E ratio', example: '1:2' }) @IsOptional() @IsString() ieRatio?: string;
  @ApiPropertyOptional({ description: 'Auto-PEEP (cmH2O)' }) @IsOptional() @IsNumber() autoPeep?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Dialysis / CRRT ──────────────────────────────────────────────────────

/**
 * Dialysis/CRRT session recording with all modalities, access, anticoagulation.
 */
export class CreateDialysisPrescriptionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: DialysisModalityEnum, description: 'Dialysis modality' })
  @IsEnum(DialysisModalityEnum) modality!: DialysisModalityEnum;

  @ApiProperty({ description: 'Access type (e.g., temporary catheter, AV fistula)' }) @IsString() @IsNotEmpty() accessType!: string;
  @ApiProperty({ description: 'Access site' }) @IsString() @IsNotEmpty() accessSite!: string;

  @ApiPropertyOptional({ enum: DialysisAnticoagulationEnum })
  @IsOptional() @IsEnum(DialysisAnticoagulationEnum) anticoagulation?: DialysisAnticoagulationEnum;
  @ApiPropertyOptional() @IsOptional() @IsNumber() anticoagulationDose?: number;

  @ApiProperty({ description: 'Blood flow rate Qb (mL/min)' }) @IsNumber() @Min(50) @Max(500) qb!: number;
  @ApiPropertyOptional({ description: 'Dialysate flow rate Qd (mL/h)' }) @IsOptional() @IsNumber() @Min(0) qd?: number;
  @ApiPropertyOptional({ description: 'Replacement fluid rate Qr (mL/h)' }) @IsOptional() @IsNumber() @Min(0) qr?: number;
  @ApiProperty({ description: 'Net ultrafiltration target (mL/h or total mL)' }) @IsNumber() @Min(0) uf!: number;
  @ApiPropertyOptional({ description: 'Duration (hours)' }) @IsOptional() @IsNumber() @Min(0.5) @Max(72) durationHours?: number;
  @ApiPropertyOptional({ description: 'Target Kt/V' }) @IsOptional() @IsNumber() @Min(0) targetKtV?: number;
  @ApiPropertyOptional({ description: 'Achieved Kt/V' }) @IsOptional() @IsNumber() @Min(0) achievedKtV?: number;

  @ApiPropertyOptional({ description: 'Pre-session weight (kg)' }) @IsOptional() @IsNumber() preWeight?: number;
  @ApiPropertyOptional({ description: 'Post-session weight (kg)' }) @IsOptional() @IsNumber() postWeight?: number;
  @ApiPropertyOptional({ description: 'Pre-session BUN (mg/dL)' }) @IsOptional() @IsNumber() preBUN?: number;
  @ApiPropertyOptional({ description: 'Post-session BUN (mg/dL)' }) @IsOptional() @IsNumber() postBUN?: number;
  @ApiPropertyOptional({ description: 'Complications during session' })
  @IsOptional() @IsArray() @IsString({ each: true }) complications?: string[];

  @ApiPropertyOptional({ description: 'Session start time' }) @IsOptional() @IsDateString() startTime?: string;
  @ApiPropertyOptional({ description: 'Session end time' }) @IsOptional() @IsDateString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Invasive Devices ─────────────────────────────────────────────────────

/**
 * Invasive device tracking with typed device types, bundle compliance, and removal tracking.
 */
export class BundleChecklistItemDto {
  @ApiProperty({ description: 'Checklist item description' }) @IsString() item!: string;
  @ApiProperty({ description: 'Is compliant' }) @IsBoolean() compliant!: boolean;
  @ApiPropertyOptional({ description: 'Reason for non-compliance' }) @IsOptional() @IsString() nonComplianceReason?: string;
}

export class CreateInvasiveDeviceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: InvasiveDeviceTypeEnum, description: 'Device type' })
  @IsEnum(InvasiveDeviceTypeEnum) deviceType!: InvasiveDeviceTypeEnum;

  @ApiProperty({ description: 'Insertion site (e.g., right subclavian, left radial)' }) @IsString() @IsNotEmpty() site!: string;
  @ApiProperty({ description: 'Insertion date/time' }) @IsDateString() insertedAt!: string;
  @ApiPropertyOptional({ description: 'Inserted by (professional ID)' }) @IsOptional() @IsString() insertedById?: string;
  @ApiPropertyOptional({ description: 'Is device still active' }) @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'Removal date/time' }) @IsOptional() @IsDateString() removalDate?: string;
  @ApiPropertyOptional({ enum: DeviceRemovalReasonEnum }) @IsOptional() @IsEnum(DeviceRemovalReasonEnum) removalReason?: DeviceRemovalReasonEnum;
  @ApiPropertyOptional({ description: 'Bundle compliance checklist' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BundleChecklistItemDto)
  bundleChecklist?: BundleChecklistItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class UpdateDeviceBundleChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() deviceDocumentId!: string;
  @ApiProperty({ description: 'Checklist items with boolean values' })
  checklist!: Record<string, boolean>;
  @ApiPropertyOptional({ description: 'Typed bundle checklist items' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BundleChecklistItemDto)
  typedChecklist?: BundleChecklistItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Prevention Bundles ───────────────────────────────────────────────────

/**
 * Prevention bundle compliance recording (CVC, VAP, CAUTI).
 * Supports both legacy Record<string, boolean> and typed BundleChecklistItemDto[].
 */
export class CreateBundleChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: BundleTypeEnum, description: 'Bundle type' })
  @IsEnum(BundleTypeEnum) bundleType!: BundleTypeEnum;

  @ApiProperty({ description: 'Checklist items (legacy Record<string, boolean>)' })
  items!: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Typed checklist items with compliance details' })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => BundleChecklistItemDto)
  typedItems?: BundleChecklistItemDto[];

  @ApiPropertyOptional({ description: 'Date of assessment' }) @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Prone Positioning ────────────────────────────────────────────────────

/**
 * Typed safety checklist for pronation sessions.
 */
export class PronationSafetyChecklistDto {
  @ApiProperty({ description: 'ETT secured' }) @IsBoolean() ettSecured!: boolean;
  @ApiProperty({ description: 'Eyes protected (taped/lubricated)' }) @IsBoolean() eyesProtected!: boolean;
  @ApiProperty({ description: 'All lines and tubes checked' }) @IsBoolean() linesChecked!: boolean;
  @ApiProperty({ description: 'Electrodes repositioned' }) @IsBoolean() electrodesRepositioned!: boolean;
  @ApiProperty({ description: 'Adequate staff present (min 5)' }) @IsBoolean() adequateStaff!: boolean;
  @ApiProperty({ description: 'Pressure areas padded' }) @IsBoolean() pressureAreasPadded!: boolean;
  @ApiProperty({ description: 'Enteral nutrition paused' }) @IsBoolean() enteralNutritionPaused!: boolean;
  @ApiProperty({ description: 'Emergency equipment at bedside' }) @IsBoolean() emergencyEquipmentReady!: boolean;
}

/**
 * Pronation session with typed safety checklist, P/F ratio before/after, complications tracking.
 */
export class CreateProneSessionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsDateString() startedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endedAt?: string;
  @ApiProperty({ description: 'P/F ratio before prone' }) @IsNumber() @Min(0) pfBefore!: number;
  @ApiPropertyOptional({ description: 'P/F ratio after prone' }) @IsOptional() @IsNumber() @Min(0) pfAfter?: number;

  /** Legacy field — Record<string, boolean> still accepted */
  @ApiProperty({ description: 'Safety checklist before prone' })
  safetyChecklist!: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Typed safety checklist (preferred over safetyChecklist)' })
  @IsOptional() @ValidateNested() @Type(() => PronationSafetyChecklistDto)
  typedSafetyChecklist?: PronationSafetyChecklistDto;

  @ApiPropertyOptional({ description: 'Complications (array or single string)' })
  @IsOptional() @IsArray() @IsString({ each: true }) complicationsList?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() complications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Daily Goals ──────────────────────────────────────────────────────────

/**
 * ICU daily goals checklist with structured items for sedation, ventilation,
 * nutrition, prophylaxis, labs, imaging, consultations, discharge criteria.
 */
export class DailyGoalChecklistItemDto {
  @ApiProperty({ description: 'Goal description' }) @IsString() description!: string;
  @ApiProperty({ description: 'Is completed' }) @IsBoolean() completed!: boolean;
}

export class CreateDailyGoalsDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiPropertyOptional({ description: 'Date for goals' }) @IsOptional() @IsDateString() date?: string;
  @ApiProperty({ description: 'Sedation goal (e.g., RASS -2)' }) @IsString() sedationGoal!: string;
  @ApiProperty({ description: 'Ventilation plan (e.g., wean FiO2, SBT today)' }) @IsString() ventilationGoal!: string;
  @ApiProperty({ description: 'Nutrition target' }) @IsString() nutritionGoal!: string;
  @ApiProperty({ description: 'Prophylaxis goal (DVT, stress ulcer, etc.)' }) @IsString() prophylaxisGoal!: string;
  @ApiProperty({ description: 'Exams/labs goal' }) @IsString() examsGoal!: string;
  @ApiProperty({ description: 'Mobility/physical therapy goal' }) @IsString() mobilityGoal!: string;
  @ApiProperty({ description: 'Overall plan for the day' }) @IsString() planForDay!: string;
  @ApiPropertyOptional({ description: 'DVT prophylaxis given' }) @IsOptional() @IsBoolean() dvtProphylaxis?: boolean;
  @ApiPropertyOptional({ description: 'Stress ulcer prophylaxis given' }) @IsOptional() @IsBoolean() stressUlcerProphylaxis?: boolean;
  @ApiPropertyOptional({ description: 'Head of bed >= 30 degrees' }) @IsOptional() @IsBoolean() headOfBed30?: boolean;
  @ApiPropertyOptional({ description: 'Glycemic control adequate' }) @IsOptional() @IsBoolean() glycemicControl?: boolean;
  @ApiPropertyOptional({ description: 'Glucose control target' }) @IsOptional() @IsString() glucoseControl?: string;
  @ApiPropertyOptional({ description: 'Labs needed today' })
  @IsOptional() @IsArray() @IsString({ each: true }) labsNeeded?: string[];
  @ApiPropertyOptional({ description: 'Imaging needed today' })
  @IsOptional() @IsArray() @IsString({ each: true }) imagingNeeded?: string[];
  @ApiPropertyOptional({ description: 'Consultations needed' })
  @IsOptional() @IsArray() @IsString({ each: true }) consultationsNeeded?: string[];
  @ApiPropertyOptional({ description: 'Discharge criteria / barriers' }) @IsOptional() @IsString() dischargeCriteria?: string;
  @ApiPropertyOptional({ description: 'Family communication planned' }) @IsOptional() @IsBoolean() familyCommunication?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() additionalNotes?: string;
  @ApiPropertyOptional({ description: 'Custom checklist items' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DailyGoalChecklistItemDto)
  customItems?: DailyGoalChecklistItemDto[];
}

// ─── ECMO ─────────────────────────────────────────────────────────────────

export class CreateEcmoRecordDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['VV', 'VA'] }) @IsString() @IsNotEmpty() ecmoType: string;
  @ApiProperty({ description: 'Blood flow L/min' }) @IsNumber() flow: number;
  @ApiProperty({ description: 'Sweep gas flow L/min' }) @IsNumber() sweep: number;
  @ApiProperty({ description: 'FdO2 (%)' }) @IsNumber() fdo2: number;
  @ApiPropertyOptional({ description: 'RPM' }) @IsOptional() @IsNumber() rpm?: number;
  @ApiPropertyOptional({ description: 'ACT or APTT value' }) @IsOptional() @IsNumber() anticoagulationValue?: number;
  @ApiPropertyOptional({ description: 'Heparin dose IU/h' }) @IsOptional() @IsNumber() heparinDose?: number;
  @ApiPropertyOptional({ description: 'Pre-membrane pressure' }) @IsOptional() @IsNumber() preMembranePressure?: number;
  @ApiPropertyOptional({ description: 'Post-membrane pressure' }) @IsOptional() @IsNumber() postMembranePressure?: number;
  @ApiPropertyOptional({ description: 'Transmembrane pressure' }) @IsOptional() @IsNumber() transmembranePressure?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Enteral Nutrition ────────────────────────────────────────────────────

/**
 * Enteral nutrition management with formula types, gastric residual checks, and caloric targets.
 */
export class CreateEnteralNutritionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: NutritionFormulaEnum, description: 'Nutrition formula type' })
  @IsEnum(NutritionFormulaEnum) formula!: NutritionFormulaEnum;

  @ApiProperty({ description: 'Infusion rate (mL/h)' }) @IsNumber() @Min(0) @Max(200) rateMlH!: number;
  @ApiProperty({ description: 'Target volume (mL/24h)' }) @IsNumber() @Min(0) targetVolume24h!: number;
  @ApiPropertyOptional({ description: 'Current volume infused (mL)' }) @IsOptional() @IsNumber() @Min(0) currentVolumeInfused?: number;
  @ApiPropertyOptional({ description: 'Gastric residual volume (mL)' }) @IsOptional() @IsNumber() @Min(0) gastricResidual?: number;
  @ApiPropertyOptional({ description: 'Gastric residual threshold (mL)', example: 500 }) @IsOptional() @IsNumber() gastricResidualThreshold?: number;
  @ApiPropertyOptional({ description: 'Caloric target (kcal/day)' }) @IsOptional() @IsNumber() caloricTarget?: number;
  @ApiPropertyOptional({ description: 'Protein target (g/day)' }) @IsOptional() @IsNumber() proteinTarget?: number;
  @ApiPropertyOptional({ description: 'Route: NGT, NJT, gastrostomy, jejunostomy' }) @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional({ description: 'Head of bed elevated >= 30 degrees' }) @IsOptional() @IsBoolean() headOfBedElevated?: boolean;
  @ApiPropertyOptional({ description: 'Prokinetic prescribed' }) @IsOptional() @IsBoolean() prokinetic?: boolean;
  @ApiPropertyOptional({ description: 'Nutrition paused' }) @IsOptional() @IsBoolean() paused?: boolean;
  @ApiPropertyOptional({ description: 'Pause reason' }) @IsOptional() @IsString() pauseReason?: string;
  @ApiPropertyOptional({ description: 'Complications (e.g., diarrhea, vomiting)' })
  @IsOptional() @IsArray() @IsString({ each: true }) complications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── ICU Flowsheet ────────────────────────────────────────────────────────

export class GetFlowsheetDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}

// ─── Weaning Assessment Response Interfaces ──────────────────────────────────

export interface WeaningAssessmentResult {
  readyForSBT: boolean;
  criteria: WeaningCriteria;
  recommendations: string[];
}

export interface WeaningCriteria {
  adequateOxygenation: boolean;
  hemodynamicallyStable: boolean;
  adequateConsciousness: boolean;
  adequateCoughReflex: boolean;
  minimalSecretions: boolean;
  resolvedAcutePhase: boolean;
  fiO2LessOrEqual40: boolean;
  peepLessOrEqual8: boolean;
  noHighVasopressors: boolean;
  rapidShallowBreathingIndex?: number;
  rsbiAcceptable: boolean;
}

// ─── Vasoactive Drug Standard Dose Ranges ────────────────────────────────────

export const VASOACTIVE_DRUG_RANGES: Record<VasoactiveDrugName, { min: number; max: number; unit: string }> = {
  [VasoactiveDrugName.NOREPINEPHRINE]: { min: 0.01, max: 2.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.DOBUTAMINE]: { min: 2.0, max: 20.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.DOPAMINE]: { min: 1.0, max: 20.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.NITROPRUSSIDE]: { min: 0.3, max: 10.0, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.EPINEPHRINE]: { min: 0.01, max: 0.5, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.VASOPRESSIN]: { min: 0.01, max: 0.04, unit: 'U/min' },
  [VasoactiveDrugName.MILRINONE]: { min: 0.125, max: 0.75, unit: 'mcg/kg/min' },
  [VasoactiveDrugName.PHENYLEPHRINE]: { min: 0.1, max: 5.0, unit: 'mcg/kg/min' },
};

// ─── Device Days-in-situ Alert Thresholds ────────────────────────────────────

export const DEVICE_DAYS_THRESHOLDS: Partial<Record<InvasiveDeviceTypeEnum, number>> = {
  [InvasiveDeviceTypeEnum.CVC]: 7,
  [InvasiveDeviceTypeEnum.SVD]: 5,
  [InvasiveDeviceTypeEnum.ARTERIAL_LINE]: 7,
  [InvasiveDeviceTypeEnum.PICC]: 14,
  [InvasiveDeviceTypeEnum.NASOGASTRIC_TUBE]: 14,
  [InvasiveDeviceTypeEnum.DIALYSIS_CATHETER]: 21,
};
