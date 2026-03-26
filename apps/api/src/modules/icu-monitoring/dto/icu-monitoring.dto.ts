import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ─────────────────────────────────────────────────────────────────

export enum InvasiveMonitoringType {
  ARTERIAL_LINE = 'ARTERIAL_LINE',
  CVP = 'CVP',
  SWAN_GANZ = 'SWAN_GANZ',
  ICP = 'ICP',
  PICCO = 'PICCO',
}

export enum VentilationMode {
  VCV = 'VCV',
  PCV = 'PCV',
  PSV = 'PSV',
  SIMV = 'SIMV',
  APRV = 'APRV',
  BIPAP = 'BIPAP',
  CPAP = 'CPAP',
  HFOV = 'HFOV',
  PRVC = 'PRVC',
  NAVA = 'NAVA',
}

// ─── Hemodynamic Readings ──────────────────────────────────────────────────

export class HemodynamicReadingsDto {
  @ApiPropertyOptional({ description: 'Mean Arterial Pressure invasive (mmHg)' })
  @IsOptional()
  @IsNumber()
  mapInvasive?: number;

  @ApiPropertyOptional({ description: 'Systolic pressure invasive (mmHg)' })
  @IsOptional()
  @IsNumber()
  systolicInvasive?: number;

  @ApiPropertyOptional({ description: 'Diastolic pressure invasive (mmHg)' })
  @IsOptional()
  @IsNumber()
  diastolicInvasive?: number;

  @ApiPropertyOptional({ description: 'Central Venous Pressure (cmH2O, normal 2-8)' })
  @IsOptional()
  @IsNumber()
  cvp?: number;

  @ApiPropertyOptional({ description: 'Intracranial Pressure (mmHg, normal <20)' })
  @IsOptional()
  @IsNumber()
  icp?: number;

  @ApiPropertyOptional({ description: 'Cerebral Perfusion Pressure (MAP - ICP, target >60)' })
  @IsOptional()
  @IsNumber()
  cpp?: number;

  @ApiPropertyOptional({ description: 'Pulmonary Artery Wedge Pressure (mmHg, normal 6-12)' })
  @IsOptional()
  @IsNumber()
  pawp?: number;

  @ApiPropertyOptional({ description: 'Cardiac Output (L/min, normal 4-8)' })
  @IsOptional()
  @IsNumber()
  cardiacOutput?: number;

  @ApiPropertyOptional({ description: 'Cardiac Index (L/min/m2, normal 2.5-4.0)' })
  @IsOptional()
  @IsNumber()
  cardiacIndex?: number;

  @ApiPropertyOptional({ description: 'Systemic Vascular Resistance (dyn.s/cm5, normal 800-1200)' })
  @IsOptional()
  @IsNumber()
  svr?: number;

  @ApiPropertyOptional({ description: 'Pulmonary Vascular Resistance (dyn.s/cm5)' })
  @IsOptional()
  @IsNumber()
  pvr?: number;

  @ApiPropertyOptional({ description: 'Mixed Venous O2 Saturation (%, normal 65-75)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  svo2?: number;
}

// ─── Record Invasive Monitoring ────────────────────────────────────────────

export class RecordInvasiveMonitoringDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: InvasiveMonitoringType })
  @IsEnum(InvasiveMonitoringType)
  monitoringType!: InvasiveMonitoringType;

  @ApiProperty({ type: HemodynamicReadingsDto })
  @ValidateNested()
  @Type(() => HemodynamicReadingsDto)
  readings!: HemodynamicReadingsDto;
}

// ─── Ventilation Settings ──────────────────────────────────────────────────

export class VentilationSettingsDto {
  @ApiProperty({ description: 'FiO2 (21-100 %)', minimum: 21, maximum: 100 })
  @IsNumber()
  @Min(21)
  @Max(100)
  fio2!: number;

  @ApiProperty({ description: 'PEEP (cmH2O)' })
  @IsNumber()
  @Min(0)
  peep!: number;

