import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum ProblemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESOLVED = 'RESOLVED',
}

export enum DeviceType {
  PROSTHESIS = 'PROSTHESIS',
  STENT = 'STENT',
  PACEMAKER = 'PACEMAKER',
  ICD = 'ICD',
  ORTHOPEDIC_IMPLANT = 'ORTHOPEDIC_IMPLANT',
  COCHLEAR_IMPLANT = 'COCHLEAR_IMPLANT',
  OTHER = 'OTHER',
}

export enum GenogramRelation {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SIBLING = 'SIBLING',
  PATERNAL_GRANDFATHER = 'PATERNAL_GRANDFATHER',
  PATERNAL_GRANDMOTHER = 'PATERNAL_GRANDMOTHER',
  MATERNAL_GRANDFATHER = 'MATERNAL_GRANDFATHER',
  MATERNAL_GRANDMOTHER = 'MATERNAL_GRANDMOTHER',
  CHILD = 'CHILD',
  SPOUSE = 'SPOUSE',
  OTHER = 'OTHER',
}

export enum AnamnesisSpecialty {
  CARDIOLOGY = 'CARDIOLOGY',
  NEUROLOGY = 'NEUROLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PULMONOLOGY = 'PULMONOLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  GENERAL = 'GENERAL',
}

// ============================================================================
// Problem List DTOs
// ============================================================================

export class CreateProblemDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icdCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icdDescription?: string;
  @ApiProperty({ enum: ProblemStatus })
  @IsEnum(ProblemStatus) status!: ProblemStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() resolutionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateProblemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ProblemStatus) status?: ProblemStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() resolutionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Home Medications DTOs
// ============================================================================

export class CreateHomeMedicationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() medicationName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescribedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalPharmacy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Obstetric History DTO
// ============================================================================

export class UpsertObstetricHistoryDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsNumber() gestations!: number;
  @ApiProperty() @IsNumber() deliveries!: number;
  @ApiProperty() @IsNumber() abortions!: number;
  @ApiProperty() @IsNumber() cesareans!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() livingChildren?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastMenstrualPeriod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Transfusion History DTO
// ============================================================================

export class CreateTransfusionHistoryDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() bloodProduct!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() indication?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() adverseReaction?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reactionDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Implanted Device DTO
// ============================================================================

export class CreateImplantedDeviceDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType) deviceType!: DeviceType;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lot?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() implantDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mriCompatible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Genogram DTO
// ============================================================================

export class GenogramPersonDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: GenogramRelation })
  @IsEnum(GenogramRelation) relation!: GenogramRelation;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deceased?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ageAtDeath?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  conditions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpsertGenogramDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ type: [GenogramPersonDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => GenogramPersonDto)
  members!: GenogramPersonDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// Clinical Timeline DTO
// ============================================================================

export class TimelineFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
}

// ============================================================================
// Specialty Anamnesis DTO
// ============================================================================

export class CreateSpecialtyAnamnesisDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: AnamnesisSpecialty })
  @IsEnum(AnamnesisSpecialty) specialty!: AnamnesisSpecialty;
  @ApiProperty() @IsString() content!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scores?: string;
}

// ============================================================================
// FHIR Import DTO
// ============================================================================

export class ImportFhirHistoryDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() source!: string;
  @ApiProperty() @IsString() fhirBundle!: string;
}

// ============================================================================
// AI Feature DTOs
// ============================================================================

export class AiInconsistencyCheckDto {
  @ApiProperty() @IsUUID() patientId!: string;
}

export class AiAnamnesisSuggestionsDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() chiefComplaint!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partialHistory?: string;
}
