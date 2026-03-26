import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum InterConsultUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum InterConsultStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DocumentLockStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  ADDENDUM = 'ADDENDUM',
}

export enum SpecialtyTemplate {
  CARDIOLOGY = 'CARDIOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  GYNECOLOGY = 'GYNECOLOGY',
  PEDIATRICS = 'PEDIATRICS',
  PSYCHIATRY = 'PSYCHIATRY',
  NEUROLOGY = 'NEUROLOGY',
  GENERAL = 'GENERAL',
}

export enum PhysicalExamSystem {
  HEAD_NECK = 'HEAD_NECK',
  CARDIOVASCULAR = 'CARDIOVASCULAR',
  RESPIRATORY = 'RESPIRATORY',
  ABDOMINAL = 'ABDOMINAL',
  NEUROLOGICAL = 'NEUROLOGICAL',
  MUSCULOSKELETAL = 'MUSCULOSKELETAL',
  SKIN = 'SKIN',
  GENITOURINARY = 'GENITOURINARY',
  PSYCHIATRIC = 'PSYCHIATRIC',
}

// ============================================================================
// Interconsultation DTOs
// ============================================================================

export class CreateInterConsultDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() requestingSpecialty!: string;
  @ApiProperty() @IsString() targetSpecialty!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() targetDoctorId?: string;
  @ApiProperty() @IsString() clinicalQuestion!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relevantHistory?: string;
  @ApiProperty({ enum: InterConsultUrgency })
  @IsEnum(InterConsultUrgency) urgency!: InterConsultUrgency;
}

export class RespondInterConsultDto {
  @ApiProperty() @IsString() response!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpPlan?: string;
}

// ============================================================================
// Case Discussion / Medical Board DTOs
// ============================================================================

export class CaseDiscussionParticipantDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() specialty!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
}

export class CreateCaseDiscussionDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() clinicalSummary!: string;
  @ApiProperty({ type: [CaseDiscussionParticipantDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CaseDiscussionParticipantDto)
  participants!: CaseDiscussionParticipantDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() conclusions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agreedPlan?: string;
}

// ============================================================================
// Attendance Declaration DTO
// ============================================================================

export class CreateAttendanceDeclarationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsString() purpose!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Copy-Forward DTO
// ============================================================================

export class CopyForwardDto {
  @ApiProperty() @IsString() sourceDocumentId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modifications?: string;
}

// ============================================================================
// Note Signing / Locking DTO
// ============================================================================

export class SignNoteDto {
  @ApiProperty() @IsString() documentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() digitalSignatureHash?: string;
}

export class CreateAddendumDto {
  @ApiProperty() @IsString() originalDocumentId!: string;
  @ApiProperty() @IsString() addendumContent!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

// ============================================================================
// SmartPhrases DTO
// ============================================================================

export class CreateSmartPhraseDto {
  @ApiProperty() @IsString() shortcut!: string;
  @ApiProperty() @IsString() expansion!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(SpecialtyTemplate) specialty?: SpecialtyTemplate;
}

export class UpdateSmartPhraseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() shortcut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expansion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

// ============================================================================
// SmartLinks DTO
// ============================================================================

export class ResolveSmartLinkDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() linkCode!: string;
}

// ============================================================================
// Physical Exam Macros DTO
// ============================================================================

export class PhysicalExamMacroDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty({ enum: PhysicalExamSystem })
  @IsEnum(PhysicalExamSystem) system!: PhysicalExamSystem;
  @ApiProperty() @IsBoolean() normal!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() abnormalities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Note Comparison DTO
// ============================================================================

export class CompareNotesDto {
  @ApiProperty() @IsString() documentIdA!: string;
  @ApiProperty() @IsString() documentIdB!: string;
}

// ============================================================================
// Media Attachment DTO
// ============================================================================

export class AttachMediaDto {
  @ApiProperty() @IsString() documentId!: string;
  @ApiProperty() @IsString() mediaType!: string;
  @ApiProperty() @IsString() mediaUrl!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timestamp?: string;
}

// ============================================================================
// Anatomical Diagram DTO
// ============================================================================

export class AnatomicalMarkingDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(100) x!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) y!: number;
  @ApiProperty() @IsString() label!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class CreateAnatomicalDiagramDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() bodyRegion!: string;
  @ApiProperty({ type: [AnatomicalMarkingDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => AnatomicalMarkingDto)
  markings!: AnatomicalMarkingDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Specialty Template DTO
// ============================================================================

export class CreateFromTemplateDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: SpecialtyTemplate })
  @IsEnum(SpecialtyTemplate) specialty!: SpecialtyTemplate;
  @ApiPropertyOptional() @IsOptional() @IsString() overrides?: string;
}

// ============================================================================
// Patient Timeline DTOs
// ============================================================================

export enum TimelineEventType {
  ENCOUNTER = 'ENCOUNTER',
  NOTE = 'NOTE',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB = 'LAB',
  VITALS = 'VITALS',
  SURGERY = 'SURGERY',
  ADMISSION = 'ADMISSION',
  DISCHARGE = 'DISCHARGE',
}

export class PatientTimelineFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional({ enum: TimelineEventType, isArray: true })
  @IsOptional() @IsArray() @IsEnum(TimelineEventType, { each: true })
  types?: TimelineEventType[];
}

// ============================================================================
// AI Feature DTOs
// ============================================================================

export class AiDifferentialDiagnosisDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsString() symptoms!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() examFindings?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() labResults?: string;
}

export class AiAutoCompleteDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsString() partialText!: string;
  @ApiProperty() @IsString() section!: string;
}

export class AiTranslateNoteDto {
  @ApiProperty() @IsString() documentId!: string;
  @ApiProperty() @IsString() targetLanguage!: string;
}

export class AiPatientSummaryDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
}
