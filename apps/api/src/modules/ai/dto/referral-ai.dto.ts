import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralParseVoiceDto {
  @ApiProperty({ description: 'Transcribed voice text requesting referral' })
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

export class ReferralParseVoiceResponseDto {
  @ApiProperty({ example: 'Cardiologia', description: 'Target specialty' })
  specialty!: string;

  @ApiProperty({ example: 'Paciente com sopro cardiaco sistolico 3+/6 de etiologia a esclarecer', description: 'Clinical reason for referral' })
  reason!: string;

  @ApiProperty({ example: 'URGENTE', enum: ['ROTINA', 'PRIORITARIO', 'URGENTE'] })
  urgency!: string;

  @ApiPropertyOptional({ example: 'J45.0', description: 'CID-10 code' })
  cidCode?: string;

  @ApiPropertyOptional({ description: 'Brief clinical summary for the specialist' })
  clinicalSummary?: string;

  @ApiPropertyOptional({ description: 'Specific questions for the specialist' })
  questionsForSpecialist?: string;

  @ApiProperty({ example: 0.88 })
  confidence!: number;
}
