import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { ChemoCycleStatus } from '@prisma/client';

export class UpdateCycleStatusDto {
  @ApiProperty({ description: 'New cycle status', enum: ChemoCycleStatus })
  @IsEnum(ChemoCycleStatus)
  @IsNotEmpty()
  status: ChemoCycleStatus;

  @ApiPropertyOptional({
    description: 'Toxicity grades (CTCAE): array of { type, grade, description }',
  })
  @IsOptional()
  @IsArray()
  toxicities?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Lab results: array of { name, value, unit }' })
  @IsOptional()
  @IsArray()
  labResults?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Nurse notes' })
  @IsOptional()
  @IsString()
  nurseNotes?: string;

  @ApiPropertyOptional({ description: 'Doctor notes' })
  @IsOptional()
  @IsString()
  doctorNotes?: string;
}
