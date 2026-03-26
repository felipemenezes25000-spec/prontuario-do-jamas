import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class EcgLeadDataDto {
  @ApiProperty({ description: 'Lead name (e.g. I, II, III, aVR, V1-V6)' })
  @IsString()
  @IsNotEmpty()
  lead: string;

  @ApiProperty({ description: 'Array of voltage values in mV' })
  @IsArray()
  @IsNumber({}, { each: true })
  values: number[];

  @ApiProperty({ description: 'Sampling rate in Hz' })
  @IsNumber()
  @Min(100)
  @Max(10000)
  samplingRate: number;
}

export class AnalyzeRhythmDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'ECG data per lead', type: [EcgLeadDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EcgLeadDataDto)
  ecgData: EcgLeadDataDto[];

  @ApiProperty({ description: 'Duration of recording in seconds' })
  @IsNumber()
  @Min(1)
  duration: number;
}

export class ArrhythmiaAlertDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Type of arrhythmia detected' })
  @IsString()
  @IsNotEmpty()
  arrhythmiaType: string;

  @ApiProperty({ description: 'Confidence level 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiPropertyOptional({ description: 'Base64-encoded ECG snapshot image' })
  @IsOptional()
  @IsString()
  ecgSnapshot?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export type ArrhythmiaType =
  | 'NORMAL'
  | 'ATRIAL_FIBRILLATION'
  | 'ATRIAL_FLUTTER'
  | 'VENTRICULAR_TACHYCARDIA'
  | 'BRADYCARDIA'
  | 'TACHYCARDIA'
  | 'AV_BLOCK'
  | 'PREMATURE_VENTRICULAR_CONTRACTION';

export type RhythmRegularity = 'REGULAR' | 'IRREGULAR' | 'IRREGULARLY_IRREGULAR';

export interface ArrhythmiaAlert {
  id: string;
  patientId: string;
  arrhythmiaType: ArrhythmiaType;
  heartRate: number;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface RhythmAnalysisResult {
  analysisId: string;
  patientId: string;
  rhythm: ArrhythmiaType;
  heartRate: number;
  regularity: RhythmRegularity;
  confidence: number;
  alerts: ArrhythmiaAlert[];
  rrIntervals: { mean: number; stdDev: number; cv: number };
  qrsWidth: number;
  analysedLeads: string[];
  duration: number;
  timestamp: string;
  disclaimer: string;
}

export interface ArrhythmiaHistoryEntry {
  id: string;
  patientId: string;
  arrhythmiaType: ArrhythmiaType;
  heartRate: number;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
}
