import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VasoactiveDrugEnum {
  NOREPINEPHRINE = 'NOREPINEPHRINE',
  DOBUTAMINE = 'DOBUTAMINE',
  DOPAMINE = 'DOPAMINE',
  NITROPRUSSIDE = 'NITROPRUSSIDE',
  EPINEPHRINE = 'EPINEPHRINE',
  VASOPRESSIN = 'VASOPRESSIN',
  MILRINONE = 'MILRINONE',
  PHENYLEPHRINE = 'PHENYLEPHRINE',
}

export enum SedationDrugEnum {
  MIDAZOLAM = 'MIDAZOLAM',
  PROPOFOL = 'PROPOFOL',
  DEXMEDETOMIDINE = 'DEXMEDETOMIDINE',
  KETAMINE = 'KETAMINE',
  FENTANYL = 'FENTANYL',
  REMIFENTANIL = 'REMIFENTANIL',
  MORPHINE = 'MORPHINE',
}

// ─── APACHE II ────────────────────────────────────────────────────────────────

export class ApacheIIDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Temperature (°C)' })
  @IsNumber() @Min(20) @Max(45)
  temperature!: number;

  @ApiProperty({ description: 'Mean Arterial Pressure (mmHg)' })
  @IsNumber() @Min(0) @Max(300)
  meanArterialPressure!: number;

  @ApiProperty({ description: 'Heart rate (bpm)' })
  @IsNumber() @Min(0) @Max(300)
  heartRate!: number;

  @ApiProperty({ description: 'Respiratory rate (rpm)' })
  @IsNumber() @Min(0) @Max(80)
  respiratoryRate!: number;

  @ApiProperty({ description: 'FiO2 percentage (21-100)' })
  @IsNumber() @Min(21) @Max(100)
  fio2!: number;

  @ApiProperty({ description: 'PaO2 (mmHg)' })
  @IsNumber() @Min(0)
  pao2!: number;

  @ApiPropertyOptional({ description: 'A-a gradient (mmHg) — required when FiO2 >= 50%' })
  @IsOptional()
  @IsNumber() @Min(0)
  aaGradient?: number;

  @ApiProperty({ description: 'Arterial pH' })
  @IsNumber() @Min(6.5) @Max(8.0)
  arterialPh!: number;

  @ApiProperty({ description: 'Serum sodium (mEq/L)' })
  @IsNumber() @Min(100) @Max(200)
  sodium!: number;

  @ApiProperty({ description: 'Serum potassium (mEq/L)' })
  @IsNumber() @Min(1.0) @Max(10.0)
  potassium!: number;

  @ApiProperty({ description: 'Serum creatinine (mg/dL)' })
  @IsNumber() @Min(0) @Max(20)
  creatinine!: number;

  @ApiProperty({ description: 'Acute renal failure (doubles creatinine points)' })
  @IsBoolean()
  acuteRenalFailure!: boolean;

  @ApiProperty({ description: 'Hematocrit (%)' })
  @IsNumber() @Min(0) @Max(80)
  hematocrit!: number;

  @ApiProperty({ description: 'WBC (x1000/mm³)' })
  @IsNumber() @Min(0) @Max(200)
  wbc!: number;

  @ApiProperty({ description: 'Glasgow Coma Scale (3-15)' })
  @IsInt() @Min(3) @Max(15)
  gcs!: number;

  @ApiProperty({ description: 'Age in years' })
  @IsInt() @Min(0) @Max(130)
  age!: number;

  @ApiProperty({
    description: 'Chronic health points: 0 = none; 2 = elective postop; 5 = emergency/non-op with severe insufficiency',
  })
  @IsInt() @Min(0) @Max(5)
  chronicHealthPoints!: number;
}

// ─── SAPS 3 ───────────────────────────────────────────────────────────────────

