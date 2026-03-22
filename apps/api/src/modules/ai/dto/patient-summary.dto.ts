import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PatientSummaryDto {
  @ApiProperty({ description: 'Patient ID to generate summary for' })
  @IsUUID()
  patientId!: string;
}

export class PatientSummaryResponseDto {
  @ApiProperty({ description: 'AI-generated concise patient summary', example: 'Paciente feminina, 45 anos, hipertensa, em uso de losartana 50mg. Ultima consulta em 10/01/2026 por cefaleia.' })
  summary!: string;
}
