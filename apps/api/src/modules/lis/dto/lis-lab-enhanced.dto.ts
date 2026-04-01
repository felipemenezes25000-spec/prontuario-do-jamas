import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// Phlebotomy Worklist
// ═══════════════════════════════════════════════════════════════════════════════

export enum PhlebotomyPriority {
  STAT = 'STAT',
  TIMED = 'TIMED',
  ROUTINE = 'ROUTINE',
}

export enum CollectionStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class OrderedTestDto {
  @ApiProperty({ description: 'Test name (e.g. Hemograma Completo)' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiProperty({ description: 'Tube color (e.g. ROXO, AMARELO, AZUL)' })
  @IsString()
  @IsNotEmpty()
  tubeColor: string;

  @ApiProperty({ description: 'Tube type (e.g. EDTA, SST, CITRATO)' })
  @IsString()
  @IsNotEmpty()
  tubeType: string;

  @ApiProperty({ description: 'Required volume in mL' })
  @IsNumber()
  @Min(0.1)
  volume: number;
}

export class PhlebotomyItemDto {
  @ApiProperty({ description: 'Phlebotomy item ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Patient full name' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ description: 'Room number' })
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiPropertyOptional({ description: 'Bed identifier' })
  @IsOptional()
  @IsString()
  bed?: string;

  @ApiProperty({ description: 'Ordered tests with tube details', type: [OrderedTestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderedTestDto)
  orderedTests: OrderedTestDto[];

  @ApiProperty({ description: 'Collection priority', enum: PhlebotomyPriority })
  @IsEnum(PhlebotomyPriority)
  priority: PhlebotomyPriority;

  @ApiProperty({ description: 'Whether fasting is required' })
  @IsBoolean()
  fastingRequired: boolean;

  @ApiPropertyOptional({ description: 'Special instructions for collection' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Scheduled collection time (ISO)' })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional({ description: 'Assigned collector ID' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiProperty({ description: 'Collection status', enum: CollectionStatus })
  @IsEnum(CollectionStatus)
  collectionStatus: CollectionStatus;

  @ApiPropertyOptional({ description: 'Timestamp when collected (ISO)' })
  @IsOptional()
  @IsDateString()
  collectionTimestamp?: string;

  @ApiPropertyOptional({ description: 'Reason for failure if status is FAILED' })
  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class PhlebotomyWorklistQueryDto {
  @ApiPropertyOptional({ description: 'Filter by unit/floor' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class PhlebotomyWorklistDto {
  date: string;
  unit: string;
  items: PhlebotomyItemDto[];
}

export class UpdateCollectionStatusDto {
  @ApiProperty({ description: 'New collection status', enum: CollectionStatus })
  @IsEnum(CollectionStatus)
  status: CollectionStatus;

  @ApiPropertyOptional({ description: 'Collector who performed the collection' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({ description: 'Failure reason (required when status is FAILED)' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePhlebotomyItemDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Patient full name' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ description: 'Room number' })
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiPropertyOptional({ description: 'Bed identifier' })
  @IsOptional()
  @IsString()
  bed?: string;

  @ApiProperty({ description: 'Unit/floor' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Ordered tests', type: [OrderedTestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderedTestDto)
  orderedTests: OrderedTestDto[];

  @ApiProperty({ description: 'Priority', enum: PhlebotomyPriority })
  @IsEnum(PhlebotomyPriority)
  priority: PhlebotomyPriority;

  @ApiProperty({ description: 'Whether fasting is required' })
  @IsBoolean()
  fastingRequired: boolean;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Scheduled time (ISO)' })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional({ description: 'Assigned collector ID' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reflex Testing
// ═══════════════════════════════════════════════════════════════════════════════

export enum ReflexTriggerCondition {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
  ABNORMAL = 'ABNORMAL',
  POSITIVE = 'POSITIVE',
}

export class CreateReflexRuleEnhancedDto {
  @ApiProperty({ description: 'Trigger test name (e.g. TSH)' })
  @IsString()
  @IsNotEmpty()
  triggerTest: string;

  @ApiProperty({ description: 'Trigger condition', enum: ReflexTriggerCondition })
  @IsEnum(ReflexTriggerCondition)
  triggerCondition: ReflexTriggerCondition;

  @ApiPropertyOptional({ description: 'Threshold value for ABOVE/BELOW conditions' })
  @IsOptional()
  @IsNumber()
  triggerValue?: number;

  @ApiProperty({ description: 'Test to auto-order when triggered (e.g. Free T4)' })
  @IsString()
  @IsNotEmpty()
  reflexTest: string;

  @ApiProperty({ description: 'Whether the rule is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Rule description / clinical rationale' })
  @IsOptional()
  @IsString()
  description?: string;
}

export interface ReflexRuleDto {
  id: string;
  triggerTest: string;
  triggerCondition: ReflexTriggerCondition;
  triggerValue: number | null;
  reflexTest: string;
  isActive: boolean;
  description: string | null;
  tenantId: string;
  createdAt: Date;
}

export interface ReflexTestResultDto {
  originalTest: string;
  originalResult: string;
  triggeredTest: string;
  triggeredAutomatically: boolean;
  ruleId: string;
}

export class EvaluateReflexDto {
  @ApiProperty({ description: 'Test name that produced the result' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiProperty({ description: 'Result value (string — numeric or qualitative)' })
  @IsString()
  @IsNotEmpty()
  resultValue: string;

  @ApiPropertyOptional({ description: 'Patient ID for auto-ordering' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID for auto-ordering' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABG Interpretation (Arterial Blood Gas)
// ═══════════════════════════════════════════════════════════════════════════════

export enum PrimaryDisorder {
  METABOLIC_ACIDOSIS = 'METABOLIC_ACIDOSIS',
  METABOLIC_ALKALOSIS = 'METABOLIC_ALKALOSIS',
  RESPIRATORY_ACIDOSIS = 'RESPIRATORY_ACIDOSIS',
  RESPIRATORY_ALKALOSIS = 'RESPIRATORY_ALKALOSIS',
  NORMAL = 'NORMAL',
}

export enum CompensationStatus {
  UNCOMPENSATED = 'UNCOMPENSATED',
  PARTIALLY_COMPENSATED = 'PARTIALLY_COMPENSATED',
  FULLY_COMPENSATED = 'FULLY_COMPENSATED',
}

export enum OxygenationStatus {
  NORMAL = 'NORMAL',
  MILD_HYPOXEMIA = 'MILD_HYPOXEMIA',
  MODERATE_HYPOXEMIA = 'MODERATE_HYPOXEMIA',
  SEVERE_HYPOXEMIA = 'SEVERE_HYPOXEMIA',
}

export class ABGInputDto {
  @ApiProperty({ description: 'pH value', example: 7.35 })
  @IsNumber()
  @Min(6.0)
  @Max(8.0)
  pH: number;

  @ApiProperty({ description: 'pCO2 in mmHg', example: 40 })
  @IsNumber()
  @Min(0)
  pCO2: number;

  @ApiProperty({ description: 'pO2 in mmHg', example: 95 })
  @IsNumber()
  @Min(0)
  pO2: number;

  @ApiProperty({ description: 'HCO3 in mEq/L', example: 24 })
  @IsNumber()
  HCO3: number;

  @ApiPropertyOptional({ description: 'Base excess in mEq/L', example: 0 })
  @IsOptional()
  @IsNumber()
  baseExcess?: number;

  @ApiPropertyOptional({ description: 'Lactate in mmol/L', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lactate?: number;

  @ApiPropertyOptional({ description: 'FiO2 as fraction (0.21-1.0)', example: 0.21 })
  @IsOptional()
  @IsNumber()
  @Min(0.21)
  @Max(1.0)
  FiO2?: number;

  @ApiPropertyOptional({ description: 'Sodium in mEq/L (for anion gap)', example: 140 })
  @IsOptional()
  @IsNumber()
  sodium?: number;

  @ApiPropertyOptional({ description: 'Chloride in mEq/L (for anion gap)', example: 104 })
  @IsOptional()
  @IsNumber()
  chloride?: number;

  @ApiPropertyOptional({ description: 'Albumin in g/dL (for corrected anion gap)', example: 4.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  albumin?: number;
}

export interface ABGInterpretationDto {
  primaryDisorder: PrimaryDisorder;
  compensation: CompensationStatus;
  expectedCompensation: string;
  mixedDisorder: boolean;
  anionGap: number | null;
  correctedAnionGap: number | null;
  deltaRatio: number | null;
  oxygenation: OxygenationStatus;
  pFRatio: number | null;
  aAGradient: number | null;
  interpretation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POC Testing (Point of Care)
// ═══════════════════════════════════════════════════════════════════════════════

export enum POCTestType {
  GLUCOSE = 'GLUCOSE',
  ABG = 'ABG',
  COAGULATION = 'COAGULATION',
  LACTATE = 'LACTATE',
  HEMOGLOBIN = 'HEMOGLOBIN',
  TROPONIN = 'TROPONIN',
  BNP = 'BNP',
  URINALYSIS = 'URINALYSIS',
  PREGNANCY = 'PREGNANCY',
}

export enum POCQCStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export class RecordPOCTestDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'POC test type', enum: POCTestType })
  @IsEnum(POCTestType)
  testType: POCTestType;

  @ApiProperty({ description: 'Device ID / serial number' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Operator ID (nurse/doctor)' })
  @IsUUID()
  operatorId: string;

  @ApiProperty({ description: 'Result value' })
  @IsString()
  @IsNotEmpty()
  result: string;

  @ApiProperty({ description: 'Unit of measurement (e.g. mg/dL)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Reference range (e.g. "70-100")' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiProperty({ description: 'QC status for this test run', enum: POCQCStatus })
  @IsEnum(POCQCStatus)
  qcStatus: POCQCStatus;

  @ApiPropertyOptional({ description: 'Reagent lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Reagent expiry date (ISO)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ description: 'Location where test was performed' })
  @IsString()
  @IsNotEmpty()
  location: string;
}

export interface POCTestRecord {
  id: string;
  patientId: string;
  encounterId: string | null;
  testType: POCTestType;
  deviceId: string;
  operatorId: string;
  result: string;
  unit: string;
  referenceRange: string | null;
  qcStatus: POCQCStatus;
  lotNumber: string | null;
  expiryDate: Date | null;
  location: string;
  timestamp: Date;
  tenantId: string;
}
