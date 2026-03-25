import { IsString, IsUUID, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePalliativeAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ppsScore?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() esasScores?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() prognosis?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() symptomManagement?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() psychosocialNeeds?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() spiritualNeeds?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreateAdvanceDirectivesDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() resuscitationStatus?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() preferences?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() healthcareProxy?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() proxyContact?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreatePalliativeCarePlanDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() goals!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() painManagement?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() symptomControl?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() familySupport?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() comfortMeasures?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
