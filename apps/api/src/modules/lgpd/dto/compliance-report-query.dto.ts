import { IsDateString } from 'class-validator';

export class ComplianceReportQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
