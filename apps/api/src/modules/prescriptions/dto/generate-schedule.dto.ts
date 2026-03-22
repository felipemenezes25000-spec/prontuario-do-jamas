import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class GenerateScheduleDto {
  @ApiProperty({
    description: 'Frequency (e.g., "8/8h", "12/12h", "6/6h", "1x/dia", "2x/dia")',
    example: '8/8h',
  })
  @IsString()
  frequency: string;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '08:00',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiPropertyOptional({ description: 'Medication name (for context)' })
  @IsOptional()
  @IsString()
  medicationName?: string;
}
