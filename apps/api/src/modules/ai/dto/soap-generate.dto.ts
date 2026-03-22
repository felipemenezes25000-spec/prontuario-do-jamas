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
  @ApiProperty({ description: 'Subjective section of SOAP note', example: 'Paciente relata dor abdominal ha 3 dias, piora apos alimentacao' })
  subjective!: string;

  @ApiProperty({ description: 'Objective section of SOAP note', example: 'Abdome: dor a palpacao em epigastrio, sem sinais de irritacao peritoneal' })
  objective!: string;

  @ApiProperty({ description: 'Assessment section of SOAP note', example: 'Dispepsia funcional. Descartar ulcera peptica.' })
  assessment!: string;

  @ApiProperty({ description: 'Plan section of SOAP note', example: 'Solicitar EDA. Iniciar omeprazol 20mg 1x/dia.' })
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
