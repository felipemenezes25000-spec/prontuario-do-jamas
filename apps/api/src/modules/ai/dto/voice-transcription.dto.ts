import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Query / Filter DTOs ────────────────────────────────────────────

export class ListTranscriptionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

// ─── Stream DTOs ────────────────────────────────────────────────────

export class StreamStartDto {
  @ApiProperty({ description: 'Encounter ID for the streaming session' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Patient ID for the streaming session' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Voice context: soap, anamnesis, prescription, etc.' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class StreamStartResponseDto {
  @ApiProperty({ description: 'Unique session ID for the streaming session' })
  sessionId!: string;
}

export class StreamStopDto {
  @ApiProperty({ description: 'Session ID to stop' })
  @IsString()
  sessionId!: string;
}

export class StreamStopResponseDto {
  @ApiProperty({ description: 'Final transcription text' })
  transcription!: string;

  @ApiProperty({ description: 'Duration in seconds' })
  duration!: number;
}

// ─── Edit DTO ───────────────────────────────────────────────────────

export class EditTranscriptionDto {
  @ApiProperty({ description: 'Updated transcription text' })
  @IsString()
  text!: string;
}

// ─── Response DTOs ──────────────────────────────────────────────────

export class TranscriptionResponseDto {
  @ApiProperty({ description: 'Transcription UUID' })
  id!: string;

  @ApiProperty({ description: 'Transcribed text' })
  text!: string;

  @ApiPropertyOptional({ description: 'Transcription confidence score (0-1)' })
  confidence!: number | null;

  @ApiPropertyOptional({ description: 'Structured data extracted via NER' })
  structuredData!: Record<string, unknown> | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Audio duration in seconds' })
  duration!: number | null;
}

export class PaginatedTranscriptionsResponseDto {
  @ApiProperty({ type: [TranscriptionResponseDto], description: 'List of transcriptions' })
  data!: TranscriptionResponseDto[];

  @ApiProperty({ description: 'Total number of transcriptions' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;
}
