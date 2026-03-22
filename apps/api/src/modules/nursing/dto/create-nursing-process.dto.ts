import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateNursingProcessDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Data collection notes' })
  @IsOptional()
  @IsString()
  dataCollectionNotes?: string;

  @ApiPropertyOptional({ description: 'Voice transcription ID for data collection' })
  @IsOptional()
  @IsUUID()
  dataCollectionVoiceId?: string;
}
