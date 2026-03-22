import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoiceTranscribeDto {
  @ApiPropertyOptional({ description: 'Voice context: soap, anamnesis, prescription, triage, etc.' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Encounter ID associated with the transcription' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Patient ID associated with the transcription' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class VoiceTranscribeResponseDto {
  @ApiProperty()
  transcriptionId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  confidence!: number;

  @ApiProperty()
  structuredData!: Record<string, unknown>;
}
