import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum CardiacRhythm {
  VF = 'VF',
  VT_PULSELESS = 'VT_PULSELESS',
  PEA = 'PEA',
  ASYSTOLE = 'ASYSTOLE',
  ROSC = 'ROSC',
  OTHER = 'OTHER',
}

export enum AclsDrug {
  EPINEPHRINE = 'EPINEPHRINE',
  AMIODARONE = 'AMIODARONE',
  LIDOCAINE = 'LIDOCAINE',
  ATROPINE = 'ATROPINE',
  VASOPRESSIN = 'VASOPRESSIN',
  SODIUM_BICARBONATE = 'SODIUM_BICARBONATE',
  CALCIUM = 'CALCIUM',
  MAGNESIUM = 'MAGNESIUM',
}

export enum DrugRoute {
  IV = 'IV',
  IO = 'IO',
}

export enum AirwayType {
  BVM = 'BVM',
  LMA = 'LMA',
  ETT = 'ETT',
  SURGICAL = 'SURGICAL',
}

export enum AirwayConfirmation {
  ETCO2 = 'ETCO2',
  AUSCULTATION = 'AUSCULTATION',
  XRAY = 'XRAY',
}

export enum CodeOutcome {
  ROSC = 'ROSC',
  DEATH = 'DEATH',
  TRANSFER = 'TRANSFER',
}

// ─── Nested DTOs ────────────────────────────────────────────────────────────

export class CprQualityDto {
  @ApiPropertyOptional({ description: 'Compressions per minute (target 100-120)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  rate?: number;

  @ApiPropertyOptional({ description: 'Depth target 5-6cm' })
  @IsOptional()
  @IsString()
  depth?: string;

  @ApiProperty()
  @IsBoolean()
  fullRecoil: boolean;
}

// ─── Main DTOs ──────────────────────────────────────────────────────────────

export class ActivateCodeBlueDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Location of arrest' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty()
  @IsBoolean()
  witnessedArrest: boolean;

  @ApiProperty({ enum: CardiacRhythm, description: 'Initial rhythm' })
  @IsEnum(CardiacRhythm)
  initialRhythm: CardiacRhythm;

  @ApiProperty()
  @IsBoolean()
  bystanderCpr: boolean;

  @ApiProperty()
  @IsBoolean()
  aedUsed: boolean;
}

export class RecordCprCycleDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  codeId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cycleNumber: number;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: 'Name of person performing compressions' })
  @IsString()
  @IsNotEmpty()
  compressor: string;

  @ApiPropertyOptional({ type: CprQualityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CprQualityDto)
  quality?: CprQualityDto;
}

export class RecordDefibrillationDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  codeId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  shockNumber: number;

  @ApiProperty({ description: 'Energy in Joules' })
  @IsNumber()
  @Min(1)
  @Max(400)
  energy: number;

  @ApiProperty({ enum: CardiacRhythm })
  @IsEnum(CardiacRhythm)
  rhythmBefore: CardiacRhythm;

  @ApiProperty({ enum: CardiacRhythm })
  @IsEnum(CardiacRhythm)
  rhythmAfter: CardiacRhythm;

  @ApiProperty()
  @IsDateString()
  time: string;
}

export class RecordAclsDrugDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  codeId: string;

  @ApiProperty({ enum: AclsDrug })
  @IsEnum(AclsDrug)
  drug: AclsDrug;

  @ApiProperty({ description: 'e.g. "1mg"' })
  @IsString()
  @IsNotEmpty()
  dose: string;

  @ApiProperty({ enum: DrugRoute })
  @IsEnum(DrugRoute)
  route: DrugRoute;

  @ApiProperty()
  @IsDateString()
  time: string;
}

export class RecordAirwayDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  codeId: string;

  @ApiProperty({ enum: AirwayType })
  @IsEnum(AirwayType)
  type: AirwayType;

  @ApiProperty()
  @IsDateString()
  time: string;

  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ettSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ettDepth?: string;

  @ApiPropertyOptional({ enum: AirwayConfirmation })
  @IsOptional()
  @IsEnum(AirwayConfirmation)
  confirmationMethod?: AirwayConfirmation;
}

export class TerminateCodeDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  codeId: string;

  @ApiProperty({ enum: CodeOutcome })
  @IsEnum(CodeOutcome)
  outcome: CodeOutcome;

  @ApiPropertyOptional({ description: 'Time of ROSC (if ROSC outcome)' })
  @IsOptional()
  @IsDateString()
  roscTime?: string;

  @ApiPropertyOptional({ description: 'Time of death (if DEATH outcome)' })
  @IsOptional()
  @IsDateString()
  timeOfDeath?: string;

  @ApiProperty({ description: 'Total duration in minutes' })
  @IsNumber()
  @Min(0)
  totalDuration: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  totalShocks: number;

  @ApiProperty({ description: 'Total epinephrine doses' })
  @IsInt()
  @Min(0)
  totalEpinephrine: number;

  @ApiProperty()
  @IsBoolean()
  familyNotified: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postRoscCare?: string;
}
