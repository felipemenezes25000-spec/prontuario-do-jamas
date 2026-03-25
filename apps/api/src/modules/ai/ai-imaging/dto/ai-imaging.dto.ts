import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ImagingAnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ImagingPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum ImagingModality {
  XRAY = 'XRAY',
  CT = 'CT',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  PET_CT = 'PET_CT',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class AnalyzeImageDto {
  @ApiProperty({ description: 'Exam result ID with associated images' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ enum: ImagingModality, description: 'Image modality' })
  @IsEnum(ImagingModality)
  @IsOptional()
  modality?: ImagingModality;

  @ApiPropertyOptional({ description: 'Clinical indication for the exam' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Body part being examined' })
  @IsString()
  @IsOptional()
  bodyPart?: string;

  @ApiPropertyOptional({ description: 'Patient age for context' })
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Patient gender for context' })
  @IsString()
  @IsOptional()
  patientGender?: string;
}

export class WorklistQueryDto {
  @ApiPropertyOptional({ enum: ImagingModality, description: 'Filter by modality' })
  @IsEnum(ImagingModality)
  @IsOptional()
  modality?: ImagingModality;

  @ApiPropertyOptional({ enum: ImagingPriority, description: 'Filter by priority' })
  @IsEnum(ImagingPriority)
  @IsOptional()
  priority?: ImagingPriority;

  @ApiPropertyOptional({ description: 'Maximum number of items', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class PrioritizeWorklistDto {
  @ApiPropertyOptional({ description: 'Filter by modality' })
  @IsString()
  @IsOptional()
  modality?: string;

  @ApiPropertyOptional({ description: 'Maximum number of items to prioritize' })
  @IsOptional()
  limit?: number;
}

export class CadMammographyDto {
  @ApiProperty({ description: 'Exam result ID' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Clinical indication' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Patient age' })
  @IsOptional()
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Family history of breast cancer' })
  @IsOptional()
  familyHistory?: boolean;

  @ApiPropertyOptional({ description: 'Previous BI-RADS classification' })
  @IsString()
  @IsOptional()
  previousBirads?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class ImagingFindingDto {
  @ApiProperty() finding!: string;
  @ApiProperty() location!: string;
  @ApiPropertyOptional() severity?: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiPropertyOptional() relatedIcdCode?: string;
  @ApiPropertyOptional() measurements?: Record<string, string>;
}

export class ImagingAnalysisResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty({ enum: ImagingAnalysisStatus }) status!: ImagingAnalysisStatus;
  @ApiProperty({ type: [ImagingFindingDto] }) findings!: ImagingFindingDto[];
  @ApiPropertyOptional() impression?: string;
  @ApiPropertyOptional() recommendation?: string;
  @ApiPropertyOptional() biradsClassification?: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() analyzedAt!: Date;
  @ApiPropertyOptional() processingTimeMs?: number;
}

export class WorklistItemDto {
  @ApiProperty() examResultId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() modality!: string;
  @ApiProperty({ enum: ImagingPriority }) aiPriority!: ImagingPriority;
  @ApiProperty() priorityScore!: number;
  @ApiPropertyOptional() reason?: string;
  @ApiPropertyOptional() clinicalIndication?: string;
  @ApiProperty() orderedAt!: Date;
  @ApiPropertyOptional() estimatedReadTime?: string;
}

export class PrioritizedWorklistResponseDto {
  @ApiProperty({ type: [WorklistItemDto] }) items!: WorklistItemDto[];
  @ApiProperty() totalItems!: number;
  @ApiProperty() generatedAt!: Date;
}

export class ImagingMetricsResponseDto {
  @ApiProperty() totalAnalyzed!: number;
  @ApiProperty() totalPending!: number;
  @ApiProperty() criticalFindings!: number;
  @ApiProperty() avgProcessingTimeMs!: number;
  @ApiProperty() analysisByModality!: Record<string, number>;
  @ApiProperty() findingsByCategory!: Record<string, number>;
  @ApiProperty() accuracyMetrics!: {
    sensitivity: number;
    specificity: number;
    ppv: number;
    npv: number;
  };
  @ApiProperty() recentCritical!: Array<{
    examResultId: string;
    finding: string;
    patientName: string;
    modality: string;
    analyzedAt: Date;
  }>;
  @ApiProperty() turnaroundTime!: {
    avgMinutes: number;
    p50Minutes: number;
    p95Minutes: number;
  };
}

export class ImagingDashboardResponseDto {
  @ApiProperty() totalPending!: number;
  @ApiProperty() totalAnalyzed!: number;
  @ApiProperty() criticalFindings!: number;
  @ApiProperty() avgProcessingTimeMs!: number;
  @ApiProperty() analysisByModality!: Record<string, number>;
  @ApiProperty() recentCritical!: Array<{
    examResultId: string;
    finding: string;
    patientName: string;
    analyzedAt: Date;
  }>;
}
