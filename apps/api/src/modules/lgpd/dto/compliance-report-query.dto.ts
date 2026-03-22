import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ComplianceReportQueryDto {
  @ApiProperty({ description: 'Report period start date (ISO 8601)', example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Report period end date (ISO 8601)', example: '2026-12-31' })
  @IsDateString()
  endDate!: string;
}
