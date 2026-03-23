import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VitalsParseVoiceDto {
  @ApiProperty({ description: 'Transcribed voice text containing vital signs' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class VitalsParseVoiceResponseDto {
  @ApiPropertyOptional({ example: 120 })
  systolicBP?: number;

  @ApiPropertyOptional({ example: 80 })
  diastolicBP?: number;

  @ApiPropertyOptional({ example: 78 })
  heartRate?: number;

  @ApiPropertyOptional({ example: 18 })
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: 36.5 })
  temperature?: number;

  @ApiPropertyOptional({ example: 97 })
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 15 })
  gcs?: number;

  @ApiPropertyOptional({ example: 3 })
  painScale?: number;

  @ApiPropertyOptional({ example: 'Abdominal' })
  painLocation?: string;

  @ApiPropertyOptional({ example: 72.5 })
  weight?: number;

  @ApiPropertyOptional({ example: 170 })
  height?: number;

  @ApiPropertyOptional({ example: 110 })
  glucoseLevel?: number;

  @ApiProperty({ example: 0.92 })
  confidence!: number;

  @ApiProperty({ example: 'PA 120x80, FC 78, FR 18, Tax 36.5, SpO2 97%' })
  summary!: string;
}
