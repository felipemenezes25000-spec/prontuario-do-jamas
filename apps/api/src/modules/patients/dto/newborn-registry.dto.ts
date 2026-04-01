import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum NewbornGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  INDETERMINATE = 'INDETERMINATE',
}

export enum DeliveryType {
  VAGINAL = 'VAGINAL',
  CESAREAN = 'CESAREAN',
  VAGINAL_ASSISTED = 'VAGINAL_ASSISTED',
}

export enum NewbornVitalStatus {
  LIVE_BIRTH = 'LIVE_BIRTH',
  STILLBIRTH = 'STILLBIRTH',
}

// ============================================================================
// Register Newborn
// ============================================================================

export class RegisterNewbornDto {
  @ApiProperty({ description: 'Mother patient ID' })
  @IsUUID()
  motherId!: string;

  @ApiProperty({ description: 'Date and time of birth (ISO 8601)' })
  @IsDateString()
  birthDateTime!: string;

  @ApiProperty({ enum: NewbornGender })
  @IsEnum(NewbornGender)
  gender!: NewbornGender;

  @ApiProperty({ enum: DeliveryType })
  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @ApiProperty({ enum: NewbornVitalStatus, default: NewbornVitalStatus.LIVE_BIRTH })
  @IsEnum(NewbornVitalStatus)
  vitalStatus!: NewbornVitalStatus;

  @ApiPropertyOptional({ description: 'Birth weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  birthWeightGrams?: number;

  @ApiPropertyOptional({ description: 'Birth length in centimeters' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Type(() => Number)
  birthLengthCm?: number;

  @ApiPropertyOptional({ description: '1-minute APGAR score' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  apgar1min?: number;

  @ApiPropertyOptional({ description: '5-minute APGAR score' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  apgar5min?: number;

  @ApiPropertyOptional({ description: 'Gestational age in weeks' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gestationalAgeWeeks?: number;

  @ApiPropertyOptional({ description: 'Attending physician or midwife ID' })
  @IsOptional()
  @IsUUID()
  attendingProviderId?: string;

  @ApiPropertyOptional({ description: 'Clinical notes about the delivery' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Newborn full name (if already given)' })
  @IsOptional()
  @IsString()
  newbornName?: string;

  @ApiPropertyOptional({ description: 'Inherit mother insurance automatically', default: true })
  @IsOptional()
  @IsBoolean()
  inheritMotherInsurance?: boolean;
}

// ============================================================================
// Result DTOs
// ============================================================================

export class NewbornRegistryResultDto {
  newbornId!: string;
  newbornMrn!: string;
  newbornName!: string;
  motherId!: string;
  motherName!: string;
  birthDateTime!: string;
  gender!: NewbornGender;
  deliveryType!: DeliveryType;
  birthWeightGrams!: number | null;
  apgar1min!: number | null;
  apgar5min!: number | null;
  linkId!: string;
}

export class MotherLinkResultDto {
  newbornId!: string;
  newbornName!: string;
  newbornMrn!: string;
  motherId!: string;
  motherName!: string;
  motherMrn!: string;
  motherCpf!: string | null;
  linkedAt!: string;
  birthDateTime!: string | null;
}
