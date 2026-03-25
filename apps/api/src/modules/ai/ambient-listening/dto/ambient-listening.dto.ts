import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum AmbientSessionStatus {
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  TRANSCRIBED = 'TRANSCRIBED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  APPROVED = 'APPROVED',
}

export enum AmbientSpecialty {
  GENERAL = 'GENERAL',
  CARDIOLOGY = 'CARDIOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PEDIATRICS = 'PEDIATRICS',
  PSYCHIATRY = 'PSYCHIATRY',
  DERMATOLOGY = 'DERMATOLOGY',
  GYNECOLOGY = 'GYNECOLOGY',
  NEUROLOGY = 'NEUROLOGY',
  PULMONOLOGY = 'PULMONOLOGY',
  EMERGENCY = 'EMERGENCY',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class StartAmbientSessionDto {
  @ApiProperty({ description: 'Patient ID for the ambient session' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter ID to associate with the ambient session' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Language for transcription', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ enum: AmbientSpecialty, description: 'Medical specialty for context-aware transcription' })
  @IsEnum(AmbientSpecialty)
  @IsOptional()
  specialty?: AmbientSpecialty;

  @ApiPropertyOptional({ description: 'Additional context for AI processing (e.g., chief complaint)' })
  @IsString()
  @IsOptional()
  context?: string;
}

export class GenerateNoteDto {
  @ApiPropertyOptional({ description: 'Note format: SOAP, H&P, PROGRESS, DISCHARGE', default: 'SOAP' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ description: 'Include ICD-10 code suggestions', default: true })
  @IsOptional()
  includeCodingSuggestions?: boolean;

  @ApiPropertyOptional({ description: 'Include medication extraction', default: true })
  @IsOptional()
  includeMedications?: boolean;

  @ApiPropertyOptional({ description: 'Additional instructions for note generation' })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class ApproveAmbientNoteDto {
  @ApiPropertyOptional({ description: 'Manual edits to the generated note before saving' })
  @IsString()
  @IsOptional()
  editedNote?: string;

  @ApiPropertyOptional({ description: 'Additional clinician comments' })
  @IsString()
  @IsOptional()
  clinicianComments?: string;

  @ApiPropertyOptional({ description: 'Override diagnosis codes' })
  @IsArray()
  @IsOptional()
  diagnosisCodes?: Array<{ code: string; description: string }>;
}

export class AmbientSessionListQueryDto {
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

export class DiagnosisCodeDto {
  @ApiProperty() code!: string;
  @ApiProperty() description!: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedMedicationDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() dose?: string;
  @ApiPropertyOptional() frequency?: string;
  @ApiPropertyOptional() route?: string;
}

export class AmbientClinicalNoteResponseDto {
  @ApiProperty() sessionId!: string;
  @ApiPropertyOptional() format?: string;
  @ApiPropertyOptional() subjective?: string;
  @ApiPropertyOptional() objective?: string;
  @ApiPropertyOptional() assessment?: string;
  @ApiPropertyOptional() plan?: string;
  @ApiPropertyOptional({ type: [DiagnosisCodeDto] }) diagnosisCodes?: DiagnosisCodeDto[];
  @ApiPropertyOptional({ type: [ExtractedMedicationDto] }) extractedMedications?: ExtractedMedicationDto[];
  @ApiPropertyOptional() chiefComplaint?: string;
  @ApiPropertyOptional() reviewOfSystems?: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() aiModel!: string;
  @ApiPropertyOptional() processingTimeMs?: number;
}

export class AmbientTranscriptResponseDto {
  @ApiProperty() sessionId!: string;
  @ApiProperty() rawTranscript!: string;
  @ApiPropertyOptional({ type: [SpeakerSegmentDto] }) speakerDiarization?: SpeakerSegmentDto[];
  @ApiProperty() language!: string;
  @ApiProperty() durationSeconds!: number;
  @ApiPropertyOptional() wordCount?: number;
  @ApiPropertyOptional() confidence?: number;
}

export class AmbientSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() encounterId!: string;
  @ApiProperty({ enum: AmbientSessionStatus }) status!: AmbientSessionStatus;
  @ApiPropertyOptional({ enum: AmbientSpecialty }) specialty?: AmbientSpecialty;
  @ApiPropertyOptional() transcript?: string;
  @ApiPropertyOptional() clinicalNote?: string;
  @ApiProperty() language!: string;
  @ApiProperty() startedAt!: Date;
  @ApiPropertyOptional() stoppedAt?: Date;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() approvedById?: string;
  @ApiPropertyOptional() durationSeconds?: number;
}

export class AmbientSessionListResponseDto {
  @ApiProperty({ type: [AmbientSessionResponseDto] }) items!: AmbientSessionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
