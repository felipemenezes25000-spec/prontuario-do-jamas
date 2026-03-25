import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BradenScoreItemDto } from '../../fall-risk/dto/create-fall-risk.dto';

export enum WoundStage {
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  STAGE_4 = 'STAGE_4',
  UNSTAGEABLE = 'UNSTAGEABLE',
  DEEP_TISSUE_INJURY = 'DEEP_TISSUE_INJURY',
}

export enum WoundLocation {
  SACRUM = 'SACRUM',
  COCCYX = 'COCCYX',
  TROCHANTER_LEFT = 'TROCHANTER_LEFT',
  TROCHANTER_RIGHT = 'TROCHANTER_RIGHT',
  HEEL_LEFT = 'HEEL_LEFT',
  HEEL_RIGHT = 'HEEL_RIGHT',
  ISCHIUM_LEFT = 'ISCHIUM_LEFT',
  ISCHIUM_RIGHT = 'ISCHIUM_RIGHT',
  OCCIPUT = 'OCCIPUT',
  SCAPULA = 'SCAPULA',
  ELBOW_LEFT = 'ELBOW_LEFT',
  ELBOW_RIGHT = 'ELBOW_RIGHT',
  MALLEOLUS_LEFT = 'MALLEOLUS_LEFT',
  MALLEOLUS_RIGHT = 'MALLEOLUS_RIGHT',
  OTHER = 'OTHER',
}

export class CreateSkinAssessmentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ type: [BradenScoreItemDto], description: 'Braden Scale items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BradenScoreItemDto)
  bradenItems: BradenScoreItemDto[];

  @ApiPropertyOptional({ description: 'Skin integrity notes' })
  @IsOptional()
  @IsString()
  skinIntegrityNotes?: string;

  @ApiPropertyOptional({ description: 'Existing wounds or areas of concern', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areasOfConcern?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class RegisterWoundDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ enum: WoundStage })
  @IsEnum(WoundStage)
  stage: WoundStage;

  @ApiProperty({ enum: WoundLocation })
  @IsEnum(WoundLocation)
  location: WoundLocation;

  @ApiPropertyOptional({ description: 'Custom location description' })
  @IsOptional()
  @IsString()
  locationDescription?: string;

  @ApiPropertyOptional({ description: 'Length in cm' })
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @ApiPropertyOptional({ description: 'Width in cm' })
  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @ApiPropertyOptional({ description: 'Depth in cm' })
  @IsOptional()
  @IsNumber()
  depthCm?: number;

  @ApiPropertyOptional({ description: 'Wound bed tissue type' })
  @IsOptional()
  @IsString()
  woundBedTissue?: string;

  @ApiPropertyOptional({ description: 'Exudate amount' })
  @IsOptional()
  @IsString()
  exudateAmount?: string;

  @ApiPropertyOptional({ description: 'Exudate type' })
  @IsOptional()
  @IsString()
  exudateType?: string;

  @ApiPropertyOptional({ description: 'Periwound condition' })
  @IsOptional()
  @IsString()
  periwoundCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateWoundEvolutionDto {
  @ApiPropertyOptional({ enum: WoundStage })
  @IsOptional()
  @IsEnum(WoundStage)
  stage?: WoundStage;

  @ApiPropertyOptional({ description: 'Length in cm' })
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @ApiPropertyOptional({ description: 'Width in cm' })
  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @ApiPropertyOptional({ description: 'Depth in cm' })
  @IsOptional()
  @IsNumber()
  depthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  woundBedTissue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exudateAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exudateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periwoundCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CreateRepositioningScheduleDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Interval in hours', minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  intervalHours: number;

  @ApiPropertyOptional({ description: 'Start time' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Positions to alternate', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  positions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
