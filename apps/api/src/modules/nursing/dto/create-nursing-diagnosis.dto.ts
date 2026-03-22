import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { NursingDxStatus, NursingPriority } from '@prisma/client';

export class CreateNursingDiagnosisDto {
  @ApiPropertyOptional({ description: 'NANDA code' })
  @IsOptional()
  @IsString()
  nandaCode?: string;

  @ApiPropertyOptional({ description: 'NANDA domain' })
  @IsOptional()
  @IsString()
  nandaDomain?: string;

  @ApiPropertyOptional({ description: 'NANDA class' })
  @IsOptional()
  @IsString()
  nandaClass?: string;

  @ApiProperty({ description: 'NANDA title' })
  @IsString()
  @IsNotEmpty()
  nandaTitle: string;

  @ApiPropertyOptional({ description: 'Related factors', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFactors?: string[];

  @ApiPropertyOptional({ description: 'Risk factors', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskFactors?: string[];

  @ApiPropertyOptional({ description: 'Defining characteristics', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  definingCharacteristics?: string[];

  @ApiPropertyOptional({ description: 'Status', enum: NursingDxStatus })
  @IsOptional()
  @IsEnum(NursingDxStatus)
  status?: NursingDxStatus;

  @ApiProperty({ description: 'Priority', enum: NursingPriority })
  @IsEnum(NursingPriority)
  priority: NursingPriority;

  @ApiPropertyOptional({ description: 'AI suggested' })
  @IsOptional()
  @IsBoolean()
  aiSuggested?: boolean;

  @ApiPropertyOptional({ description: 'AI confidence' })
  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class CreateNursingOutcomeDto {
  @ApiPropertyOptional({ description: 'NOC code' })
  @IsOptional()
  @IsString()
  nocCode?: string;

  @ApiProperty({ description: 'NOC title' })
  @IsString()
  @IsNotEmpty()
  nocTitle: string;

  @ApiProperty({ description: 'Baseline score' })
  @IsNumber()
  baselineScore: number;

  @ApiProperty({ description: 'Target score' })
  @IsNumber()
  targetScore: number;

  @ApiProperty({ description: 'Current score' })
  @IsNumber()
  currentScore: number;

  @ApiPropertyOptional({ description: 'Evaluation frequency' })
  @IsOptional()
  @IsString()
  evaluationFrequency?: string;
}

export class CreateNursingInterventionDto {
  @ApiPropertyOptional({ description: 'NIC code' })
  @IsOptional()
  @IsString()
  nicCode?: string;

  @ApiProperty({ description: 'NIC title' })
  @IsString()
  @IsNotEmpty()
  nicTitle: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Voice transcription ID' })
  @IsOptional()
  @IsString()
  voiceTranscriptionId?: string;
}
