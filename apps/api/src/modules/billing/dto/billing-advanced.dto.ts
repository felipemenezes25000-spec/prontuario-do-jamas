import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum TISSGuideType {
  SP_SADT = 'SP_SADT',
  INTERNACAO = 'INTERNACAO',
  CONSULTA = 'CONSULTA',
  HONORARIOS = 'HONORARIOS',
  RESUMO_INTERNACAO = 'RESUMO_INTERNACAO',
  ODONTOLOGICA = 'ODONTOLOGICA',
}

export enum CoverageType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  NOT_COVERED = 'NOT_COVERED',
}

export enum TISSBatchStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  EXPORTED = 'EXPORTED',
  SUBMITTED = 'SUBMITTED',
  PROTOCOL_RECEIVED = 'PROTOCOL_RECEIVED',
}

export enum AuditCheckCategory {
  COMPLETENESS = 'COMPLETENESS',
  CONSISTENCY = 'CONSISTENCY',
  CODING = 'CODING',
  DOCUMENTATION = 'DOCUMENTATION',
  AUTHORIZATION = 'AUTHORIZATION',
}

export enum AuditCheckStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum AuditOverallStatus {
  APPROVED = 'APPROVED',
  NEEDS_CORRECTION = 'NEEDS_CORRECTION',
  REJECTED = 'REJECTED',
}

// ─── 1. Real-time Eligibility Check ────────────────────────────────────────

export class EligibilityCheckDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Insurance UUID' })
  @IsUUID()
  @IsNotEmpty()
  insuranceId: string;

  @ApiProperty({ description: 'TUSS procedure code' })
  @IsString()
  @IsNotEmpty()
  procedureCode: string;

  @ApiProperty({ description: 'Scheduled date for the procedure' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;
}

export class EligibilityRestrictionDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  description: string;
}

export class EligibilityResultDto {
  @ApiProperty()
  isEligible: boolean;

  @ApiProperty()
  planActive: boolean;

  @ApiProperty({ enum: CoverageType })
  coverageType: CoverageType;

  @ApiProperty()
  copayAmount: number;

  @ApiProperty({ description: 'Coinsurance percentage (0-100)' })
  coinsurancePercent: number;

  @ApiProperty()
  deductibleRemaining: number;

  @ApiProperty()
  preAuthRequired: boolean;

  @ApiProperty()
  waitingPeriod: boolean;

  @ApiPropertyOptional()
  waitingPeriodEndDate: string | null;

  @ApiProperty({ type: [EligibilityRestrictionDto] })
  restrictions: EligibilityRestrictionDto[];

  @ApiProperty()
  cardValidUntil: string;
}

// ─── 2. TISS XML Generation (Guias) ────────────────────────────────────────

export class GenerateTISSDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ enum: TISSGuideType })
  @IsEnum(TISSGuideType)
  @IsNotEmpty()
  guideType: TISSGuideType;

  @ApiProperty({ description: 'Insurance UUID' })
  @IsUUID()
  @IsNotEmpty()
  insuranceId: string;

  @ApiProperty({ description: 'Provider CNES code' })
  @IsString()
  @IsNotEmpty()
  providerCNES: string;

  @ApiProperty({ description: 'Executant CNES code' })
  @IsString()
  @IsNotEmpty()
  executantCNES: string;
}

export class TISSProcedureDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;
}

export class TISSPatientDataDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  insuranceNumber: string;

  @ApiProperty()
  planCode: string;
}

export class TISSProviderDataDto {
  @ApiProperty()
  CNES: string;

  @ApiProperty()
  name: string;
}

export class TISSGuideDto {
  @ApiProperty()
  guideNumber: string;

  @ApiProperty({ enum: TISSGuideType })
  guideType: TISSGuideType;

  @ApiProperty()
  registrationANS: string;

  @ApiProperty({ type: TISSPatientDataDto })
  patientData: TISSPatientDataDto;

  @ApiProperty({ type: TISSProviderDataDto })
  providerData: TISSProviderDataDto;

  @ApiProperty({ type: [TISSProcedureDto] })
  procedures: TISSProcedureDto[];

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ description: 'Generated TISS 4.0 XML string' })
  xmlContent: string;
}

export class CreateTISSBatchDto {
  @ApiProperty({ enum: TISSGuideType })
  @IsEnum(TISSGuideType)
  @IsNotEmpty()
  guideType: TISSGuideType;

  @ApiProperty({ description: 'Competence period (YYYY-MM)' })
  @IsString()
  @IsNotEmpty()
  competence: string;

  @ApiProperty({ description: 'Guide IDs to include in batch', type: [String] })
  @IsArray()
  @IsString({ each: true })
  guideIds: string[];
}

export class TISSBatchDto {
  @ApiProperty()
  batchNumber: string;

