import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum AgentTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AgentType {
  PRE_VISIT_PREP = 'pre-visit-prep',
  FOLLOW_UP = 'follow-up',
  INBOX_TRIAGE = 'inbox-triage',
  PRIOR_AUTH = 'prior-auth',
  REFERRAL = 'referral',
  SUMMARIZE = 'summarize',
  PRE_FILL_FORM = 'pre-fill-form',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class ExecuteAgentDto {
  @ApiProperty({ description: 'Patient ID for context' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter ID for context' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Specific areas to focus on' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  focusAreas?: string[];

  @ApiPropertyOptional({ description: 'Additional parameters for the agent' })
  @IsOptional()
  parameters?: Record<string, string>;
}

export class UpdateAgentConfigDto {
  @ApiPropertyOptional({ description: 'Enable or disable this agent' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Auto-execute on encounter creation' })
  @IsBoolean()
  @IsOptional()
  autoExecute?: boolean;

  @ApiPropertyOptional({ description: 'Priority level (1-10)', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Maximum execution time in seconds' })
  @IsNumber()
  @IsOptional()
  timeoutSeconds?: number;

  @ApiPropertyOptional({ description: 'Custom prompt override' })
  @IsString()
  @IsOptional()
  customPrompt?: string;
}

export class AgentTaskListQueryDto {
  @ApiPropertyOptional({ enum: AgentType, description: 'Filter by agent type' })
  @IsEnum(AgentType)
  @IsOptional()
  agentType?: AgentType;

  @ApiPropertyOptional({ enum: AgentTaskStatus, description: 'Filter by status' })
  @IsEnum(AgentTaskStatus)
  @IsOptional()
  status?: AgentTaskStatus;

  @ApiPropertyOptional({ description: 'Filter by patient ID' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

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

export class AgentDefinitionDto {
  @ApiProperty() agentType!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() autoExecute!: boolean;
  @ApiProperty() priority!: number;
  @ApiProperty() timeoutSeconds!: number;
  @ApiPropertyOptional() customPrompt?: string;
  @ApiProperty() totalExecutions!: number;
  @ApiProperty() avgDurationMs!: number;
  @ApiProperty() successRate!: number;
}

export class AgentTaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AgentType }) type!: AgentType;
  @ApiProperty({ enum: AgentTaskStatus }) status!: AgentTaskStatus;
  @ApiPropertyOptional() patientId?: string;
  @ApiPropertyOptional() encounterId?: string;
  @ApiPropertyOptional() result?: Record<string, unknown>;
  @ApiPropertyOptional() error?: string;
  @ApiProperty() durationMs!: number;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() completedAt?: Date;
}

export class AgentTaskListResponseDto {
  @ApiProperty({ type: [AgentTaskResponseDto] }) items!: AgentTaskResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

export class AgentMetricsResponseDto {
  @ApiProperty() totalTasks!: number;
  @ApiProperty() completedTasks!: number;
  @ApiProperty() failedTasks!: number;
  @ApiProperty() avgDurationMs!: number;
  @ApiProperty() successRate!: number;
  @ApiProperty() byAgent!: Array<{
    agentType: string;
    totalTasks: number;
    completedTasks: number;
    avgDurationMs: number;
    successRate: number;
  }>;
  @ApiProperty() timeSavedHours!: number;
  @ApiProperty() tasksLast24h!: number;
  @ApiProperty() tasksLast7d!: number;
}

// Legacy DTOs for backward compatibility
export class PrepareConsultationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Specific areas to focus on' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  focusAreas?: string[];
}

export class PreFillFormDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Form type identifier' })
  @IsString()
  formType!: string;

  @ApiPropertyOptional({ description: 'Encounter ID for context' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;
}

export class SummarizePatientDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Summary type: brief | comprehensive | specialty-focused' })
  @IsString()
  @IsOptional()
  summaryType?: string;

  @ApiPropertyOptional({ description: 'Date range start' })
  @IsString()
  @IsOptional()
  fromDate?: string;
}

export class ConsultationPrepResponseDto {
  @ApiProperty() taskId!: string;
  @ApiPropertyOptional() recentLabResults?: Array<{ name: string; value: string; date: string; abnormal: boolean }>;
  @ApiPropertyOptional() activeProblems?: Array<{ condition: string; cidCode: string; since: string }>;
  @ApiPropertyOptional() currentMedications?: Array<{ name: string; dose: string; frequency: string }>;
  @ApiPropertyOptional() pendingOrders?: Array<{ type: string; description: string; orderedAt: string }>;
  @ApiPropertyOptional() aiRecommendations?: string[];
  @ApiPropertyOptional() riskAlerts?: string[];
}

export class PreFilledFormResponseDto {
  @ApiProperty() taskId!: string;
  @ApiProperty() formType!: string;
  @ApiProperty() prefilledFields!: Record<string, unknown>;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() suggestedValues?: Record<string, string>;
}

export class PatientSummaryAgentResponseDto {
  @ApiProperty() taskId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() summary!: string;
  @ApiPropertyOptional() demographics?: Record<string, string>;
  @ApiPropertyOptional() problemList?: Array<{ condition: string; status: string }>;
  @ApiPropertyOptional() medicationList?: Array<{ name: string; dose: string }>;
  @ApiPropertyOptional() recentEncounters?: Array<{ date: string; type: string; summary: string }>;
  @ApiPropertyOptional() allergyList?: Array<{ substance: string; severity: string }>;
}
