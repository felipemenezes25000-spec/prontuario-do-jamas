import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum SampleType {
  BLOOD = 'BLOOD',
  URINE = 'URINE',
  SPUTUM = 'SPUTUM',
  WOUND = 'WOUND',
  CSF = 'CSF',
  STOOL = 'STOOL',
  OTHER = 'OTHER',
}

export enum CulturePriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum CultureStatus {
  RECEIVED = 'RECEIVED',
  INCUBATING = 'INCUBATING',
  GROWTH_DETECTED = 'GROWTH_DETECTED',
  NO_GROWTH = 'NO_GROWTH',
  PRELIMINARY = 'PRELIMINARY',
  FINAL = 'FINAL',
  CANCELLED = 'CANCELLED',
}

export enum GramStain {
  GRAM_POS_COCCI = 'GRAM_POS_COCCI',
  GRAM_POS_BACILLI = 'GRAM_POS_BACILLI',
  GRAM_NEG_COCCI = 'GRAM_NEG_COCCI',
  GRAM_NEG_BACILLI = 'GRAM_NEG_BACILLI',
  YEAST = 'YEAST',
  OTHER = 'OTHER',
}

export enum AstInterpretation {
  SENSITIVE = 'SENSITIVE',
  INTERMEDIATE = 'INTERMEDIATE',
  RESISTANT = 'RESISTANT',
  NOT_TESTED = 'NOT_TESTED',
}

export enum AstMethod {
  DISK_DIFFUSION = 'DISK_DIFFUSION',
  MIC_BROTH = 'MIC_BROTH',
  ETEST = 'ETEST',
  VITEK = 'VITEK',
  AUTOMATED = 'AUTOMATED',
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class RegisterCultureDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Sample type', enum: SampleType })
  @IsEnum(SampleType)
  sampleType: SampleType;

  @ApiProperty({ description: 'Anatomical site of collection' })
  @IsString()
  @IsNotEmpty()
  sampleSite: string;

  @ApiProperty({ description: 'Date/time of collection' })
  @IsDateString()
  @IsNotEmpty()
  collectedAt: string;

  @ApiProperty({ description: 'Clinical indication for the culture' })
  @IsString()
  @IsNotEmpty()
  clinicalIndication: string;

  @ApiProperty({ description: 'Priority', enum: CulturePriority })
  @IsEnum(CulturePriority)
  priority: CulturePriority;
}

export class RecordIsolateDto {
  @ApiProperty({ description: 'Culture ID' })
  @IsUUID()
  @IsNotEmpty()
  cultureId: string;

  @ApiProperty({ description: 'Organism name (e.g. Staphylococcus aureus)' })
  @IsString()
  @IsNotEmpty()
  organism: string;

  @ApiPropertyOptional({ description: 'Colony count (e.g. >100,000 CFU/mL)' })
  @IsOptional()
  @IsString()
  colonyCount?: string;

  @ApiPropertyOptional({ description: 'Gram stain result', enum: GramStain })
  @IsOptional()
  @IsEnum(GramStain)
  gramStain?: GramStain;

  @ApiPropertyOptional({ description: 'Morphology description' })
  @IsOptional()
  @IsString()
  morphology?: string;
}

export class AntibioticResultDto {
  @ApiProperty({ description: 'Antibiotic name' })
  @IsString()
  @IsNotEmpty()
  antibiotic: string;

  @ApiPropertyOptional({ description: 'Minimum inhibitory concentration (MIC)' })
  @IsOptional()
  @IsNumber()
  mic?: number;

  @ApiProperty({ description: 'Interpretation', enum: AstInterpretation })
  @IsEnum(AstInterpretation)
  interpretation: AstInterpretation;
}

export class RecordAstResultDto {
  @ApiProperty({ description: 'Isolate ID' })
  @IsUUID()
  @IsNotEmpty()
  isolateId: string;

  @ApiProperty({ description: 'Antibiotic sensitivity results', type: [AntibioticResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AntibioticResultDto)
  antibiotics: AntibioticResultDto[];

  @ApiProperty({ description: 'AST method used', enum: AstMethod })
  @IsEnum(AstMethod)
  method: AstMethod;
}

export class UpdateCultureStatusDto {
  @ApiProperty({ description: 'New culture status', enum: CultureStatus })
  @IsEnum(CultureStatus)
  status: CultureStatus;
}

export class GetInstitutionalAntibiogramDto {
  @ApiPropertyOptional({ description: 'Period in months (default 6)' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: 'Filter by organisms' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organisms?: string[];

  @ApiPropertyOptional({ description: 'Filter by ward/unit' })
  @IsOptional()
  @IsString()
  ward?: string;
}
