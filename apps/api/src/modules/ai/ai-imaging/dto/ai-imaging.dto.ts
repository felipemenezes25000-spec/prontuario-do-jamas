import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

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

export class AnalyzeImageDto {
  @ApiProperty({ description: 'Exam result ID with associated images' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Image modality (XRAY, CT, MRI, etc.)' })
  @IsString()
  @IsOptional()
  modality?: string;

  @ApiPropertyOptional({ description: 'Clinical indication for the exam' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Body part being examined' })
  @IsString()
  @IsOptional()
  bodyPart?: string;
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

export class ImagingFindingDto {
  @ApiProperty() finding!: string;
  @ApiProperty() location!: string;
  @ApiPropertyOptional() severity?: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiPropertyOptional() relatedIcdCode?: string;
}

export class ImagingAnalysisResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty({ enum: ImagingAnalysisStatus }) status!: ImagingAnalysisStatus;
  @ApiProperty({ type: [ImagingFindingDto] }) findings!: ImagingFindingDto[];
  @ApiPropertyOptional() impression?: string;
  @ApiPropertyOptional() recommendation?: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() analyzedAt!: Date;
}

export class WorklistItemDto {
  @ApiProperty() examResultId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() modality!: string;
  @ApiProperty({ enum: ImagingPriority }) aiPriority!: ImagingPriority;
  @ApiProperty() priorityScore!: number;
  @ApiPropertyOptional() reason?: string;
  @ApiProperty() orderedAt!: Date;
}

export class PrioritizedWorklistResponseDto {
  @ApiProperty({ type: [WorklistItemDto] }) items!: WorklistItemDto[];
  @ApiProperty() totalItems!: number;
  @ApiProperty() generatedAt!: Date;
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
