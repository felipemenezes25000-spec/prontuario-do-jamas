import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ScreeningTool {
  QSOFA = 'QSOFA',
  SOFA = 'SOFA',
  SIRS = 'SIRS',
  NEWS2 = 'NEWS2',
}

export enum BundleType {
  HOUR_1 = 'HOUR_1',
  HOUR_3 = 'HOUR_3',
  HOUR_6 = 'HOUR_6',
}

export enum BundleItemStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  DELAYED = 'DELAYED',
}

export class ScreeningCriterionDto {
  @ApiProperty({ description: 'Criterion name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether criterion is positive' })
  @IsBoolean()
  positive: boolean;

  @ApiPropertyOptional({ description: 'Measured value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSepsisScreeningDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ enum: ScreeningTool })
  @IsEnum(ScreeningTool)
  tool: ScreeningTool;

  @ApiProperty({ type: [ScreeningCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreeningCriterionDto)
  criteria: ScreeningCriterionDto[];

  @ApiProperty({ description: 'Total score' })
  @IsInt()
  @Min(0)
  totalScore: number;

  @ApiPropertyOptional({ description: 'Suspected infection source' })
  @IsOptional()
  @IsString()
  suspectedSource?: string;

  @ApiPropertyOptional({ description: 'Lactate level mmol/L' })
  @IsOptional()
  @IsNumber()
  lactateMmolL?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class ActivateBundleDto {
  @ApiProperty({ enum: BundleType })
  @IsEnum(BundleType)
  bundleType: BundleType;

  @ApiPropertyOptional({ description: 'Specific bundle items to include', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];
}

export class UpdateBundleItemDto {
  @ApiProperty({ description: 'Bundle item name' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ enum: BundleItemStatus })
  @IsEnum(BundleItemStatus)
  status: BundleItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
