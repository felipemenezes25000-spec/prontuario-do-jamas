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
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export enum ChestPainType {
  STEMI = 'STEMI',
  NSTEMI = 'NSTEMI',
  UNSTABLE_ANGINA = 'UNSTABLE_ANGINA',
  STABLE_ANGINA = 'STABLE_ANGINA',
  NON_CARDIAC = 'NON_CARDIAC',
  UNDETERMINED = 'UNDETERMINED',
}

export class ActivateChestPainDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ enum: ChestPainType })
  @IsOptional()
  @IsEnum(ChestPainType)
  suspectedType?: ChestPainType;

  @ApiPropertyOptional({ description: 'Symptom onset time' })
  @IsOptional()
  @IsDateString()
  symptomOnsetAt?: string;

  @ApiPropertyOptional({ description: 'Initial symptoms', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @ApiPropertyOptional({ description: 'Initial ECG findings' })
  @IsOptional()
  @IsString()
  initialEcgFindings?: string;

  @ApiPropertyOptional({ description: 'Initial troponin ng/mL' })
  @IsOptional()
  @IsString()
  initialTroponin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class ChestPainScoresDto {
  @ApiPropertyOptional({ description: 'KILLIP class (I-IV)', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  killipClass?: number;

  @ApiPropertyOptional({ description: 'TIMI score (0-7)', minimum: 0, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  timiScore?: number;

  @ApiPropertyOptional({ description: 'GRACE score' })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceScore?: number;

  @ApiPropertyOptional({ description: 'HEART score (0-10)', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  heartScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateChestPainChecklistDto {
  @ApiPropertyOptional({ description: 'ECG within 10 minutes' })
  @IsOptional()
  @IsBoolean()
  ecgWithin10Min?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ecgDoneAt?: string;

  @ApiPropertyOptional({ description: 'Troponin collected' })
  @IsOptional()
  @IsBoolean()
  troponinCollected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  troponinCollectedAt?: string;

  @ApiPropertyOptional({ description: 'Aspirin given' })
  @IsOptional()
  @IsBoolean()
  aspirinGiven?: boolean;

  @ApiPropertyOptional({ description: 'Clopidogrel/Ticagrelor given' })
  @IsOptional()
  @IsBoolean()
  antiplateletGiven?: boolean;

  @ApiPropertyOptional({ description: 'Anticoagulant given' })
  @IsOptional()
  @IsBoolean()
  anticoagulantGiven?: boolean;

  @ApiPropertyOptional({ description: 'PCI performed' })
  @IsOptional()
  @IsBoolean()
  pciPerformed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  pciPerformedAt?: string;

  @ApiPropertyOptional({ description: 'Cardiology consulted' })
  @IsOptional()
  @IsBoolean()
  cardiologyConsulted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
