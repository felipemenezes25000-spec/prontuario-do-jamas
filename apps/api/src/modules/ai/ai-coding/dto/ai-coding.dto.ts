import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class SuggestIcdDto {
  @ApiProperty({ description: 'Clinical note text for ICD-10 code suggestion' })
  @IsString()
  clinicalText!: string;

  @ApiPropertyOptional({ description: 'SOAP subjective section' })
  @IsString()
  @IsOptional()
  subjective?: string;

  @ApiPropertyOptional({ description: 'SOAP assessment section' })
  @IsString()
  @IsOptional()
  assessment?: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions' })
  @IsOptional()
  maxSuggestions?: number;
}

export class SuggestCbhpmDto {
  @ApiProperty({ description: 'Procedure description text' })
  @IsString()
  procedureText!: string;

  @ApiPropertyOptional({ description: 'List of procedures performed' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  procedures?: string[];
}

export class ImproveSpecificityDto {
  @ApiProperty({ description: 'Current ICD-10 code to improve' })
  @IsString()
  currentCode!: string;

  @ApiProperty({ description: 'Clinical context for more specific code' })
  @IsString()
  clinicalContext!: string;
}

export class CodeSuggestionDto {
  @ApiProperty() code!: string;
  @ApiProperty() description!: string;
  @ApiProperty() confidence!: number;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() reasoning?: string;
}

export class IcdSuggestionsResponseDto {
  @ApiProperty({ type: [CodeSuggestionDto] }) suggestions!: CodeSuggestionDto[];
  @ApiProperty() aiModel!: string;
  @ApiPropertyOptional() clinicalContext?: string;
}

export class CbhpmSuggestionsResponseDto {
  @ApiProperty({ type: [CodeSuggestionDto] }) suggestions!: CodeSuggestionDto[];
  @ApiProperty() aiModel!: string;
}

export class ImproveSpecificityResponseDto {
  @ApiProperty() originalCode!: string;
  @ApiProperty() originalDescription!: string;
  @ApiProperty({ type: [CodeSuggestionDto] }) improvedCodes!: CodeSuggestionDto[];
  @ApiPropertyOptional() explanation?: string;
}

export class EncounterCodingResponseDto {
  @ApiProperty() encounterId!: string;
  @ApiProperty({ type: [CodeSuggestionDto] }) diagnosisCodes!: CodeSuggestionDto[];
  @ApiProperty({ type: [CodeSuggestionDto] }) procedureCodes!: CodeSuggestionDto[];
  @ApiPropertyOptional() missingDocumentation?: string[];
  @ApiPropertyOptional() specificityOpportunities?: Array<{
    currentCode: string;
    suggestedCode: string;
    reason: string;
  }>;
}
