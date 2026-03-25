import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsObject, IsDateString } from 'class-validator';

export class SubmitSinanDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Disease code (SINAN)' })
  @IsString()
  diseaseCode!: string;

  @ApiProperty({ description: 'Disease name' })
  @IsString()
  diseaseName!: string;

  @ApiProperty({ description: 'Notification date' })
  @IsDateString()
  notificationDate!: string;

  @ApiPropertyOptional({ description: 'Symptoms onset date' })
  @IsOptional()
  @IsDateString()
  symptomsOnsetDate?: string;

  @ApiPropertyOptional({ description: 'Additional SINAN form data' })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Related encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

export class SubmitNotivisaDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Event type: ADVERSE_REACTION, TECHNICAL_COMPLAINT, MEDICATION_ERROR' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'Product/medication name' })
  @IsString()
  productName!: string;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Severity: MILD, MODERATE, SEVERE, DEATH' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Event date' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ description: 'Additional form data' })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}
