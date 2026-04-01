import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum RassScoreLabel {
  COMBATIVE = 'COMBATIVE',         // +4
  VERY_AGITATED = 'VERY_AGITATED', // +3
  AGITATED = 'AGITATED',           // +2
  RESTLESS = 'RESTLESS',            // +1
  ALERT_CALM = 'ALERT_CALM',        //  0
  DROWSY = 'DROWSY',                // -1
  LIGHT_SEDATION = 'LIGHT_SEDATION',// -2
  MODERATE_SEDATION = 'MODERATE_SEDATION', // -3
  DEEP_SEDATION = 'DEEP_SEDATION',  // -4
  UNAROUSABLE = 'UNAROUSABLE',      // -5
}

export enum CamIcuConsciousnessLevel {
  ALERT = 'ALERT',
  VIGILANT = 'VIGILANT',
  LETHARGIC = 'LETHARGIC',
  STUPOR = 'STUPOR',
}

export enum VitalTrendType {
  HEART_RATE = 'HEART_RATE',
  SYSTOLIC_BP = 'SYSTOLIC_BP',
  DIASTOLIC_BP = 'DIASTOLIC_BP',
  MEAN_ARTERIAL_PRESSURE = 'MEAN_ARTERIAL_PRESSURE',
  RESPIRATORY_RATE = 'RESPIRATORY_RATE',
  TEMPERATURE = 'TEMPERATURE',
  OXYGEN_SATURATION = 'OXYGEN_SATURATION',
  GLUCOSE = 'GLUCOSE',
  GCS = 'GCS',
  NEWS_SCORE = 'NEWS_SCORE',
}

export enum TrendPeriodHours {
  H24 = 24,
  H168 = 168,
  H720 = 720,
}

// ─── RASS Assessment ──────────────────────────────────────────────────────────

export class RassScaleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({
    description: 'RASS score (-5 unarousable to +4 combative)',
    minimum: -5,
    maximum: 4,
  })
  @IsInt()
  @Min(-5)
  @Max(4)
  score!: number;

  @ApiProperty({ description: 'Assessment timestamp (ISO 8601)' })
  @IsDateString()
  assessmentTimestamp!: string;

  @ApiProperty({ description: 'Assessor user UUID' })
  @IsUUID()
  assessorId!: string;

  @ApiPropertyOptional({ description: 'Clinical observations / description' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: 'Target RASS goal for this patient' })
  @IsOptional()
  @IsInt()
  @Min(-5)
  @Max(4)
  targetScore?: number;
}

// ─── CAM-ICU Assessment ───────────────────────────────────────────────────────

export class CamIcuDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Feature 1: acute onset or fluctuating mental status' })
  @IsBoolean()
  acuteOnset!: boolean;

  @ApiProperty({ description: 'Feature 2: inattention (letters test or pictures)' })
  @IsBoolean()
  inattention!: boolean;

  @ApiProperty({ description: 'Feature 3: disorganized thinking' })
  @IsBoolean()
  disorganizedThinking!: boolean;

  @ApiProperty({
    description: 'Feature 4: altered consciousness level',
    enum: CamIcuConsciousnessLevel,
  })
  @IsEnum(CamIcuConsciousnessLevel)
  consciousnessLevel!: CamIcuConsciousnessLevel;

  @ApiProperty({ description: 'CAM-ICU result: positive = delirium present' })
  @IsBoolean()
  result!: boolean;

  @ApiProperty({ description: 'Assessment timestamp (ISO 8601)' })
  @IsDateString()
  assessmentTimestamp!: string;

  @ApiProperty({ description: 'Assessor user UUID' })
  @IsUUID()
  assessorId!: string;

  @ApiPropertyOptional({ description: 'RASS score at time of assessment' })
  @IsOptional()
  @IsInt()
  @Min(-5)
  @Max(4)
  rassAtAssessment?: number;

  @ApiPropertyOptional({ description: 'Clinical notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Vital Signs Trend ────────────────────────────────────────────────────────

export class VitalsTrendDataPointDto {
  @ApiProperty({ description: 'Timestamp of measurement (ISO 8601)' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ description: 'Measured value' })
  @IsNumber()
  value!: number;
}

export class VitalsTrendDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({
    description: 'Type of vital sign to trend',
    enum: VitalTrendType,
  })
  @IsEnum(VitalTrendType)
  vitalType!: VitalTrendType;

  @ApiProperty({
    description: 'Period in hours: 24 (1 day), 168 (7 days), 720 (30 days)',
    enum: TrendPeriodHours,
  })
  @IsInt()
  @IsEnum(TrendPeriodHours)
  periodHours!: TrendPeriodHours;

  @ApiPropertyOptional({
    description: 'Pre-fetched data points (optional — if not provided the service fetches them)',
    type: [VitalsTrendDataPointDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VitalsTrendDataPointDto)
  dataPoints?: VitalsTrendDataPointDto[];
}

// ─── Normal Zones (response shape) ───────────────────────────────────────────

export class NormalZoneDto {
  @ApiProperty() low!: number;
  @ApiProperty() high!: number;
  @ApiProperty() unit!: string;
}
