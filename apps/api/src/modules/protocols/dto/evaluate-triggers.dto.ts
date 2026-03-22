import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class EvaluateTriggersDto {
  @ApiProperty({
    description: 'Encounter / triage data object to evaluate against protocol triggers',
    example: {
      triageLevel: 'RED',
      temperature: 39.2,
      heartRate: 120,
      systolicBP: 80,
      chiefComplaint: 'dor torácica intensa',
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional encounter ID for context' })
  @IsOptional()
  @IsString()
  encounterId?: string;
}
