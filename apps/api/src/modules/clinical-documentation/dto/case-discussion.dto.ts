import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum CaseDiscussionType {
  CASE_DISCUSSION = 'CASE_DISCUSSION',
  TUMOR_BOARD = 'TUMOR_BOARD',
  MORTALITY_REVIEW = 'MORTALITY_REVIEW',
  ETHICS_COMMITTEE = 'ETHICS_COMMITTEE',
  MULTIDISCIPLINARY_TEAM = 'MULTIDISCIPLINARY_TEAM',
}

export enum CaseDiscussionParticipantRole {
  PRESENTER = 'PRESENTER',
  REVIEWER = 'REVIEWER',
  ATTENDEE = 'ATTENDEE',
}

export enum CaseDiscussionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// Nested DTOs
// ============================================================================

export class CaseDiscussionParticipantInputDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() specialty!: string;
  @ApiProperty({ enum: CaseDiscussionParticipantRole })
  @IsEnum(CaseDiscussionParticipantRole) role!: CaseDiscussionParticipantRole;
}

export class CaseDiscussionRecommendationDto {
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() responsible!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deadline?: string;
}

// ============================================================================
// Create Case Discussion DTO
// ============================================================================

export class CreateCaseDiscussionFullDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: CaseDiscussionType })
  @IsEnum(CaseDiscussionType) type!: CaseDiscussionType;

  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsDateString() scheduledDate!: string;

  @ApiProperty({ type: [CaseDiscussionParticipantInputDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CaseDiscussionParticipantInputDto)
  participants!: CaseDiscussionParticipantInputDto[];

  @ApiProperty() @IsString() clinicalSummary!: string;

  @ApiProperty({ type: [String] })
  @IsArray() @IsString({ each: true }) questionsForDiscussion!: string[];
}

// ============================================================================
// Record Outcome DTO
// ============================================================================

export class RecordCaseDiscussionOutcomeDto {
  @ApiProperty() @IsUUID() discussionId!: string;
  @ApiProperty() @IsString() conclusions!: string;
  @ApiProperty() @IsString() agreedPlan!: string;

  @ApiProperty({ type: [CaseDiscussionRecommendationDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CaseDiscussionRecommendationDto)
  recommendations!: CaseDiscussionRecommendationDto[];

  @ApiPropertyOptional() @IsOptional() @IsDateString() followUpDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dissenting?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recordingUrl?: string;
}

// ============================================================================
// Filters DTO
// ============================================================================

export class ListCaseDiscussionsFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional({ enum: CaseDiscussionType })
  @IsOptional() @IsEnum(CaseDiscussionType) type?: CaseDiscussionType;
  @ApiPropertyOptional({ enum: CaseDiscussionStatus })
  @IsOptional() @IsEnum(CaseDiscussionStatus) status?: CaseDiscussionStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
