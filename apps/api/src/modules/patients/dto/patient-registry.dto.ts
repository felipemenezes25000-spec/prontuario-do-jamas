import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsNumber,
} from 'class-validator';

// ============================================================================
// Phonetic Search
// ============================================================================

export class PhoneticSearchQueryDto {
  @ApiProperty({ description: 'Name to search (phonetically)' })
  @IsString()
  query!: string;
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export class FindDuplicatesResultDto {
  id!: string;
  fullName!: string;
  cpf!: string | null;
  birthDate!: Date | null;
  mrn!: string;
  matchScore!: number;
  matchReasons!: string[];
}

// ============================================================================
// Merge Patients
// ============================================================================

export class MergePatientsDto {
  @ApiProperty({ description: 'Primary patient ID (record to keep)' })
  @IsUUID()
  primaryId!: string;

  @ApiProperty({ description: 'Secondary patient ID (record to merge into primary)' })
  @IsUUID()
  secondaryId!: string;
}

// ============================================================================
// Barcode / QR Generation
// ============================================================================

export class GenerateBarcodeResultDto {
  patientId!: string;
  mrn!: string;
  qrData!: string;
  barcodeData!: string;
  applications!: string[];
}

// ============================================================================
// Address
// ============================================================================

export enum AddressType {
  RESIDENTIAL = 'RESIDENTIAL',
  WORK = 'WORK',
  TEMPORARY = 'TEMPORARY',
}

export class AddPatientAddressDto {
  @ApiProperty({ enum: AddressType }) @IsEnum(AddressType) type!: AddressType;
  @ApiProperty() @IsString() street!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() state!: string;
  @ApiProperty() @IsString() zipCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

// ============================================================================
// Link Newborn
// ============================================================================

export class LinkNewbornDto {
  @ApiProperty({ description: 'Mother patient ID' })
  @IsUUID()
  motherId!: string;

  @ApiProperty({ description: 'Newborn patient ID' })
  @IsUUID()
  newbornId!: string;
}

export class LinkNewbornResultDto {
  linkId!: string;
  motherId!: string;
  newbornId!: string;
  linkedAt!: string;
}
