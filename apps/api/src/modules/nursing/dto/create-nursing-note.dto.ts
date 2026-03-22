import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { NursingNoteType, Shift } from '@prisma/client';

export class CreateNursingNoteDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Note type', enum: NursingNoteType })
  @IsEnum(NursingNoteType)
  type: NursingNoteType;

  @ApiProperty({ description: 'Content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Shift', enum: Shift })
  @IsEnum(Shift)
  shift: Shift;

  @ApiPropertyOptional({ description: 'Voice transcription ID' })
  @IsOptional()
  @IsUUID()
  voiceTranscriptionId?: string;
}
