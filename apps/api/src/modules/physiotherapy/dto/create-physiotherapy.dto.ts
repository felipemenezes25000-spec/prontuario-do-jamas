import { IsString, IsUUID, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhysiotherapyAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() diagnosis?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() functionalAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() rangeOfMotion?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() muscleStrength?: Record<string, unknown>;
  @ApiPropertyOptional() @IsNumber() @IsOptional() barthIndex?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() painAssessment?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreateTreatmentPlanDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() goals!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() exercises?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() modalities?: Record<string, unknown>;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sessionsPerWeek?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() estimatedDuration?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordSessionDto {
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() procedures?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() evolution?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() patientResponse?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
