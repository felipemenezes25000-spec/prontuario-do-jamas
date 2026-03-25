import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum CredentialStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export enum CredentialType {
  CRM = 'CRM',
  COREN = 'COREN',
  CRF = 'CRF',
  SPECIALTY_TITLE = 'SPECIALTY_TITLE',
  BOARD_CERTIFICATION = 'BOARD_CERTIFICATION',
  BLS_ACLS = 'BLS_ACLS',
  PALS = 'PALS',
  ATLS = 'ATLS',
  OTHER = 'OTHER',
}

export class RegisterCredentialDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty({ enum: CredentialType }) @IsEnum(CredentialType) type!: CredentialType;
  @ApiProperty() @IsString() number!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() state?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() issuingBody?: string;
  @ApiProperty() @IsDateString() issuedAt!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() expiresAt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() specialty?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() documentUrl?: string;
}

export class UpdateCredentialDto {
  @ApiPropertyOptional({ enum: CredentialStatus }) @IsEnum(CredentialStatus) @IsOptional() status?: CredentialStatus;
  @ApiPropertyOptional() @IsDateString() @IsOptional() expiresAt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() documentUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CredentialResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty({ enum: CredentialType }) type!: CredentialType;
  @ApiProperty() number!: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional() issuingBody?: string;
  @ApiProperty({ enum: CredentialStatus }) status!: CredentialStatus;
  @ApiProperty() issuedAt!: Date;
  @ApiPropertyOptional() expiresAt?: Date;
  @ApiPropertyOptional() specialty?: string;
  @ApiPropertyOptional() documentUrl?: string;
  @ApiPropertyOptional() lastVerifiedAt?: Date;
  @ApiProperty() createdAt!: Date;
}

export class ExpiringCredentialDto {
  @ApiProperty() credentialId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty({ enum: CredentialType }) type!: CredentialType;
  @ApiProperty() number!: string;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() daysUntilExpiry!: number;
}

export class ExpiringCredentialsResponseDto {
  @ApiProperty({ type: [ExpiringCredentialDto] }) credentials!: ExpiringCredentialDto[];
  @ApiProperty() totalExpiring!: number;
}

export class CrmVerificationResponseDto {
  @ApiProperty() credentialId!: string;
  @ApiProperty() crmNumber!: string;
  @ApiProperty() verified!: boolean;
  @ApiPropertyOptional() doctorName?: string;
  @ApiPropertyOptional() specialty?: string;
  @ApiPropertyOptional() status?: string;
  @ApiProperty() verifiedAt!: Date;
}
