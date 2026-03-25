import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  Min,
  Max,
} from 'class-validator';

// ─── Therapeutic Hypothermia ─────────────────────────────────────────────────

export enum HypothermiaPhase {
  INDUCTION = 'INDUCTION',
  MAINTENANCE = 'MAINTENANCE',
  REWARMING = 'REWARMING',
  COMPLETED = 'COMPLETED',
}

export enum HypothermiaIndication {
  CARDIAC_ARREST = 'CARDIAC_ARREST',
  TRAUMATIC_BRAIN_INJURY = 'TRAUMATIC_BRAIN_INJURY',
  NEONATAL_HYPOXIA = 'NEONATAL_HYPOXIA',
  STROKE = 'STROKE',
  OTHER = 'OTHER',
}

export class CreateHypothermiaSessionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Target temperature in Celsius (usually 33-36°C)' })
  @IsNumber()
  @Min(28)
  @Max(37)
  targetTemperatureCelsius: number;

  @ApiProperty({ description: 'Clinical indication', enum: HypothermiaIndication })
  @IsEnum(HypothermiaIndication)
  indication: HypothermiaIndication;

  @ApiProperty({ description: 'Initial phase', enum: HypothermiaPhase })
  @IsEnum(HypothermiaPhase)
  phase: HypothermiaPhase;

  @ApiProperty({ description: 'Cooling rate target in °C/hour' })
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  coolingRateCelsiusPerHour: number;

  @ApiPropertyOptional({ description: 'Rewarming rate target in °C/hour (if applicable)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(0.5)
  rewarmingRateCelsiusPerHour?: number;

  @ApiPropertyOptional({ description: 'Notes / additional protocol' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── AI: Sepsis Prediction ───────────────────────────────────────────────────

export class PredictSepsisDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Current temperature °C' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Heart rate bpm' })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ description: 'Respiratory rate breaths/min' })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Systolic blood pressure mmHg' })
  @IsOptional()
  @IsNumber()
  systolicBp?: number;

  @ApiPropertyOptional({ description: 'SpO2 %' })
  @IsOptional()
  @IsNumber()
  spo2?: number;

  @ApiPropertyOptional({ description: 'Lactate mmol/L' })
  @IsOptional()
  @IsNumber()
  lactate?: number;

  @ApiPropertyOptional({ description: 'WBC x10³/μL' })
  @IsOptional()
  @IsNumber()
  wbc?: number;

  @ApiPropertyOptional({ description: 'Creatinine mg/dL' })
  @IsOptional()
  @IsNumber()
  creatinine?: number;

  @ApiPropertyOptional({ description: 'Bilirubin mg/dL' })
  @IsOptional()
  @IsNumber()
  bilirubin?: number;
}

// ─── AI: Extubation Prediction ───────────────────────────────────────────────

export class PredictExtubationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'RSBI (Rapid Shallow Breathing Index = f/VT)' })
  @IsOptional()
  @IsNumber()
  rsbi?: number;

  @ApiPropertyOptional({ description: 'FiO2 at assessment (0.21-1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0.21)
  @Max(1.0)
  fio2?: number;

  @ApiPropertyOptional({ description: 'PaO2/FiO2 ratio' })
  @IsOptional()
  @IsNumber()
  pao2fio2?: number;

  @ApiPropertyOptional({ description: 'PEEP cmH2O' })
  @IsOptional()
  @IsNumber()
  peep?: number;

  @ApiPropertyOptional({ description: 'GCS score' })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(15)
  gcs?: number;

  @ApiPropertyOptional({ description: 'Cough strength (0-5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  coughStrength?: number;

  @ApiPropertyOptional({ description: 'Days on mechanical ventilation' })
  @IsOptional()
  @IsNumber()
  ventilationDays?: number;

  @ApiPropertyOptional({ description: 'NIF (Negative Inspiratory Force) cmH2O' })
  @IsOptional()
  @IsNumber()
  nif?: number;
}

// ─── AI: Vasopressor Titration ───────────────────────────────────────────────

export class SuggestVasopressorTitrationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Target MAP mmHg (usually 65)' })
  @IsNumber()
  @Min(50)
  @Max(100)
  targetMap: number;

  @ApiProperty({ description: 'Current MAP mmHg' })
  @IsNumber()
  currentMap: number;

  @ApiProperty({ description: 'Current norepinephrine dose mcg/kg/min' })
  @IsNumber()
  @Min(0)
  norepinephrineDose: number;

  @ApiPropertyOptional({ description: 'Current vasopressin dose units/min' })
  @IsOptional()
  @IsNumber()
  vasopressinDose?: number;

  @ApiPropertyOptional({ description: 'Current dobutamine dose mcg/kg/min' })
  @IsOptional()
  @IsNumber()
  dobutamineDose?: number;

  @ApiProperty({ description: 'Patient weight kg' })
  @IsNumber()
  @Min(1)
  weightKg: number;

  @ApiPropertyOptional({ description: 'Lactate trend: IMPROVING, STABLE, WORSENING' })
  @IsOptional()
  @IsString()
  lactateTrend?: string;

  @ApiPropertyOptional({ description: 'Urine output mL/h last hour' })
  @IsOptional()
  @IsNumber()
  urineOutputMlH?: number;
}
