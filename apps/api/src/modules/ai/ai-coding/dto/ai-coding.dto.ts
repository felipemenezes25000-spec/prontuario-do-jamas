import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum CodingSuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  MODIFIED = 'MODIFIED',
}

export enum CodingSystem {
  ICD10 = 'ICD-10',
  CBHPM = 'CBHPM',
  TUSS = 'TUSS',
  SUS_SIGTAP = 'SUS-SIGTAP',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class SuggestIcdDto {
  @ApiProperty({ description: 'Clinical note text for ICD-10 code suggestion' })
  @IsString()
  clinicalText!: string;

  @ApiPropertyOptional({ description: 'SOAP subjective section' })
  @IsString()
  @IsOptional()
  subjective?: string;

  @ApiPropertyOptional({ description: 'SOAP assessment section' })
  @IsString()
  @IsOptional()
  assessment?: string;

  @ApiPropertyOptional({ description: 'Patient age for context' })
  @IsNumber()
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Patient gender for context' })
  @IsString()
  @IsOptional()
  patientGender?: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions', default: 5 })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  maxSuggestions?: number;
}

export class SuggestProceduresDto {
  @ApiProperty({ description: 'Procedure description text or clinical note' })
  @IsString()
  procedureText!: string;

  @ApiPropertyOptional({ description: 'List of procedures performed' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  procedures?: string[];

  @ApiPropertyOptional({ enum: CodingSystem, description: 'Coding system to use', default: CodingSystem.CBHPM })
  @IsEnum(CodingSystem)
  @IsOptional()
  codingSystem?: CodingSystem;

  @ApiPropertyOptional({ description: 'Encounter ID for context' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;
}

export class ValidateCodingDto {
  @ApiProperty({ description: 'Diagnosis ICD-10 codes to validate' })
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes!: string[];

  @ApiPropertyOptional({ description: 'Procedure codes to validate' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  procedureCodes?: string[];

  @ApiPropertyOptional({ description: 'Clinical text for context validation' })
  @IsString()
  @IsOptional()
  clinicalText?: string;

  @ApiPropertyOptional({ description: 'Patient age' })
  @IsNumber()
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Patient gender' })
  @IsString()
  @IsOptional()
  patientGender?: string;
}

export class AcceptSuggestionDto {
  @ApiProperty({ description: 'Suggestion ID to accept or reject' })
  @IsString()
  suggestionId!: string;

  @ApiProperty({ description: 'Whether the suggestion was accepted' })
  @IsBoolean()
  accepted!: boolean;

  @ApiPropertyOptional({ description: 'Modified code if the user changed it' })
  @IsString()
  @IsOptional()
  modifiedCode?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection (for learning)' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Encounter ID for tracking' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;
}

export class ImproveSpecificityDto {
  @ApiProperty({ description: 'Current ICD-10 code to improve' })
  @IsString()
  currentCode!: string;

  @ApiProperty({ description: 'Clinical context for more specific code' })
  @IsString()
  clinicalContext!: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class CodeSuggestionDto {
  @ApiProperty() suggestionId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() description!: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() reasoning?: string;
  @ApiPropertyOptional() codingSystem?: string;
  @ApiPropertyOptional() status?: CodingSuggestionStatus;
}

export class IcdSuggestionsResponseDto {
  @ApiProperty({ type: [CodeSuggestionDto] }) suggestions!: CodeSuggestionDto[];
  @ApiProperty() aiModel!: string;
  @ApiPropertyOptional() clinicalContext?: string;
  @ApiProperty() processingTimeMs!: number;
}

export class ProcedureSuggestionsResponseDto {
  @ApiProperty({ type: [CodeSuggestionDto] }) suggestions!: CodeSuggestionDto[];
  @ApiProperty() codingSystem!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class CodingValidationIssueDto {
  @ApiProperty() code!: string;
  @ApiProperty() issue!: string;
  @ApiProperty() severity!: string;
  @ApiPropertyOptional() suggestedFix?: string;
  @ApiPropertyOptional() relatedCode?: string;
}

export class CodingValidationResponseDto {
  @ApiProperty() valid!: boolean;
  @ApiProperty({ type: [CodingValidationIssueDto] }) issues!: CodingValidationIssueDto[];
  @ApiPropertyOptional() missingDocumentation?: string[];
  @ApiPropertyOptional() specificityOpportunities?: Array<{
    currentCode: string;
    suggestedCode: string;
    reason: string;
  }>;
  @ApiProperty() aiModel!: string;
}

export class CodingMetricsResponseDto {
  @ApiProperty() totalSuggestions!: number;
  @ApiProperty() accepted!: number;
  @ApiProperty() rejected!: number;
  @ApiProperty() modified!: number;
  @ApiProperty() acceptanceRate!: number;
  @ApiProperty() avgConfidence!: number;
  @ApiProperty() topIcdCodes!: Array<{ code: string; description: string; count: number }>;
  @ApiProperty() topProcedureCodes!: Array<{ code: string; description: string; count: number }>;
  @ApiProperty() accuracyTrend!: Array<{ month: string; accuracy: number }>;
  @ApiProperty() aiModel!: string;
}

export class AcceptSuggestionResponseDto {
  @ApiProperty() suggestionId!: string;
  @ApiProperty({ enum: CodingSuggestionStatus }) status!: CodingSuggestionStatus;
  @ApiPropertyOptional() originalCode?: string;
  @ApiPropertyOptional() finalCode?: string;
  @ApiProperty() recordedAt!: Date;
}

export class ImproveSpecificityResponseDto {
  @ApiProperty() originalCode!: string;
  @ApiProperty() originalDescription!: string;
  @ApiProperty({ type: [CodeSuggestionDto] }) improvedCodes!: CodeSuggestionDto[];
  @ApiPropertyOptional() explanation?: string;
}

export class EncounterCodingResponseDto {
  @ApiProperty() encounterId!: string;
  @ApiProperty({ type: [CodeSuggestionDto] }) diagnosisCodes!: CodeSuggestionDto[];
  @ApiProperty({ type: [CodeSuggestionDto] }) procedureCodes!: CodeSuggestionDto[];
  @ApiPropertyOptional() missingDocumentation?: string[];
  @ApiPropertyOptional() specificityOpportunities?: Array<{
    currentCode: string;
    suggestedCode: string;
    reason: string;
  }>;
}

// Keep CbhpmSuggestionsResponseDto for backward compat
export class CbhpmSuggestionsResponseDto {
  @ApiProperty({ type: [CodeSuggestionDto] }) suggestions!: CodeSuggestionDto[];
  @ApiProperty() aiModel!: string;
}
