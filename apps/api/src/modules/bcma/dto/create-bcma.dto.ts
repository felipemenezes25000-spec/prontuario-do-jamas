import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class VerifyMedicationDto {
  @ApiProperty({ description: 'Patient barcode/ID' })
  @IsString()
  @IsNotEmpty()
  patientBarcode: string;

  @ApiProperty({ description: 'Medication barcode' })
  @IsString()
  @IsNotEmpty()
  medicationBarcode: string;

  @ApiProperty({ description: 'Prescription item ID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;
}

export class AdministerMedicationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Prescription item ID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Scheduled time' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Medication barcode scanned' })
  @IsOptional()
  @IsString()
  medicationBarcode?: string;

  @ApiPropertyOptional({ description: 'Patient barcode scanned' })
  @IsOptional()
  @IsString()
  patientBarcode?: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'All 5 rights verified' })
  @IsOptional()
  @IsBoolean()
  fiveRightsVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
