import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── SmartPhrase Variable Types ─────────────────────────────────────────────

export enum SmartPhraseVariableType {
  TEXT = 'TEXT',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  PATIENT_DATA = 'PATIENT_DATA',
  LAB_RESULT = 'LAB_RESULT',
}

export enum SmartPhraseCategory {
  PHYSICAL_EXAM = 'PHYSICAL_EXAM',
  HISTORY = 'HISTORY',
  PLAN = 'PLAN',
  ASSESSMENT = 'ASSESSMENT',
  INSTRUCTIONS = 'INSTRUCTIONS',
  PROCEDURES = 'PROCEDURES',
  GENERAL = 'GENERAL',
}

export enum SmartLinkKeyword {
  LAB_RECENTE = 'labrecente',
  SINAIS_VITAIS = 'sinaisvitais',
  MEDICAMENTOS = 'medicamentos',
  ALERGIAS = 'alergias',
  PROBLEMAS = 'problemas',
}

export enum NoteSignatureType {
  DIGITAL_ICP = 'DIGITAL_ICP',
  ELECTRONIC = 'ELECTRONIC',
  BIOMETRIC = 'BIOMETRIC',
}

// ─── SmartPhrase DTOs ───────────────────────────────────────────────────────

export class SmartPhraseVariableDto {
  @ApiProperty({ description: 'Variable name (used in template as {{name}})' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Variable type', enum: SmartPhraseVariableType })
  @IsEnum(SmartPhraseVariableType)
  type: SmartPhraseVariableType;
}

export class CreateSmartPhraseDto {
  @ApiProperty({ description: 'Abbreviation trigger (e.g. ".normalexfisico")', example: '.normalexfisico' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\./, { message: 'Abbreviation must start with a dot (.)' })
  abbreviation: string;

  @ApiProperty({ description: 'Expansion text with optional {{variable}} placeholders' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  expansionText: string;

  @ApiPropertyOptional({ description: 'Variables used in the expansion text', type: [SmartPhraseVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartPhraseVariableDto)
  variables?: SmartPhraseVariableDto[];

  @ApiPropertyOptional({ description: 'Owner user ID. If omitted, phrase is shared.' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Medical specialty (e.g. "CARDIOLOGY", "GENERAL")' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Category for organization', enum: SmartPhraseCategory })
  @IsOptional()
  @IsEnum(SmartPhraseCategory)
  category?: SmartPhraseCategory;
}

export class UpdateSmartPhraseDto {
  @ApiPropertyOptional({ description: 'New abbreviation trigger' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\./, { message: 'Abbreviation must start with a dot (.)' })
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'New expansion text' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expansionText?: string;

  @ApiPropertyOptional({ description: 'Updated variables', type: [SmartPhraseVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartPhraseVariableDto)
  variables?: SmartPhraseVariableDto[];

  @ApiPropertyOptional({ description: 'Medical specialty' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Category', enum: SmartPhraseCategory })
  @IsOptional()
  @IsEnum(SmartPhraseCategory)
  category?: SmartPhraseCategory;
}

export class VariableValueDto {
  @ApiProperty({ description: 'Variable name matching the SmartPhrase variable' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Value to substitute' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class ExpandSmartPhraseDto {
  @ApiProperty({ description: 'SmartPhrase abbreviation to expand', example: '.normalexfisico' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiPropertyOptional({ description: 'Patient ID for PATIENT_DATA variables' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID for context-dependent variables' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Variable values for substitution', type: [VariableValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableValueDto)
  variableValues?: VariableValueDto[];
}

// ─── SmartPhrase Response Interfaces ────────────────────────────────────────

export interface SmartPhraseResponse {
  id: string;
  abbreviation: string;
  expansionText: string;
  variables: SmartPhraseVariableDto[];
  ownerId: string | null;
  specialty: string | null;
  category: SmartPhraseCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpandedPhraseResponse {
  originalAbbreviation: string;
  expandedText: string;
  unresolvedVariables: string[];
}

// ─── SmartLink DTOs ─────────────────────────────────────────────────────────

export class ResolveSmartLinkDto {
  @ApiProperty({ description: 'Patient ID to resolve data for' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID for encounter-scoped data' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'SmartLink keyword', enum: SmartLinkKeyword, example: 'labrecente' })
  @IsEnum(SmartLinkKeyword)
  keyword: SmartLinkKeyword;
}

export interface SmartLinkResolvedResponse {
  keyword: SmartLinkKeyword;
  prefix: string;
  resolvedAt: Date;
  data: SmartLinkLabData[] | SmartLinkVitalsData | SmartLinkMedicationData[] | SmartLinkAllergyData[] | SmartLinkProblemData[];
  formattedText: string;
}

export interface SmartLinkLabData {
  examName: string;
  examCode: string | null;
  labResults: Record<string, unknown> | null;
  completedAt: Date | null;
  status: string;
}

export interface SmartLinkVitalsData {
  recordedAt: Date;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  painScale: number | null;
}

export interface SmartLinkMedicationData {
  medicationName: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  status: string;
  startDate: Date | null;
}

export interface SmartLinkAllergyData {
  substance: string;
  type: string;
  severity: string;
  reaction: string | null;
}

export interface SmartLinkProblemData {
  cidCode: string | null;
  cidDescription: string | null;
  status: string;
  severity: string | null;
  diagnosedAt: Date | null;
}

// ─── CopyForward DTOs ──────────────────────────────────────────────────────

export class CopyForwardDto {
  @ApiProperty({ description: 'Source clinical note ID to copy from' })
  @IsUUID()
  @IsNotEmpty()
  sourceNoteId: string;

  @ApiProperty({ description: 'Target encounter ID for the new note' })
  @IsUUID()
  @IsNotEmpty()
  targetEncounterId: string;

  @ApiPropertyOptional({ description: 'Whether to highlight changes from the source', default: true })
  @IsOptional()
  @IsBoolean()
  highlightChanges?: boolean;
}

export interface CopyForwardResultResponse {
  copiedContent: {
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    freeText: string | null;
    diagnosisCodes: string[];
    procedureCodes: string[];
  };
  sourceDate: Date;
  sourceAuthor: {
    id: string;
    name: string;
  };
  changeMarkers: ChangeMarker[];
}

export interface ChangeMarker {
  field: string;
  sourceValue: string | null;
  note: string;
}

// ─── NoteLocking DTOs ───────────────────────────────────────────────────────

export class LockNoteDto {
  @ApiProperty({ description: 'Signature type for locking', enum: NoteSignatureType })
  @IsEnum(NoteSignatureType)
  signatureType: NoteSignatureType;

  @ApiPropertyOptional({ description: 'Digital signature hash (required for DIGITAL_ICP)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  signatureHash?: string;

  @ApiPropertyOptional({ description: 'CFM-standard signature block text' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  signatureBlock?: string;
}

export class AddendumDto {
  @ApiProperty({ description: 'Addendum text content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  addendumText: string;

  @ApiProperty({ description: 'Reason for the addendum' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export interface NoteVersionResponse {
  versionNumber: number;
  content: {
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    freeText: string | null;
  };
  author: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: Date;
  isLocked: boolean;
  signatureType: NoteSignatureType | null;
  addenda: AddendumEntry[];
}

export interface AddendumEntry {
  id: string;
  text: string;
  reason: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface NoteHistoryResponse {
  noteId: string;
  currentVersion: number;
  isLocked: boolean;
  versions: NoteVersionResponse[];
}