  @ApiProperty({ enum: TISSGuideType })
  guideType: TISSGuideType;

  @ApiProperty({ description: 'Competence period (YYYY-MM)' })
  competence: string;

  @ApiProperty({ type: [TISSGuideDto] })
  guides: TISSGuideDto[];

  @ApiProperty()
  totalGuides: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ description: 'Full batch TISS XML' })
  xmlContent: string;

  @ApiProperty({ enum: TISSBatchStatus })
  status: TISSBatchStatus;
}

// ─── 3. Pre-billing Audit ──────────────────────────────────────────────────

export class PreBillingAuditDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Auditor UUID' })
  @IsUUID()
  @IsNotEmpty()
  auditorId: string;
}

export class AuditChecklistItemDto {
  @ApiProperty({ enum: AuditCheckCategory })
  category: AuditCheckCategory;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: AuditCheckStatus })
  status: AuditCheckStatus;

  @ApiPropertyOptional()
  notes: string | null;
}

export class AuditChecklistDto {
  @ApiProperty({ type: [AuditChecklistItemDto] })
  items: AuditChecklistItemDto[];
}

export class AuditCorrectionDto {
  @ApiProperty()
  field: string;

  @ApiProperty()
  currentValue: string;

  @ApiProperty()
  suggestedValue: string;

  @ApiProperty()
  reason: string;
}

export class AuditResultDto {
  @ApiProperty()
  encounterId: string;

  @ApiProperty({ enum: AuditOverallStatus })
  overallStatus: AuditOverallStatus;

  @ApiProperty({ minimum: 0, maximum: 100 })
  score: number;

  @ApiProperty({ type: [AuditChecklistItemDto] })
  failedChecks: AuditChecklistItemDto[];

  @ApiProperty({ type: [AuditChecklistItemDto] })
  warnings: AuditChecklistItemDto[];

  @ApiProperty({ type: [AuditCorrectionDto] })
  corrections: AuditCorrectionDto[];

  @ApiProperty()
  auditorId: string;

  @ApiProperty()
  auditedAt: string;
}

// ─── 4. Cost per Patient/Case ──────────────────────────────────────────────

export class CostAnalysisDto {
  @ApiPropertyOptional({ description: 'Encounter UUID (for single encounter cost)' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Patient UUID (for aggregate patient cost)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Start date for analysis period' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for analysis period' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CostItemDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiProperty()
  unitCost: number;

  @ApiProperty()
  total: number;
}

export class CostBreakdownDetailsDto {
  @ApiProperty()
  dailyRates: { days: number; unitCost: number; total: number };

  @ApiProperty({ type: [CostItemDto] })
  medications: CostItemDto[];

  @ApiProperty({ type: [CostItemDto] })
  materials: CostItemDto[];

  @ApiProperty({ type: [CostItemDto] })
  labs: CostItemDto[];

  @ApiProperty({ type: [CostItemDto] })
  imaging: CostItemDto[];

  @ApiProperty({ type: [CostItemDto] })
  procedures: CostItemDto[];

  @ApiProperty()
  professionalFees: { total: number };

  @ApiProperty()
  icuDays: { count: number; dailyCost: number; total: number };

  @ApiProperty()
  surgicalRoom: { hours: number; hourlyRate: number; total: number };

  @ApiProperty({ type: [CostItemDto] })
  other: CostItemDto[];
}

export class CostBreakdownDto {
  @ApiProperty()
  encounterId: string;

  @ApiProperty()
  patientId: string;

  @ApiPropertyOptional()
  admissionDate: string | null;

  @ApiPropertyOptional()
  dischargeDate: string | null;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  revenueTotal: number;

  @ApiProperty()
  margin: number;

  @ApiProperty({ description: 'Margin as percentage' })
  marginPercent: number;

  @ApiProperty({ type: CostBreakdownDetailsDto })
  breakdown: CostBreakdownDetailsDto;
}

export class CostComparisonDto {
  @ApiProperty()
  encounterId: string;

  @ApiProperty()
  actualCost: number;

  @ApiProperty()
  drgExpectedCost: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  variancePercent: number;

  @ApiProperty()
  drgCode: string;

  @ApiProperty()
  drgDescription: string;
}

export class MarginAnalysisDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  grossMargin: number;

  @ApiProperty()
  grossMarginPercent: number;

  @ApiProperty()
  encounterCount: number;

  @ApiProperty()
  averageMarginPerEncounter: number;

  @ApiProperty({ description: 'Top 5 highest-margin encounters' })
  topMarginEncounters: Array<{
    encounterId: string;
    margin: number;
    marginPercent: number;
  }>;

  @ApiProperty({ description: 'Top 5 lowest-margin (loss) encounters' })
  worstMarginEncounters: Array<{
    encounterId: string;
    margin: number;
    marginPercent: number;
  }>;
}
