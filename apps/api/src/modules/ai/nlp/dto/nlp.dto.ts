import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum NlpExtractionType {
  GENERAL = 'GENERAL',
  PROBLEMS = 'PROBLEMS',
  MEDICATIONS = 'MEDICATIONS',
  ALLERGIES = 'ALLERGIES',
}

export enum ClinicalLanguage {
  PT_BR = 'pt-BR',
  EN_US = 'en-US',
  ES = 'es',
}

export enum InconsistencySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class ExtractFromTextDto {
  @ApiProperty({ description: 'Free text to extract structured data from' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Language of the text', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;
}

export class ExtractEntitiesDto {
  @ApiProperty({ description: 'Clinical text to extract entities from' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Entity types to extract (medications, diagnoses, allergies, procedures, vitals, symptoms)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  entityTypes?: string[];

  @ApiPropertyOptional({ description: 'Language', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Include negation detection', default: true })
  @IsOptional()
  includeNegations?: boolean;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold (0-1)', default: 0.5 })
  @IsOptional()
  minConfidence?: number;
}

export class StructureTextDto {
  @ApiProperty({ description: 'Free text clinical note to structure' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Target structure format: SOAP, H_AND_P, DISCHARGE, PROGRESS', default: 'SOAP' })
  @IsString()
  @IsOptional()
  targetFormat?: string;

  @ApiPropertyOptional({ description: 'Language', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;
}

export class DetectInconsistenciesDto {
  @ApiProperty({ description: 'Clinical text to check for inconsistencies' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Patient medications for cross-checking' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currentMedications?: string[];

  @ApiPropertyOptional({ description: 'Patient allergies for cross-checking' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knownAllergies?: string[];

  @ApiPropertyOptional({ description: 'Patient diagnoses for cross-checking' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activeDiagnoses?: string[];

  @ApiPropertyOptional({ description: 'Patient age' })
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Patient gender' })
  @IsString()
  @IsOptional()
  patientGender?: string;
}

export class TranslateTextDto {
  @ApiProperty({ description: 'Clinical text to translate' })
  @IsString()
  text!: string;

  @ApiProperty({ description: 'Source language', enum: ClinicalLanguage })
  @IsEnum(ClinicalLanguage)
  sourceLanguage!: ClinicalLanguage;

  @ApiProperty({ description: 'Target language', enum: ClinicalLanguage })
  @IsEnum(ClinicalLanguage)
  targetLanguage!: ClinicalLanguage;

  @ApiPropertyOptional({ description: 'Preserve medical terminology without translation' })
  @IsOptional()
  preserveTerminology?: boolean;
}

export class SummarizeTextDto {
  @ApiProperty({ description: 'Clinical text to summarize' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Summary length: brief, standard, detailed', default: 'standard' })
  @IsString()
  @IsOptional()
  length?: string;

  @ApiPropertyOptional({ description: 'Focus areas for summary' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  focusAreas?: string[];

  @ApiPropertyOptional({ description: 'Language', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class ExtractedEntityDto {
  @ApiProperty() entity!: string;
  @ApiProperty() type!: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() normalizedValue?: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() startOffset?: number;
  @ApiPropertyOptional() endOffset?: number;
  @ApiPropertyOptional() negated?: boolean;
  @ApiPropertyOptional() context?: string;
}

export class ExtractedDataResponseDto {
  @ApiProperty({ type: [ExtractedEntityDto] }) entities!: ExtractedEntityDto[];
  @ApiPropertyOptional() structuredData?: Record<string, unknown>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class ExtractEntitiesResponseDto {
  @ApiProperty({ type: [ExtractedEntityDto] }) entities!: ExtractedEntityDto[];
  @ApiProperty() totalEntities!: number;
  @ApiProperty() entityCounts!: Record<string, number>;
  @ApiPropertyOptional() negatedEntities?: ExtractedEntityDto[];
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class StructuredSectionDto {
  @ApiProperty() section!: string;
  @ApiProperty() content!: string;
  @ApiPropertyOptional() entities?: ExtractedEntityDto[];
}

export class StructuredTextResponseDto {
  @ApiProperty() format!: string;
  @ApiProperty({ type: [StructuredSectionDto] }) sections!: StructuredSectionDto[];
  @ApiPropertyOptional() structuredJson?: Record<string, unknown>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class InconsistencyDto {
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: InconsistencySeverity }) severity!: InconsistencySeverity;
  @ApiPropertyOptional() evidence?: string;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiProperty() confidence!: number;
}

export class DetectInconsistenciesResponseDto {
  @ApiProperty({ type: [InconsistencyDto] }) inconsistencies!: InconsistencyDto[];
  @ApiProperty() totalFound!: number;
  @ApiProperty() criticalCount!: number;
  @ApiProperty() warningCount!: number;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class TranslateTextResponseDto {
  @ApiProperty() originalText!: string;
  @ApiProperty() translatedText!: string;
  @ApiProperty() sourceLanguage!: string;
  @ApiProperty() targetLanguage!: string;
  @ApiPropertyOptional() preservedTerms?: Array<{ original: string; kept: string }>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class SummarizeTextResponseDto {
  @ApiProperty() summary!: string;
  @ApiProperty() length!: string;
  @ApiPropertyOptional() keyFindings?: string[];
  @ApiPropertyOptional() activeDiagnoses?: string[];
  @ApiPropertyOptional() currentMedications?: string[];
  @ApiPropertyOptional() pendingActions?: string[];
  @ApiProperty() originalWordCount!: number;
  @ApiProperty() summaryWordCount!: number;
  @ApiProperty() compressionRatio!: number;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

// ─── Legacy Response DTOs ────────────────────────────────────────────────────

export class ExtractedProblemDto {
  @ApiProperty() problemName!: string;
  @ApiPropertyOptional() icdCode?: string;
  @ApiPropertyOptional() icdDescription?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() onset?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedProblemsResponseDto {
  @ApiProperty({ type: [ExtractedProblemDto] }) problems!: ExtractedProblemDto[];
  @ApiProperty() aiModel!: string;
}

export class ExtractedMedicationDto {
  @ApiProperty() medicationName!: string;
  @ApiPropertyOptional() activeIngredient?: string;
  @ApiPropertyOptional() dose?: string;
  @ApiPropertyOptional() route?: string;
  @ApiPropertyOptional() frequency?: string;
  @ApiPropertyOptional() duration?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedMedicationsResponseDto {
  @ApiProperty({ type: [ExtractedMedicationDto] }) medications!: ExtractedMedicationDto[];
  @ApiProperty() aiModel!: string;
}

export class ExtractedAllergyDto {
  @ApiProperty() substance!: string;
  @ApiPropertyOptional() type?: string;
  @ApiPropertyOptional() reaction?: string;
  @ApiPropertyOptional() severity?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedAllergiesResponseDto {
  @ApiProperty({ type: [ExtractedAllergyDto] }) allergies!: ExtractedAllergyDto[];
  @ApiProperty() aiModel!: string;
}
