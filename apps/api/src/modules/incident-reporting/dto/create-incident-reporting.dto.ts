import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';

export enum IncidentType {
  ADVERSE_EVENT = 'ADVERSE_EVENT',
  NEAR_MISS = 'NEAR_MISS',
  SENTINEL_EVENT = 'SENTINEL_EVENT',
  MEDICATION_ERROR = 'MEDICATION_ERROR',
  FALL = 'FALL',
  PRESSURE_INJURY = 'PRESSURE_INJURY',
  INFECTION = 'INFECTION',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  WRONG_PATIENT = 'WRONG_PATIENT',
  WRONG_PROCEDURE = 'WRONG_PROCEDURE',
  WRONG_SITE = 'WRONG_SITE',
  BLOOD_TRANSFUSION = 'BLOOD_TRANSFUSION',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  NO_HARM = 'NO_HARM',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  DEATH = 'DEATH',
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  ACTION_PLAN = 'ACTION_PLAN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateIncidentDto {
  @ApiPropertyOptional({ description: 'Patient ID (if patient-related)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Incident description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Location/sector where incident occurred' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Date/time of incident' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Involved persons', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  involvedPersons?: string[];

  @ApiPropertyOptional({ description: 'Immediate actions taken', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  immediateActions?: string[];

  @ApiPropertyOptional({ description: 'Is this a confidential report' })
  @IsOptional()
  anonymous?: boolean;
}

export class UpdateInvestigationDto {
  @ApiProperty({ description: 'Root cause analysis' })
  @IsString()
  @IsNotEmpty()
  rootCauseAnalysis: string;

  @ApiPropertyOptional({ description: 'Contributing factors', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contributingFactors?: string[];

  @ApiPropertyOptional({ description: 'Classification after investigation' })
  @IsOptional()
  @IsString()
  classificationAfterInvestigation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  investigatorNotes?: string;
}

export class UpdateActionPlanDto {
  @ApiProperty({ description: 'Action items', type: [String] })
  @IsArray()
  @IsString({ each: true })
  actions: string[];

  @ApiPropertyOptional({ description: 'Responsible person' })
  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Preventive measures', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preventiveMeasures?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
