import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum BulkExportType {
  SYSTEM = 'system',
  PATIENT = 'patient',
  GROUP = 'group',
}

export enum BulkExportStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum FhirResourceType {
  PATIENT = 'Patient',
  ENCOUNTER = 'Encounter',
  OBSERVATION = 'Observation',
  CONDITION = 'Condition',
  MEDICATION_REQUEST = 'MedicationRequest',
  ALLERGY_INTOLERANCE = 'AllergyIntolerance',
  DIAGNOSTIC_REPORT = 'DiagnosticReport',
  PROCEDURE = 'Procedure',
  IMMUNIZATION = 'Immunization',
  DOCUMENT_REFERENCE = 'DocumentReference',
}

export class StartBulkExportDto {
  @ApiPropertyOptional({ description: 'Export type', enum: BulkExportType })
  @IsOptional()
  @IsEnum(BulkExportType)
  exportType?: BulkExportType;

  @ApiPropertyOptional({ description: 'Resource types to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resourceTypes?: string[];

  @ApiPropertyOptional({ description: 'Export data since this date (ISO)' })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ description: 'Output format (ndjson)' })
  @IsOptional()
  @IsString()
  outputFormat?: string;

  @ApiPropertyOptional({ description: 'Group ID (for group export)' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
