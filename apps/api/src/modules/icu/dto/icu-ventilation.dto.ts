import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VentilationModeDto {
  VCV  = 'VCV',
  PCV  = 'PCV',
  PSV  = 'PSV',
  APRV = 'APRV',
  CPAP = 'CPAP',
  SIMV_VC  = 'SIMV_VC',
  SIMV_PC  = 'SIMV_PC',
  PRVC     = 'PRVC',
  BIPAP    = 'BIPAP',
  HFOV     = 'HFOV',
  HFNC     = 'HFNC',
}

export enum SbtResultEnum {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
}

export enum CrrtAccessEnum {
  FEMORAL   = 'FEMORAL',
  JUGULAR   = 'JUGULAR',
  SUBCLAVIAN = 'SUBCLAVIAN',
}

export enum CrrtAnticoagulationEnum {
  HEPARIN  = 'HEPARIN',
  CITRATE  = 'CITRATE',
  NONE     = 'NONE',
}

export enum DialysisModalityDtoEnum {
  HD         = 'HD',
  CRRT_CVVH  = 'CRRT_CVVH',
  CRRT_CVVHD = 'CRRT_CVVHD',
  CRRT_CVVHDF= 'CRRT_CVVHDF',
  PD         = 'PD',
  SLED       = 'SLED',
  SCUF       = 'SCUF',
}

// ─── Mechanical Ventilation ───────────────────────────────────────────────────

