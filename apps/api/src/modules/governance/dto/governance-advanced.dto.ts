import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsUUID,
  IsNotEmpty,
  IsEmail,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PortabilityFormat {
  JSON = 'JSON',
  PDF = 'PDF',
  FHIR = 'FHIR',
}

export enum SectorType {
  ICU = 'ICU',
  EMERGENCY = 'EMERGENCY',
  WARD = 'WARD',
  OUTPATIENT = 'OUTPATIENT',
  SURGICAL = 'SURGICAL',
  PHARMACY = 'PHARMACY',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
}

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
}

export enum BackupSchedule {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum RestoreResult {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  NOT_TESTED = 'NOT_TESTED',
}

export enum DpiaLegalBasis {
  CONSENT = 'CONSENT',
  LEGITIMATE_INTEREST = 'LEGITIMATE_INTEREST',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTEREST = 'VITAL_INTEREST',
  PUBLIC_TASK = 'PUBLIC_TASK',
  CONTRACT = 'CONTRACT',
}

export enum DpiaRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SensitiveDiagnosisCategory {
  HIV = 'HIV',
  PSYCHIATRY = 'PSYCHIATRY',
  STI = 'STI',
  GENETICS = 'GENETICS',
  SUBSTANCE_ABUSE = 'SUBSTANCE_ABUSE',
  DOMESTIC_VIOLENCE = 'DOMESTIC_VIOLENCE',
  ONCOLOGY = 'ONCOLOGY',
}

export enum SensitiveAccessLevel {
  PUBLIC = 'PUBLIC',
  TREATING_TEAM_ONLY = 'TREATING_TEAM_ONLY',
  SPECIALTY_ONLY = 'SPECIALTY_ONLY',
  EXPLICIT_CONSENT = 'EXPLICIT_CONSENT',
  BREAK_THE_GLASS = 'BREAK_THE_GLASS',
}

export enum RipdStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ─── Data Portability ─────────────────────────────────────────────────────────

export class DataPortabilityDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Request date (ISO 8601)' })
  @IsDateString()
  requestDate!: string;

  @ApiProperty({ enum: PortabilityFormat, description: 'Export format' })
  @IsEnum(PortabilityFormat)
  format!: PortabilityFormat;

