import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  IsNotEmpty,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum MedicalCalculatorType {
  CHADS2VASC = 'CHADS2VASC',
  MELD = 'MELD',
  CHILD_PUGH = 'CHILD_PUGH',
  APACHE_II = 'APACHE_II',
  WELLS_DVT = 'WELLS_DVT',
  WELLS_PE = 'WELLS_PE',
  GENEVA = 'GENEVA',
  CURB65 = 'CURB65',
  FRAMINGHAM = 'FRAMINGHAM',
  ASCVD = 'ASCVD',
  CAPRINI = 'CAPRINI',
  PADUA = 'PADUA',
  SOFA = 'SOFA',
  NEWS2 = 'NEWS2',
  GCS = 'GCS',
  NIHSS = 'NIHSS',
  PSI = 'PSI',
  GRACE = 'GRACE',
  TIMI = 'TIMI',
  HASBLED = 'HASBLED',
}

export enum PathwayOrderType {
  MEDICATION = 'MEDICATION',
  LAB = 'LAB',
  IMAGING = 'IMAGING',
  PROCEDURE = 'PROCEDURE',
  DIET = 'DIET',
  ACTIVITY = 'ACTIVITY',
  CONSULT = 'CONSULT',
  NURSING = 'NURSING',
  MONITORING = 'MONITORING',
  DISCHARGE_PREP = 'DISCHARGE_PREP',
}

export enum ProtocolDeviationSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIAL = 'PARTIAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

// ─── Medical Calculator ───────────────────────────────────────────────────────

export class MedicalCalculatorDto {
  @ApiProperty({ enum: MedicalCalculatorType, description: 'Calculator type' })
  @IsEnum(MedicalCalculatorType)
  calculatorType!: MedicalCalculatorType;

  @ApiProperty({
    description: 'Calculator-specific inputs as key-value map',
    example: { age: 72, diabetes: true, heartFailure: false },
  })
  @IsObject()
  inputs!: Record<string, number | boolean | string>;

  @ApiPropertyOptional({ description: 'Patient UUID to auto-populate inputs' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter UUID for context' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

export class MedicalCalculatorResultDto {
  @ApiProperty({ enum: MedicalCalculatorType })
  calculatorType!: MedicalCalculatorType;

  @ApiProperty({ description: 'Numeric score or result' })
  result!: number | string;

  @ApiProperty({ description: 'Clinical interpretation of the result' })
  interpretation!: string;

  @ApiProperty({ description: 'Risk category (low/intermediate/high)' })
  riskCategory!: string;

  @ApiPropertyOptional({ description: 'Recommended action or intervention' })
  recommendation?: string;

  @ApiPropertyOptional({ description: 'Reference guideline source' })
  guidelineSource?: string;

  @ApiProperty({ description: 'Timestamp when calculation was performed' })
  calculatedAt!: string;

  @ApiProperty({ description: 'Input values used in the calculation' })
  inputs!: Record<string, number | boolean | string>;
}

// ─── Clinical Pathway ─────────────────────────────────────────────────────────

export class PathwayOrderDto {
  @ApiProperty({ enum: PathwayOrderType })
  @IsEnum(PathwayOrderType)
  type!: PathwayOrderType;

  @ApiProperty({ description: 'Order description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Order details / parameters' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiProperty({ description: 'Whether this order is mandatory for the pathway' })
  @IsBoolean()
  mandatory!: boolean;
}

export class DischargeCriterionDto {
  @ApiProperty({ description: 'Clinical criterion for discharge eligibility' })
  @IsString()
  @IsNotEmpty()
  criterion!: string;

  @ApiProperty({ description: 'Whether this criterion has been met' })
  @IsBoolean()
  met!: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PathwayVarianceDto {
  @ApiProperty({ description: 'Day of pathway when variance occurred' })
  @IsInt()
  @Min(1)
  day!: number;

  @ApiProperty({ description: 'Expected standard' })
  @IsString()
  @IsNotEmpty()
  expected!: string;

  @ApiProperty({ description: 'Actual finding' })
  @IsString()
  @IsNotEmpty()
  actual!: string;

  @ApiProperty({ description: 'Clinical justification for variance' })
  @IsString()
  @IsNotEmpty()
  justification!: string;

  @ApiProperty({ description: 'Timestamp of variance' })
  @IsDateString()
  timestamp!: string;
}

export class ClinicalPathwayDto {
  @ApiProperty({ description: 'Pathway definition ID (e.g. "knee-arthroplasty-v2")' })
  @IsString()
  @IsNotEmpty()
  pathwayId!: string;

  @ApiProperty({ description: 'Primary diagnosis or procedure' })
  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Current day number on the pathway (D1, D2, …)', minimum: 1 })
  @IsInt()
  @Min(1)
  day!: number;

  @ApiProperty({ type: [PathwayOrderDto], description: 'Orders for the current day' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathwayOrderDto)
  orders!: PathwayOrderDto[];

  @ApiProperty({ description: 'Clinical goals for the current day' })
  @IsArray()
  @IsString({ each: true })
  goals!: string[];

  @ApiProperty({ type: [DischargeCriterionDto], description: 'Discharge criteria checklist' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DischargeCriterionDto)
  dischargeCriteria!: DischargeCriterionDto[];

  @ApiPropertyOptional({ type: [PathwayVarianceDto], description: 'Variances from standard pathway' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathwayVarianceDto)
  varianceTracking?: PathwayVarianceDto[];
}

// ─── Protocol Compliance Checklist ───────────────────────────────────────────

export class ComplianceChecklistItemDto {
  @ApiProperty({ description: 'Checklist item description' })
  @IsString()
  @IsNotEmpty()
  item!: string;

  @ApiProperty({ enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  status!: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Timestamp when item was checked' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'User who completed the item' })
  @IsOptional()
  @IsString()
  completedBy?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ComplianceChecklistDto {
  @ApiProperty({ description: 'Protocol definition ID' })
  @IsString()
  @IsNotEmpty()
  protocolId!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ type: [ComplianceChecklistItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComplianceChecklistItemDto)
  checklistItems!: ComplianceChecklistItemDto[];
}

// ─── Protocol Deviation ───────────────────────────────────────────────────────

export class ProtocolDeviationDto {
  @ApiProperty({ description: 'Protocol definition ID' })
  @IsString()
  @IsNotEmpty()
  protocolId!: string;

  @ApiProperty({ description: 'Prescription or order UUID that deviated' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ description: 'Description of the deviation from protocol' })
  @IsString()
  @IsNotEmpty()
  deviation!: string;

  @ApiProperty({ description: 'Clinical justification for the deviation' })
  @IsString()
  @IsNotEmpty()
  justification!: string;

  @ApiProperty({ enum: ProtocolDeviationSeverity })
  @IsEnum(ProtocolDeviationSeverity)
  severity!: ProtocolDeviationSeverity;

  @ApiPropertyOptional({ description: 'UUID of approving physician' })
  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Approval timestamp' })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}