export class Saps3Dto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Age in years' })
  @IsInt() @Min(0) @Max(130)
  age!: number;

  @ApiProperty({ description: 'Comorbidities score (0-9)' })
  @IsInt() @Min(0) @Max(9)
  comorbiditiesScore!: number;

  @ApiProperty({ description: 'In-hospital prior to ICU (>= 14 days)' })
  @IsBoolean()
  priorHospitalization!: boolean;

  @ApiProperty({ description: 'ICU admission reason score (0-13)' })
  @IsInt() @Min(0) @Max(13)
  admissionReasonScore!: number;

  @ApiProperty({ description: 'Surgery status score (0-4)' })
  @IsInt() @Min(0) @Max(4)
  surgeryScore!: number;

  @ApiProperty({ description: 'Glasgow Coma Scale (3-15)' })
  @IsInt() @Min(3) @Max(15)
  gcs!: number;

  @ApiProperty({ description: 'Bilirubin (mg/dL)' })
  @IsNumber() @Min(0)
  bilirubin!: number;

  @ApiProperty({ description: 'Body temperature (°C)' })
  @IsNumber() @Min(20) @Max(45)
  temperature!: number;

  @ApiProperty({ description: 'Creatinine (mg/dL)' })
  @IsNumber() @Min(0) @Max(20)
  creatinine!: number;

  @ApiProperty({ description: 'Heart rate (bpm)' })
  @IsNumber() @Min(0) @Max(300)
  heartRate!: number;

  @ApiProperty({ description: 'Systolic BP (mmHg)' })
  @IsNumber() @Min(0) @Max(300)
  systolicBP!: number;

  @ApiProperty({ description: 'PaO2/FiO2 ratio' })
  @IsNumber() @Min(0)
  pfRatio!: number;

  @ApiProperty({ description: 'WBC (x1000/mm³)' })
  @IsNumber() @Min(0) @Max(200)
  wbc!: number;

  @ApiProperty({ description: 'Platelet count (x1000/mm³)' })
  @IsNumber() @Min(0) @Max(2000)
  platelets!: number;

  @ApiProperty({ description: 'pH' })
  @IsNumber() @Min(6.5) @Max(8.0)
  ph!: number;

  @ApiProperty({ description: 'Vasopressor use' })
  @IsBoolean()
  vasopressorUse!: boolean;
}

// ─── SOFA ─────────────────────────────────────────────────────────────────────

export class SofaScoreDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'PaO2/FiO2 ratio' })
  @IsNumber() @Min(0)
  pfRatio!: number;

  @ApiProperty({ description: 'Mechanical ventilation (impacts respiratory score)' })
  @IsBoolean()
  onVentilator!: boolean;

  @ApiProperty({ description: 'Platelet count (x1000/mm³)' })
  @IsNumber() @Min(0) @Max(2000)
  platelets!: number;

  @ApiProperty({ description: 'Total bilirubin (mg/dL)' })
  @IsNumber() @Min(0)
  bilirubin!: number;

  @ApiProperty({ description: 'Glasgow Coma Scale (3-15)' })
  @IsInt() @Min(3) @Max(15)
  gcs!: number;

  @ApiProperty({ description: 'Mean Arterial Pressure (mmHg)' })
  @IsNumber() @Min(0) @Max(200)
  map!: number;

  @ApiPropertyOptional({ description: 'Dopamine dose (mcg/kg/min)' })
  @IsOptional()
  @IsNumber() @Min(0)
  dopamineDose?: number;

  @ApiPropertyOptional({ description: 'Dobutamine in use' })
  @IsOptional()
  @IsBoolean()
  dobutamineUse?: boolean;

  @ApiPropertyOptional({ description: 'Epinephrine dose (mcg/kg/min)' })
  @IsOptional()
  @IsNumber() @Min(0)
  epinephrineDose?: number;

  @ApiPropertyOptional({ description: 'Norepinephrine dose (mcg/kg/min)' })
  @IsOptional()
  @IsNumber() @Min(0)
  norepinephrineDose?: number;

  @ApiProperty({ description: 'Creatinine (mg/dL)' })
  @IsNumber() @Min(0) @Max(20)
  creatinine!: number;

  @ApiPropertyOptional({ description: 'Urine output (mL/day)' })
  @IsOptional()
  @IsNumber() @Min(0)
  urineOutput?: number;
}

// ─── TISS-28 ──────────────────────────────────────────────────────────────────

