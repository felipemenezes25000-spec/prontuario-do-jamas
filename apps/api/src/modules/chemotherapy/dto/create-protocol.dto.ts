import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class CreateProtocolDto {
  @ApiProperty({ description: 'Protocol name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Protocol name in English' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'Regimen (e.g., FOLFOX, AC-T)' })
  @IsString()
  @IsNotEmpty()
  regimen: string;

  @ApiProperty({ description: 'Clinical indication' })
  @IsString()
  @IsNotEmpty()
  indication: string;

  @ApiProperty({
    description:
      'Array of drugs: { name, dose, unit, route, day, infusionTime }',
  })
  @IsArray()
  @IsNotEmpty()
  drugs: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: 'Array of premedications: { name, dose, timing }',
  })
  @IsOptional()
  @IsArray()
  premedications?: Record<string, unknown>[];

  @ApiProperty({ description: 'Cycle duration in days' })
  @IsInt()
  @Min(1)
  cycleDays: number;

  @ApiProperty({ description: 'Maximum number of cycles' })
  @IsInt()
  @Min(1)
  maxCycles: number;

  @ApiPropertyOptional({
    description: 'Emetogenic risk: HIGH, MODERATE, LOW, MINIMAL',
  })
  @IsOptional()
  @IsString()
  emetogenicRisk?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether protocol is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
