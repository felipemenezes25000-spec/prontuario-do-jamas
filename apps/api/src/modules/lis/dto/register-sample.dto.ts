import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SampleType {
  BLOOD = 'BLOOD',
  URINE = 'URINE',
  STOOL = 'STOOL',
  CSF = 'CSF',
  SPUTUM = 'SPUTUM',
  SWAB = 'SWAB',
  TISSUE = 'TISSUE',
  ASPIRATE = 'ASPIRATE',
  OTHER = 'OTHER',
}

export enum SampleStatus {
  REGISTERED = 'REGISTERED',
  COLLECTED = 'COLLECTED',
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum QcLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

export class RegisterSampleDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Barcode for the sample' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Sample type', enum: SampleType })
  @IsEnum(SampleType)
  sampleType: SampleType;

  @ApiPropertyOptional({ description: 'Collection site' })
  @IsOptional()
  @IsString()
  collectionSite?: string;

  @ApiPropertyOptional({ description: 'Collection date/time' })
  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @ApiPropertyOptional({ description: 'Collector ID' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiProperty({ description: 'Exam request IDs linked to this sample' })
  @IsArray()
  @IsUUID('4', { each: true })
  examRequestIds: string[];

  @ApiPropertyOptional({ description: 'Notes about the sample' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSampleStatusDto {
  @ApiProperty({ description: 'New sample status', enum: SampleStatus })
  @IsEnum(SampleStatus)
  status: SampleStatus;

  @ApiPropertyOptional({ description: 'Rejection reason (required if status is REJECTED)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QualityControlEntryDto {
  @ApiProperty({ description: 'Analyzer ID' })
  @IsString()
  @IsNotEmpty()
  analyzerId: string;

  @ApiProperty({ description: 'Analyte name' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiProperty({ description: 'QC level', enum: QcLevel })
  @IsEnum(QcLevel)
  level: QcLevel;

  @ApiProperty({ description: 'Measured value' })
  @IsNotEmpty()
  measuredValue: number;

  @ApiProperty({ description: 'Expected mean' })
  @IsNotEmpty()
  expectedMean: number;

  @ApiProperty({ description: 'Expected SD' })
  @IsNotEmpty()
  expectedSd: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class AutoReleaseDto {
  @ApiPropertyOptional({ description: 'Override auto-release rules and force release' })
  @IsOptional()
  forceRelease?: boolean;
}

export class AnalyzerResultDto {
  @ApiProperty({ description: 'Analyzer ID' })
  @IsString()
  @IsNotEmpty()
  analyzerId: string;

  @ApiProperty({ description: 'Sample barcode' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Results from analyzer' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyzerResultItemDto)
  results: AnalyzerResultItemDto[];

  @ApiPropertyOptional({ description: 'Raw message from analyzer' })
  @IsOptional()
  @IsString()
  rawMessage?: string;
}

export class AnalyzerResultItemDto {
  @ApiProperty({ description: 'Analyte code' })
  @IsString()
  @IsNotEmpty()
  analyteCode: string;

  @ApiProperty({ description: 'Analyte name' })
  @IsString()
  @IsNotEmpty()
  analyteName: string;

  @ApiProperty({ description: 'Result value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Flag (H, L, C)' })
  @IsOptional()
  @IsString()
  flag?: string;
}
