import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VariantClassification {
  PATHOGENIC = 'PATHOGENIC',
  LIKELY_PATHOGENIC = 'LIKELY_PATHOGENIC',
  VUS = 'VUS',
  LIKELY_BENIGN = 'LIKELY_BENIGN',
  BENIGN = 'BENIGN',
}

export enum ZygosityType {
  HOMOZYGOUS = 'HOMOZYGOUS',
  HETEROZYGOUS = 'HETEROZYGOUS',
  HEMIZYGOUS = 'HEMIZYGOUS',
}

export enum MetabolizerStatus {
  POOR = 'POOR',
  INTERMEDIATE = 'INTERMEDIATE',
  NORMAL = 'NORMAL',
  RAPID = 'RAPID',
  ULTRA_RAPID = 'ULTRA_RAPID',
}

export class GeneticVariantDto {
  @ApiProperty({ description: 'Gene symbol (e.g., BRCA1)' })
  @IsString()
  @IsNotEmpty()
  gene: string;

  @ApiProperty({ description: 'Variant description (e.g., c.5266dupC)' })
  @IsString()
  @IsNotEmpty()
  variant: string;

  @ApiPropertyOptional({ description: 'Chromosome' })
  @IsOptional()
  @IsString()
  chromosome?: string;

  @ApiPropertyOptional({ description: 'Position' })
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional({ description: 'Reference allele' })
  @IsOptional()
  @IsString()
  referenceAllele?: string;

  @ApiPropertyOptional({ description: 'Alternate allele' })
  @IsOptional()
  @IsString()
  alternateAllele?: string;

  @ApiProperty({ description: 'Classification', enum: VariantClassification })
  @IsEnum(VariantClassification)
  classification: VariantClassification;

  @ApiPropertyOptional({ description: 'Zygosity', enum: ZygosityType })
  @IsOptional()
  @IsEnum(ZygosityType)
  zygosity?: ZygosityType;

  @ApiPropertyOptional({ description: 'dbSNP ID (e.g., rs123456)' })
  @IsOptional()
  @IsString()
  dbSnpId?: string;

  @ApiPropertyOptional({ description: 'ClinVar ID' })
  @IsOptional()
  @IsString()
  clinVarId?: string;

  @ApiPropertyOptional({ description: 'Associated conditions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  associatedConditions?: string[];
}

export class RegisterVariantsDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Test name (e.g., Whole Exome Sequencing)' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiPropertyOptional({ description: 'Lab reference' })
  @IsOptional()
  @IsString()
  labReference?: string;

  @ApiProperty({ description: 'Variants found', type: [GeneticVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneticVariantDto)
  variants: GeneticVariantDto[];
}

export class PrecisionMedicineDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Specific condition to evaluate' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Specific drug to evaluate' })
  @IsOptional()
  @IsString()
  drug?: string;
}