  @ApiPropertyOptional({ description: 'Tidal Volume (mL) - set in volume modes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tidalVolume?: number;

  @ApiPropertyOptional({ description: 'Respiratory rate (rpm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Inspiratory Pressure (cmH2O) - pressure modes' })
  @IsOptional()
  @IsNumber()
  inspiratoryPressure?: number;

  @ApiPropertyOptional({ description: 'Pressure Support (cmH2O) - PSV level' })
  @IsOptional()
  @IsNumber()
  pressureSupport?: number;

  @ApiPropertyOptional({ description: 'I:E ratio (e.g. "1:2")' })
  @IsOptional()
  @IsString()
  iERatio?: string;

  @ApiPropertyOptional({ description: 'Flow trigger (L/min)' })
  @IsOptional()
  @IsNumber()
  flowTrigger?: number;

  @ApiPropertyOptional({ description: 'Pressure trigger (cmH2O)' })
  @IsOptional()
  @IsNumber()
  pressureTrigger?: number;
}

// ─── Ventilation Measurements ──────────────────────────────────────────────

export class VentilationMeasurementsDto {
  @ApiPropertyOptional({ description: 'Expired tidal volume (mL)' })
  @IsOptional()
  @IsNumber()
  tidalVolumeExpired?: number;

  @ApiPropertyOptional({ description: 'Minute volume (L/min)' })
  @IsOptional()
  @IsNumber()
  minuteVolume?: number;

  @ApiPropertyOptional({ description: 'Peak pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  peakPressure?: number;

  @ApiPropertyOptional({ description: 'Plateau pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  plateauPressure?: number;

  @ApiPropertyOptional({ description: 'Driving pressure (auto-calc: Plateau - PEEP)' })
  @IsOptional()
  @IsNumber()
  drivingPressure?: number;

  @ApiPropertyOptional({ description: 'Auto-PEEP (cmH2O)' })
  @IsOptional()
  @IsNumber()
  autopeep?: number;

  @ApiPropertyOptional({ description: 'Compliance (mL/cmH2O)' })
  @IsOptional()
  @IsNumber()
  compliance?: number;

  @ApiPropertyOptional({ description: 'Resistance (cmH2O/L/s)' })
  @IsOptional()
  @IsNumber()
  resistance?: number;

  @ApiPropertyOptional({ description: 'P/F ratio (PaO2/FiO2)' })
  @IsOptional()
  @IsNumber()
  pfRatio?: number;
}

// ─── Blood Gas ─────────────────────────────────────────────────────────────

export class BloodGasDto {
  @ApiPropertyOptional({ description: 'Arterial pH' })
  @IsOptional()
  @IsNumber()
  ph?: number;

  @ApiPropertyOptional({ description: 'PaO2 (mmHg)' })
  @IsOptional()
  @IsNumber()
  pao2?: number;

  @ApiPropertyOptional({ description: 'PaCO2 (mmHg)' })
  @IsOptional()
  @IsNumber()
  paco2?: number;

  @ApiPropertyOptional({ description: 'HCO3 (mEq/L)' })
  @IsOptional()
  @IsNumber()
  hco3?: number;

  @ApiPropertyOptional({ description: 'Base Excess' })
  @IsOptional()
  @IsNumber()
  be?: number;

  @ApiPropertyOptional({ description: 'SaO2 (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sao2?: number;

  @ApiPropertyOptional({ description: 'Lactate (mmol/L)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lactate?: number;
}

// ─── Record Ventilation ────────────────────────────────────────────────────

export class RecordVentilationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: VentilationMode })
  @IsEnum(VentilationMode)
  mode!: VentilationMode;

  @ApiProperty({ type: VentilationSettingsDto })
  @ValidateNested()
  @Type(() => VentilationSettingsDto)
  settings!: VentilationSettingsDto;

  @ApiProperty({ type: VentilationMeasurementsDto })
  @ValidateNested()
  @Type(() => VentilationMeasurementsDto)
  measurements!: VentilationMeasurementsDto;

  @ApiPropertyOptional({ type: BloodGasDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BloodGasDto)
  bloodGas?: BloodGasDto;
}
