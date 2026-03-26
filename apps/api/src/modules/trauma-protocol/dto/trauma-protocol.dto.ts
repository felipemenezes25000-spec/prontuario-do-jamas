import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum TraumaActivationLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

export enum TraumaMechanism {
  BLUNT = 'BLUNT',
  PENETRATING = 'PENETRATING',
  BURN = 'BURN',
  BLAST = 'BLAST',
  OTHER = 'OTHER',
}

export enum AirwayStatus {
  PATENT = 'PATENT',
  COMPROMISED = 'COMPROMISED',
  INTUBATED = 'INTUBATED',
}

export enum BreathSounds {
  NORMAL = 'NORMAL',
  DIMINISHED = 'DIMINISHED',
  ABSENT = 'ABSENT',
}

export enum ChestMovement {
  SYMMETRIC = 'SYMMETRIC',
  ASYMMETRIC = 'ASYMMETRIC',
}

export enum TracheaPosition {
  MIDLINE = 'MIDLINE',
  DEVIATED_LEFT = 'DEVIATED_LEFT',
  DEVIATED_RIGHT = 'DEVIATED_RIGHT',
}

export enum SkinColor {
  NORMAL = 'NORMAL',
  PALE = 'PALE',
  CYANOTIC = 'CYANOTIC',
  MOTTLED = 'MOTTLED',
}

export enum PupilStatus {
  EQUAL_REACTIVE = 'EQUAL_REACTIVE',
  LEFT_FIXED = 'LEFT_FIXED',
  RIGHT_FIXED = 'RIGHT_FIXED',
  BILATERAL_FIXED = 'BILATERAL_FIXED',
}

export enum FastResult {
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  INDETERMINATE = 'INDETERMINATE',
}

export enum InjuryRegion {
  HEAD = 'HEAD',
  FACE = 'FACE',
  CHEST = 'CHEST',
  ABDOMEN = 'ABDOMEN',
  EXTREMITY = 'EXTREMITY',
  EXTERNAL = 'EXTERNAL',
}

// ─── Nested DTOs ────────────────────────────────────────────────────────────

export class AirwayAssessmentDto {
  @ApiProperty({ enum: AirwayStatus })
  @IsEnum(AirwayStatus)
  status: AirwayStatus;

  @ApiProperty()
  @IsBoolean()
  cervicalSpineImmobilized: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BreathingAssessmentDto {
  @ApiProperty({ enum: BreathSounds })
  @IsEnum(BreathSounds)
  breathSoundsLeft: BreathSounds;

  @ApiProperty({ enum: BreathSounds })
  @IsEnum(BreathSounds)
  breathSoundsRight: BreathSounds;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(80)
  respiratoryRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  spo2: number;

  @ApiProperty({ enum: ChestMovement })
  @IsEnum(ChestMovement)
  chestMovement: ChestMovement;

  @ApiProperty({ enum: TracheaPosition })
  @IsEnum(TracheaPosition)
  tracheaPosition: TracheaPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CirculationAssessmentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(300)
  heartRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(300)
  systolicBP: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(200)
  diastolicBP: number;

  @ApiProperty({ description: 'Capillary refill in seconds' })
  @IsNumber()
  @Min(0)
  @Max(30)
  capillaryRefill: number;

  @ApiProperty({ enum: SkinColor })
  @IsEnum(SkinColor)
  skinColor: SkinColor;

  @ApiProperty()
  @IsBoolean()
  externalBleeding: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bleedingSite?: string;

  @ApiProperty({ description: 'Number of IV access points' })
  @IsInt()
  @Min(0)
  @Max(10)
  ivAccess: number;

  @ApiPropertyOptional({ description: 'Fluid given in mL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fluidGiven?: number;

  @ApiProperty()
  @IsBoolean()
  bloodOrdered: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DisabilityAssessmentDto {
  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  gcsEye: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  gcsVerbal: number;

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  gcsMotor: number;

  @ApiProperty({ enum: PupilStatus })
  @IsEnum(PupilStatus)
  pupils: PupilStatus;

  @ApiProperty()
  @IsBoolean()
  lateralizing: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExposureAssessmentDto {
  @ApiProperty({ description: 'Temperature in Celsius' })
  @IsNumber()
  @Min(20)
  @Max(45)
  temperature: number;

  @ApiProperty()
  @IsBoolean()
  logRollDone: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;
}

export class InjuryDto {
  @ApiProperty({ enum: InjuryRegion })
  @IsEnum(InjuryRegion)
  region: InjuryRegion;

  @ApiProperty({ minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  aisScore: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;
}

// ─── Main DTOs ──────────────────────────────────────────────────────────────

export class ActivateTraumaDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: TraumaActivationLevel })
  @IsEnum(TraumaActivationLevel)
  activationLevel: TraumaActivationLevel;

  @ApiProperty({ enum: TraumaMechanism })
  @IsEnum(TraumaMechanism)
  mechanism: TraumaMechanism;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mechanismDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sceneDescription?: string;

  @ApiPropertyOptional({ minimum: 3, maximum: 15 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(15)
  preHospitalGcs?: number;
}

export class RecordPrimarySurveyDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  traumaId: string;

  @ApiProperty({ type: AirwayAssessmentDto })
  @ValidateNested()
  @Type(() => AirwayAssessmentDto)
  airway: AirwayAssessmentDto;

  @ApiProperty({ type: BreathingAssessmentDto })
  @ValidateNested()
  @Type(() => BreathingAssessmentDto)
  breathing: BreathingAssessmentDto;

  @ApiProperty({ type: CirculationAssessmentDto })
  @ValidateNested()
  @Type(() => CirculationAssessmentDto)
  circulation: CirculationAssessmentDto;

  @ApiProperty({ type: DisabilityAssessmentDto })
  @ValidateNested()
  @Type(() => DisabilityAssessmentDto)
  disability: DisabilityAssessmentDto;

  @ApiProperty({ type: ExposureAssessmentDto })
  @ValidateNested()
  @Type(() => ExposureAssessmentDto)
  exposure: ExposureAssessmentDto;
}

export class RecordFastExamDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  traumaId: string;

  @ApiProperty({ enum: FastResult, description: "Morison's pouch" })
  @IsEnum(FastResult)
  rightUpperQuadrant: FastResult;

  @ApiProperty({ enum: FastResult, description: 'Splenorenal' })
  @IsEnum(FastResult)
  leftUpperQuadrant: FastResult;

  @ApiProperty({ enum: FastResult, description: 'Pelvis' })
  @IsEnum(FastResult)
  suprapubic: FastResult;

  @ApiProperty({ enum: FastResult, description: 'Pericardial' })
  @IsEnum(FastResult)
  subxiphoid: FastResult;

  @ApiProperty({ enum: FastResult })
  @IsEnum(FastResult)
  overallResult: FastResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordTraumaScoresDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  traumaId: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 75 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(75)
  iss?: number;

  @ApiPropertyOptional({ description: 'Auto-calculated if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7.84)
  rts?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  triss?: number;

  @ApiProperty({ type: [InjuryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InjuryDto)
  injuries: InjuryDto[];
}
