import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DischargePlanDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;
}

export class DischargePlanResponseDto {
  @ApiProperty({ description: 'Discharge plan text' })
  plan!: string;

  @ApiProperty({ type: [String], description: 'Discharge medications' })
  medications!: string[];

  @ApiProperty({ type: [String], description: 'Follow-up instructions' })
  followUp!: string[];

  @ApiProperty({ description: 'Patient instructions in simple language' })
  instructions!: string;

  @ApiProperty({ type: [String], description: 'Warning signs to watch for' })
  warnings!: string[];
}
