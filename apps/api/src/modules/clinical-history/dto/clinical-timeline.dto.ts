import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum TimelineEventType {
  ENCOUNTER = 'ENCOUNTER',
  HOSPITALIZATION = 'HOSPITALIZATION',
  SURGERY = 'SURGERY',
  EXAM_RESULT = 'EXAM_RESULT',
  DIAGNOSIS = 'DIAGNOSIS',
  PRESCRIPTION = 'PRESCRIPTION',
  VITAL_SIGNS = 'VITAL_SIGNS',
  ALLERGY = 'ALLERGY',
  VACCINATION = 'VACCINATION',
  TRANSFUSION = 'TRANSFUSION',
  IMPLANT = 'IMPLANT',
  DISCHARGE = 'DISCHARGE',
  NOTE = 'NOTE',
}

// ============================================================================
// Query DTO
// ============================================================================

export class ClinicalTimelineQueryDto {
  @ApiPropertyOptional({ enum: TimelineEventType, isArray: true, description: 'Filter by event types (comma-separated)' })
  @IsOptional()
  eventTypes?: TimelineEventType | TimelineEventType[];

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Maximum number of events to return', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

// ============================================================================
// Result DTOs
// ============================================================================

export class TimelineEventDto {
  id!: string;
  type!: TimelineEventType;
  eventDate!: string;
  title!: string;
  summary!: string | null;
  metadata!: Record<string, unknown>;
  providerId!: string | null;
  providerName!: string | null;
}

export class ClinicalTimelineDto {
  patientId!: string;
  totalEvents!: number;
  events!: TimelineEventDto[];
  from!: string | null;
  to!: string | null;
  generatedAt!: string;
}
