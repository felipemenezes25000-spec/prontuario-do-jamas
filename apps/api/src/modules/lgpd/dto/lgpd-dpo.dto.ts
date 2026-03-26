import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';

// ─── Subject Request (LGPD Art. 18) ────────────────────────────────────────

export enum SubjectRequestType {
  ACCESS = 'ACCESS',
  PORTABILITY = 'PORTABILITY',
  DELETION = 'DELETION',
  RECTIFICATION = 'RECTIFICATION',
  ANONYMIZATION = 'ANONYMIZATION',
  OBJECTION = 'OBJECTION',
}

export enum SubjectRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DENIED = 'DENIED',
}

export class CreateSubjectRequestDto {
  @ApiProperty({ description: 'Type of data subject request', enum: SubjectRequestType })
  @IsEnum(SubjectRequestType)
  type!: SubjectRequestType;

  @ApiProperty({ description: 'Patient ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'Who requested (name or user ID)', example: 'Dr. Silva' })
  @IsString()
  @MaxLength(255)
  requestedBy!: string;

  @ApiProperty({ description: 'Description of the request' })
  @IsString()
  @MaxLength(2000)
  description!: string;
}

export class ListSubjectRequestsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: SubjectRequestStatus })
  @IsOptional()
  @IsEnum(SubjectRequestStatus)
  status?: SubjectRequestStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: SubjectRequestType })
  @IsOptional()
  @IsEnum(SubjectRequestType)
  type?: SubjectRequestType;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateSubjectRequestDto {
  @ApiProperty({ description: 'New status', enum: SubjectRequestStatus })
  @IsEnum(SubjectRequestStatus)
  status!: SubjectRequestStatus;

  @ApiPropertyOptional({ description: 'Response/resolution details' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;
}

// ─── Data Incident (LGPD Art. 48) ──────────────────────────────────────────

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
}

export class CreateDataIncidentDto {
  @ApiProperty({ description: 'Incident severity', enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @ApiProperty({ description: 'Number of affected records', example: 150 })
  @IsInt()
  @Min(0)
  affectedRecords!: number;

  @ApiProperty({ description: 'Description of the incident' })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ description: 'Containment actions taken' })
  @IsString()
  @MaxLength(5000)
  containmentActions!: string;

  @ApiProperty({ description: 'Whether ANPD was notified', example: false })
  @IsBoolean()
  notifiedAnpd!: boolean;
}

// ─── DPIA — Data Protection Impact Assessment (LGPD Art. 38) ───────────────

export class CreateDpiaDto {
  @ApiProperty({ description: 'Name of the process being assessed', example: 'Processamento de dados biometricos' })
  @IsString()
  @MaxLength(255)
  processName!: string;

  @ApiProperty({ description: 'Purpose of data processing' })
  @IsString()
  @MaxLength(2000)
  purpose!: string;

  @ApiProperty({ description: 'Data categories involved', example: ['HEALTH_RECORDS', 'PERSONAL_IDENTIFICATION'] })
  @IsArray()
  @IsString({ each: true })
  dataCategories!: string[];

  @ApiProperty({ description: 'Identified risks', example: ['Vazamento de dados sensiveis', 'Acesso nao autorizado'] })
  @IsArray()
  @IsString({ each: true })
  risks!: string[];

  @ApiProperty({ description: 'Mitigation measures', example: ['Criptografia em repouso', 'Controle de acesso granular'] })
  @IsArray()
  @IsString({ each: true })
  mitigationMeasures!: string[];
}
