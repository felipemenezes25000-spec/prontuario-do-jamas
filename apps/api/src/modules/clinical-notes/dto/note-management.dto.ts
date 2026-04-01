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
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum InterconsultationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  ANSWERED = 'ANSWERED',
  CANCELLED = 'CANCELLED',
}

export enum InterconsultationUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENT = 'EMERGENT',
}

export enum NoteSignatureKind {
  ELECTRONIC = 'ELECTRONIC',
  DIGITAL_ICP = 'DIGITAL_ICP',
  BIOMETRIC = 'BIOMETRIC',
}

export enum NoteMediaType {
  PHOTO = 'photo',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export enum SpecialtyTemplateKind {
  CARDIOLOGY = 'CARDIOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PSYCHIATRY = 'PSYCHIATRY',
  PEDIATRICS = 'PEDIATRICS',
  NEUROLOGY = 'NEUROLOGY',
  ONCOLOGY = 'ONCOLOGY',
  GERIATRICS = 'GERIATRICS',
  OBSTETRICS = 'OBSTETRICS',
  NEPHROLOGY = 'NEPHROLOGY',
  PULMONOLOGY = 'PULMONOLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  ENDOCRINOLOGY = 'ENDOCRINOLOGY',
  RHEUMATOLOGY = 'RHEUMATOLOGY',
  UROLOGY = 'UROLOGY',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  GENERAL = 'GENERAL',
}

// ─── Interconsultation ────────────────────────────────────────────────────────

export class InterconsultationDto {
  @ApiProperty({ description: 'Requesting doctor user UUID' })
  @IsUUID()
  @IsNotEmpty()
  requestingDoctorId: string;

