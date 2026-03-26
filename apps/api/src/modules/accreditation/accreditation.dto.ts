import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum AccreditationStandard {
  ONA = 'ONA',
  JCI = 'JCI',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIAL = 'PARTIAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  NOT_EVALUATED = 'NOT_EVALUATED',
}

export enum ActionPlanPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ActionPlanStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// DTOs
// ============================================================================

export class EvaluateChecklistItemDto {
  @ApiProperty() @IsString() itemId!: string;

  @ApiProperty({ enum: ComplianceStatus })
  @IsEnum(ComplianceStatus) status!: ComplianceStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() evidence?: string;
  @ApiProperty() @IsString() evaluatedBy!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateActionPlanDto {
  @ApiProperty() @IsString() checklistItemId!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() responsible!: string;
  @ApiProperty() @IsDateString() deadline!: string;

  @ApiProperty({ enum: ActionPlanPriority })
  @IsEnum(ActionPlanPriority) priority!: ActionPlanPriority;
}

export class UpdateActionPlanStatusDto {
  @ApiProperty({ enum: ActionPlanStatus })
  @IsEnum(ActionPlanStatus) status!: ActionPlanStatus;
}

export class ListActionPlansFilterDto {
  @ApiPropertyOptional({ enum: ActionPlanStatus })
  @IsOptional() @IsEnum(ActionPlanStatus) status?: ActionPlanStatus;

  @ApiPropertyOptional({ enum: ActionPlanPriority })
  @IsOptional() @IsEnum(ActionPlanPriority) priority?: ActionPlanPriority;

  @ApiPropertyOptional() @IsOptional() @IsString() responsible?: string;
}
