import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsEmail,
  IsDateString,
} from 'class-validator';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum PortabilityRequestType {
  PORTABILITY = 'PORTABILITY',
  ACCESS = 'ACCESS',
  CORRECTION = 'CORRECTION',
  DELETION = 'DELETION',
  RESTRICTION = 'RESTRICTION',
}

export enum PortabilityFormat {
  JSON = 'JSON',
  PDF = 'PDF',
  FHIR_BUNDLE = 'FHIR_BUNDLE',
}

export enum PortabilityStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  DENIED = 'DENIED',
}

export enum PersonalDataType {
  IDENTIFICATION = 'IDENTIFICATION',
  HEALTH = 'HEALTH',
  GENETIC = 'GENETIC',
  BIOMETRIC = 'BIOMETRIC',
  FINANCIAL = 'FINANCIAL',
  CONTACT = 'CONTACT',
}

export enum DataSubjectType {
  PATIENTS = 'PATIENTS',
  STAFF = 'STAFF',
  VISITORS = 'VISITORS',
}

export enum RiskLikelihood {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum RiskImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum DiagnosisCategory {
  HIV = 'HIV',
  PSYCHIATRY = 'PSYCHIATRY',
  SUBSTANCE_ABUSE = 'SUBSTANCE_ABUSE',
  SEXUAL_HEALTH = 'SEXUAL_HEALTH',
  GENETIC = 'GENETIC',
  DOMESTIC_VIOLENCE = 'DOMESTIC_VIOLENCE',
}

export enum SensitiveAccessLevel {
  TREATING_TEAM_ONLY = 'TREATING_TEAM_ONLY',
  SPECIALTY_ONLY = 'SPECIALTY_ONLY',
  EXPLICIT_CONSENT = 'EXPLICIT_CONSENT',
}

export enum SensitiveAuditFrequency {
  EVERY_ACCESS = 'EVERY_ACCESS',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum AccessUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum AccreditationStandard {
  ONA_LEVEL_1 = 'ONA_LEVEL_1',
  ONA_LEVEL_2 = 'ONA_LEVEL_2',
  ONA_LEVEL_3 = 'ONA_LEVEL_3',
  JCI = 'JCI',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  NOT_ASSESSED = 'NOT_ASSESSED',
}

// ─── 5. LGPD Data Portability ──────────────────────────────────────────────

export class DataPortabilityRequestDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ enum: PortabilityRequestType })
  @IsEnum(PortabilityRequestType)
  @IsNotEmpty()
  requestType: PortabilityRequestType;

  @ApiProperty({ enum: PortabilityFormat })
  @IsEnum(PortabilityFormat)
  @IsNotEmpty()
  format: PortabilityFormat;

  @ApiProperty({ description: 'UUID of the user making the request' })
  @IsUUID()
  @IsNotEmpty()
  requestedBy: string;

  @ApiProperty({ description: 'Contact email for delivery notification' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;
}

export class DataPackageDto {
  @ApiProperty()
  demographics: Record<string, unknown>;

  @ApiProperty()
  encounters: Record<string, unknown>[];

  @ApiProperty()
  prescriptions: Record<string, unknown>[];

  @ApiProperty()
  labResults: Record<string, unknown>[];

  @ApiProperty()
  imaging: Record<string, unknown>[];

  @ApiProperty()
  notes: Record<string, unknown>[];

  @ApiProperty()
  allergies: Record<string, unknown>[];

  @ApiProperty()
  vaccinations: Record<string, unknown>[];

  @ApiProperty()
  consents: Record<string, unknown>[];
}

export class DataPortabilityResultDto {
  @ApiProperty()
  requestId: string;

  @ApiProperty({ enum: PortabilityStatus })
  status: PortabilityStatus;

  @ApiPropertyOptional({ type: DataPackageDto })
  dataPackage: DataPackageDto | null;

  @ApiPropertyOptional()
  exportedAt: string | null;

  @ApiPropertyOptional()
  downloadUrl: string | null;

  @ApiPropertyOptional({ description: 'Download link expires after 30 days' })
  expiresAt: string | null;

  @ApiProperty({ description: 'LGPD Art. 18 deadline (15 days)' })
  deadline: string;
}

// ─── 6. DPIA (Data Protection Impact Assessment) ───────────────────────────

export class CreateDPIADto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Assessor UUID' })
  @IsUUID()
  @IsNotEmpty()
  assessorId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  processingActivity: string;

  @ApiProperty({ enum: PersonalDataType, isArray: true })
  @IsArray()
  @IsEnum(PersonalDataType, { each: true })
  personalDataTypes: PersonalDataType[];

  @ApiProperty({ enum: DataSubjectType, isArray: true })
  @IsArray()
  @IsEnum(DataSubjectType, { each: true })
  dataSubjects: DataSubjectType[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  legalBasis: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  necessity: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  proportionality: string;
}

export class DPIADto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  assessorId: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  processingActivity: string;

  @ApiProperty({ enum: PersonalDataType, isArray: true })
  personalDataTypes: PersonalDataType[];

  @ApiProperty({ enum: DataSubjectType, isArray: true })
  dataSubjects: DataSubjectType[];

  @ApiProperty()
  legalBasis: string;

  @ApiProperty()
  purpose: string;

  @ApiProperty()
  necessity: string;

  @ApiProperty()
  proportionality: string;

  @ApiProperty()
  createdAt: string;
}

export class AddDPIARiskDto {
  @ApiProperty({ description: 'DPIA UUID' })
  @IsUUID()
  @IsNotEmpty()
  dpiaId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  riskDescription: string;

