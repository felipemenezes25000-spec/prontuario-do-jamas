import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsInt,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum OrderSetItemType {
  MEDICATION = 'MEDICATION',
  LAB = 'LAB',
  IMAGING = 'IMAGING',
  DIET = 'DIET',
  NURSING = 'NURSING',
  PROCEDURE = 'PROCEDURE',
}

export enum OrderSetCategory {
  CARDIOLOGY = 'CARDIOLOGY',
  SURGERY = 'SURGERY',
  ENDOCRINOLOGY = 'ENDOCRINOLOGY',
  CRITICAL_CARE = 'CRITICAL_CARE',
  NEUROLOGY = 'NEUROLOGY',
  INFECTIOUS_DISEASE = 'INFECTIOUS_DISEASE',
  PULMONOLOGY = 'PULMONOLOGY',
  NEPHROLOGY = 'NEPHROLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  OBSTETRICS = 'OBSTETRICS',
  PEDIATRICS = 'PEDIATRICS',
  ONCOLOGY = 'ONCOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  GENERAL = 'GENERAL',
}

export enum GFRFormula {
  COCKCROFT_GAULT = 'COCKCROFT_GAULT',
  CKD_EPI = 'CKD_EPI',
  MDRD = 'MDRD',
}

export enum GFRCategory {
  G1 = 'G1',
  G2 = 'G2',
  G3a = 'G3a',
  G3b = 'G3b',
  G4 = 'G4',
  G5 = 'G5',
}

export enum AscitesSeverity {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE_SEVERE = 'MODERATE_SEVERE',
}

export enum EncephalopathyGrade {
  NONE = 'NONE',
  GRADE_1_2 = 'GRADE_1_2',
  GRADE_3_4 = 'GRADE_3_4',
}

export enum ChildPughClass {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum FDAPregnancyCategoryOS {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  X = 'X',
}

export enum InfantRisk {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CONTRAINDICATED = 'CONTRAINDICATED',
}

export enum FoodInteractionType {
  ABSORPTION = 'ABSORPTION',
  METABOLISM = 'METABOLISM',
  EFFECT = 'EFFECT',
}

export enum InteractionSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
}

// ============================================================================
// Order Set Item DTO
// ============================================================================

export class OrderSetItemDto {
  @ApiProperty({ enum: OrderSetItemType })
  @IsEnum(OrderSetItemType)
  type!: OrderSetItemType;

  @ApiProperty({ description: 'Description or name of the item' })
  @IsString()
  details!: string;

  @ApiPropertyOptional({ description: 'Default dose (e.g. "100mg", "500mL")' })
  @IsOptional()
  @IsString()
  defaultDose?: string;

  @ApiPropertyOptional({ description: 'Default frequency (e.g. "8/8h", "1x/dia")' })
  @IsOptional()
  @IsString()
  defaultFrequency?: string;

  @ApiProperty({ description: 'Whether this item is mandatory in the order set' })
  @IsBoolean()
  isRequired!: boolean;

  @ApiPropertyOptional({ description: 'Conditional dependency on another item (item details string)' })
  @IsOptional()
  @IsString()
  conditionalOn?: string;
}

// ============================================================================
// Order Set DTO (read model)
// ============================================================================

export class OrderSetDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: OrderSetCategory }) category!: OrderSetCategory;
  @ApiProperty() specialty!: string;
  @ApiProperty({ type: [OrderSetItemDto] }) items!: OrderSetItemDto[];
}

// ============================================================================
// Create Order Set DTO
// ============================================================================

