import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType } from '@prisma/client';

export class BulkExamItemDto {
  @ApiProperty({ description: 'Exam name' })
  @IsString()
  @IsNotEmpty()
  examName: string;

  @ApiPropertyOptional({ description: 'Exam code (TUSS)' })
  @IsOptional()
  @IsString()
  examCode?: string;

  @ApiProperty({ description: 'Exam type', enum: ExamType })
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Clinical indication' })
  @IsOptional()
  @IsString()
  clinicalIndication?: string;
}

export class BulkExamRequestDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'List of exams to request', type: [BulkExamItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkExamItemDto)
  items: BulkExamItemDto[];
}