export class MechanicalVentilationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: VentilationModeDto, description: 'Ventilation mode' })
  @IsEnum(VentilationModeDto)
  mode!: VentilationModeDto;

  @ApiProperty({ description: 'FiO2 percentage (21-100)' })
  @IsNumber() @Min(21) @Max(100)
  fio2!: number;

  @ApiProperty({ description: 'PEEP (cmH2O)' })
  @IsNumber() @Min(0) @Max(30)
  peep!: number;

  @ApiPropertyOptional({ description: 'Tidal volume (mL) — VCV/SIMV' })
  @IsOptional()
  @IsNumber() @Min(50) @Max(1200)
  tidalVolume?: number;

  @ApiPropertyOptional({ description: 'Set respiratory rate (rpm)' })
  @IsOptional()
  @IsNumber() @Min(4) @Max(60)
  setRespiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Inspiratory pressure (cmH2O) — PCV/PSV' })
  @IsOptional()
  @IsNumber() @Min(0) @Max(50)
  inspiratoryPressure?: number;

  @ApiPropertyOptional({ description: 'Plateau pressure (cmH2O)' })
  @IsOptional()
  @IsNumber() @Min(0) @Max(60)
  plateauPressure?: number;

  @ApiPropertyOptional({
    description: 'Driving pressure (cmH2O) = plateau - PEEP. Auto-calculated if not provided',
  })
  @IsOptional()
  @IsNumber() @Min(0) @Max(50)
  drivingPressure?: number;

  @ApiPropertyOptional({ description: 'PaO2/FiO2 ratio' })
  @IsOptional()
  @IsNumber() @Min(0)
  pfRatio?: number;

  @ApiPropertyOptional({ description: 'Respiratory system compliance (mL/cmH2O)' })
  @IsOptional()
  @IsNumber() @Min(0)
  compliance?: number;

  @ApiPropertyOptional({ description: 'Peak inspiratory pressure (cmH2O)' })
  @IsOptional()
  @IsNumber() @Min(0) @Max(80)
  peakPressure?: number;

  @ApiPropertyOptional({ description: 'I:E ratio as string e.g. "1:2"' })
  @IsOptional()
  @IsString()
  ieRatio?: string;

  @ApiProperty({ description: 'Assessment timestamp' })
  @IsDateString()
  recordedAt!: string;

  @ApiPropertyOptional({ description: 'Clinical notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Weaning Protocol ─────────────────────────────────────────────────────────

export class WeaningCriteriaDto {
  @ApiProperty({ description: 'Cause of respiratory failure resolved or improving' })
  @IsBoolean()
  causeResolved!: boolean;

  @ApiProperty({ description: 'Adequate oxygenation (SpO2 >= 90% on FiO2 <= 40%, PEEP <= 5)' })
  @IsBoolean()
  adequateOxygenation!: boolean;

  @ApiProperty({ description: 'Hemodynamic stability (no/minimal vasopressors)' })
  @IsBoolean()
  hemodynamicallyStable!: boolean;

  @ApiProperty({ description: 'Able to initiate spontaneous breaths' })
  @IsBoolean()
  spontaneousBreath!: boolean;

  @ApiProperty({ description: 'Adequate cough and airway protection' })
  @IsBoolean()
  adequateCough!: boolean;

  @ApiProperty({ description: 'RASS >= -2 (not deeply sedated)' })
  @IsBoolean()
  adequateConsciousness!: boolean;
}

export class WeaningProtocolDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Pre-SBT criteria assessment', type: WeaningCriteriaDto })
  @ValidateNested()
  @Type(() => WeaningCriteriaDto)
  sbtCriteria!: WeaningCriteriaDto;

  @ApiProperty({ enum: SbtResultEnum, description: 'SBT outcome' })
  @IsEnum(SbtResultEnum)
  sbtResult!: SbtResultEnum;

  @ApiPropertyOptional({ description: 'SBT duration (minutes)' })
  @IsOptional()
  @IsInt() @Min(0) @Max(120)
  sbtDurationMin?: number;

  @ApiProperty({ description: 'Extubation criteria met' })
  @IsBoolean()
  extubationCriteria!: boolean;

  @ApiPropertyOptional({ description: 'RSBI (f/Vt) at SBT start — < 105 favors success' })
  @IsOptional()
  @IsNumber() @Min(0)
  rsbi?: number;

  @ApiPropertyOptional({ description: 'Reason for SBT failure' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Post-extubation plan (NIV, HFNC, reintubation risk)' })
  @IsOptional()
  @IsString()
  postExtubationPlan?: string;
}

// ─── Dialysis / CRRT ──────────────────────────────────────────────────────────

export class DialysisCrrtDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: DialysisModalityDtoEnum, description: 'Dialysis modality' })
  @IsEnum(DialysisModalityDtoEnum)
  modality!: DialysisModalityDtoEnum;

  @ApiProperty({ enum: CrrtAccessEnum, description: 'Vascular access site' })
  @IsEnum(CrrtAccessEnum)
  access!: CrrtAccessEnum;

  @ApiProperty({ enum: CrrtAnticoagulationEnum, description: 'Anticoagulation strategy' })
  @IsEnum(CrrtAnticoagulationEnum)
  anticoagulation!: CrrtAnticoagulationEnum;

  @ApiProperty({ description: 'Blood flow rate (mL/min)' })
  @IsNumber() @Min(0) @Max(500)
  bloodFlow!: number;

  @ApiPropertyOptional({ description: 'Dialysate flow rate (mL/h)' })
  @IsOptional()
  @IsNumber() @Min(0)
  dialysateFlow?: number;

  @ApiPropertyOptional({ description: 'Replacement fluid flow (mL/h)' })
  @IsOptional()
  @IsNumber() @Min(0)
  replacementFlow?: number;

  @ApiProperty({ description: 'Net ultrafiltration rate (mL/h)' })
  @IsNumber() @Min(0)
  ultrafiltration!: number;

  @ApiProperty({ description: 'Planned session duration (hours)' })
  @IsNumber() @Min(0) @Max(72)
  duration!: number;

  @ApiPropertyOptional({ description: 'Kt/V target (for HD/SLED)' })
  @IsOptional()
  @IsNumber() @Min(0)
  ktv?: number;

  @ApiPropertyOptional({ description: 'Session start time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Reason for dialysis / AKI stage' })
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional({ description: 'Notes / filter changes / alarms' })
  @IsOptional()
  @IsString()
  notes?: string;
}
