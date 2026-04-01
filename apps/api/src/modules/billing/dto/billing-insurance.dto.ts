import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  IsPositive,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum EligibilityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export enum PriceTableType {
  AMB = 'AMB',
  CBHPM = 'CBHPM',
  TUSS = 'TUSS',
  SUS = 'SUS',
  INSTITUTIONAL = 'institutional',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'card',
  INSTALLMENT = 'installment',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
}

export enum TissGuideType {
  SP = 'SP',
  SADT = 'SADT',
  INTERNACAO = 'internacao',
  RESUMO = 'resumo',
}

export enum TissSubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PARTIALLY_ACCEPTED = 'PARTIALLY_ACCEPTED',
}

export enum GlosaClassification {
  TECHNICAL = 'technical',
  ADMINISTRATIVE = 'administrative',
  CODING = 'coding',
  AUTHORIZATION = 'authorization',
  DUPLICATE = 'duplicate',
}

export enum GlosaAppealStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PARTIALLY_ACCEPTED = 'partially_accepted',
}

export enum SusBillingType {
  BPA_I = 'BPA_I',
  BPA_C = 'BPA_C',
  APAC = 'APAC',
  AIH = 'AIH',
}

// ═══════════════════════════════════════════════════════════════════════════════
// NESTED CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export class ProcedureEntryDto {
  @ApiProperty({ description: 'TUSS or CBHPM procedure code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Procedure description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Unit price in BRL' })
  @IsNumber()
  @IsPositive()
  price!: number;
}

export class DailyRateDto {
  @ApiProperty({ description: 'Rate type (e.g., UTI, enfermaria, apartamento)' })
  @IsString()
  rateType!: string;

  @ApiProperty({ description: 'Number of days' })
  @IsInt()
  @Min(1)
  days!: number;

  @ApiProperty({ description: 'Unit price per day in BRL' })
  @IsNumber()
  @IsPositive()
  unitPrice!: number;

  @ApiProperty({ description: 'Total subtotal for this rate type' })
  @IsNumber()
  @IsPositive()
  subtotal!: number;
}

export class FeeItemDto {
  @ApiProperty({ description: 'TUSS code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Fee description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Quantity performed' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit price in BRL' })
  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}

export class GlosedItemDto {
  @ApiProperty({ description: 'Item identifier or code' })
  @IsString()
  item!: string;

  @ApiProperty({ description: 'Reason provided by the insurance operator' })
  @IsString()
  reason!: string;

  @ApiProperty({ description: 'Glosed amount in BRL' })
  @IsNumber()
  @IsPositive()
  amount!: number;
}

export class SusProcedureDto {
  @ApiProperty({ description: 'SIGTAP procedure code' })
  @IsString()
  sigtapCode!: string;

  @ApiProperty({ description: 'Procedure description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Quantity performed' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'CID-10 code associated with the procedure' })
  @IsString()
  cid10!: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELIGIBILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export class EligibilityCheckDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: "Patient's insurance card number (carteirinha)" })
  @IsString()
  insuranceCardNumber!: string;

  @ApiProperty({ description: 'Insurance plan code (ANS code)' })
  @IsString()
  planCode!: string;

  @ApiPropertyOptional({ description: 'TUSS procedure code to check coverage' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ enum: EligibilityStatus, description: 'Expected check result' })
  @IsOptional()
  @IsEnum(EligibilityStatus)
  checkResult?: EligibilityStatus;

