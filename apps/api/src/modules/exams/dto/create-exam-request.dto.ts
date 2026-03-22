import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ExamType, ImageModality } from '@prisma/client';

export class CreateExamRequestDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Exam name' })
  @IsString()
  @IsNotEmpty()
  examName: string;

  @ApiPropertyOptional({ description: 'Exam code' })
  @IsOptional()
  @IsString()
  examCode?: string;

  @ApiProperty({ description: 'Exam type', enum: ExamType })
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiPropertyOptional({ description: 'Image modality', enum: ImageModality })
  @IsOptional()
  @IsEnum(ImageModality)
  imageModality?: ImageModality;

  @ApiPropertyOptional({ description: 'Exam instructions' })
  @IsOptional()
  @IsString()
  examInstructions?: string;
}
