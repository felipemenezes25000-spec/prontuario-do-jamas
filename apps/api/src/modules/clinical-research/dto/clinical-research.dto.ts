import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, IsObject } from 'class-validator';

export enum TrialStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RECRUITING = 'RECRUITING',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
}

export enum EnrollmentStatus {
  SCREENING = 'SCREENING',
  ENROLLED = 'ENROLLED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  SCREEN_FAILED = 'SCREEN_FAILED',
}

export class RegisterTrialDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() protocolNumber?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sponsor?: string;
  @ApiProperty() @IsString() principalInvestigator!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty({ description: 'Eligibility criteria' }) @IsObject() eligibilityCriteria!: Record<string, unknown>;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ethicsApprovalNumber?: string;
  @ApiPropertyOptional() @IsOptional() targetEnrollment?: number;
}

export class EnrollPatientDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() consentDocumentUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() arm?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class TrialResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() protocolNumber?: string;
  @ApiPropertyOptional() sponsor?: string;
  @ApiProperty() principalInvestigator!: string;
  @ApiProperty({ enum: TrialStatus }) status!: TrialStatus;
  @ApiProperty() eligibilityCriteria!: Record<string, unknown>;
  @ApiPropertyOptional() startDate?: Date;
  @ApiPropertyOptional() endDate?: Date;
  @ApiPropertyOptional() ethicsApprovalNumber?: string;
  @ApiPropertyOptional() targetEnrollment?: number;
  @ApiProperty() currentEnrollment!: number;
  @ApiProperty() createdAt!: Date;
}

export class EligiblePatientDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() matchScore!: number;
  @ApiProperty() matchingCriteria!: string[];
  @ApiPropertyOptional() excludingCriteria?: string[];
}

export class EligiblePatientsResponseDto {
  @ApiProperty({ type: [EligiblePatientDto] }) patients!: EligiblePatientDto[];
  @ApiProperty() totalEligible!: number;
  @ApiProperty() totalScreened!: number;
}

export class EnrollmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() trialId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ enum: EnrollmentStatus }) status!: EnrollmentStatus;
  @ApiPropertyOptional() arm?: string;
  @ApiProperty() enrolledAt!: Date;
  @ApiPropertyOptional() consentDocumentUrl?: string;
}

export class ResearchDataResponseDto {
  @ApiProperty() trialId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() enrollments!: number;
  @ApiProperty() dataPoints!: Array<{
    patientId: string;
    visitDate: string;
    dataType: string;
    values: Record<string, unknown>;
  }>;
  @ApiProperty() completionRate!: number;
}
