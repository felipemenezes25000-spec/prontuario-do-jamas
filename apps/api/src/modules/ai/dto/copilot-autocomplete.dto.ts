import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CopilotAutocompleteDto {
  @ApiProperty({ description: 'Text to autocomplete' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Clinical context (e.g. anamnesis, physical_exam, assessment, plan)' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Cursor position in the text' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cursorPosition?: number;
}

export class CopilotAutocompleteResponseDto {
  @ApiProperty({ type: [String], description: 'Autocomplete suggestions' })
  suggestions!: string[];
}
