import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
} from 'class-validator';

export enum WoundClassification {
  NPUAP_STAGE_1 = 'NPUAP_STAGE_1',
  NPUAP_STAGE_2 = 'NPUAP_STAGE_2',
  NPUAP_STAGE_3 = 'NPUAP_STAGE_3',
  NPUAP_STAGE_4 = 'NPUAP_STAGE_4',
  NPUAP_UNSTAGEABLE = 'NPUAP_UNSTAGEABLE',
  NPUAP_DTI = 'NPUAP_DTI',
  WAGNER_0 = 'WAGNER_0',
  WAGNER_1 = 'WAGNER_1',
  WAGNER_2 = 'WAGNER_2',
  WAGNER_3 = 'WAGNER_3',
  WAGNER_4 = 'WAGNER_4',
  WAGNER_5 = 'WAGNER_5',
  SURGICAL = 'SURGICAL',
  TRAUMATIC = 'TRAUMATIC',
  VENOUS_ULCER = 'VENOUS_ULCER',
  ARTERIAL_ULCER = 'ARTERIAL_ULCER',
  MIXED_ULCER = 'MIXED_ULCER',
  BURN = 'BURN',
  OTHER = 'OTHER',
}

export enum WoundTissueType {
  EPITHELIAL = 'EPITHELIAL',
  GRANULATION = 'GRANULATION',
  SLOUGH = 'SLOUGH',
  NECROTIC = 'NECROTIC',
  ESCHAR = 'ESCHAR',
  MIXED = 'MIXED',
}

export enum ExudateAmount {
  NONE = 'NONE',
  SCANT = 'SCANT',
  SMALL = 'SMALL',
  MODERATE = 'MODERATE',
  LARGE = 'LARGE',
  COPIOUS = 'COPIOUS',
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

  @ApiProperty({ enum: WoundClassification })
  @IsEnum(WoundClassification)
  classification: WoundClassification;

  @ApiProperty({ description: 'Anatomical location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  etiology?: string;

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

  @ApiPropertyOptional({ description: 'Undermining in cm' })
  @IsOptional()
  @IsNumber()
  underminingCm?: number;

  @ApiPropertyOptional({ description: 'Tunneling in cm' })
  @IsOptional()
  @IsNumber()
  tunnelingCm?: number;

  @ApiPropertyOptional({ enum: WoundTissueType })
  @IsOptional()
  @IsEnum(WoundTissueType)
  woundBedTissue?: WoundTissueType;

  @ApiPropertyOptional({ description: 'Percentage of each tissue type' })
  @IsOptional()
  @IsString()
  tissuePercentages?: string;

  @ApiPropertyOptional({ enum: ExudateAmount })
  @IsOptional()
  @IsEnum(ExudateAmount)
  exudateAmount?: ExudateAmount;

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
  painLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  odor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateWoundEvolutionDto {
  @ApiPropertyOptional({ enum: WoundClassification })
  @IsOptional()
  @IsEnum(WoundClassification)
  classification?: WoundClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  depthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  underminingCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tunnelingCm?: number;

  @ApiPropertyOptional({ enum: WoundTissueType })
  @IsOptional()
  @IsEnum(WoundTissueType)
  woundBedTissue?: WoundTissueType;

  @ApiPropertyOptional({ enum: ExudateAmount })
  @IsOptional()
  @IsEnum(ExudateAmount)
  exudateAmount?: ExudateAmount;

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
  painLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dressingUsed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class RegisterPhotoDto {
  @ApiProperty({ description: 'Photo URL (S3)' })
  @IsString()
  @IsNotEmpty()
  photoUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}

export class CreateDressingPlanDto {
  @ApiProperty({ description: 'Dressing type' })
  @IsString()
  @IsNotEmpty()
  dressingType: string;

  @ApiPropertyOptional({ description: 'Frequency of dressing changes' })
  @IsOptional()
  @IsString()
  changeFrequency?: string;

  @ApiPropertyOptional({ description: 'Cleansing solution' })
  @IsOptional()
  @IsString()
  cleansingSolution?: string;

  @ApiPropertyOptional({ description: 'Application instructions' })
  @IsOptional()
  @IsString()
  applicationInstructions?: string;

  @ApiPropertyOptional({ description: 'Special precautions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  precautions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
