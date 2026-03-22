import { ApiProperty } from '@nestjs/swagger';

export class CodingSuggestionItemDto {
  @ApiProperty({ description: 'ICD-10 or TUSS code' })
  code!: string;

  @ApiProperty({ description: 'Code description' })
  description!: string;

  @ApiProperty({ description: 'Confidence score 0-1' })
  confidence!: number;
}

export class CodingSuggestionsResponseDto {
  @ApiProperty({ type: [CodingSuggestionItemDto], description: 'Diagnosis code suggestions (CID-10)' })
  diagnosisCodes!: CodingSuggestionItemDto[];

  @ApiProperty({ type: [CodingSuggestionItemDto], description: 'Procedure code suggestions (TUSS)' })
  procedureCodes!: CodingSuggestionItemDto[];
}
