import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum DiagramType {
  FULL_BODY_ANTERIOR = 'FULL_BODY_ANTERIOR',
  FULL_BODY_POSTERIOR = 'FULL_BODY_POSTERIOR',
  HEAD_NECK = 'HEAD_NECK',
  CHEST = 'CHEST',
  ABDOMEN = 'ABDOMEN',
  UPPER_EXTREMITY = 'UPPER_EXTREMITY',
  LOWER_EXTREMITY = 'LOWER_EXTREMITY',
  HAND = 'HAND',
  FOOT = 'FOOT',
  SPINE = 'SPINE',
  PELVIS = 'PELVIS',
}

export enum AnnotationType {
  POINT = 'POINT',
  LINE = 'LINE',
  AREA = 'AREA',
  TEXT = 'TEXT',
}

export enum ExamSystem {
  GENERAL = 'GENERAL',
  HEAD_NECK = 'HEAD_NECK',
  CARDIOVASCULAR = 'CARDIOVASCULAR',
  RESPIRATORY = 'RESPIRATORY',
  ABDOMEN = 'ABDOMEN',
  NEUROLOGICAL = 'NEUROLOGICAL',
  MUSCULOSKELETAL = 'MUSCULOSKELETAL',
  SKIN = 'SKIN',
  GENITOURINARY = 'GENITOURINARY',
  PSYCHIATRIC = 'PSYCHIATRIC',
}

export enum DiffChangeType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
}

export enum NoteMediaType {
  PHOTO = 'PHOTO',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

// ============================================================================
// 8. Anatomic Diagram Drawing
// ============================================================================

export class DrawingAnnotationDto {
  @ApiProperty({ description: 'X coordinate (0-100 normalized)' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Y coordinate (0-100 normalized)' })
  @IsNumber()
  y!: number;

  @ApiProperty({ enum: AnnotationType })
  @IsEnum(AnnotationType)
  type!: AnnotationType;

  @ApiProperty({ description: 'Label for the annotation' })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ description: 'Color in hex format (e.g. #FF0000)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Additional description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AnatomicDrawingDto {
  @ApiPropertyOptional({ description: 'Clinical note ID' })
  @IsOptional()
  @IsUUID()
  noteId?: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ enum: DiagramType })
  @IsEnum(DiagramType)
  diagramType!: DiagramType;

  @ApiProperty({ type: [DrawingAnnotationDto], description: 'Drawing annotations' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrawingAnnotationDto)
  annotations!: DrawingAnnotationDto[];
}

export class UpdateAnatomicDrawingDto {
  @ApiPropertyOptional({ enum: DiagramType })
  @IsOptional()
  @IsEnum(DiagramType)
  diagramType?: DiagramType;

  @ApiPropertyOptional({ type: [DrawingAnnotationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrawingAnnotationDto)
  annotations?: DrawingAnnotationDto[];
}

export class AnatomicDrawingResultDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) noteId!: string | null;
  @ApiProperty() encounterId!: string;
  @ApiProperty({ enum: DiagramType }) diagramType!: DiagramType;
  @ApiProperty({ type: [DrawingAnnotationDto] }) annotations!: DrawingAnnotationDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ============================================================================
// 9. Physical Exam Macros
// ============================================================================

export class AbnormalFindingDto {
  @ApiProperty({ description: 'Finding name' })
  @IsString()
  finding!: string;

  @ApiProperty({ description: 'Finding description' })
  @IsString()
  description!: string;
}

export class ExamMacroDto {
  @ApiProperty({ enum: ExamSystem })
  @IsEnum(ExamSystem)
  system!: ExamSystem;

  @ApiPropertyOptional({ description: 'Custom normal text (overrides default)' })
  @IsOptional()
  @IsString()
  normalText?: string;

  @ApiPropertyOptional({ type: [AbnormalFindingDto], description: 'Abnormal findings to include' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbnormalFindingDto)
  abnormalFindings?: AbnormalFindingDto[];
}

export class CommonAbnormalityDto {
  @ApiProperty() name!: string;
  @ApiProperty() text!: string;
}

export class ExamMacroTemplateDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ExamSystem }) system!: ExamSystem;
  @ApiProperty() normalTemplate!: string;
  @ApiProperty({ type: [CommonAbnormalityDto] }) commonAbnormalities!: CommonAbnormalityDto[];
}

export class CreateCustomMacroDto {
  @ApiProperty({ enum: ExamSystem })
  @IsEnum(ExamSystem)
  system!: ExamSystem;

  @ApiProperty({ description: 'Normal exam text template' })
  @IsString()
  normalTemplate!: string;

  @ApiPropertyOptional({ type: [CommonAbnormalityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommonAbnormalityDto)
  commonAbnormalities?: CommonAbnormalityDto[];
}

// ============================================================================
// 10. Note Diff
// ============================================================================

export class NoteDiffDto {
  @ApiProperty({ description: 'First note ID' })
  @IsUUID()
  noteId1!: string;

  @ApiProperty({ description: 'Second note ID' })
  @IsUUID()
  noteId2!: string;
}

export class DiffChangeDto {
  @ApiProperty({ enum: DiffChangeType }) type!: DiffChangeType;
  @ApiProperty() lineNumber!: number;
  @ApiProperty({ nullable: true }) oldText!: string | null;
  @ApiProperty({ nullable: true }) newText!: string | null;
}

export class NoteSummaryDto {
  @ApiProperty() content!: string;
  @ApiProperty() date!: string;
  @ApiProperty() author!: string;
}

export class NoteDiffResultDto {
  @ApiProperty({ type: NoteSummaryDto }) note1!: NoteSummaryDto;
  @ApiProperty({ type: NoteSummaryDto }) note2!: NoteSummaryDto;
  @ApiProperty({ type: [DiffChangeDto] }) changes!: DiffChangeDto[];
}

// ============================================================================
// 11. Note with Media
// ============================================================================

export class NoteMediaDto {
  @ApiProperty({ description: 'Clinical note ID' })
  @IsUUID()
  noteId!: string;

  @ApiProperty({ enum: NoteMediaType })
  @IsEnum(NoteMediaType)
  mediaType!: NoteMediaType;

  @ApiProperty({ description: 'Description of the media' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Body region depicted (e.g. "left arm", "abdomen")' })
  @IsOptional()
  @IsString()
  bodyRegion?: string;

  @ApiPropertyOptional({ description: 'When the media was captured' })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSize!: number;

  @ApiProperty({ description: 'MIME type (e.g. image/jpeg, audio/mp3, video/mp4)' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Storage key (S3 path or similar)' })
  @IsString()
  storageKey!: string;
}

export class NoteMediaResultDto {
  @ApiProperty() id!: string;
  @ApiProperty() noteId!: string;
  @ApiProperty({ enum: NoteMediaType }) mediaType!: NoteMediaType;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) bodyRegion!: string | null;
  @ApiProperty({ nullable: true }) capturedAt!: string | null;
  @ApiProperty() fileSize!: number;
  @ApiProperty() mimeType!: string;
  @ApiProperty() storageKey!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() isDeleted!: boolean;
}
