import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum BloodProductType {
  PACKED_RED_CELLS = 'PACKED_RED_CELLS',
  FRESH_FROZEN_PLASMA = 'FRESH_FROZEN_PLASMA',
  PLATELETS = 'PLATELETS',
  CRYOPRECIPITATE = 'CRYOPRECIPITATE',
  WHOLE_BLOOD = 'WHOLE_BLOOD',
  ALBUMIN = 'ALBUMIN',
  IMMUNOGLOBULIN = 'IMMUNOGLOBULIN',
  FACTOR_CONCENTRATE = 'FACTOR_CONCENTRATE',
  OTHER = 'OTHER',
}

export enum TransfusionReactionType {
  NONE = 'NONE',
  FEBRILE_NON_HEMOLYTIC = 'FEBRILE_NON_HEMOLYTIC',
  ALLERGIC_MILD = 'ALLERGIC_MILD',
  ALLERGIC_SEVERE = 'ALLERGIC_SEVERE',
  HEMOLYTIC_ACUTE = 'HEMOLYTIC_ACUTE',
  HEMOLYTIC_DELAYED = 'HEMOLYTIC_DELAYED',
  TRANSFUSION_RELATED_LUNG_INJURY = 'TRANSFUSION_RELATED_LUNG_INJURY',
  CIRCULATORY_OVERLOAD = 'CIRCULATORY_OVERLOAD',
  SEPTIC = 'SEPTIC',
  OTHER = 'OTHER',
}

// ============================================================================
// Create / Update
// ============================================================================

export class CreateTransfusionHistoryDto {
  @ApiProperty({ description: 'Date of transfusion (ISO 8601)' })
  @IsDateString()
  transfusionDate!: string;

  @ApiProperty({ enum: BloodProductType })
  @IsEnum(BloodProductType)
  productType!: BloodProductType;

  @ApiPropertyOptional({ description: 'Volume transfused in mL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  volumeMl?: number;

  @ApiPropertyOptional({ description: 'Number of units transfused' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  units?: number;

  @ApiPropertyOptional({ description: 'ABO blood group of transfused product' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  donorBloodGroup?: string;

  @ApiProperty({ enum: TransfusionReactionType, default: TransfusionReactionType.NONE })
  @IsEnum(TransfusionReactionType)
  reactionType!: TransfusionReactionType;

  @ApiPropertyOptional({ description: 'Description of reaction if any' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reactionDescription?: string;

  @ApiPropertyOptional({ description: 'Irregular antibodies identified', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  irregularAntibodies?: string[];

  @ApiPropertyOptional({ description: 'Clinical indication for transfusion' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  indication?: string;

  @ApiPropertyOptional({ description: 'Hospital / facility where transfusion occurred' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  facility?: string;

  @ApiPropertyOptional({ description: 'Flag for future cross-match required' })
  @IsOptional()
  @IsBoolean()
  crossMatchRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateTransfusionHistoryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() transfusionDate?: string;
  @ApiPropertyOptional({ enum: BloodProductType }) @IsOptional() @IsEnum(BloodProductType) productType?: BloodProductType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) volumeMl?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) units?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) donorBloodGroup?: string;
  @ApiPropertyOptional({ enum: TransfusionReactionType }) @IsOptional() @IsEnum(TransfusionReactionType) reactionType?: TransfusionReactionType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reactionDescription?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) irregularAntibodies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) indication?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) facility?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() crossMatchRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

// ============================================================================
// Result
// ============================================================================

export class TransfusionHistoryDto {
  id!: string;
  patientId!: string;
  transfusionDate!: string;
  productType!: BloodProductType;
  volumeMl!: number | null;
  units!: number | null;
  donorBloodGroup!: string | null;
  reactionType!: TransfusionReactionType;
  reactionDescription!: string | null;
  irregularAntibodies!: string[];
  indication!: string | null;
  facility!: string | null;
  crossMatchRequired!: boolean;
  notes!: string | null;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
