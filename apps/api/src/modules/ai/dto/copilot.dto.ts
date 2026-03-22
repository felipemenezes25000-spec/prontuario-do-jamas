import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CopilotSuggestionsDto {
  @ApiProperty({ description: 'Encounter ID for context' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Current transcription text' })
  @IsOptional()
  @IsString()
  transcription?: string;
}

export class CopilotSuggestionItemDto {
  @ApiProperty({ description: 'Suggestion type (e.g. diagnosis, exam, medication, alert)', example: 'diagnosis' })
  type!: string;

  @ApiProperty({ description: 'Suggestion text', example: 'Considerar solicitar hemograma completo' })
  text!: string;

  @ApiProperty({ description: 'AI confidence score (0-1)', example: 0.85 })
  confidence!: number;

  @ApiProperty({ description: 'Source of the suggestion (e.g. guidelines, patient-history)', example: 'clinical-guidelines' })
  source!: string;

  @ApiProperty({ description: 'Whether the suggestion can be directly applied', example: true })
  actionable!: boolean;
}

export class CopilotSuggestionsResponseDto {
  @ApiProperty({ type: [CopilotSuggestionItemDto], description: 'AI copilot suggestions for the encounter' })
  suggestions!: CopilotSuggestionItemDto[];
}