  @ApiPropertyOptional({ description: 'Deadline (15 days from request per LGPD Art. 18)' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Timestamp when data package was generated' })
  @IsOptional()
  @IsDateString()
  generatedAt?: string;

  @ApiPropertyOptional({ description: 'Signed URL to download the data package' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiProperty({ description: 'Requester email for delivery' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ description: 'Requester user ID' })
  @IsOptional()
  @IsUUID()
  requestedBy?: string;
}

// ─── Session Timeout ──────────────────────────────────────────────────────────

export class SessionTimeoutDto {
  @ApiProperty({ enum: SectorType, description: 'Hospital sector type' })
  @IsEnum(SectorType)
  sectorType!: SectorType;

  @ApiProperty({ description: 'Session timeout in minutes', minimum: 1, maximum: 480 })
  @IsInt()
  @Min(1)
  @Max(480)
  timeoutMinutes!: number;

  @ApiProperty({ description: 'Lock screen instead of logout on timeout' })
  @IsBoolean()
  lockScreen!: boolean;

  @ApiProperty({ description: 'Auto-logout after lock screen if not unlocked within N minutes' })
  @IsBoolean()
  autoLogout!: boolean;

  @ApiPropertyOptional({ description: 'Minutes to auto-logout after lock screen', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  autoLogoutAfterMinutes?: number;
}

// ─── Password Policy ──────────────────────────────────────────────────────────

export class PasswordPolicyDto {
  @ApiProperty({ description: 'Minimum password length', minimum: 8 })
  @IsInt()
  @Min(8)
  minLength!: number;

  @ApiProperty({ description: 'Require at least one uppercase letter' })
  @IsBoolean()
  requireUppercase!: boolean;

  @ApiProperty({ description: 'Require at least one numeric digit' })
  @IsBoolean()
  requireNumber!: boolean;

  @ApiProperty({ description: 'Require at least one special character' })
  @IsBoolean()
  requireSpecial!: boolean;

  @ApiProperty({ description: 'Password expiration in days (0 = never)', minimum: 0 })
  @IsInt()
  @Min(0)
  expirationDays!: number;

  @ApiProperty({ description: 'Number of previous passwords that cannot be reused', minimum: 0 })
  @IsInt()
  @Min(0)
  historyCount!: number;

  @ApiProperty({ description: 'Max failed attempts before lockout', minimum: 1 })
  @IsInt()
  @Min(1)
  maxFailedAttempts!: number;

  @ApiProperty({ description: 'Account lockout duration in minutes', minimum: 1 })
  @IsInt()
  @Min(1)
  lockoutMinutes!: number;
}

// ─── Backup & Disaster Recovery ───────────────────────────────────────────────

export class BackupRecoveryDto {
  @ApiProperty({ enum: BackupType, description: 'Backup type' })
  @IsEnum(BackupType)
  type!: BackupType;

  @ApiProperty({ enum: BackupSchedule, description: 'Backup schedule' })
  @IsEnum(BackupSchedule)
  schedule!: BackupSchedule;

  @ApiProperty({ description: 'Recovery Point Objective in hours (max data loss)', minimum: 0 })
  @IsNumber()
  @Min(0)
  rpoHours!: number;

  @ApiProperty({ description: 'Recovery Time Objective in hours (max downtime)', minimum: 0 })
  @IsNumber()
  @Min(0)
  rtoHours!: number;

  @ApiProperty({ description: 'Enable cross-region replication' })
  @IsBoolean()
  crossRegion!: boolean;

  @ApiPropertyOptional({ description: 'Last restore test timestamp' })
  @IsOptional()
  @IsDateString()
  lastTestedAt?: string;

  @ApiPropertyOptional({ enum: RestoreResult, description: 'Result of last restore test' })
  @IsOptional()
  @IsEnum(RestoreResult)
  restoreResult?: RestoreResult;

  @ApiPropertyOptional({ description: 'Notes from last restore test' })
  @IsOptional()
  @IsString()
  restoreNotes?: string;
}

// ─── DPO Dashboard ────────────────────────────────────────────────────────────

export class ConsentSummaryDto {
  @ApiProperty() @IsString() @IsNotEmpty() type!: string;
  @ApiProperty() @IsInt() @Min(0) total!: number;
  @ApiProperty() @IsInt() @Min(0) active!: number;
  @ApiProperty() @IsInt() @Min(0) revoked!: number;
  @ApiProperty() @IsInt() @Min(0) expired!: number;
}

export class LgpdRequestSummaryDto {
  @ApiProperty() @IsString() @IsNotEmpty() requestType!: string;
  @ApiProperty() @IsInt() @Min(0) pending!: number;
  @ApiProperty() @IsInt() @Min(0) completed!: number;
  @ApiProperty() @IsInt() @Min(0) overdue!: number;
}

export class IncidentSummaryDto {
  @ApiProperty() @IsString() @IsNotEmpty() incidentId!: string;
  @ApiProperty() @IsDateString() reportedAt!: string;
  @ApiProperty() @IsString() @IsNotEmpty() severity!: string;
  @ApiProperty() @IsString() @IsNotEmpty() status!: string;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
}

export class DpoDashboardDto {
  @ApiProperty({ type: [ConsentSummaryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentSummaryDto)
  consents!: ConsentSummaryDto[];

  @ApiProperty({ type: [LgpdRequestSummaryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LgpdRequestSummaryDto)
  requests!: LgpdRequestSummaryDto[];

  @ApiProperty({ type: [IncidentSummaryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncidentSummaryDto)
  incidents!: IncidentSummaryDto[];

  @ApiProperty({ enum: RipdStatus, description: 'RIPD (ROPA) current status' })
  @IsEnum(RipdStatus)
  ripdStatus!: RipdStatus;

  @ApiPropertyOptional({ description: 'Data mapping / inventory status summary' })
  @IsOptional()
  @IsString()
  dataMapping?: string;
}

// ─── DPIA Report ──────────────────────────────────────────────────────────────

export class DpiaRiskDto {
  @ApiProperty() @IsString() @IsNotEmpty() riskDescription!: string;
  @ApiProperty({ enum: DpiaRiskLevel }) @IsEnum(DpiaRiskLevel) likelihood!: DpiaRiskLevel;
  @ApiProperty({ enum: DpiaRiskLevel }) @IsEnum(DpiaRiskLevel) impact!: DpiaRiskLevel;
  @ApiProperty() @IsString() @IsNotEmpty() mitigation!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() residualRisk?: string;
}

export class DpiaReportDto {
  @ApiProperty({ description: 'Processing activity name' })
  @IsString()
  @IsNotEmpty()
  processName!: string;

  @ApiProperty({ description: 'Categories of personal data involved' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  dataCategories!: string[];

  @ApiProperty({ enum: DpiaLegalBasis, description: 'Legal basis for processing' })
  @IsEnum(DpiaLegalBasis)
  legalBasis!: DpiaLegalBasis;

  @ApiProperty({ type: [DpiaRiskDto], description: 'Identified risks and mitigations' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DpiaRiskDto)
  risks!: DpiaRiskDto[];

  @ApiPropertyOptional({ description: 'Additional mitigations not tied to a specific risk' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mitigations?: string[];

  @ApiPropertyOptional({ description: 'DPO / approver user ID' })
  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Approval date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}

// ─── Sensitive Data Segregation ───────────────────────────────────────────────

export class SensitiveDataSegregationDto {
  @ApiProperty({ enum: SensitiveDiagnosisCategory, description: 'Category of sensitive diagnosis' })
  @IsEnum(SensitiveDiagnosisCategory)
  diagnosisCategory!: SensitiveDiagnosisCategory;

  @ApiProperty({ enum: SensitiveAccessLevel, description: 'Required access level' })
  @IsEnum(SensitiveAccessLevel)
  accessLevel!: SensitiveAccessLevel;

  @ApiProperty({ description: 'Roles allowed to access this category' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  allowedRoles!: string[];

  @ApiProperty({ description: 'Create an audit entry on every access' })
  @IsBoolean()
  auditOnAccess!: boolean;

  @ApiPropertyOptional({ description: 'Require explicit patient consent before access' })
  @IsOptional()
  @IsBoolean()
  requiresExplicitConsent?: boolean;

  @ApiPropertyOptional({ description: 'Allow break-the-glass emergency override' })
  @IsOptional()
  @IsBoolean()
  breakTheGlassAllowed?: boolean;
}
