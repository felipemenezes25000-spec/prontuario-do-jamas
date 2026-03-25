import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpeechAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() swallowingAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() speechAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() languageAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() voiceAssessment?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() dysphagiaSeverity?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() dietConsistency?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordSpeechSessionDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() procedures?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() evolution?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() patientResponse?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