  @ApiPropertyOptional({ description: 'Coverage percentage (0–100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coverage?: number;

  @ApiPropertyOptional({ description: 'Waiting period in days for this procedure/plan' })
  @IsOptional()
  @IsInt()
  @Min(0)
  waitingPeriod?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export class PriceTableDto {
  @ApiProperty({ enum: PriceTableType, description: 'Price table standard' })
  @IsEnum(PriceTableType)
  tableType!: PriceTableType;

  @ApiProperty({ description: 'Table version (e.g., "2024.01")' })
  @IsString()
  version!: string;

  @ApiProperty({ type: [ProcedureEntryDto], description: 'Procedures and their prices' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureEntryDto)
  procedures!: ProcedureEntryDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITAL BILL (CONTA HOSPITALAR)
// ═══════════════════════════════════════════════════════════════════════════════

export class HospitalBillDto {
  @ApiProperty({ description: 'Admission UUID' })
  @IsUUID()
  admissionId!: string;

  @ApiPropertyOptional({ type: [DailyRateDto], description: 'Daily accommodation rates' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyRateDto)
  dailyRates?: DailyRateDto[];

  @ApiPropertyOptional({ type: [FeeItemDto], description: 'Medical fees (honorários)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  fees?: FeeItemDto[];

  @ApiPropertyOptional({ type: [FeeItemDto], description: 'Materials and implants' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  materials?: FeeItemDto[];

  @ApiPropertyOptional({ type: [FeeItemDto], description: 'Medications dispensed' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  medications?: FeeItemDto[];

  @ApiPropertyOptional({ type: [FeeItemDto], description: 'Physician honorariums' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  honorariums?: FeeItemDto[];

  @ApiPropertyOptional({ type: [FeeItemDto], description: 'Exams and diagnostics' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  exams?: FeeItemDto[];

  @ApiPropertyOptional({ description: 'Cost center code for accounting allocation' })
  @IsOptional()
  @IsString()
  costCenter?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE PAY BUDGET (ORÇAMENTO PARTICULAR)
// ═══════════════════════════════════════════════════════════════════════════════

export class PrivatePayBudgetDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: [ProcedureEntryDto], description: 'Procedures included in the budget' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureEntryDto)
  procedures!: ProcedureEntryDto[];

  @ApiProperty({ description: 'Total budget amount in BRL' })
  @IsNumber()
  @IsPositive()
  totalAmount!: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Chosen payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Number of installments (for credit card)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional({ description: 'Whether the patient approved the budget' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BILLING AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

export class PreBillingAuditDto {
  @ApiProperty({ description: 'Bill UUID to audit' })
  @IsUUID()
  billId!: string;

  @ApiProperty({ description: 'Auditor name or employee ID' })
  @IsString()
  auditor!: string;

  @ApiPropertyOptional({ description: 'Completeness checklist items (field -> passed)' })
  @IsOptional()
  @IsObject()
  completenessChecklist?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Consistency checklist items (field -> passed)' })
  @IsOptional()
  @IsObject()
  consistencyChecklist?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Coding review notes' })
  @IsOptional()
  @IsString()
  codingReview?: string;

  @ApiPropertyOptional({ description: 'List of issues found during the audit' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TISS GUIDE (GUIA TISS)
// ═══════════════════════════════════════════════════════════════════════════════

export class TissGuideDto {
  @ApiProperty({ enum: TissGuideType, description: 'TISS guide type' })
  @IsEnum(TissGuideType)
  guideType!: TissGuideType;

  @ApiPropertyOptional({ description: 'Raw XML content of the TISS guide' })
  @IsOptional()
  @IsString()
  xmlContent?: string;

  @ApiPropertyOptional({ description: 'Validation errors from TISS XSD schema' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  validationErrors?: string[];

  @ApiPropertyOptional({ enum: TissSubmissionStatus, description: 'Current submission status' })
  @IsOptional()
  @IsEnum(TissSubmissionStatus)
  submissionStatus?: TissSubmissionStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TISS BATCH (LOTE TISS)
// ═══════════════════════════════════════════════════════════════════════════════

export class TissBatchDto {
  @ApiProperty({ description: 'Batch identifier' })
  @IsString()
  batchId!: string;

  @ApiProperty({ type: [String], description: 'List of TISS guide UUIDs in this batch' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  guides!: string[];

  @ApiPropertyOptional({ description: 'Submission date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  submissionDate?: string;

  @ApiPropertyOptional({ description: 'Protocol number returned by the operator' })
  @IsOptional()
  @IsString()
  protocol?: string;

  @ApiPropertyOptional({ enum: TissSubmissionStatus, description: 'Payment/processing status' })
  @IsOptional()
  @IsEnum(TissSubmissionStatus)
  paymentStatus?: TissSubmissionStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSA MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export class GlosaManagementDto {
  @ApiProperty({ description: 'Billing entry UUID that was glosed' })
  @IsUUID()
  billId!: string;

  @ApiProperty({ type: [GlosedItemDto], description: 'Items that were glosed' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlosedItemDto)
  glosedItems!: GlosedItemDto[];

  @ApiProperty({ enum: GlosaClassification, description: 'Glosa classification' })
  @IsEnum(GlosaClassification)
  classification!: GlosaClassification;

  @ApiPropertyOptional({ description: 'Written justification for appeal' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ enum: GlosaAppealStatus, description: 'Current appeal status' })
  @IsOptional()
  @IsEnum(GlosaAppealStatus)
  appealStatus?: GlosaAppealStatus;

  @ApiPropertyOptional({ description: 'Appeal deadline (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  appealDeadline?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUS BILLING
// ═══════════════════════════════════════════════════════════════════════════════

export class SusBillingDto {
  @ApiProperty({ enum: SusBillingType, description: 'SUS billing instrument type' })
  @IsEnum(SusBillingType)
  type!: SusBillingType;

  @ApiProperty({ description: 'Competence month in YYYY-MM format' })
  @IsString()
  competence!: string;

  @ApiProperty({ type: [SusProcedureDto], description: 'Procedures performed' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SusProcedureDto)
  procedures!: SusProcedureDto[];

  @ApiPropertyOptional({ description: 'Export file content (DATASUS format / .rem)' })
  @IsOptional()
  @IsString()
  exportFile?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST PER CASE
// ═══════════════════════════════════════════════════════════════════════════════

export class CostPerCaseDto {
  @ApiProperty({ description: 'Admission UUID' })
  @IsUUID()
  admissionId!: string;

  @ApiPropertyOptional({ description: 'Total materials cost in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  materials?: number;

  @ApiPropertyOptional({ description: 'Total medications cost in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  medications?: number;

  @ApiPropertyOptional({ description: 'Total staffing cost in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  staffing?: number;

  @ApiPropertyOptional({ description: 'Total hospitality/hotel cost in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hospitality?: number;

  @ApiPropertyOptional({ description: 'Total exams cost in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exams?: number;

  @ApiPropertyOptional({ description: 'Total cost in BRL (sum of all categories)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({ description: 'Total revenue billed for this admission in BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;

  @ApiPropertyOptional({ description: 'Margin (revenue - totalCost) in BRL' })
  @IsOptional()
  @IsNumber()
  margin?: number;
}
