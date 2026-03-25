import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MorseItemKey {
  HISTORY_OF_FALLING = 'HISTORY_OF_FALLING',
  SECONDARY_DIAGNOSIS = 'SECONDARY_DIAGNOSIS',
  AMBULATORY_AID = 'AMBULATORY_AID',
  IV_HEPARIN_LOCK = 'IV_HEPARIN_LOCK',
  GAIT = 'GAIT',
  MENTAL_STATUS = 'MENTAL_STATUS',
}

export enum BradenDomain {
  SENSORY_PERCEPTION = 'SENSORY_PERCEPTION',
  MOISTURE = 'MOISTURE',
  ACTIVITY = 'ACTIVITY',
  MOBILITY = 'MOBILITY',
  NUTRITION = 'NUTRITION',
  FRICTION_SHEAR = 'FRICTION_SHEAR',
}

export class MorseScoreItemDto {
  @ApiProperty({ enum: MorseItemKey })
  @IsEnum(MorseItemKey)
  key: MorseItemKey;

  @ApiProperty({ description: 'Score for this item (0-30)', minimum: 0, maximum: 30 })
  @IsInt()
  @Min(0)
  @Max(30)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMorseAssessmentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ type: [MorseScoreItemDto], description: 'Morse Fall Scale items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MorseScoreItemDto)
  items: MorseScoreItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class BradenScoreItemDto {
  @ApiProperty({ enum: BradenDomain })
  @IsEnum(BradenDomain)
  domain: BradenDomain;

  @ApiProperty({ description: 'Score for this domain (1-4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  score: number;
}

export class CreateBradenAssessmentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ type: [BradenScoreItemDto], description: 'Braden Scale items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BradenScoreItemDto)
  items: BradenScoreItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreatePreventionPlanDto {
  @ApiProperty({ description: 'Interventions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  interventions: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ description: 'Schedule repositioning every N hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  repositioningIntervalHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fallPrecautionSignage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bedAlarmActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  nonSlipFootwear?: boolean;
}
