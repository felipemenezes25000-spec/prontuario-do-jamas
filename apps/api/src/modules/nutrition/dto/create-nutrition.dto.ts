import { IsString, IsUUID, IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NutritionAssessmentTool {
  MNA = 'MNA',
  NRS_2002 = 'NRS_2002',
  MUST = 'MUST',
  SGA = 'SGA',
}

export class CreateNutritionAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty({ enum: NutritionAssessmentTool }) @IsEnum(NutritionAssessmentTool) tool!: NutritionAssessmentTool;
  @ApiPropertyOptional() @IsNumber() @IsOptional() score?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() bmi?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() anthropometry?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() labResults?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() diagnosis?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreateDietPlanDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() dietType!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() calories?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() macros?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() restrictions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() supplements?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() schedule?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class UpdateNutritionDto {
  @ApiPropertyOptional() @IsObject() @IsOptional() data?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
