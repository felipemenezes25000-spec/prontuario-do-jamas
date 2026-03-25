import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum AudioFormat {
  WAV = 'WAV',
  MP3 = 'MP3',
  OGG = 'OGG',
  WEBM = 'WEBM',
  M4A = 'M4A',
}

export enum TranscriptionLanguage {
  PT_BR = 'pt-BR',
  EN_US = 'en-US',
  ES = 'es',
}

export enum ClinicalSpecialty {
  GENERAL = 'GENERAL',
  CARDIOLOGY = 'CARDIOLOGY',
  PEDIATRICS = 'PEDIATRICS',
  ORTHOPEDICS = 'ORTHOPEDICS',
  NEUROLOGY = 'NEUROLOGY',
  EMERGENCY = 'EMERGENCY',
  PSYCHIATRY = 'PSYCHIATRY',
  DERMATOLOGY = 'DERMATOLOGY',
  GYNECOLOGY = 'GYNECOLOGY',
  PULMONOLOGY = 'PULMONOLOGY',
}

export enum AmbientSessionStatus {
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  TRANSCRIBED = 'TRANSCRIBED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  STOPPED = 'STOPPED',
}

export enum EntityType {
  MEDICATION = 'MEDICATION',
  DIAGNOSIS = 'DIAGNOSIS',
  ALLERGY = 'ALLERGY',
  PROCEDURE = 'PROCEDURE',
  SYMPTOM = 'SYMPTOM',
  VITAL_SIGN = 'VITAL_SIGN',
  TEMPORAL = 'TEMPORAL',
}

export enum InconsistencySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum TranslationLanguage {
  PT_BR = 'pt-BR',
  EN_US = 'en-US',
  ES = 'es',
}

export enum SummaryAudience {
  PROFESSIONAL = 'PROFESSIONAL',
  PATIENT = 'PATIENT',
}

