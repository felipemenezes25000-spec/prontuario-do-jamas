import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TriageProtocol, TriageLevel } from '@prisma/client';

export class CreateTriageDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ description: 'Triage protocol', enum: TriageProtocol })
  @IsOptional()
  @IsEnum(TriageProtocol)
  protocol?: TriageProtocol;

  @ApiProperty({ description: 'Chief complaint' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @ApiPropertyOptional({ description: 'Symptom onset description' })
  @IsOptional()
  @IsString()
  symptomOnset?: string;

  @ApiPropertyOptional({ description: 'Symptom duration' })
  @IsOptional()
  @IsString()
  symptomDuration?: string;

  @ApiPropertyOptional({ description: 'Pain scale (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScale?: number;

  @ApiPropertyOptional({ description: 'Pain location' })
  @IsOptional()
  @IsString()
  painLocation?: string;

  @ApiPropertyOptional({ description: 'Pain character' })
  @IsOptional()
  @IsString()
  painCharacter?: string;

  @ApiPropertyOptional({ description: 'Selected discriminator' })
  @IsOptional()
  @IsString()
  selectedDiscriminator?: string;

  @ApiProperty({ description: 'Triage level', enum: TriageLevel })
  @IsEnum(TriageLevel)
  level: TriageLevel;

  @ApiPropertyOptional({ description: 'Level description' })
  @IsOptional()
  @IsString()
  levelDescription?: string;

  @ApiPropertyOptional({ description: 'Max wait time in minutes' })
  @IsOptional()
  @IsInt()
  maxWaitTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Reassessment time in minutes' })
  @IsOptional()
  @IsInt()
  reassessmentTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Vital signs ID' })
  @IsOptional()
  @IsUUID()
  vitalSignsId?: string;

  @ApiPropertyOptional({ description: 'Voice transcription ID' })
  @IsOptional()
  @IsUUID()
  voiceTranscriptionId?: string;
}

export class UpdateTriageDto {
  @ApiPropertyOptional({ description: 'Triage level', enum: TriageLevel })
  @IsOptional()
  @IsEnum(TriageLevel)
  level?: TriageLevel;

  @ApiPropertyOptional({ description: 'Override reason' })
  @IsOptional()
  @IsString()
  overrideReason?: string;

  @ApiPropertyOptional({ description: 'Selected discriminator' })
  @IsOptional()
  @IsString()
  selectedDiscriminator?: string;

  @ApiPropertyOptional({ description: 'Level description' })
  @IsOptional()
  @IsString()
  levelDescription?: string;
}
