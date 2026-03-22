import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PatientSummaryDto {
  @ApiProperty({ description: 'Patient ID to generate summary for' })
  @IsUUID()
  patientId!: string;
}

export class PatientSummaryResponseDto {
  @ApiProperty({ description: 'AI-generated concise patient summary' })
  summary!: string;
}
