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
  @ApiProperty()
  type!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  confidence!: number;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  actionable!: boolean;
}

export class CopilotSuggestionsResponseDto {
  @ApiProperty({ type: [CopilotSuggestionItemDto] })
  suggestions!: CopilotSuggestionItemDto[];
}
