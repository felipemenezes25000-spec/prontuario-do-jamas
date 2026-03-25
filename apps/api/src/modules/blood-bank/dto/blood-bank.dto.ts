import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';

export enum BloodTypeEnum {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum AntibodyScreenResult {
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  INDETERMINATE = 'INDETERMINATE',
}

export enum CrossmatchResult {
  COMPATIBLE = 'COMPATIBLE',
  INCOMPATIBLE = 'INCOMPATIBLE',
  NOT_DONE = 'NOT_DONE',
}

export enum BloodProduct {
  WHOLE_BLOOD = 'WHOLE_BLOOD',
  PACKED_RED_CELLS = 'PACKED_RED_CELLS',
  FRESH_FROZEN_PLASMA = 'FRESH_FROZEN_PLASMA',
  PLATELET_CONCENTRATE = 'PLATELET_CONCENTRATE',
  CRYOPRECIPITATE = 'CRYOPRECIPITATE',
  LEUKOREDUCED_RBC = 'LEUKOREDUCED_RBC',
  IRRADIATED_RBC = 'IRRADIATED_RBC',
  WASHED_RBC = 'WASHED_RBC',
  APHERESIS_PLATELETS = 'APHERESIS_PLATELETS',
  GRANULOCYTES = 'GRANULOCYTES',
}

export enum TransfusionReactionType {
  FEBRILE = 'FEBRILE',
  ALLERGIC_MILD = 'ALLERGIC_MILD',
  ALLERGIC_SEVERE = 'ALLERGIC_SEVERE',
  HEMOLYTIC_ACUTE = 'HEMOLYTIC_ACUTE',
  HEMOLYTIC_DELAYED = 'HEMOLYTIC_DELAYED',
  TRALI = 'TRALI',
  TACO = 'TACO',
  BACTERIAL_CONTAMINATION = 'BACTERIAL_CONTAMINATION',
  HYPOTENSIVE = 'HYPOTENSIVE',
  OTHER = 'OTHER',
}

export enum ReactionSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  LIFE_THREATENING = 'LIFE_THREATENING',
  FATAL = 'FATAL',
}

export class BloodTypingDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'ABO/Rh blood type', enum: BloodTypeEnum })
  @IsEnum(BloodTypeEnum)
  bloodType: BloodTypeEnum;

  @ApiProperty({ description: 'Antibody screen result', enum: AntibodyScreenResult })
  @IsEnum(AntibodyScreenResult)
  antibodyScreen: AntibodyScreenResult;

  @ApiPropertyOptional({ description: 'Identified antibodies' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  identifiedAntibodies?: string[];

  @ApiPropertyOptional({ description: 'Direct Antiglobulin Test (DAT) result' })
  @IsOptional()
  @IsString()
  datResult?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CrossmatchDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Blood unit ID/bag number' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ description: 'Blood product type', enum: BloodProduct })
  @IsEnum(BloodProduct)
  product: BloodProduct;

  @ApiProperty({ description: 'Crossmatch result', enum: CrossmatchResult })
  @IsEnum(CrossmatchResult)
  result: CrossmatchResult;

  @ApiPropertyOptional({ description: 'Crossmatch method (IS, AHG, electronic)' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordTransfusionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Blood unit ID/bag number' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ description: 'Blood product type', enum: BloodProduct })
  @IsEnum(BloodProduct)
  product: BloodProduct;

  @ApiProperty({ description: 'Volume in mL' })
  @IsNumber()
  volumeMl: number;

  @ApiProperty({ description: 'Start time' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'End time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Indication' })
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional({ description: 'Pre-transfusion vitals (JSON)' })
  @IsOptional()
  preTransfusionVitals?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Post-transfusion vitals (JSON)' })
  @IsOptional()
  postTransfusionVitals?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Nurse/technician who administered' })
  @IsOptional()
  @IsUUID()
  administeredById?: string;
}

export class TransfusionReactionDto {
  @ApiProperty({ description: 'Reaction type', enum: TransfusionReactionType })
  @IsEnum(TransfusionReactionType)
  reactionType: TransfusionReactionType;

  @ApiProperty({ description: 'Severity', enum: ReactionSeverity })
  @IsEnum(ReactionSeverity)
  severity: ReactionSeverity;

  @ApiProperty({ description: 'Signs and symptoms' })
  @IsArray()
  @IsString({ each: true })
  signsSymptoms: string[];

  @ApiProperty({ description: 'Time of onset' })
  @IsDateString()
  onsetTime: string;

  @ApiPropertyOptional({ description: 'Actions taken' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionsTaken?: string[];

  @ApiPropertyOptional({ description: 'Outcome description' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Was transfusion stopped?' })
  @IsOptional()
  @IsBoolean()
  transfusionStopped?: boolean;
}
