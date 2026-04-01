import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
  Matches,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SmartPhraseVariableKind {
  TEXT = 'TEXT',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  PATIENT_DATA = 'PATIENT_DATA',
  LAB_RESULT = 'LAB_RESULT',
}

export enum SmartLinkDataSource {
  LAB = 'lab',
  VITALS = 'vitals',
  MEDS = 'meds',
  DIAGNOSES = 'diagnoses',
}

export enum ExamSystem {
  CARDIO = 'cardio',
  PULMONARY = 'pulmonary',
  ABDOMEN = 'abdomen',
  NEURO = 'neuro',
  MUSCULOSKELETAL = 'musculoskeletal',
  DERMATOLOGY = 'dermatology',
  OPHTHALMOLOGY = 'ophthalmology',
  ENT = 'ent',
  GENITOURINARY = 'genitourinary',
  PSYCHIATRIC = 'psychiatric',
  GENERAL = 'general',
}

export enum SmartPhraseTextCategory {
  PHYSICAL_EXAM = 'PHYSICAL_EXAM',
  HISTORY = 'HISTORY',
  PLAN = 'PLAN',
  ASSESSMENT = 'ASSESSMENT',
  INSTRUCTIONS = 'INSTRUCTIONS',
  PROCEDURES = 'PROCEDURES',
  GENERAL = 'GENERAL',
}

// ─── SmartPhrase ──────────────────────────────────────────────────────────────

export class SmartPhraseVariableItemDto {
  @ApiProperty({ description: 'Variable name (used in template as {{name}})' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: SmartPhraseVariableKind })
  @IsEnum(SmartPhraseVariableKind)
  kind: SmartPhraseVariableKind;

  @ApiPropertyOptional({ description: 'Default value for the variable' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;
}

export class SmartPhraseDto {
  @ApiProperty({
    description: 'Dot-prefixed abbreviation trigger, e.g. ".normalexfisico"',
    example: '.normalexfisico',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\./, { message: 'Abbreviation must start with a dot (.)' })
  abbreviation: string;

  @ApiProperty({ description: 'Full expansion text with optional {{variable}} placeholders' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  expansion: string;

  @ApiPropertyOptional({ description: 'Variable definitions used in the expansion text', type: [SmartPhraseVariableItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartPhraseVariableItemDto)
  variables?: SmartPhraseVariableItemDto[];

  @ApiPropertyOptional({ description: 'Whether the phrase is private to one doctor vs shared' })
  @IsOptional()
  @IsBoolean()
  personalPerDoctor?: boolean;

  @ApiPropertyOptional({ description: 'Owning doctor user ID (null = shared library)' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: SmartPhraseTextCategory })
  @IsOptional()
  @IsEnum(SmartPhraseTextCategory)
  category?: SmartPhraseTextCategory;
}

export class UpdateSmartPhraseTextDto {
  @ApiPropertyOptional({ example: '.normalexfisico' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\./, { message: 'Abbreviation must start with a dot (.)' })
  abbreviation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  expansion?: string;

  @ApiPropertyOptional({ type: [SmartPhraseVariableItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartPhraseVariableItemDto)
  variables?: SmartPhraseVariableItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  personalPerDoctor?: boolean;

  @ApiPropertyOptional({ enum: SmartPhraseTextCategory })
  @IsOptional()
  @IsEnum(SmartPhraseTextCategory)
  category?: SmartPhraseTextCategory;
}

export class ExpandSmartPhraseTextDto {
  @ApiProperty({ example: '.normalexfisico' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiPropertyOptional({ description: 'Patient UUID for auto-resolution of patient variables' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Manual variable overrides as key→value map' })
  @IsOptional()
  @IsObject()
  variableValues?: Record<string, string>;
}

// ─── SmartLink ────────────────────────────────────────────────────────────────

export class SmartLinkDto {
  @ApiProperty({
    description: '@-prefixed keyword trigger, e.g. "@labrecente"',
    example: '@labrecente',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^@/, { message: 'Keyword must start with @' })
  keyword: string;

  @ApiProperty({ enum: SmartLinkDataSource })
  @IsEnum(SmartLinkDataSource)
  dataSource: SmartLinkDataSource;

  @ApiPropertyOptional({ description: 'Refresh live data on every note open' })
  @IsOptional()
  @IsBoolean()
  autoUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Optional human-readable description of the link' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ResolveSmartLinkTextDto {
  @ApiProperty({ example: '@labrecente' })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID for encounter-scoped data' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// ─── Exam Macro ───────────────────────────────────────────────────────────────

export class ExamMacroDto {
  @ApiProperty({ enum: ExamSystem })
  @IsEnum(ExamSystem)
  system: ExamSystem;

  @ApiProperty({ description: 'Full normal exam text for this system', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  normalTemplate: string;

  @ApiPropertyOptional({ description: 'Pre-defined abnormal findings for quick selection', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  findings?: string[];

  @ApiPropertyOptional({ description: 'Medical specialty that owns this macro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;
}

export class ApplyExamMacroDto {
  @ApiProperty({ enum: ExamSystem })
  @IsEnum(ExamSystem)
  system: ExamSystem;

  @ApiPropertyOptional({ description: 'Selected abnormal findings to merge into the normal template', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedFindings?: string[];

  @ApiPropertyOptional({ description: 'Free-text override for specific sections' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  freeTextOverride?: string;
}

// ─── Note Diff ────────────────────────────────────────────────────────────────

export class NoteDiffDto {
  @ApiProperty({ description: 'First clinical note UUID (e.g. yesterday)' })
  @IsUUID()
  @IsNotEmpty()
  noteId1: string;

  @ApiProperty({ description: 'Second clinical note UUID (e.g. today)' })
  @IsUUID()
  @IsNotEmpty()
  noteId2: string;
}

// ─── Response Interfaces ───────────────────────────────────────────────────────

export interface SmartPhraseTextRecord {
  id: string;
  abbreviation: string;
  expansion: string;
  variables: SmartPhraseVariableItemDto[];
  personalPerDoctor: boolean;
  ownerId: string | null;
  category: SmartPhraseTextCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpandedSmartPhraseResult {
  abbreviation: string;
  expandedText: string;
  unresolvedVariables: string[];
}

export interface SmartLinkRecord {
  id: string;
  keyword: string;
  dataSource: SmartLinkDataSource;
  autoUpdate: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedSmartLinkResult {
  keyword: string;
  dataSource: SmartLinkDataSource;
  resolvedAt: Date;
  formattedText: string;
  rawData: unknown;
}

export interface ExamMacroRecord {
  id: string;
  system: ExamSystem;
  normalTemplate: string;
  findings: string[];
  specialty: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppliedExamMacroResult {
  system: ExamSystem;
  resultText: string;
  appliedFindings: string[];
}

export interface NoteDiffHunk {
  field: string;
  oldText: string | null;
  newText: string | null;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface NoteDiffResult {
  noteId1: string;
  noteId2: string;
  date1: Date;
  date2: Date;
  author1: string;
  author2: string;
  hunks: NoteDiffHunk[];
  summary: string;
}
