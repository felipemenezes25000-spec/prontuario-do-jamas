import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

// ============================================================================
// Enums
// ============================================================================

export enum HomeMedStatus {
  ACTIVE = 'ACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  ON_HOLD = 'ON_HOLD',
}

export enum HomeMedRoute {
  ORAL = 'ORAL',
  SUBLINGUAL = 'SUBLINGUAL',
  TOPICAL = 'TOPICAL',
  INHALED = 'INHALED',
  INJECTABLE = 'INJECTABLE',
  TRANSDERMAL = 'TRANSDERMAL',
  OPHTHALMIC = 'OPHTHALMIC',
  OTIC = 'OTIC',
  NASAL = 'NASAL',
  RECTAL = 'RECTAL',
  OTHER = 'OTHER',
}

// ============================================================================
// Create / Update
// ============================================================================

export class CreateHomeMedicationDto {
  @ApiProperty({ description: 'Medication name (generic or brand)' })
  @IsString()
  @MaxLength(255)
  medicationName!: string;

  @ApiPropertyOptional({ description: 'Active ingredient (generic name)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  genericName?: string;

  @ApiProperty({ description: 'Dose and unit, e.g. "10mg"' })
  @IsString()
  @MaxLength(100)
  dose!: string;

  @ApiProperty({ description: 'Frequency, e.g. "once daily", "BID"' })
  @IsString()
  @MaxLength(100)
  frequency!: string;

  @ApiProperty({ enum: HomeMedRoute })
  @IsEnum(HomeMedRoute)
  route!: HomeMedRoute;

  @ApiProperty({ enum: HomeMedStatus, default: HomeMedStatus.ACTIVE })
  @IsEnum(HomeMedStatus)
  status!: HomeMedStatus;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Prescribing physician name (external)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  prescriberName?: string;

  @ApiPropertyOptional({ description: 'Prescribing physician CRM/specialty' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  prescriberCrm?: string;

  @ApiPropertyOptional({ description: 'Clinical indication / reason for use' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  indication?: string;

  @ApiPropertyOptional({ description: 'Flag for reconciliation review required' })
  @IsOptional()
  @IsBoolean()
  reconciliationNeeded?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateHomeMedicationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) medicationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) genericName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) dose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) frequency?: string;
  @ApiPropertyOptional({ enum: HomeMedRoute }) @IsOptional() @IsEnum(HomeMedRoute) route?: HomeMedRoute;
  @ApiPropertyOptional({ enum: HomeMedStatus }) @IsOptional() @IsEnum(HomeMedStatus) status?: HomeMedStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) prescriberName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) prescriberCrm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) indication?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reconciliationNeeded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

// ============================================================================
// Result
// ============================================================================

export class HomeMedicationDto {
  id!: string;
  patientId!: string;
  medicationName!: string;
  genericName!: string | null;
  dose!: string;
  frequency!: string;
  route!: HomeMedRoute;
  status!: HomeMedStatus;
  startDate!: string | null;
  prescriberName!: string | null;
  prescriberCrm!: string | null;
  indication!: string | null;
  reconciliationNeeded!: boolean;
  notes!: string | null;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
