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
  @ApiProperty({ description: 'Processed and normalized text', example: 'Paciente com dor abdominal em regiao epigastrica' })
  processedText!: string;

  @ApiProperty({ description: 'Structured data extracted from text' })
  structuredData!: Record<string, unknown>;

  @ApiProperty({
    description: 'Named entities extracted from text',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        value: { type: 'string' },
        confidence: { type: 'number' },
      },
    },
  })
  entities!: Array<{ type: string; value: string; confidence: number }>;
}