  @ApiProperty({ enum: RiskLikelihood })
  @IsEnum(RiskLikelihood)
  @IsNotEmpty()
  likelihood: RiskLikelihood;

  @ApiProperty({ enum: RiskImpact })
  @IsEnum(RiskImpact)
  @IsNotEmpty()
  impact: RiskImpact;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  existingControls: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  proposedMitigations: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  responsiblePerson: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  deadline: string;
}

export class DPIARiskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  dpiaId: string;

  @ApiProperty()
  riskDescription: string;

  @ApiProperty({ enum: RiskLikelihood })
  likelihood: RiskLikelihood;

  @ApiProperty({ enum: RiskImpact })
  impact: RiskImpact;

  @ApiProperty({ description: 'Calculated: likelihood x impact (1-16)' })
  riskLevel: number;

  @ApiProperty({ type: [String] })
  existingControls: string[];

  @ApiProperty({ type: [String] })
  proposedMitigations: string[];

  @ApiProperty({ enum: RiskLikelihood })
  residualRisk: RiskLikelihood;

  @ApiProperty()
  responsiblePerson: string;

  @ApiProperty()
  deadline: string;
}

export class DPIAResultDto {
  @ApiProperty({ enum: RiskLikelihood })
  overallRiskLevel: RiskLikelihood;

  @ApiProperty()
  acceptableRisk: boolean;

  @ApiProperty({
    description: 'If HIGH risk, ANPD consultation may be required',
  })
  requiresAnpdConsultation: boolean;

  @ApiPropertyOptional()
  approvedBy: string | null;

  @ApiPropertyOptional()
  approvedAt: string | null;
}

export class ApproveDPIADto {
  @ApiProperty({ description: 'DPIA UUID' })
  @IsUUID()
  @IsNotEmpty()
  dpiaId: string;

  @ApiProperty({ description: 'Approver UUID' })
  @IsUUID()
  @IsNotEmpty()
  approvedBy: string;
}

// ─── 7. Sensitive Data Segregation ─────────────────────────────────────────

export class SensitiveDataPolicyDto {
  @ApiProperty({ enum: DiagnosisCategory })
  @IsEnum(DiagnosisCategory)
  @IsNotEmpty()
  diagnosisCategory: DiagnosisCategory;

  @ApiProperty({ enum: SensitiveAccessLevel })
  @IsEnum(SensitiveAccessLevel)
  @IsNotEmpty()
  accessLevel: SensitiveAccessLevel;

  @ApiProperty()
  @IsBoolean()
  requiresExplicitConsent: boolean;

  @ApiProperty()
  @IsBoolean()
  breakTheGlassAllowed: boolean;

  @ApiProperty({ enum: SensitiveAuditFrequency })
  @IsEnum(SensitiveAuditFrequency)
  @IsNotEmpty()
  auditFrequency: SensitiveAuditFrequency;
}

export class SensitiveAccessRequestDto {
  @ApiProperty({ description: 'Requester UUID' })
  @IsUUID()
  @IsNotEmpty()
  requesterId: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ enum: DiagnosisCategory })
  @IsEnum(DiagnosisCategory)
  @IsNotEmpty()
  diagnosisCategory: DiagnosisCategory;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiProperty({ enum: AccessUrgency })
  @IsEnum(AccessUrgency)
  @IsNotEmpty()
  urgency: AccessUrgency;
}

export class SensitiveAccessResultDto {
  @ApiProperty()
  accessGranted: boolean;

  @ApiProperty()
  accessId: string;

  @ApiPropertyOptional()
  expiresAt: string | null;

  @ApiPropertyOptional()
  denialReason: string | null;

  @ApiProperty()
  auditLogId: string;
}

// ─── 8. ONA / JCI Readiness Checklist ──────────────────────────────────────

export class AccreditationRequirementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  @IsNotEmpty()
  status: ComplianceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class AccreditationSectionDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ type: [AccreditationRequirementDto] })
  requirements: AccreditationRequirementDto[];
}

export class AccreditationChecklistDto {
  @ApiProperty({ enum: AccreditationStandard })
  standard: AccreditationStandard;

  @ApiProperty({ type: [AccreditationSectionDto] })
  sections: AccreditationSectionDto[];
}

export class UpdateRequirementDto {
  @ApiProperty({ enum: AccreditationStandard })
  @IsEnum(AccreditationStandard)
  @IsNotEmpty()
  standard: AccreditationStandard;

  @ApiProperty({ description: 'Requirement code (e.g., LG-01)' })
  @IsString()
  @IsNotEmpty()
  requirementCode: string;

  @ApiProperty({ enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  @IsNotEmpty()
  status: ComplianceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class AccreditationDashboardDto {
  @ApiProperty({ enum: AccreditationStandard })
  standard: AccreditationStandard;

  @ApiProperty()
  totalRequirements: number;

  @ApiProperty()
  compliant: number;

  @ApiProperty()
  partiallyCompliant: number;

  @ApiProperty()
  nonCompliant: number;

  @ApiProperty()
  notAssessed: number;

  @ApiProperty({ description: 'Percentage of compliant requirements' })
  complianceRate: number;

  @ApiProperty({
    description: 'Non-compliant requirements requiring immediate action',
  })
  criticalGaps: Array<{ code: string; description: string; section: string }>;

  @ApiProperty({ description: 'Requirements with approaching due dates' })
  upcomingDeadlines: Array<{
    code: string;
    description: string;
    dueDate: string;
    daysRemaining: number;
  }>;
}
