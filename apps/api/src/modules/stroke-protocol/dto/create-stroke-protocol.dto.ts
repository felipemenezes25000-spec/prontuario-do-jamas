import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StrokeType {
  ISCHEMIC = 'ISCHEMIC',
  HEMORRHAGIC = 'HEMORRHAGIC',
  TIA = 'TIA',
  UNKNOWN = 'UNKNOWN',
}

export class ActivateStrokeCodeDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ enum: StrokeType })
  @IsOptional()
  @IsEnum(StrokeType)
  suspectedType?: StrokeType;

  @ApiPropertyOptional({ description: 'Symptom onset time' })
  @IsOptional()
  @IsDateString()
  symptomOnsetAt?: string;

  @ApiPropertyOptional({ description: 'Last known well time' })
  @IsOptional()
  @IsDateString()
  lastKnownWellAt?: string;

  @ApiPropertyOptional({ description: 'Initial symptoms', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class NihssItemDto {
  @ApiProperty({ description: 'NIHSS item (1a, 1b, 1c, 2, 3, 4, 5a, 5b, 6a, 6b, 7, 8, 9, 10, 11)' })
  @IsString()
  item: string;

  @ApiProperty({ description: 'Score', minimum: 0, maximum: 4 })
  @IsInt()
  @Min(0)
  @Max(4)
  score: number;
}

export class CreateNihssAssessmentDto {
  @ApiProperty({ type: [NihssItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NihssItemDto)
  items: NihssItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateStrokeChecklistDto {
  @ApiPropertyOptional({ description: 'CT/MRI done' })
  @IsOptional()
  @IsBoolean()
  imagingDone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  imagingDoneAt?: string;

  @ApiPropertyOptional({ description: 'Thrombolysis eligible' })
  @IsOptional()
  @IsBoolean()
  thrombolysisEligible?: boolean;

  @ApiPropertyOptional({ description: 'tPA administered' })
  @IsOptional()
  @IsBoolean()
  tpaAdministered?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tpaAdministeredAt?: string;

  @ApiPropertyOptional({ description: 'Thrombectomy eligible' })
  @IsOptional()
  @IsBoolean()
  thrombectomyEligible?: boolean;

  @ApiPropertyOptional({ description: 'Thrombectomy performed' })
  @IsOptional()
  @IsBoolean()
  thrombectomyPerformed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  thrombectomyPerformedAt?: string;

  @ApiPropertyOptional({ description: 'Neurology consulted' })
  @IsOptional()
  @IsBoolean()
  neurologyConsulted?: boolean;

  @ApiPropertyOptional({ description: 'Swallow screen done' })
  @IsOptional()
  @IsBoolean()
  swallowScreenDone?: boolean;

  @ApiPropertyOptional({ description: 'Antiplatelet given within 48h' })
  @IsOptional()
  @IsBoolean()
  antiplateletGiven?: boolean;

  @ApiPropertyOptional({ description: 'DVT prophylaxis' })
  @IsOptional()
  @IsBoolean()
  dvtProphylaxis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
