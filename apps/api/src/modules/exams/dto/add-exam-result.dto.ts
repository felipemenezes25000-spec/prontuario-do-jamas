import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AddExamResultDto {
  @ApiPropertyOptional({ description: 'Lab results as JSON' })
  @IsOptional()
  labResults?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Radiologist report' })
  @IsOptional()
  @IsString()
  radiologistReport?: string;
}
