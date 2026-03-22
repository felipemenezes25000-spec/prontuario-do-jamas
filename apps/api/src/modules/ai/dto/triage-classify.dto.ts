import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriageClassifyDto {
  @ApiProperty({ description: 'Free-text description of patient symptoms' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({
    description: 'Vital signs as key-value pairs (e.g. { systolicBP: 120, heartRate: 80 })',
  })
  @IsOptional()
  @IsObject()
  vitalSigns?: Record<string, number>;
}

export class TriageClassifyResponseDto {
  @ApiProperty({ description: 'Manchester triage level: VERMELHO, LARANJA, AMARELO, VERDE, AZUL' })
  level!: string;

  @ApiProperty({ description: 'Human-readable level description' })
  levelDescription!: string;

  @ApiProperty({ type: [String], description: 'Manchester discriminators identified' })
  discriminators!: string[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        flag: { type: 'string' },
        severity: { type: 'string' },
        recommendation: { type: 'string' },
      },
    },
  })
  redFlags!: Array<{ flag: string; severity: string; recommendation: string }>;

  @ApiProperty({ description: 'Suggested maximum wait time in minutes' })
  suggestedMaxWait!: number;
}
