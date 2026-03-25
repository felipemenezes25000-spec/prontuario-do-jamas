import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum AmbientSessionStatus {
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  APPROVED = 'APPROVED',
}

export class StartAmbientSessionDto {
  @ApiProperty({ description: 'Encounter ID to associate with the ambient session' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Language for transcription', default: 'pt-BR' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Additional context for AI processing' })
  @IsString()
  @IsOptional()
  context?: string;
}

export class ApproveAmbientNoteDto {
  @ApiPropertyOptional({ description: 'Manual edits to the generated note before saving' })
  @IsString()
  @IsOptional()
  editedNote?: string;

  @ApiPropertyOptional({ description: 'Additional clinician comments' })
  @IsString()
  @IsOptional()
  clinicianComments?: string;
}

export class AmbientSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() encounterId!: string;
  @ApiProperty({ enum: AmbientSessionStatus }) status!: AmbientSessionStatus;
  @ApiPropertyOptional() transcript?: string;
  @ApiPropertyOptional() clinicalNote?: string;
  @ApiProperty() startedAt!: Date;
  @ApiPropertyOptional() stoppedAt?: Date;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() approvedById?: string;
}

export class AmbientTranscriptResponseDto {
  @ApiProperty() sessionId!: string;
  @ApiProperty() rawTranscript!: string;
  @ApiPropertyOptional() speakerDiarization?: Array<{ speaker: string; text: string; timestamp: number }>;
  @ApiProperty() language!: string;
  @ApiProperty() durationSeconds!: number;
}

export class AmbientClinicalNoteResponseDto {
  @ApiProperty() sessionId!: string;
  @ApiPropertyOptional() subjective?: string;
  @ApiPropertyOptional() objective?: string;
  @ApiPropertyOptional() assessment?: string;
  @ApiPropertyOptional() plan?: string;
  @ApiPropertyOptional() diagnosisCodes?: Array<{ code: string; description: string; confidence: number }>;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() aiModel!: string;
}

export class AmbientSessionListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by encounter ID' })
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiPropertyOptional({ enum: AmbientSessionStatus })
  @IsEnum(AmbientSessionStatus)
  @IsOptional()
  status?: AmbientSessionStatus;
}
