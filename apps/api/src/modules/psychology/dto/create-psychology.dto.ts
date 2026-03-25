import { IsString, IsUUID, IsOptional, IsObject, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PsychometricScale {
  PHQ_9 = 'PHQ_9',
  GAD_7 = 'GAD_7',
  MINI = 'MINI',
  BECK_DEPRESSION = 'BECK_DEPRESSION',
  BECK_ANXIETY = 'BECK_ANXIETY',
  HAMILTON_DEPRESSION = 'HAMILTON_DEPRESSION',
  HAMILTON_ANXIETY = 'HAMILTON_ANXIETY',
  COLUMBIA_SUICIDE = 'COLUMBIA_SUICIDE',
  OTHER = 'OTHER',
}

export enum SuicideRiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  IMMINENT = 'IMMINENT',
}

export class CreatePsychologyAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty({ enum: PsychometricScale }) @IsEnum(PsychometricScale) scale!: PsychometricScale;
  @ApiPropertyOptional() @IsNumber() @IsOptional() score?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() interpretation?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() responses?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() clinicalImpression?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreatePsychologyTreatmentPlanDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() therapeuticApproach!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() goals?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sessionsPerWeek?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() estimatedDuration?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() interventions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordPsychologySessionDto {
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sessionType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() themes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() interventions?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() patientPresentation?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() evolution?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class SuicideRiskAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty({ enum: SuicideRiskLevel }) @IsEnum(SuicideRiskLevel) riskLevel!: SuicideRiskLevel;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasIdeation?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasPlan?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasMeans?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasIntention?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() previousAttempts?: boolean;
  @ApiPropertyOptional() @IsObject() @IsOptional() protectiveFactors?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() riskFactors?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() safetyPlan?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