export class CreateOrderSetDto {
  @ApiProperty({ example: 'Admissão IAM' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Protocolo de admissão para Infarto Agudo do Miocárdio' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: OrderSetCategory })
  @IsEnum(OrderSetCategory)
  category!: OrderSetCategory;

  @ApiProperty({ example: 'Cardiologia' })
  @IsString()
  specialty!: string;

  @ApiProperty({ type: [OrderSetItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderSetItemDto)
  items!: OrderSetItemDto[];
}

// ============================================================================
// Activate Order Set DTO
// ============================================================================

export class OrderSetModificationDto {
  @ApiProperty({ description: 'Index of the item in the order set to modify' })
  @IsInt()
  @Min(0)
  itemIndex!: number;

  @ApiPropertyOptional({ description: 'Override dose' })
  @IsOptional()
  @IsString()
  overrideDose?: string;

  @ApiPropertyOptional({ description: 'Override frequency' })
  @IsOptional()
  @IsString()
  overrideFrequency?: string;

  @ApiPropertyOptional({ description: 'Set to true to skip this item' })
  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}

export class ActivateOrderSetDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;

  @ApiProperty()
  @IsString()
  orderSetId!: string;

  @ApiPropertyOptional({ type: [OrderSetModificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderSetModificationDto)
  modifications?: OrderSetModificationDto[];
}

// ============================================================================
// Renal Adjustment DTOs
// ============================================================================

export class RenalAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Serum creatinine in mg/dL' })
  @IsNumber()
  @Min(0.1)
  creatinine!: number;

  @ApiProperty({ description: 'Patient age in years' })
  @IsInt()
  @Min(1)
  @Max(150)
  age!: number;

  @ApiProperty({ description: 'Patient weight in kg' })
  @IsNumber()
  @Min(1)
  weight!: number;

  @ApiProperty({ description: 'Patient gender: M or F' })
  @IsString()
  gender!: string;

  @ApiProperty({ enum: GFRFormula })
  @IsEnum(GFRFormula)
  formula!: GFRFormula;

  @ApiProperty({ description: 'Medication identifier or name' })
  @IsString()
  medicationId!: string;
}

export class RenalAdjustmentResultDto {
  @ApiProperty() gfr!: number;
  @ApiProperty({ enum: GFRCategory }) gfrCategory!: GFRCategory;
  @ApiProperty() currentDose!: string;
  @ApiProperty() adjustedDose!: string;
  @ApiProperty() adjustmentReason!: string;
  @ApiProperty() needsMonitoring!: boolean;
}

// ============================================================================
// Hepatic Adjustment DTOs
// ============================================================================

export class HepaticAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Total bilirubin in mg/dL' })
  @IsNumber()
  @Min(0)
  bilirubin!: number;

  @ApiProperty({ description: 'Serum albumin in g/dL' })
  @IsNumber()
  @Min(0)
  albumin!: number;

  @ApiProperty({ description: 'INR value' })
  @IsNumber()
  @Min(0)
  inr!: number;

  @ApiProperty({ enum: AscitesSeverity })
  @IsEnum(AscitesSeverity)
  ascites!: AscitesSeverity;

  @ApiProperty({ enum: EncephalopathyGrade })
  @IsEnum(EncephalopathyGrade)
  encephalopathy!: EncephalopathyGrade;

  @ApiProperty({ description: 'Medication identifier or name' })
  @IsString()
  medicationId!: string;
}

export class ChildPughResultDto {
  @ApiProperty({ minimum: 5, maximum: 15 }) score!: number;
  @ApiProperty({ enum: ChildPughClass }) class!: ChildPughClass;
  @ApiProperty() adjustedDose!: string;
  @ApiProperty() recommendation!: string;
}

// ============================================================================
// Pregnancy Alert DTO
// ============================================================================

export class PregnancyCheckDto {
  @ApiProperty({ description: 'Medication identifier or name' })
  @IsString()
  medicationId!: string;

  @ApiPropertyOptional({ description: 'Trimester (1, 2 or 3)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  trimester?: number;
}

export class PregnancyAlertDto {
  @ApiProperty() medicationId!: string;
  @ApiProperty({ enum: FDAPregnancyCategoryOS }) fdaCategory!: FDAPregnancyCategoryOS;
  @ApiProperty() trimester!: number;
  @ApiProperty() riskDescription!: string;
  @ApiProperty({ type: [String] }) alternatives!: string[];
}

// ============================================================================
// Lactation Alert DTO
// ============================================================================

export class LactationCheckDto {
  @ApiProperty({ description: 'Medication identifier or name' })
  @IsString()
  medicationId!: string;
}

export class LactationAlertDto {
  @ApiProperty() medicationId!: string;
  @ApiProperty() passesToMilk!: boolean;
  @ApiProperty({ enum: InfantRisk }) infantRisk!: InfantRisk;
  @ApiProperty() recommendation!: string;
  @ApiProperty({ type: [String] }) alternatives!: string[];
}

// ============================================================================
// Food-Drug Interaction DTO
// ============================================================================

export class FoodDrugInteractionDto {
  @ApiProperty() medicationId!: string;
  @ApiProperty() food!: string;
  @ApiProperty({ enum: FoodInteractionType }) interactionType!: FoodInteractionType;
  @ApiProperty({ enum: InteractionSeverity }) severity!: InteractionSeverity;
  @ApiProperty() description!: string;
  @ApiProperty() recommendation!: string;
}
