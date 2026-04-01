import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum QualityIndicatorType {
  INFECTION = 'INFECTION',
  MORTALITY = 'MORTALITY',
  READMISSION_30D = 'READMISSION_30D',
  LENGTH_OF_STAY = 'LENGTH_OF_STAY',
  FALL = 'FALL',
  PRESSURE_INJURY = 'PRESSURE_INJURY',
  AHRQ_PSI = 'AHRQ_PSI',
  NEAR_MISS = 'NEAR_MISS',
  ADVERSE_EVENT = 'ADVERSE_EVENT',
}

export enum InfectionSiteType {
  SSI = 'SSI',          // Surgical Site Infection
  CLABSI = 'CLABSI',   // Central Line–Associated BSI
  VAP = 'VAP',          // Ventilator-Associated Pneumonia
  CAUTI = 'CAUTI',      // Catheter-Associated UTI
  MRSA = 'MRSA',
  C_DIFF = 'C_DIFF',
}

export enum RegulatoryReportType {
  ANS = 'ANS',
  ANVISA = 'ANVISA',
  VIGILANCIA = 'VIGILANCIA',
  CRM = 'CRM',
  CFM = 'CFM',
  COREN = 'COREN',
  DATASUS = 'DATASUS',
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  RESUBMISSION_REQUIRED = 'RESUBMISSION_REQUIRED',
}

export enum IndicatorTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
  UNKNOWN = 'UNKNOWN',
}

// ─── Quality Indicator ────────────────────────────────────────────────────────

export class QualityIndicatorDto {
  @ApiProperty({ enum: QualityIndicatorType })
  @IsEnum(QualityIndicatorType)
  indicatorType!: QualityIndicatorType;

  @ApiProperty({ description: 'Calculated value of the indicator' })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: 'Benchmark / reference value (ONA, JCI, AHRQ)' })
  @IsNumber()
  benchmark!: number;

  @ApiProperty({ description: 'Analysis period (e.g. "2025-Q1", "2025-01")' })
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiProperty({ description: 'Unit of measurement (%, per 1000 patient-days, etc.)' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional({ enum: IndicatorTrend })
  @IsOptional()
  @IsEnum(IndicatorTrend)
  trend?: IndicatorTrend;

  @ApiPropertyOptional({ description: 'Numerator used in calculation' })
  @IsOptional()
  @IsNumber()
  numerator?: number;

  @ApiPropertyOptional({ description: 'Denominator used in calculation' })
  @IsOptional()
  @IsNumber()
  denominator?: number;

  @ApiPropertyOptional({ description: 'Optional breakdown by unit / department' })
  @IsOptional()
  @IsString()
  unit_breakdown?: string;
}

// ─── Process Indicator ────────────────────────────────────────────────────────

export class ProcessIndicatorDto {
  @ApiProperty({ description: '% of patients with protocol-compliant care', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  protocolCompliance!: number;

  @ApiPropertyOptional({ description: 'Door-to-needle time in minutes (stroke/STEMI)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  doorToNeedleTime?: number;

  @ApiPropertyOptional({ description: 'Prophylactic antibiotic timing compliance (%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prophylacticAbxTiming?: number;

  @ApiPropertyOptional({ description: 'VTE prophylaxis compliance (%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vteProphylaxis?: number;

  @ApiPropertyOptional({ description: 'Medication reconciliation rate (%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reconciliationRate?: number;

  @ApiProperty({ description: 'Analysis period' })
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiPropertyOptional({ description: 'Specific department or unit' })
  @IsOptional()
  @IsString()
  department?: string;
}

// ─── Infection Dashboard ──────────────────────────────────────────────────────

export class ResistancePatternDto {
  @ApiProperty() @IsString() @IsNotEmpty() pathogen!: string;
  @ApiProperty() @IsString() @IsNotEmpty() resistance!: string;
  @ApiProperty() @IsInt() @Min(0) cases!: number;
}

export class InfectionDashboardDto {
  @ApiProperty({ enum: InfectionSiteType })
  @IsEnum(InfectionSiteType)
  siteType!: InfectionSiteType;

  @ApiProperty({ description: 'Infection density per 1000 device-days' })
  @IsNumber()
  @Min(0)
  densityPer1000DeviceDays!: number;

  @ApiProperty({ description: 'Most frequent organisms isolated' })
  @IsArray()
  @IsString({ each: true })
  organisms!: string[];

  @ApiProperty({ type: [ResistancePatternDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResistancePatternDto)
  resistancePatterns!: ResistancePatternDto[];

  @ApiProperty({ description: 'Device utilization ratio (0-1)' })
  @IsNumber()
  @Min(0)
  deviceUtilization!: number;

  @ApiProperty({ description: 'Analysis period' })
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiPropertyOptional({ description: 'Unit / ICU name' })
  @IsOptional()
  @IsString()
  unit?: string;
}

// ─── Regulatory Report ────────────────────────────────────────────────────────

export class RegulatoryReportDto {
  @ApiProperty({ enum: RegulatoryReportType })
  @IsEnum(RegulatoryReportType)
  type!: RegulatoryReportType;

  @ApiProperty({ description: 'Reporting period (e.g. "2025-01", "2025-Q1")' })
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiProperty({ description: 'Whether this report was auto-generated' })
  autoGenerated!: boolean;

  @ApiProperty({ description: 'Report payload data' })
  data!: Record<string, unknown>;

  @ApiProperty({ enum: SubmissionStatus })
  @IsEnum(SubmissionStatus)
  submissionStatus!: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Submission timestamp' })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({ description: 'Regulatory agency protocol / control number' })
  @IsOptional()
  @IsString()
  controlNumber?: string;
}

// ─── Query DTOs ───────────────────────────────────────────────────────────────

export class QualityIndicatorQueryDto {
  @ApiPropertyOptional({ enum: QualityIndicatorType })
  @IsOptional()
  @IsEnum(QualityIndicatorType)
  indicatorType?: QualityIndicatorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;
}

export class InfectionDashboardQueryDto {
  @ApiPropertyOptional({ enum: InfectionSiteType })
  @IsOptional()
  @IsEnum(InfectionSiteType)
  siteType?: InfectionSiteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}
