import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator';

export enum AgentTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AgentTaskType {
  PREPARE_CONSULTATION = 'PREPARE_CONSULTATION',
  PRE_FILL_FORM = 'PRE_FILL_FORM',
  SUMMARIZE_PATIENT = 'SUMMARIZE_PATIENT',
}

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

  @ApiPropertyOptional({ description: 'Date range start for summary' })
  @IsString()
  @IsOptional()
  fromDate?: string;
}

export class AgentTaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AgentTaskType }) type!: AgentTaskType;
  @ApiProperty({ enum: AgentTaskStatus }) status!: AgentTaskStatus;
  @ApiPropertyOptional() result?: Record<string, unknown>;
  @ApiPropertyOptional() error?: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() completedAt?: Date;
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
