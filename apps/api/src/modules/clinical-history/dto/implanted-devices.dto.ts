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

export enum ImplantType {
  PACEMAKER = 'PACEMAKER',
  ICD = 'ICD',
  CARDIAC_RESYNCHRONIZATION = 'CARDIAC_RESYNCHRONIZATION',
  CORONARY_STENT = 'CORONARY_STENT',
  PERIPHERAL_STENT = 'PERIPHERAL_STENT',
  AORTIC_STENT_GRAFT = 'AORTIC_STENT_GRAFT',
  PROSTHETIC_VALVE = 'PROSTHETIC_VALVE',
  JOINT_REPLACEMENT = 'JOINT_REPLACEMENT',
  BREAST_IMPLANT = 'BREAST_IMPLANT',
  COCHLEAR_IMPLANT = 'COCHLEAR_IMPLANT',
  INTRAOCULAR_LENS = 'INTRAOCULAR_LENS',
  SPINAL_CORD_STIMULATOR = 'SPINAL_CORD_STIMULATOR',
  VASCULAR_ACCESS_PORT = 'VASCULAR_ACCESS_PORT',
  CONTRACEPTIVE_IUD = 'CONTRACEPTIVE_IUD',
  PENILE_IMPLANT = 'PENILE_IMPLANT',
  NEUROSTIMULATOR = 'NEUROSTIMULATOR',
  INSULIN_PUMP = 'INSULIN_PUMP',
  FIXATION_HARDWARE = 'FIXATION_HARDWARE',
  OTHER = 'OTHER',
}

export enum ImplantStatus {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
  REPLACED = 'REPLACED',
  MALFUNCTION = 'MALFUNCTION',
}

export enum MriCompatibility {
  SAFE = 'SAFE',
  CONDITIONAL = 'CONDITIONAL',
  UNSAFE = 'UNSAFE',
  UNKNOWN = 'UNKNOWN',
}

// ============================================================================
// Create / Update
// ============================================================================

export class CreateImplantedDeviceDto {
  @ApiProperty({ enum: ImplantType })
  @IsEnum(ImplantType)
  type!: ImplantType;

  @ApiProperty({ description: 'Device model or trade name' })
  @IsString()
  @MaxLength(255)
  model!: string;

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Lot number for traceability' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Unique Device Identifier (UDI/ANVISA)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  udi?: string;

  @ApiPropertyOptional({ description: 'Date of implantation (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  implantDate?: string;

  @ApiPropertyOptional({ description: 'Date of removal (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  removalDate?: string;

  @ApiProperty({ enum: ImplantStatus, default: ImplantStatus.ACTIVE })
  @IsEnum(ImplantStatus)
  status!: ImplantStatus;

  @ApiProperty({ enum: MriCompatibility, description: 'MRI compatibility status' })
  @IsEnum(MriCompatibility)
  mriCompatibility!: MriCompatibility;

  @ApiPropertyOptional({ description: 'MRI conditions or restrictions if CONDITIONAL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mriConditions?: string;

  @ApiPropertyOptional({ description: 'Anatomical location of implant' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bodyLocation?: string;

  @ApiPropertyOptional({ description: 'Implanting physician name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  implantingPhysician?: string;

  @ApiPropertyOptional({ description: 'Facility where procedure was performed' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  facility?: string;

  @ApiPropertyOptional({ description: 'Trigger MRI safety alert on future orders' })
  @IsOptional()
  @IsBoolean()
  alertOnMriOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateImplantedDeviceDto {
  @ApiPropertyOptional({ enum: ImplantType }) @IsOptional() @IsEnum(ImplantType) type?: ImplantType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lotNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) udi?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() implantDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() removalDate?: string;
  @ApiPropertyOptional({ enum: ImplantStatus }) @IsOptional() @IsEnum(ImplantStatus) status?: ImplantStatus;
  @ApiPropertyOptional({ enum: MriCompatibility }) @IsOptional() @IsEnum(MriCompatibility) mriCompatibility?: MriCompatibility;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) mriConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) bodyLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) implantingPhysician?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) facility?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() alertOnMriOrder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

// ============================================================================
// Result
// ============================================================================

export class ImplantedDeviceDto {
  id!: string;
  patientId!: string;
  type!: ImplantType;
  model!: string;
  manufacturer!: string | null;
  lotNumber!: string | null;
  serialNumber!: string | null;
  udi!: string | null;
  implantDate!: string | null;
  removalDate!: string | null;
  status!: ImplantStatus;
  mriCompatibility!: MriCompatibility;
  mriConditions!: string | null;
  bodyLocation!: string | null;
  implantingPhysician!: string | null;
  facility!: string | null;
  alertOnMriOrder!: boolean;
  notes!: string | null;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
