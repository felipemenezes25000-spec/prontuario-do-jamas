import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum CdsHookType {
  PATIENT_VIEW = 'patient-view',
  ORDER_SELECT = 'order-select',
  ORDER_SIGN = 'order-sign',
  ENCOUNTER_START = 'encounter-start',
  ENCOUNTER_DISCHARGE = 'encounter-discharge',
  APPOINTMENT_BOOK = 'appointment-book',
  MEDICATION_PRESCRIBE = 'medication-prescribe',
}

export enum CardIndicator {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export class RegisterCdsServiceDto {
  @ApiProperty({ description: 'Service ID (unique identifier)' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Service title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Hook type', enum: CdsHookType })
  @IsEnum(CdsHookType)
  hook: CdsHookType;

  @ApiProperty({ description: 'Description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'External service URL (if remote)' })
  @IsOptional()
  @IsString()
  serviceUrl?: string;

  @ApiPropertyOptional({ description: 'Prefetch template (FHIR queries)' })
  @IsOptional()
  prefetch?: Record<string, string>;
}

export class EvaluateCdsHookDto {
  @ApiPropertyOptional({ description: 'Patient FHIR ID' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter FHIR ID' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'FHIR server URL' })
  @IsOptional()
  @IsString()
  fhirServer?: string;

  @ApiPropertyOptional({ description: 'FHIR authorization token' })
  @IsOptional()
  @IsString()
  fhirAuthorization?: string;

  @ApiPropertyOptional({ description: 'Context data for the hook' })
  @IsOptional()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Prefetched FHIR resources' })
  @IsOptional()
  prefetch?: Record<string, unknown>;
}
