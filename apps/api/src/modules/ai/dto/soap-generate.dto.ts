import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SoapGenerateDto {
  @ApiProperty({ description: 'Transcription text to generate SOAP from' })
  @IsString()
  transcription!: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Doctor specialty for context-specific SOAP generation' })
  @IsOptional()
  @IsString()
  doctorSpecialty?: string;
}

export class SoapGenerateResponseDto {
  @ApiProperty()
  subjective!: string;

  @ApiProperty()
  objective!: string;

  @ApiProperty()
  assessment!: string;

  @ApiProperty()
  plan!: string;

  @ApiProperty({ type: [String] })
  diagnosisCodes!: string[];

  @ApiProperty({ type: [String] })
  suggestedExams!: string[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        dose: { type: 'string' },
        route: { type: 'string' },
        frequency: { type: 'string' },
        duration: { type: 'string' },
      },
    },
  })
  suggestedMedications!: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}
