import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Reflex Testing ──────────────────────────────────────────────────────────

export enum ReflexCondition {
  ABOVE_HIGH = 'ABOVE_HIGH',
  BELOW_LOW = 'BELOW_LOW',
  ABNORMAL = 'ABNORMAL',
  POSITIVE = 'POSITIVE',
}

export class CreateReflexRuleDto {
  @ApiProperty({ description: 'Trigger analyte (e.g. TSH)' })
  @IsString()
  @IsNotEmpty()
  triggerAnalyte: string;

  @ApiProperty({ description: 'Condition that triggers reflex', enum: ReflexCondition })
  @IsEnum(ReflexCondition)
  condition: ReflexCondition;

  @ApiPropertyOptional({ description: 'Threshold value for numeric conditions' })
  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @ApiProperty({ description: 'Reflex test to auto-order (e.g. T4L)' })
  @IsString()
  @IsNotEmpty()
  reflexTest: string;

  @ApiPropertyOptional({ description: 'Notes/rationale' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Add-on Testing ──────────────────────────────────────────────────────────

export class RequestAddOnDto {
  @ApiProperty({ description: 'Sample barcode to add test to' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Test name to add' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiProperty({ description: 'Test code' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Clinical justification' })
  @IsOptional()
  @IsString()
  justification?: string;
}

// ─── POC Testing ─────────────────────────────────────────────────────────────

export enum PocDeviceType {
  GLUCOMETER = 'GLUCOMETER',
  BLOOD_GAS = 'BLOOD_GAS',
  COAGULATION = 'COAGULATION',
  CARDIAC_MARKER = 'CARDIAC_MARKER',
  URINALYSIS = 'URINALYSIS',
  OTHER = 'OTHER',
}

export class PocResultItemDto {
  @ApiProperty({ description: 'Analyte name' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiProperty({ description: 'Result value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Reference range min' })
  @IsOptional()
  @IsNumber()
  referenceMin?: number;

  @ApiPropertyOptional({ description: 'Reference range max' })
  @IsOptional()
  @IsNumber()
  referenceMax?: number;

  @ApiPropertyOptional({ description: 'Flag: H, L, C' })
  @IsOptional()
  @IsString()
  flag?: string;
}

export class RecordPocResultDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'POC device type', enum: PocDeviceType })
  @IsEnum(PocDeviceType)
  deviceType: PocDeviceType;

  @ApiProperty({ description: 'Device serial/ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Operator (nurse/doctor) ID' })
  @IsUUID()
  operatorId: string;

  @ApiProperty({ description: 'Results array', type: [PocResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PocResultItemDto)
  results: PocResultItemDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── AI: Lab Panel Interpretation ────────────────────────────────────────────

export class LabPanelResultItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() analyte: string;
  @ApiProperty() @IsString() @IsNotEmpty() value: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() referenceMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() referenceMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() flag?: string;
}

export class InterpretLabPanelDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Panel results', type: [LabPanelResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabPanelResultItemDto)
  results: LabPanelResultItemDto[];

  @ApiPropertyOptional({ description: 'Clinical context for AI' })
  @IsOptional()
  @IsString()
  clinicalContext?: string;
}

// ─── AI: Result Prediction ───────────────────────────────────────────────────

export class PredictResultDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Target analyte to predict (e.g. hemoglobin)' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiPropertyOptional({ description: 'Clinical context' })
  @IsOptional()
  @IsString()
  clinicalContext?: string;
}

// ─── AI: Sample Swap Detection ───────────────────────────────────────────────

export class DetectSampleSwapDto {
  @ApiProperty({ description: 'Patient ID to check' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Exam result ID with results to validate' })
  @IsUUID()
  examResultId: string;

  @ApiPropertyOptional({ description: 'Include demographic cross-check (gender, age)' })
  @IsOptional()
  @IsBoolean()
  includeDemographicCheck?: boolean;
}
