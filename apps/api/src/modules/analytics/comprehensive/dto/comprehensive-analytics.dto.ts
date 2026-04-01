import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum IndicatorStatus {
  WITHIN_TARGET = 'WITHIN_TARGET',
  NEAR_TARGET = 'NEAR_TARGET',
  BELOW_TARGET = 'BELOW_TARGET',
  ABOVE_TARGET = 'ABOVE_TARGET',
  CRITICAL = 'CRITICAL',
}

export enum SelfServiceChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  TABLE = 'table',
}

export enum CohortFilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  BETWEEN = 'between',
  IN = 'in',
  CONTAINS = 'contains',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class SelfServiceAnalyticsDto {
  @ApiPropertyOptional({ description: 'Filter by diagnosis CID-10 codes' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by procedure codes' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  procedureCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by doctor IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  doctorIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by unit/department' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  units?: string[];

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Group by field: diagnosis, doctor, unit, month, week' })
  @IsString()
  @IsOptional()
  groupBy?: string;

  @ApiPropertyOptional({ description: 'Metric: encounters, admissions, los, cost, readmissions' })
  @IsString()
  @IsOptional()
  metric?: string;

  @ApiPropertyOptional({ enum: SelfServiceChartType, description: 'Preferred chart type' })
  @IsEnum(SelfServiceChartType)
  @IsOptional()
  chartType?: SelfServiceChartType;

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

export class PopulationHealthDto {
  @ApiPropertyOptional({ description: 'Chronic condition CID codes to analyze' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditionCodes?: string[];

  @ApiPropertyOptional({ description: 'Age range minimum' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ageMin?: number;

  @ApiPropertyOptional({ description: 'Age range maximum' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ageMax?: number;

  @ApiPropertyOptional({ description: 'Gender filter' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Risk stratification level: LOW, MODERATE, HIGH, VERY_HIGH' })
  @IsString()
  @IsOptional()
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class BenchmarkingQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Specific indicator to compare' })
  @IsString()
  @IsOptional()
  indicator?: string;

  @ApiPropertyOptional({ description: 'Unit/branch IDs to compare' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unitIds?: string[];
}

export class ClinicalResearchCohortDto {
  @ApiProperty({ description: 'Study/trial title or identifier' })
  @IsString()
  studyTitle!: string;

  @ApiPropertyOptional({ description: 'Inclusion diagnosis CID codes' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inclusionDiagnoses?: string[];

  @ApiPropertyOptional({ description: 'Exclusion diagnosis CID codes' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclusionDiagnoses?: string[];

  @ApiPropertyOptional({ description: 'Minimum age' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ageMin?: number;

  @ApiPropertyOptional({ description: 'Maximum age' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ageMax?: number;

  @ApiPropertyOptional({ description: 'Gender filter (M/F)' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Required lab results (e.g. HbA1c > 7)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labCriteria?: string[];

  @ApiPropertyOptional({ description: 'Required medications' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredMedications?: string[];

  @ApiPropertyOptional({ description: 'Excluded medications' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedMedications?: string[];

  @ApiPropertyOptional({ description: 'Minimum follow-up period in months' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minFollowUpMonths?: number;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class QualityIndicatorItemDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() value!: number;
  @ApiProperty() unit!: string;
  @ApiProperty() benchmark!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() trend?: string;
  @ApiPropertyOptional() detail?: string;
}

export class ComprehensiveQualityResponseDto {
  @ApiProperty() overallScore!: number;
  @ApiProperty({ type: [QualityIndicatorItemDto] }) indicators!: QualityIndicatorItemDto[];
  @ApiProperty() analysisDate!: Date;
  @ApiPropertyOptional() recommendations?: string[];
}

export class ProcessIndicatorResponseDto {
  @ApiProperty() protocolCompliance!: Record<string, unknown>;
  @ApiProperty() doorToNeedleTime!: Record<string, unknown>;
  @ApiProperty() prophylacticAntibioticTiming!: Record<string, unknown>;
  @ApiProperty() vteProphylaxis!: Record<string, unknown>;
  @ApiProperty() totalEncountersAnalyzed!: number;
}

export class SelfServiceAnalyticsResponseDto {
  @ApiProperty() metric!: string;
  @ApiProperty() groupBy!: string;
  @ApiProperty() chartType!: string;
  @ApiProperty() data!: Array<Record<string, unknown>>;
  @ApiProperty() totalRecords!: number;
  @ApiPropertyOptional() summary?: Record<string, unknown>;
  @ApiProperty() generatedAt!: Date;
}

export class PopulationHealthResponseDto {
  @ApiProperty() totalPatients!: number;
  @ApiProperty() cohorts!: Array<{
    condition: string;
    cidCode: string;
    patientCount: number;
    avgAge: number;
    riskDistribution: Record<string, number>;
    controlRate: number;
    hospitalizationRate: number;
  }>;
  @ApiProperty() riskStratification!: {
    low: number;
    moderate: number;
    high: number;
    veryHigh: number;
  };
  @ApiPropertyOptional() interventionGaps?: string[];
  @ApiProperty() analysisDate!: Date;
}

export class BenchmarkingResponseDto {
  @ApiProperty() indicators!: Array<{
    name: string;
    units: Array<{
      unitId: string;
      unitName: string;
      value: number;
      benchmark: number;
      status: string;
      rank: number;
    }>;
    networkAverage: number;
    bestPerformer: string;
    worstPerformer: string;
  }>;
  @ApiProperty() period!: { startDate: string; endDate: string };
  @ApiProperty() generatedAt!: Date;
}

export class ClinicalResearchCohortResponseDto {
  @ApiProperty() studyTitle!: string;
  @ApiProperty() eligiblePatients!: number;
  @ApiProperty() screenedPatients!: number;
  @ApiProperty() patients!: Array<{
    patientId: string;
    patientName: string;
    age: number;
    gender: string;
    matchingCriteria: string[];
    exclusionFlags: string[];
    eligibilityScore: number;
  }>;
  @ApiProperty() inclusionCriteria!: string[];
  @ApiProperty() exclusionCriteria!: string[];
  @ApiPropertyOptional() demographicSummary?: {
    avgAge: number;
    genderDistribution: Record<string, number>;
    topComorbidities: Array<{ condition: string; count: number }>;
  };
  @ApiProperty() generatedAt!: Date;
}
