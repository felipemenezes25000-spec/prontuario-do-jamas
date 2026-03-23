import { IsString, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamParseVoiceDto {
  @ApiProperty({ description: 'Transcribed voice text requesting exams' })
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

  @ApiPropertyOptional({ description: 'Clinical justification / hypothesis' })
  @IsOptional()
  @IsString()
  clinicalIndication?: string;
}

export class ParsedExamItem {
  @ApiProperty({ example: 'Hemograma completo' })
  examName!: string;

  @ApiProperty({ example: 'LABORATORIAL', enum: ['LABORATORIAL', 'IMAGEM', 'FUNCIONAL', 'ANATOMOPATOLOGICO', 'OUTRO'] })
  examType!: string;

  @ApiPropertyOptional({ example: '40304361' })
  tussCode?: string;

  @ApiProperty({ example: 'ROTINA', enum: ['ROTINA', 'URGENTE', 'EMERGENCIA'] })
  urgency!: string;

  @ApiPropertyOptional({ example: 'Investigacao de anemia' })
  clinicalIndication?: string;

  @ApiProperty({ example: 0.95 })
  confidence!: number;
}

export class ExamParseVoiceResponseDto {
  @ApiProperty({ type: [ParsedExamItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedExamItem)
  items!: ParsedExamItem[];

  @ApiProperty({ example: 'Investigacao de anemia ferropriva' })
  suggestedIndication!: string;
}
