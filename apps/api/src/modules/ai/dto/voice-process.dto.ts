import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoiceProcessDto {
  @ApiProperty({ description: 'Transcribed text to process' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Context of the transcription (soap, anamnesis, etc.)' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

export class VoiceProcessResponseDto {
  @ApiProperty()
  processedText!: string;

  @ApiProperty()
  structuredData!: Record<string, unknown>;

  @ApiProperty()
  entities!: Array<{ type: string; value: string; confidence: number }>;
}
