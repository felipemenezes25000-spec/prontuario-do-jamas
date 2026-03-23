import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CertificateParseVoiceDto {
  @ApiProperty({ description: 'Transcribed voice text requesting certificate' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class CertificateParseVoiceResponseDto {
  @ApiProperty({ example: 3, description: 'Number of days for the certificate' })
  days!: number;

  @ApiPropertyOptional({ example: 'J06.9', description: 'CID-10 code' })
  cidCode?: string;

  @ApiPropertyOptional({ example: 'Infeccao aguda das vias aereas superiores' })
  cidDescription?: string;

  @ApiProperty({ example: 'Paciente necessita de afastamento por 3 dias para recuperacao de infeccao respiratoria aguda.' })
  justification!: string;

  @ApiProperty({
    example: 'AFASTAMENTO',
    enum: ['AFASTAMENTO', 'COMPARECIMENTO', 'APTIDAO', 'ACOMPANHANTE', 'OBITO'],
  })
  certificateType!: string;

  @ApiPropertyOptional({ description: 'Additional restrictions or notes' })
  restrictions?: string;

  @ApiProperty({ example: 0.9 })
  confidence!: number;
}
