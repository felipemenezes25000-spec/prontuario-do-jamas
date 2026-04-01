import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

// ============================================================================
// RASS Assessment DTO
// ============================================================================

export class CreateRassDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'RASS score (-5 to +4)', minimum: -5, maximum: 4 })
  @IsInt()
  @Min(-5)
  @Max(4)
  rass!: number;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// CAM-ICU Assessment DTO
// ============================================================================

export class CreateCamIcuDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Current RASS score' })
  @IsInt()
  @Min(-5)
  @Max(4)
  rassScore!: number;

  @ApiProperty({ description: 'Feature 1: Acute onset of mental status change' })
  @IsBoolean()
  feature1AcuteOnset!: boolean;

  @ApiProperty({ description: 'Feature 1: Fluctuating course' })
  @IsBoolean()
  feature1Fluctuating!: boolean;

  @ApiProperty({ description: 'Feature 2: Inattention' })
  @IsBoolean()
  feature2Inattention!: boolean;

  @ApiPropertyOptional({ description: 'Feature 2: ASE/letter score (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  feature2Score?: number;

  @ApiProperty({ description: 'Feature 3: Altered level of consciousness (RASS != 0)' })
  @IsBoolean()
  feature3AlteredConsciousness!: boolean;

  @ApiProperty({ description: 'Feature 4: Disorganized thinking' })
  @IsBoolean()
  feature4DisorganizedThinking!: boolean;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// BIS (Bispectral Index) DTO
// ============================================================================

export class CreateBisDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'BIS value (0-100)', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  bisValue!: number;

  @ApiPropertyOptional({ description: 'EMG value (electromyography)' })
  @IsOptional()
  @IsNumber()
  emg?: number;

  @ApiPropertyOptional({ description: 'Suppression Ratio (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sr?: number;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// ICP (Intracranial Pressure) DTO
// ============================================================================

export class CreateIcpDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Intracranial pressure (mmHg)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  icp!: number;

  @ApiProperty({ description: 'Mean arterial pressure (mmHg)', minimum: 20, maximum: 200 })
  @IsNumber()
  @Min(20)
  @Max(200)
  meanArterialPressure!: number;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// Invasive Hemodynamics DTO
// ============================================================================

export class CreateInvasiveHemodynamicsDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Mean arterial pressure (mmHg)' })
  @IsNumber()
  pam!: number;

  @ApiPropertyOptional({ description: 'Central venous pressure (mmHg)' })
  @IsOptional()
  @IsNumber()
  pvc?: number;

  @ApiPropertyOptional({ description: 'Pulmonary artery occlusion pressure (mmHg)' })
  @IsOptional()
  @IsNumber()
  poap?: number;

  @ApiPropertyOptional({ description: 'Cardiac output (L/min)' })
  @IsOptional()
  @IsNumber()
  cardiacOutput?: number;

  @ApiPropertyOptional({ description: 'Cardiac index (L/min/m2)' })
  @IsOptional()
  @IsNumber()
  cardiacIndex?: number;

  @ApiPropertyOptional({ description: 'Systemic vascular resistance (dyn.s/cm5)' })
  @IsOptional()
  @IsNumber()
  svr?: number;

  @ApiPropertyOptional({ description: 'Systemic vascular resistance index' })
  @IsOptional()
  @IsNumber()
  svri?: number;

  @ApiPropertyOptional({ description: 'Pulmonary vascular resistance (dyn.s/cm5)' })
  @IsOptional()
  @IsNumber()
  pvr?: number;

  @ApiPropertyOptional({ description: 'Mixed venous oxygen saturation (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  svo2?: number;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// Ventilator Settings DTO
// ============================================================================

export enum VentilatorMode {
  VCV = 'VCV',
  PCV = 'PCV',
  PSV = 'PSV',
  SIMV_VC = 'SIMV_VC',
  SIMV_PC = 'SIMV_PC',
  APRV = 'APRV',
  BIPAP = 'BIPAP',
  CPAP = 'CPAP',
  HFOV = 'HFOV',
  NAVA = 'NAVA',
  PRVC = 'PRVC',
}

export class CreateVentilatorSettingsDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Ventilator mode', enum: VentilatorMode })
  @IsEnum(VentilatorMode)
  mode!: VentilatorMode;

  @ApiPropertyOptional({ description: 'Tidal volume (mL)' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1500)
  tidalVolume?: number;

  @ApiPropertyOptional({ description: 'Respiratory rate (breaths/min)' })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(60)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'FiO2 (0.21-1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0.21)
  @Max(1.0)
  fio2?: number;

  @ApiPropertyOptional({ description: 'PEEP (cmH2O)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  peep?: number;

  @ApiPropertyOptional({ description: 'Pressure support (cmH2O)' })
  @IsOptional()
  @IsNumber()
  pressureSupport?: number;

  @ApiPropertyOptional({ description: 'Plateau pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  plateauPressure?: number;

  @ApiPropertyOptional({ description: 'Peak inspiratory pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  peakPressure?: number;

  @ApiPropertyOptional({ description: 'Mean airway pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  meanAirwayPressure?: number;

  @ApiPropertyOptional({ description: 'Pulmonary compliance (mL/cmH2O)' })
  @IsOptional()
  @IsNumber()
  compliance?: number;

  @ApiPropertyOptional({ description: 'Airway resistance (cmH2O/L/s)' })
  @IsOptional()
  @IsNumber()
  resistance?: number;

  @ApiPropertyOptional({ description: 'Auto-PEEP (cmH2O)' })
  @IsOptional()
  @IsNumber()
  autopeep?: number;

  @ApiPropertyOptional({ description: 'I:E ratio (e.g., "1:2")' })
  @IsOptional()
  @IsString()
  ieRatio?: string;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// Pediatric Growth DTO
// ============================================================================

export enum GrowthStandard {
  WHO = 'WHO',
  CDC = 'CDC',
}

export class RecordPediatricGrowthDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Age in months at measurement' })
  @IsNumber()
  @Min(0)
  @Max(240)
  ageMonths!: number;

  @ApiPropertyOptional({ description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(200)
  weight?: number;

  @ApiPropertyOptional({ description: 'Length/height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(220)
  height?: number;

  @ApiPropertyOptional({ description: 'Head circumference in cm' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(70)
  headCircumference?: number;

  @ApiPropertyOptional({ description: 'BMI (auto-calculated if weight+height provided)' })
  @IsOptional()
  @IsNumber()
  bmi?: number;

  @ApiProperty({ description: 'Gender (M or F) for z-score calculation' })
  @IsString()
  gender!: string;

  @ApiPropertyOptional({ description: 'Growth standard to use', enum: GrowthStandard, default: GrowthStandard.WHO })
  @IsOptional()
  @IsEnum(GrowthStandard)
  standard?: GrowthStandard;

  @ApiPropertyOptional({ description: 'Date of measurement' })
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @ApiPropertyOptional({ description: 'Clinical observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// Trend Query DTO
// ============================================================================

export enum TrendPeriod {
  H24 = '24h',
  D7 = '7d',
  D30 = '30d',
}
