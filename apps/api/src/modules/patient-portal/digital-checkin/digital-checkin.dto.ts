import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, IsObject } from 'class-validator';

export class CreateCheckinDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional({ description: 'Patient confirmed address' })
  @IsOptional()
  @IsString()
  confirmedAddress?: string;

  @ApiPropertyOptional({ description: 'Patient confirmed phone' })
  @IsOptional()
  @IsString()
  confirmedPhone?: string;

  @ApiPropertyOptional({ description: 'Insurance card photo URL' })
  @IsOptional()
  @IsString()
  insuranceCardPhoto?: string;

  @ApiPropertyOptional({ description: 'Arrival latitude/longitude' })
  @IsOptional()
  @IsString()
  geolocation?: string;
}

export class SubmitAnamnesisDto {
  @ApiProperty({ description: 'Chief complaint' })
  @IsString()
  chiefComplaint!: string;

  @ApiPropertyOptional({ description: 'Symptoms duration' })
  @IsOptional()
  @IsString()
  symptomsDuration?: string;

  @ApiPropertyOptional({ description: 'Current medications' })
  @IsOptional()
  @IsString()
  currentMedications?: string;

  @ApiPropertyOptional({ description: 'Recent changes in health' })
  @IsOptional()
  @IsString()
  recentChanges?: string;

  @ApiPropertyOptional({ description: 'Additional structured data as JSON' })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}

export class UploadCheckinDocumentDto {
  @ApiProperty({ description: 'Document type: ID, INSURANCE_CARD, REFERRAL, EXTERNAL_EXAM' })
  @IsString()
  documentType!: string;

  @ApiProperty({ description: 'S3 pre-signed URL or direct file URL' })
  @IsString()
  fileUrl!: string;

  @ApiPropertyOptional({ description: 'Notes about the document' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitConsentDto {
  @ApiProperty({ description: 'Consent type (TREATMENT, LGPD_GENERAL, etc.)' })
  @IsString()
  consentType!: string;

  @ApiProperty({ description: 'Patient accepted' })
  @IsBoolean()
  accepted!: boolean;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
