import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BiopsyType {
  INCISIONAL = 'INCISIONAL',
  EXCISIONAL = 'EXCISIONAL',
  NEEDLE_CORE = 'NEEDLE_CORE',
  FINE_NEEDLE_ASPIRATION = 'FINE_NEEDLE_ASPIRATION',
  PUNCH = 'PUNCH',
  SHAVE = 'SHAVE',
  ENDOSCOPIC = 'ENDOSCOPIC',
  CURETTAGE = 'CURETTAGE',
}

export enum PathologyStatus {
  REQUESTED = 'REQUESTED',
  RECEIVED = 'RECEIVED',
  GROSSING = 'GROSSING',
  PROCESSING = 'PROCESSING',
  MICROSCOPY = 'MICROSCOPY',
  IHC_PENDING = 'IHC_PENDING',
  FINAL_REPORT = 'FINAL_REPORT',
  SIGNED = 'SIGNED',
  AMENDED = 'AMENDED',
}

export class CreateBiopsyRequestDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Biopsy type', enum: BiopsyType })
  @IsEnum(BiopsyType)
  biopsyType: BiopsyType;

  @ApiProperty({ description: 'Specimen site' })
  @IsString()
  @IsNotEmpty()
  specimenSite: string;

  @ApiPropertyOptional({ description: 'Laterality' })
  @IsOptional()
  @IsString()
  laterality?: string;

  @ApiProperty({ description: 'Clinical history' })
  @IsString()
  @IsNotEmpty()
  clinicalHistory: string;

  @ApiPropertyOptional({ description: 'Clinical suspicion/diagnosis' })
  @IsOptional()
  @IsString()
  clinicalSuspicion?: string;

  @ApiPropertyOptional({ description: 'Number of fragments' })
  @IsOptional()
  numberOfFragments?: number;

  @ApiPropertyOptional({ description: 'Fixative used' })
  @IsOptional()
  @IsString()
  fixative?: string;
}

export class MacroscopyDto {
  @ApiProperty({ description: 'Macroscopic description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Specimen dimensions (cm)' })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({ description: 'Weight (grams)' })
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Consistency' })
  @IsOptional()
  @IsString()
  consistency?: string;

  @ApiPropertyOptional({ description: 'Number of cassettes' })
  @IsOptional()
  numberOfCassettes?: number;

  @ApiPropertyOptional({ description: 'Margins description' })
  @IsOptional()
  @IsString()
  margins?: string;

  @ApiPropertyOptional({ description: 'Photos URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class MicroscopyDto {
  @ApiProperty({ description: 'Microscopic description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Histological type' })
  @IsOptional()
  @IsString()
  histologicalType?: string;

  @ApiPropertyOptional({ description: 'Grade' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ description: 'Margins status' })
  @IsOptional()
  @IsString()
  marginsStatus?: string;

  @ApiPropertyOptional({ description: 'Lymphovascular invasion' })
  @IsOptional()
  lymphovascularInvasion?: boolean;

  @ApiPropertyOptional({ description: 'Perineural invasion' })
  @IsOptional()
  perineuralInvasion?: boolean;

  @ApiPropertyOptional({ description: 'Necrosis present' })
  @IsOptional()
  necrosis?: boolean;

  @ApiPropertyOptional({ description: 'Mitotic count' })
  @IsOptional()
  @IsString()
  mitoticCount?: string;
}

export class IhcMarkerDto {
  @ApiProperty({ description: 'Marker name (e.g., ER, PR, HER2, Ki67)' })
  @IsString()
  @IsNotEmpty()
  marker: string;

  @ApiProperty({ description: 'Result' })
  @IsString()
  @IsNotEmpty()
  result: string;

  @ApiPropertyOptional({ description: 'Intensity (weak, moderate, strong)' })
  @IsOptional()
  @IsString()
  intensity?: string;

  @ApiPropertyOptional({ description: 'Percentage positive' })
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ description: 'Interpretation' })
  @IsOptional()
  @IsString()
  interpretation?: string;
}

export class ImmunohistochemistryDto {
  @ApiProperty({ description: 'IHC panel name' })
  @IsString()
  @IsNotEmpty()
  panelName: string;

  @ApiProperty({ description: 'Markers results', type: [IhcMarkerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IhcMarkerDto)
  markers: IhcMarkerDto[];

  @ApiPropertyOptional({ description: 'Overall interpretation' })
  @IsOptional()
  @IsString()
  interpretation?: string;
}

export class FinalPathologyReportDto {
  @ApiProperty({ description: 'Final diagnosis' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiPropertyOptional({ description: 'ICD-10 code' })
  @IsOptional()
  @IsString()
  icdCode?: string;

  @ApiPropertyOptional({ description: 'SNOMED-CT code' })
  @IsOptional()
  @IsString()
  snomedCode?: string;

  @ApiPropertyOptional({ description: 'TNM staging' })
  @IsOptional()
  @IsString()
  tnmStaging?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: 'Synoptic report data (CAP protocol JSON)' })
  @IsOptional()
  synopticData?: Record<string, unknown>;
}
