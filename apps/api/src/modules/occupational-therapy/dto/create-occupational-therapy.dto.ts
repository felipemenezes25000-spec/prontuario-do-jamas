import { IsString, IsUUID, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOTAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() adlAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() iadlAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsNumber() @IsOptional() fimScore?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() barthIndex?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() cognitiveScreening?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() upperExtremityFunction?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreateOTRehabPlanDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() goals!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() interventions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() adaptiveEquipment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() homeModifications?: Record<string, unknown>;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sessionsPerWeek?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
