import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ConsentType, LegalBasis } from '@prisma/client';

export class RecordConsentDto {
  @IsString()
  patientId!: string;

  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @IsString()
  purpose!: string;

  @IsBoolean()
  granted!: boolean;

  @IsEnum(LegalBasis)
  legalBasis!: LegalBasis;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  consentText?: string;
}
