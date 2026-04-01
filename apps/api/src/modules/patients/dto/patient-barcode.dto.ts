import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

// ============================================================================
// Enums
// ============================================================================

export enum BarcodeFormat {
  CODE128 = 'CODE128',
  CODE39 = 'CODE39',
  EAN13 = 'EAN13',
  QR_CODE = 'QR_CODE',
  DATA_MATRIX = 'DATA_MATRIX',
}

export enum LabelType {
  WRISTBAND = 'WRISTBAND',
  COLLECTION_TUBE = 'COLLECTION_TUBE',
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  MEDICATION = 'MEDICATION',
  SPECIMEN = 'SPECIMEN',
}

// ============================================================================
// Print Labels Request
// ============================================================================

export class PrintLabelsDto {
  @ApiProperty({ enum: LabelType, isArray: true, description: 'Label types to print' })
  @IsArray()
  @IsEnum(LabelType, { each: true })
  labelTypes!: LabelType[];

  @ApiPropertyOptional({ description: 'Number of copies', default: 1 })
  @IsOptional()
  copies?: number;

  @ApiPropertyOptional({ description: 'Printer name / destination' })
  @IsOptional()
  @IsString()
  printerName?: string;

  @ApiPropertyOptional({ description: 'Additional notes to include on labels' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// Result DTOs
// ============================================================================

export class BarcodeResultDto {
  patientId!: string;
  mrn!: string;
  fullName!: string;
  barcodeData!: string;
  barcodeFormat!: BarcodeFormat;
  allergyAlert!: boolean;
}

export class QrCodeResultDto {
  patientId!: string;
  mrn!: string;
  fullName!: string;
  qrData!: string;
  payload!: Record<string, unknown>;
  allergyAlert!: boolean;
  highRiskAllergies!: string[];
}

export class PrintLabelResultDto {
  patientId!: string;
  labelsRequested!: LabelType[];
  copies!: number;
  printerName!: string | null;
  jobId!: string;
  status!: string;
  generatedAt!: string;
}
