import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class UpdateClinicalNoteDto {
  @ApiPropertyOptional({ description: 'Subjective (SOAP)' })
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional({ description: 'Objective (SOAP)' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ description: 'Assessment (SOAP)' })
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional({ description: 'Plan (SOAP)' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ description: 'Free text content' })
  @IsOptional()
  @IsString()
  freeText?: string;

  @ApiPropertyOptional({ description: 'Diagnosis ICD codes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: 'Procedure codes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  procedureCodes?: string[];
}
