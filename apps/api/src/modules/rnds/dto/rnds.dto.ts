import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
} from 'class-validator';

export enum RndsResourceType {
  ENCOUNTER_SUMMARY = 'ENCOUNTER_SUMMARY',
  VACCINATION = 'VACCINATION',
  LAB_RESULT = 'LAB_RESULT',
  PRESCRIPTION = 'PRESCRIPTION',
}

export enum RndsSubmissionStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

export class SendEncounterSummaryDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ description: 'Patient CNS (Cartao Nacional de Saude)' })
  @IsOptional()
  @IsString()
  patientCns?: string;

  @ApiPropertyOptional({ description: 'Override CNES establishment code' })
  @IsOptional()
  @IsString()
  cnesCode?: string;
}

export class SendVaccinationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Vaccine code (CVX or ANVISA)' })
  @IsString()
  @IsNotEmpty()
  vaccineCode: string;

  @ApiProperty({ description: 'Vaccine name' })
  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @ApiProperty({ description: 'Lot number' })
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @ApiProperty({ description: 'Manufacturer' })
  @IsString()
  @IsNotEmpty()
  manufacturer: string;

  @ApiPropertyOptional({ description: 'Dose number' })
  @IsOptional()
  doseNumber?: number;

  @ApiPropertyOptional({ description: 'Administration site' })
  @IsOptional()
  @IsString()
  administrationSite?: string;

  @ApiPropertyOptional({ description: 'Patient CNS' })
  @IsOptional()
  @IsString()
  patientCns?: string;
}

export class SendLabResultDto {
  @ApiProperty({ description: 'Exam result ID' })
  @IsUUID()
  @IsNotEmpty()
  examResultId: string;

  @ApiPropertyOptional({ description: 'LOINC code' })
  @IsOptional()
  @IsString()
  loincCode?: string;

  @ApiPropertyOptional({ description: 'Patient CNS' })
  @IsOptional()
  @IsString()
  patientCns?: string;
}
