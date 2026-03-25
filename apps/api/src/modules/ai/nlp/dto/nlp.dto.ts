import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export enum NlpExtractionType {
  GENERAL = 'GENERAL',
  PROBLEMS = 'PROBLEMS',
  MEDICATIONS = 'MEDICATIONS',
  ALLERGIES = 'ALLERGIES',
}

export class ExtractFromTextDto {
  @ApiProperty({ description: 'Free text to extract structured data from' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Language of the text', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;
}

export class ExtractedEntityDto {
  @ApiProperty() entity!: string;
  @ApiProperty() type!: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() normalizedValue?: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() startOffset?: number;
  @ApiPropertyOptional() endOffset?: number;
}

export class ExtractedDataResponseDto {
  @ApiProperty({ type: [ExtractedEntityDto] }) entities!: ExtractedEntityDto[];
  @ApiPropertyOptional() structuredData?: Record<string, unknown>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
}

export class ExtractedProblemDto {
  @ApiProperty() problemName!: string;
  @ApiPropertyOptional() icdCode?: string;
  @ApiPropertyOptional() icdDescription?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() onset?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedProblemsResponseDto {
  @ApiProperty({ type: [ExtractedProblemDto] }) problems!: ExtractedProblemDto[];
  @ApiProperty() aiModel!: string;
}

export class ExtractedMedicationDto {
  @ApiProperty() medicationName!: string;
  @ApiPropertyOptional() activeIngredient?: string;
  @ApiPropertyOptional() dose?: string;
  @ApiPropertyOptional() route?: string;
  @ApiPropertyOptional() frequency?: string;
  @ApiPropertyOptional() duration?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedMedicationsResponseDto {
  @ApiProperty({ type: [ExtractedMedicationDto] }) medications!: ExtractedMedicationDto[];
  @ApiProperty() aiModel!: string;
}

export class ExtractedAllergyDto {
  @ApiProperty() substance!: string;
  @ApiPropertyOptional() type?: string;
  @ApiPropertyOptional() reaction?: string;
  @ApiPropertyOptional() severity?: string;
  @ApiProperty() confidence!: number;
}

export class ExtractedAllergiesResponseDto {
  @ApiProperty({ type: [ExtractedAllergyDto] }) allergies!: ExtractedAllergyDto[];
  @ApiProperty() aiModel!: string;
}
