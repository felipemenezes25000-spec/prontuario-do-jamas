import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DischargeParseVoiceDto {
  @ApiProperty({ description: 'Transcribed voice text with discharge instructions' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class DischargeParseVoiceResponseDto {
  @ApiProperty({ example: 'MELHORADO', enum: ['CURADO', 'MELHORADO', 'INALTERADO', 'AGRAVADO', 'OBITO', 'TRANSFERENCIA', 'EVASAO', 'A_PEDIDO'] })
  dischargeType!: string;

  @ApiProperty({ example: 'ESTAVEL', enum: ['ESTAVEL', 'INSTAVEL', 'GRAVE', 'CRITICO'] })
  condition!: string;

  @ApiPropertyOptional({ example: 7 })
  followUpDays?: number;

  @ApiProperty({ description: 'Discharge instructions for the patient' })
  instructions!: string;

  @ApiPropertyOptional({ description: 'Follow-up specialty for scheduled return' })
  followUpSpecialty?: string;

  @ApiPropertyOptional({ type: [String], description: 'Warning signs to watch for' })
  warningSignals?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Medications to continue at home' })
  homeMedications?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Activity restrictions' })
  restrictions?: string[];

  @ApiProperty({ example: 0.88 })
  confidence!: number;
}
