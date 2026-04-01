import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum DeliveryOutcome {
  LIVE_BIRTH = 'LIVE_BIRTH',
  STILLBIRTH = 'STILLBIRTH',
  MISCARRIAGE = 'MISCARRIAGE',
  ECTOPIC = 'ECTOPIC',
  MOLAR = 'MOLAR',
}

export enum DeliveryMode {
  VAGINAL = 'VAGINAL',
  VAGINAL_ASSISTED = 'VAGINAL_ASSISTED',
  CESAREAN_ELECTIVE = 'CESAREAN_ELECTIVE',
  CESAREAN_EMERGENCY = 'CESAREAN_EMERGENCY',
}

// ============================================================================
// Delivery entry (embedded)
// ============================================================================

export class DeliveryEntryDto {
  @ApiPropertyOptional({ description: 'Year of delivery' })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ enum: DeliveryOutcome })
  @IsOptional()
  @IsEnum(DeliveryOutcome)
  outcome?: DeliveryOutcome;

  @ApiPropertyOptional({ enum: DeliveryMode })
  @IsOptional()
  @IsEnum(DeliveryMode)
  mode?: DeliveryMode;

  @ApiPropertyOptional({ description: 'Birth weight in grams' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  birthWeightGrams?: number;

  @ApiPropertyOptional({ description: 'Gestational age in weeks' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gestationalAgeWeeks?: number;

  @ApiPropertyOptional({ description: 'Complications during delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  complications?: string;
}

// ============================================================================
// GPAC Summary
// ============================================================================

export class GpacDto {
  @ApiProperty({ description: 'G — Gravida: total number of pregnancies' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gravida!: number;

  @ApiProperty({ description: 'P — Para: number of deliveries ≥ 20 weeks' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  para!: number;

  @ApiProperty({ description: 'A — Aborta: miscarriages + elective abortions' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  aborta!: number;

  @ApiProperty({ description: 'C — Cesarean: number of cesarean deliveries' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cesarean!: number;
}

// ============================================================================
// Create / Update
// ============================================================================

export class CreateObstetricHistoryDto {
  @ApiProperty({ description: 'GPAC summary' })
  @Type(() => GpacDto)
  gpac!: GpacDto;

  @ApiPropertyOptional({ description: 'Date of last menstrual period (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastMenstrualPeriod?: string;

  @ApiPropertyOptional({ description: 'Estimated due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  estimatedDueDate?: string;

  @ApiPropertyOptional({ description: 'Current pregnancy week' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(45)
  @Type(() => Number)
  currentGestationalWeek?: number;

  @ApiPropertyOptional({ description: 'Individual delivery records', type: [DeliveryEntryDto] })
  @IsOptional()
  @IsArray()
  @Type(() => DeliveryEntryDto)
  deliveries?: DeliveryEntryDto[];

  @ApiPropertyOptional({ description: 'History of preeclampsia' })
  @IsOptional()
  @IsBoolean()
  historyPreeclampsia?: boolean;

  @ApiPropertyOptional({ description: 'History of gestational diabetes' })
  @IsOptional()
  @IsBoolean()
  historyGestationalDiabetes?: boolean;

  @ApiPropertyOptional({ description: 'History of postpartum hemorrhage' })
  @IsOptional()
  @IsBoolean()
  historyPostpartumHemorrhage?: boolean;

  @ApiPropertyOptional({ description: 'Additional obstetric notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateObstetricHistoryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => GpacDto) gpac?: GpacDto;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastMenstrualPeriod?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() estimatedDueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(45) @Type(() => Number) currentGestationalWeek?: number;
  @ApiPropertyOptional({ type: [DeliveryEntryDto] }) @IsOptional() @IsArray() @Type(() => DeliveryEntryDto) deliveries?: DeliveryEntryDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() historyPreeclampsia?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() historyGestationalDiabetes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() historyPostpartumHemorrhage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

// ============================================================================
// Result
// ============================================================================

export class ObstetricHistoryDto {
  id!: string;
  patientId!: string;
  gpac!: GpacDto;
  lastMenstrualPeriod!: string | null;
  estimatedDueDate!: string | null;
  currentGestationalWeek!: number | null;
  deliveries!: DeliveryEntryDto[];
  historyPreeclampsia!: boolean;
  historyGestationalDiabetes!: boolean;
  historyPostpartumHemorrhage!: boolean;
  notes!: string | null;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