export enum StructuredOutputFormat {
  SOAP = 'SOAP',
  H_AND_P = 'H_AND_P',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  PROGRESS_NOTE = 'PROGRESS_NOTE',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class TranscribeAudioDto {
  @ApiProperty({ description: 'Base64-encoded audio content' })
  @IsString()
  @MinLength(10)
  audioBase64!: string;

  @ApiPropertyOptional({ enum: AudioFormat, default: AudioFormat.WAV })
  @IsEnum(AudioFormat)
  @IsOptional()
  format?: AudioFormat;

  @ApiPropertyOptional({ enum: TranscriptionLanguage, default: TranscriptionLanguage.PT_BR })
  @IsEnum(TranscriptionLanguage)
  @IsOptional()
  language?: TranscriptionLanguage;

  @ApiPropertyOptional({ description: 'Encounter ID for context enrichment' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiPropertyOptional({ enum: ClinicalSpecialty })
  @IsEnum(ClinicalSpecialty)
  @IsOptional()
  specialty?: ClinicalSpecialty;

  @ApiPropertyOptional({ description: 'Enable speaker diarization', default: true })
  @IsBoolean()
  @IsOptional()
  enableDiarization?: boolean;
}

export class GenerateSoapDto {
  @ApiProperty({ description: 'Transcription text to generate SOAP from' })
  @IsString()
  @MinLength(20)
  transcription!: string;

  @ApiPropertyOptional({ description: 'Patient ID for context' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID for context' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiPropertyOptional({ enum: ClinicalSpecialty, default: ClinicalSpecialty.GENERAL })
  @IsEnum(ClinicalSpecialty)
  @IsOptional()
  specialty?: ClinicalSpecialty;

  @ApiPropertyOptional({ description: 'Include ICD-10 coding suggestions', default: true })
  @IsBoolean()
  @IsOptional()
  includeCoding?: boolean;

  @ApiPropertyOptional({ description: 'Include medication extraction', default: true })
  @IsBoolean()
  @IsOptional()
  includeMedications?: boolean;

  @ApiPropertyOptional({ description: 'Additional instructions for AI' })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class StartAmbientDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ enum: ClinicalSpecialty, default: ClinicalSpecialty.GENERAL })
  @IsEnum(ClinicalSpecialty)
  @IsOptional()
  specialty?: ClinicalSpecialty;

  @ApiPropertyOptional({ enum: TranscriptionLanguage, default: TranscriptionLanguage.PT_BR })
  @IsEnum(TranscriptionLanguage)
  @IsOptional()
  language?: TranscriptionLanguage;

  @ApiPropertyOptional({ description: 'Additional clinical context' })
  @IsString()
  @IsOptional()
  context?: string;
}

export class ExtractEntitiesDto {
  @ApiProperty({ description: 'Clinical text to analyze' })
  @IsString()
  @MinLength(5)
  text!: string;

  @ApiPropertyOptional({ enum: EntityType, isArray: true, description: 'Filter by entity types' })
  @IsEnum(EntityType, { each: true })
  @IsArray()
  @IsOptional()
  entityTypes?: EntityType[];

  @ApiPropertyOptional({ description: 'Minimum confidence threshold (0-1)', default: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Include negated entities', default: true })
  @IsBoolean()
  @IsOptional()
  includeNegations?: boolean;
}

export class StructureTextDto {
  @ApiProperty({ description: 'Free text clinical note' })
  @IsString()
  @MinLength(10)
  text!: string;

  @ApiPropertyOptional({ enum: StructuredOutputFormat, default: StructuredOutputFormat.SOAP })
  @IsEnum(StructuredOutputFormat)
  @IsOptional()
  outputFormat?: StructuredOutputFormat;

  @ApiPropertyOptional({ enum: ClinicalSpecialty })
  @IsEnum(ClinicalSpecialty)
  @IsOptional()
  specialty?: ClinicalSpecialty;
}

export class DetectInconsistenciesDto {
  @ApiProperty({ description: 'Clinical note text' })
  @IsString()
  @MinLength(10)
  text!: string;

  @ApiPropertyOptional({ description: 'Current medications list', type: [String] })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  currentMedications?: string[];

  @ApiPropertyOptional({ description: 'Known allergies list', type: [String] })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  knownAllergies?: string[];

  @ApiPropertyOptional({ description: 'Active diagnoses (CID-10 codes or text)', type: [String] })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  activeDiagnoses?: string[];

  @ApiPropertyOptional({ description: 'Patient age in years' })
  @IsInt()
  @Min(0)
  @Max(150)
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Patient gender (M/F)' })
  @IsString()
  @IsOptional()
  patientGender?: string;
}

export class TranslateTextDto {
  @ApiProperty({ description: 'Clinical text to translate' })
  @IsString()
  @MinLength(5)
  text!: string;

  @ApiProperty({ enum: TranslationLanguage, description: 'Source language' })
  @IsEnum(TranslationLanguage)
  sourceLanguage!: TranslationLanguage;

  @ApiProperty({ enum: TranslationLanguage, description: 'Target language' })
  @IsEnum(TranslationLanguage)
  targetLanguage!: TranslationLanguage;

  @ApiPropertyOptional({ description: 'Preserve medical terminology without translation', default: true })
  @IsBoolean()
  @IsOptional()
  preserveTerminology?: boolean;
}

export class SummarizeTextDto {
  @ApiProperty({ description: 'Clinical note(s) to summarize' })
  @IsString()
  @MinLength(20)
  text!: string;

  @ApiPropertyOptional({ enum: SummaryAudience, default: SummaryAudience.PROFESSIONAL, description: 'Target audience' })
  @IsEnum(SummaryAudience)
  @IsOptional()
  audience?: SummaryAudience;

  @ApiPropertyOptional({ description: 'Max summary length in words', default: 150 })
  @IsInt()
  @Min(30)
  @Max(500)
  @IsOptional()
  maxWords?: number;

  @ApiPropertyOptional({ description: 'Focus areas (e.g., medications, diagnoses)', type: [String] })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  focusAreas?: string[];
}

export class AutocompleteDto {
  @ApiProperty({ description: 'Partial clinical text being typed' })
  @IsString()
  @MinLength(3)
  text!: string;

  @ApiPropertyOptional({ description: 'Field context (e.g., subjective, objective, plan)' })
  @IsString()
  @IsOptional()
  fieldContext?: string;

  @ApiPropertyOptional({ enum: ClinicalSpecialty })
  @IsEnum(ClinicalSpecialty)
  @IsOptional()
  specialty?: ClinicalSpecialty;

  @ApiPropertyOptional({ description: 'Max suggestions to return', default: 5 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxSuggestions?: number;
}

export class AmbientSessionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by encounter ID' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ enum: AmbientSessionStatus })
  @IsEnum(AmbientSessionStatus)
  @IsOptional()
  status?: AmbientSessionStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class SpeakerSegmentDto {
  @ApiProperty() speaker!: string;
  @ApiProperty() text!: string;
  @ApiProperty() timestampStart!: number;
  @ApiProperty() timestampEnd!: number;
  @ApiPropertyOptional() confidence?: number;
}

export class TranscribeResponseDto {
  @ApiProperty() text!: string;
  @ApiProperty() language!: string;
  @ApiProperty() durationSeconds!: number;
  @ApiProperty() wordCount!: number;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional({ type: [SpeakerSegmentDto] }) speakerSegments?: SpeakerSegmentDto[];
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class DiagnosisCodeDto {
  @ApiProperty() code!: string;
  @ApiProperty() description!: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedMedicationDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() dose?: string;
  @ApiPropertyOptional() route?: string;
  @ApiPropertyOptional() frequency?: string;
}

export class SoapResponseDto {
  @ApiProperty() subjective!: string;
  @ApiProperty() objective!: string;
  @ApiProperty() assessment!: string;
  @ApiProperty() plan!: string;
  @ApiProperty() chiefComplaint!: string;
  @ApiPropertyOptional({ type: [DiagnosisCodeDto] }) diagnosisCodes?: DiagnosisCodeDto[];
  @ApiPropertyOptional({ type: [ExtractedMedicationDto] }) extractedMedications?: ExtractedMedicationDto[];
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class AmbientSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() encounterId!: string;
  @ApiProperty({ enum: AmbientSessionStatus }) status!: AmbientSessionStatus;
  @ApiPropertyOptional({ enum: ClinicalSpecialty }) specialty?: ClinicalSpecialty;
  @ApiProperty() language!: string;
  @ApiProperty() startedAt!: Date;
  @ApiPropertyOptional() stoppedAt?: Date;
  @ApiPropertyOptional() transcript?: string;
  @ApiPropertyOptional() durationSeconds?: number;
}

export class AmbientSessionListResponseDto {
  @ApiProperty({ type: [AmbientSessionResponseDto] }) items!: AmbientSessionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

export class ExtractedEntityDto {
  @ApiProperty() entity!: string;
  @ApiProperty({ enum: EntityType }) type!: EntityType;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() normalizedCode?: string;
  @ApiPropertyOptional() dose?: string;
  @ApiPropertyOptional() route?: string;
  @ApiPropertyOptional() frequency?: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() startOffset?: number;
  @ApiPropertyOptional() endOffset?: number;
  @ApiPropertyOptional() negated?: boolean;
  @ApiPropertyOptional() context?: string;
}

export class ExtractEntitiesResponseDto {
  @ApiProperty({ type: [ExtractedEntityDto] }) entities!: ExtractedEntityDto[];
  @ApiProperty() totalEntities!: number;
  @ApiProperty() entityCounts!: Record<string, number>;
  @ApiPropertyOptional({ type: [ExtractedEntityDto] }) negatedEntities?: ExtractedEntityDto[];
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class StructuredSectionDto {
  @ApiProperty() section!: string;
  @ApiProperty() content!: string;
}

export class StructureTextResponseDto {
  @ApiProperty({ enum: StructuredOutputFormat }) format!: StructuredOutputFormat;
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
  @ApiProperty({ enum: TranslationLanguage }) sourceLanguage!: TranslationLanguage;
  @ApiProperty({ enum: TranslationLanguage }) targetLanguage!: TranslationLanguage;
  @ApiPropertyOptional() preservedTerms?: Array<{ original: string; kept: string }>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class SummarizeTextResponseDto {
  @ApiProperty() professionalSummary!: string;
  @ApiProperty() patientFriendlySummary!: string;
  @ApiPropertyOptional({ type: [String] }) keyFindings?: string[];
  @ApiPropertyOptional({ type: [String] }) activeDiagnoses?: string[];
  @ApiPropertyOptional({ type: [String] }) currentMedications?: string[];
  @ApiProperty() originalWordCount!: number;
  @ApiProperty() summaryWordCount!: number;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class AutocompleteSuggestionDto {
  @ApiProperty() text!: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() category?: string;
}

export class AutocompleteResponseDto {
  @ApiProperty({ type: [AutocompleteSuggestionDto] }) suggestions!: AutocompleteSuggestionDto[];
  @ApiProperty() inputText!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}
