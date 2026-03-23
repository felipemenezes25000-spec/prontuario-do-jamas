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
  @ApiProperty({ description: 'Unique transcription ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  transcriptionId!: string;

  @ApiProperty({ description: 'Transcribed text from audio', example: 'Paciente relata dor abdominal ha 3 dias' })
  text!: string;

  @ApiProperty({ description: 'Transcription confidence score (0-1)', example: 0.95 })
  confidence!: number;

  @ApiProperty({ description: 'Structured data extracted from transcription (NER results)' })
  structuredData!: Record<string, unknown>;

  @ApiProperty({
    description: 'Detected voice intent',
    example: 'SOAP',
    enum: ['SOAP', 'PRESCRIPTION', 'EXAM_REQUEST', 'CERTIFICATE', 'REFERRAL', 'EVOLUTION', 'VITALS', 'DISCHARGE'],
  })
  intent!: string;

  @ApiProperty({ description: 'Intent classification confidence (0-1)', example: 0.92 })
  intentConfidence!: number;

  @ApiProperty({ description: 'Data extracted based on the detected intent' })
  intentData!: Record<string, unknown>;
}
