import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsIn } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty({ description: 'Survey type: NPS, PREM, PROM' })
  @IsIn(['NPS', 'PREM', 'PROM'])
  surveyType!: string;

  @ApiProperty({ description: 'Survey title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Target patient UUID (omit for broadcast)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Related encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Questions array', type: [Object] })
  @IsArray()
  questions!: Array<{
    id: string;
    text: string;
    type: 'SCALE' | 'TEXT' | 'MULTIPLE_CHOICE' | 'BOOLEAN';
    options?: string[];
    required: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Expiry date ISO 8601' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class SubmitSurveyResponseDto {
  @ApiProperty({ description: 'Answers array', type: [Object] })
  @IsArray()
  answers!: Array<{
    questionId: string;
    value: string | number | boolean;
  }>;

  @ApiPropertyOptional({ description: 'Additional free-text comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