  @ApiProperty({ description: 'Encounter UUID where the request originates' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Target specialty for the consultation', enum: SpecialtyTemplateKind })
  @IsEnum(SpecialtyTemplateKind)
  targetSpecialty: SpecialtyTemplateKind;

  @ApiProperty({ description: 'Clinical reason / question for consultation', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @ApiProperty({ enum: InterconsultationUrgency })
  @IsEnum(InterconsultationUrgency)
  urgency: InterconsultationUrgency;

  @ApiPropertyOptional({ description: 'Relevant clinical context, history or findings', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  clinicalContext?: string;

  @ApiPropertyOptional({ description: 'Preferred response date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  preferredResponseDate?: string;
}

export class InterconsultationResponseDto {
  @ApiProperty({ description: 'Interconsultation request UUID' })
  @IsUUID()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({ description: 'Responding specialist user UUID' })
  @IsUUID()
  @IsNotEmpty()
  respondingDoctorId: string;

  @ApiProperty({ description: 'Structured response / opinion', maxLength: 10_000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  response: string;

  @ApiPropertyOptional({ description: 'Recommended follow-up actions', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Proposed ICD-10/CID-10 diagnosis', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  proposedDiagnosis?: string;
}

// ─── CopyForward ──────────────────────────────────────────────────────────────

export class CopyForwardNoteDto {
  @ApiProperty({ description: 'Source clinical note UUID to copy from' })
  @IsUUID()
  @IsNotEmpty()
  sourceNoteId: string;

  @ApiProperty({ description: 'Target encounter UUID for the new draft note' })
  @IsUUID()
  @IsNotEmpty()
  targetEncounterId: string;

  @ApiPropertyOptional({ description: 'Highlight which sections changed since the source note', default: true })
  @IsOptional()
  @IsBoolean()
  highlightChanges?: boolean;

  @ApiPropertyOptional({ description: 'Only copy these SOAP sections', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];
}

// ─── Note Signature & Lock ────────────────────────────────────────────────────

export class NoteSignatureDto {
  @ApiProperty({ description: 'Clinical note UUID to sign and lock' })
  @IsUUID()
  @IsNotEmpty()
  noteId: string;

  @ApiProperty({ enum: NoteSignatureKind })
  @IsEnum(NoteSignatureKind)
  signatureType: NoteSignatureKind;

  @ApiPropertyOptional({ description: 'Whether to immediately lock the note after signing (read-only per CFM)' })
  @IsOptional()
  @IsBoolean()
  lockAfterSign?: boolean;

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

// ─── Note Media ────────────────────────────────────────────────────────────────

export class NoteMediaDto {
  @ApiProperty({ description: 'Clinical note UUID to attach media to' })
  @IsUUID()
  @IsNotEmpty()
  noteId: string;

  @ApiProperty({ enum: NoteMediaType })
  @IsEnum(NoteMediaType)
  mediaType: NoteMediaType;

  @ApiProperty({ description: 'S3 object key or presigned upload token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  fileKey: string;

  @ApiProperty({ description: 'Original filename with extension' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({ description: 'MIME type of the uploaded file' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 capture timestamp' })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiPropertyOptional({ description: 'Clinical description / context for the media item', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Body region depicted (for anatomical reference)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bodyRegion?: string;
}

// ─── Anatomical Drawing ───────────────────────────────────────────────────────

export class DrawingAnnotationDto {
  @ApiProperty({ description: 'SVG path data string for the annotation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  svgPath: string;

  @ApiProperty({ description: 'Label for the annotation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  label: string;

  @ApiPropertyOptional({ description: 'Hex color for the annotation stroke', example: '#ef4444' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class AnatomicalDrawingDto {
  @ApiProperty({ description: 'Clinical note UUID to attach the drawing to' })
  @IsUUID()
  @IsNotEmpty()
  noteId: string;

  @ApiProperty({
    description: 'Body region identifier (e.g. "anterior_torso", "posterior_head")',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bodyRegion: string;

  @ApiProperty({ description: 'Collection of SVG annotation paths with labels', type: [DrawingAnnotationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrawingAnnotationDto)
  annotations: DrawingAnnotationDto[];

  @ApiPropertyOptional({ description: 'Free-text clinical description of the drawing', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

// ─── Specialty Template ───────────────────────────────────────────────────────

export class TemplateFieldDto {
  @ApiProperty({ description: 'Field identifier key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ description: 'Human-readable field label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ description: 'Placeholder text shown in the UI' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Whether the field is mandatory', default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Predefined options for dropdown fields', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class EmbeddedScoreDto {
  @ApiProperty({ description: 'Clinical score name, e.g. "NIHSS", "CHADS2"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  scoreName: string;

  @ApiProperty({ description: 'Score fields with their labels', type: [TemplateFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields: TemplateFieldDto[];

  @ApiPropertyOptional({ description: 'Scoring formula description or interpretation guide' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  interpretation?: string;
}

export class SpecialtyTemplateDto {
  @ApiProperty({ enum: SpecialtyTemplateKind })
  @IsEnum(SpecialtyTemplateKind)
  specialty: SpecialtyTemplateKind;

  @ApiProperty({ description: 'Ordered list of section names for the template', type: [String] })
  @IsArray()
  @IsString({ each: true })
  sections: string[];

  @ApiPropertyOptional({ description: 'Embedded clinical scores for the template', type: [EmbeddedScoreDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbeddedScoreDto)
  embeddedScores?: EmbeddedScoreDto[];

  @ApiPropertyOptional({ description: 'Custom fields for the template', type: [TemplateFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];

  @ApiPropertyOptional({ description: 'Template description for UI display' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// ─── Addendum (locked note change via addendum only) ──────────────────────────

export class NoteAddendumDto {
  @ApiProperty({ description: 'Addendum content text', maxLength: 10_000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  addendumText: string;

  @ApiProperty({ description: 'Reason for the addendum (CFM requirement)', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface InterconsultationRecord {
  id: string;
  encounterId: string;
  requestingDoctorId: string;
  targetSpecialty: SpecialtyTemplateKind;
  reason: string;
  urgency: InterconsultationUrgency;
  status: InterconsultationStatus;
  clinicalContext: string | null;
  preferredResponseDate: Date | null;
  response: string | null;
  recommendations: string | null;
  proposedDiagnosis: string | null;
  respondingDoctorId: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteMediaRecord {
  id: string;
  noteId: string;
  mediaType: NoteMediaType;
  fileKey: string;
  fileName: string;
  mimeType: string | null;
  capturedAt: Date | null;
  description: string | null;
  bodyRegion: string | null;
  uploadedAt: Date;
}

export interface AnatomicalDrawingRecord {
  id: string;
  noteId: string;
  bodyRegion: string;
  annotations: DrawingAnnotationDto[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialtyTemplateRecord {
  id: string;
  specialty: SpecialtyTemplateKind;
  sections: string[];
  embeddedScores: EmbeddedScoreDto[];
  fields: TemplateFieldDto[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CopyForwardNoteResult {
  copiedContent: Record<string, string | null>;
  sourceNoteId: string;
  sourceDate: Date;
  sourceAuthor: string;
  highlightedSections: string[];
}

export interface NoteSignatureResult {
  noteId: string;
  signedAt: Date;
  signatureType: NoteSignatureKind;
  isLocked: boolean;
  signedById: string;
}
