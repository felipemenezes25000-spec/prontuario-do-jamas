import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min, Max } from 'class-validator';

export class AddDiaryEntryDto {
  @ApiProperty({ description: 'Entry type: BP, GLUCOSE, SYMPTOMS, MOOD, EXERCISE, WEIGHT, TEMPERATURE, PAIN' })
  @IsIn(['BP', 'GLUCOSE', 'SYMPTOMS', 'MOOD', 'EXERCISE', 'WEIGHT', 'TEMPERATURE', 'PAIN'])
  entryType!: string;

  @ApiPropertyOptional({ description: 'Date ISO 8601 (default: now)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Systolic blood pressure' })
  @IsOptional()
  @IsNumber()
  systolicBP?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure' })
  @IsOptional()
  @IsNumber()
  diastolicBP?: number;

  @ApiPropertyOptional({ description: 'Blood glucose mg/dL' })
  @IsOptional()
  @IsNumber()
  glucose?: number;

  @ApiPropertyOptional({ description: 'Glucose meal context: FASTING, PRE_MEAL, POST_MEAL, BEDTIME' })
  @IsOptional()
  @IsIn(['FASTING', 'PRE_MEAL', 'POST_MEAL', 'BEDTIME'])
  glucoseMealContext?: string;

  @ApiPropertyOptional({ description: 'Symptom list', type: [String] })
  @IsOptional()
  @IsArray()
  symptoms?: string[];

  @ApiPropertyOptional({ description: 'Mood: GREAT, GOOD, OK, BAD, TERRIBLE' })
  @IsOptional()
  @IsIn(['GREAT', 'GOOD', 'OK', 'BAD', 'TERRIBLE'])
  mood?: string;

  @ApiPropertyOptional({ description: 'Exercise type' })
  @IsOptional()
  @IsString()
  exerciseType?: string;

  @ApiPropertyOptional({ description: 'Exercise duration in minutes' })
  @IsOptional()
  @IsNumber()
  exerciseDuration?: number;

  @ApiPropertyOptional({ description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Pain scale 0-10' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painScale?: number;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
