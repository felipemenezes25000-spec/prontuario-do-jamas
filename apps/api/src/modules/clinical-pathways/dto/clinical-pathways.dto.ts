import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Calculator DTOs ──────────────────────────────────────────────────────────

export enum CalculatorType {
  CHADS2_VASC = 'CHADS2_VASC',
  MELD = 'MELD',
  CHILD_PUGH = 'CHILD_PUGH',
  APACHE_II = 'APACHE_II',
  WELLS_DVT = 'WELLS_DVT',
  WELLS_PE = 'WELLS_PE',
  GENEVA = 'GENEVA',
  CURB_65 = 'CURB_65',
  CAPRINI = 'CAPRINI',
  PADUA = 'PADUA',
}

export class CalculateScoreDto {
  @ApiProperty({ enum: CalculatorType })
  @IsEnum(CalculatorType)
  calculator!: CalculatorType;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Calculator input parameters as key-value' })
  parameters!: Record<string, number | boolean | string>;
}

// ─── Order Set DTOs ───────────────────────────────────────────────────────────

export class OrderSetItemDto {
  @ApiProperty({ description: 'Item type' })
  @IsString()
  itemType!: string; // MEDICATION, EXAM, PROCEDURE, NURSING, DIET

  @ApiProperty({ description: 'Item description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Medication details' })
  @IsOptional()
  @IsString()
  dose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}

export class CreateOrderSetDto {
  @ApiProperty({ description: 'Order set name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Protocol/pathway reference' })
  @IsOptional()
  @IsString()
  protocolId?: string;

  @ApiProperty({ description: 'Associated diagnosis codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes!: string[];

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Order items', type: [OrderSetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderSetItemDto)
  items!: OrderSetItemDto[];
}

// ─── Clinical Pathway DTOs ────────────────────────────────────────────────────

export class PathwayDayDto {
  @ApiProperty({ description: 'Day number (e.g., D0, D1, D2)' })
  @IsNumber()
  @Min(0)
  @Max(90)
  dayNumber!: number;

  @ApiProperty({ description: 'Day goals', type: [String] })
  @IsArray()
  @IsString({ each: true })
  goals!: string[];

  @ApiProperty({ description: 'Orders for this day', type: [String] })
  @IsArray()
  @IsString({ each: true })
  orders!: string[];

  @ApiPropertyOptional({ description: 'Nursing interventions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nursingInterventions?: string[];

  @ApiPropertyOptional({ description: 'Discharge criteria', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dischargeCriteria?: string[];

  @ApiPropertyOptional({ description: 'Expected outcomes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedOutcomes?: string[];
}

export class CreatePathwayDto {
  @ApiProperty({ description: 'Pathway name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Associated diagnosis codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes!: string[];

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Expected total days' })
  @IsNumber()
  @Min(1)
  expectedDays!: number;

  @ApiProperty({ description: 'Day-by-day pathway', type: [PathwayDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathwayDayDto)
  days!: PathwayDayDto[];
}

// ─── Protocol Compliance ──────────────────────────────────────────────────────

export class RecordComplianceDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Pathway/protocol ID' })
  @IsString()
  pathwayId!: string;

  @ApiProperty({ description: 'Checklist items with status' })
  @IsArray()
  checklistItems!: Array<{ item: string; completed: boolean; notes?: string }>;
}

// ─── Protocol Deviation ───────────────────────────────────────────────────────

export class RecordDeviationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Protocol/pathway ID' })
  @IsString()
  pathwayId!: string;

  @ApiProperty({ description: 'Deviation description' })
  @IsString()
  @IsNotEmpty()
  deviationDescription!: string;

  @ApiProperty({ description: 'Mandatory justification' })
  @IsString()
  @IsNotEmpty()
  justification!: string;

  @ApiPropertyOptional({ description: 'Severity' })
  @IsOptional()
  @IsString()
  severity?: string;
}
