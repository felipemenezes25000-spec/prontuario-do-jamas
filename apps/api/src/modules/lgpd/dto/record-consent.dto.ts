import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ConsentType, LegalBasis } from '@prisma/client';

export class RecordConsentDto {
  @ApiProperty({ description: 'Patient ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'Consent type', enum: ConsentType })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiProperty({ description: 'Purpose of data processing', example: 'Tratamento de saude e prontuario eletronico' })
  @IsString()
  purpose!: string;

  @ApiProperty({ description: 'Whether consent was granted', example: true })
  @IsBoolean()
  granted!: boolean;

  @ApiProperty({ description: 'Legal basis for data processing (LGPD)', enum: LegalBasis })
  @IsEnum(LegalBasis)
  legalBasis!: LegalBasis;

  @ApiPropertyOptional({ description: 'Consent expiration date (ISO 8601)', example: '2027-03-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Full consent text shown to the patient' })
  @IsOptional()
  @IsString()
  consentText?: string;
}