export class Tiss28Dto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  // Basic activities
  @ApiProperty() @IsBoolean() monitoringStandardVitals!: boolean;
  @ApiProperty() @IsBoolean() laboratoryInvestigations!: boolean;
  @ApiProperty() @IsBoolean() singleMedication!: boolean;
  @ApiProperty() @IsBoolean() intravenousMedications!: boolean;
  @ApiProperty() @IsBoolean() routineHygiene!: boolean;
  @ApiProperty() @IsBoolean() woundCare!: boolean;
  @ApiProperty() @IsBoolean() drainsManagement!: boolean;

  // Ventilatory support
  @ApiProperty() @IsBoolean() mechanicalVentilation!: boolean;
  @ApiProperty() @IsBoolean() weaning!: boolean;
  @ApiProperty() @IsBoolean() noninvasiveVentilation!: boolean;
  @ApiProperty() @IsBoolean() supplementalO2!: boolean;

  // Cardiovascular support
  @ApiProperty() @IsBoolean() singleVasoactiveAgent!: boolean;
  @ApiProperty() @IsBoolean() multipleVasoactiveAgents!: boolean;
  @ApiProperty() @IsBoolean() iabp!: boolean;
  @ApiProperty() @IsBoolean() pacingCatheter!: boolean;
  @ApiProperty() @IsBoolean() hemofiltration!: boolean;
  @ApiProperty() @IsBoolean() arterialLine!: boolean;
  @ApiProperty() @IsBoolean() pulmonaryArteryCatheter!: boolean;
  @ApiProperty() @IsBoolean() cvp!: boolean;
  @ApiProperty() @IsBoolean() cpr!: boolean;

  // Renal support
  @ApiProperty() @IsBoolean() renalReplacement!: boolean;

  // Neurological monitoring
  @ApiProperty() @IsBoolean() icpMonitoring!: boolean;

  // Metabolic interventions
  @ApiProperty() @IsBoolean() acidosisAlkalosisManagement!: boolean;
  @ApiProperty() @IsBoolean() parenteralNutrition!: boolean;
  @ApiProperty() @IsBoolean() enteralNutrition!: boolean;

  // Specific interventions
  @ApiProperty() @IsBoolean() specificInterventionsInICU!: boolean;
  @ApiProperty() @IsBoolean() specificInterventionsOutsideICU!: boolean;
}

// ─── Vasoactive Drug Calculator ───────────────────────────────────────────────

export class VasoactiveDrugDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: VasoactiveDrugEnum, description: 'Vasoactive drug' })
  @IsEnum(VasoactiveDrugEnum)
  drug!: VasoactiveDrugEnum;

  @ApiProperty({ description: 'Patient weight (kg)' })
  @IsNumber() @Min(1) @Max(300)
  weight!: number;

  @ApiProperty({ description: 'Ampoule concentration (mcg/mL)' })
  @IsNumber() @Min(0)
  concentration!: number;

  @ApiProperty({ description: 'Total dilution volume (mL) in the syringe/bag' })
  @IsNumber() @Min(0)
  dilutionVolume!: number;

  @ApiPropertyOptional({ description: 'Desired dose (mcg/kg/min) — calculates pump rate' })
  @IsOptional()
  @IsNumber() @Min(0)
  desiredDoseMcgKgMin?: number;

  @ApiPropertyOptional({ description: 'Pump rate (mL/h) — calculates resulting dose' })
  @IsOptional()
  @IsNumber() @Min(0)
  pumpRateMlH?: number;
}

// ─── Sedation Protocol ────────────────────────────────────────────────────────

export class SedationProtocolDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Target RASS goal', minimum: -5, maximum: 4 })
  @IsInt() @Min(-5) @Max(4)
  targetRass!: number;

  @ApiProperty({ description: 'Current RASS score', minimum: -5, maximum: 4 })
  @IsInt() @Min(-5) @Max(4)
  currentRass!: number;

  @ApiProperty({ enum: SedationDrugEnum, description: 'Sedation / analgesia drug' })
  @IsEnum(SedationDrugEnum)
  drug!: SedationDrugEnum;

  @ApiProperty({ description: 'Current drug dose with unit (e.g. 2 mg/h, 5 mcg/kg/h)' })
  @IsString()
  dose!: string;

  @ApiProperty({ description: 'Daily Awakening Trial (SAT) performed today' })
  @IsBoolean()
  dailyAwakening!: boolean;

  @ApiPropertyOptional({ description: 'SAT pass/fail result' })
  @IsOptional()
  @IsBoolean()
  satResult?: boolean;

  @ApiPropertyOptional({ description: 'BPS (Behavioural Pain Scale) 3-12' })
  @IsOptional()
  @IsInt() @Min(3) @Max(12)
  bpsScore?: number;

  @ApiPropertyOptional({ description: 'CPOT score (0-8)' })
  @IsOptional()
  @IsInt() @Min(0) @Max(8)
  cpotScore?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
