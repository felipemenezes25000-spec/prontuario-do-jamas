import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import {
  MedicationRoute,
  DurationUnit,
  ExamType,
  Priority,
  ControlledSchedule,
} from '@prisma/client';

export class CreatePrescriptionItemDto {
  @ApiPropertyOptional({ description: 'Medication name' })
  @IsOptional()
  @IsString()
  medicationName?: string;

  @ApiPropertyOptional({ description: 'Active ingredient' })
  @IsOptional()
  @IsString()
  activeIngredient?: string;

  @ApiPropertyOptional({ description: 'Concentration' })
  @IsOptional()
  @IsString()
  concentration?: string;

  @ApiPropertyOptional({ description: 'Pharmaceutical form' })
  @IsOptional()
  @IsString()
  pharmaceuticalForm?: string;

  @ApiPropertyOptional({ description: 'Dose' })
  @IsOptional()
  @IsString()
  dose?: string;

  @ApiPropertyOptional({ description: 'Dose unit' })
  @IsOptional()
  @IsString()
  doseUnit?: string;

  @ApiPropertyOptional({ description: 'Route of administration', enum: MedicationRoute })
  @IsOptional()
  @IsEnum(MedicationRoute)
  route?: MedicationRoute;

  @ApiPropertyOptional({ description: 'Frequency' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ description: 'Frequency in hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  frequencyHours?: number;

  @ApiPropertyOptional({ description: 'Duration' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Duration unit', enum: DurationUnit })
  @IsOptional()
  @IsEnum(DurationUnit)
  durationUnit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Infusion rate' })
  @IsOptional()
  @IsString()
  infusionRate?: string;

  @ApiPropertyOptional({ description: 'Infusion rate unit' })
  @IsOptional()
  @IsString()
  infusionRateUnit?: string;

  @ApiPropertyOptional({ description: 'Dilution' })
  @IsOptional()
  @IsString()
  dilution?: string;

  @ApiPropertyOptional({ description: 'Dilution volume' })
  @IsOptional()
  @IsString()
  dilutionVolume?: string;

  @ApiPropertyOptional({ description: 'Dilution solution' })
  @IsOptional()
  @IsString()
  dilutionSolution?: string;

  @ApiPropertyOptional({ description: 'Max daily dose' })
  @IsOptional()
  @IsString()
  maxDailyDose?: string;

  @ApiPropertyOptional({ description: 'PRN condition' })
  @IsOptional()
  @IsString()
  prnCondition?: string;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Exam name' })
  @IsOptional()
  @IsString()
  examName?: string;

  @ApiPropertyOptional({ description: 'Exam code' })
  @IsOptional()
  @IsString()
  examCode?: string;

  @ApiPropertyOptional({ description: 'Exam type', enum: ExamType })
  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @ApiPropertyOptional({ description: 'Exam urgency', enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  examUrgency?: Priority;

  @ApiPropertyOptional({ description: 'Exam instructions' })
  @IsOptional()
  @IsString()
  examInstructions?: string;

  @ApiPropertyOptional({ description: 'Exam justification' })
  @IsOptional()
  @IsString()
  examJustification?: string;

  @ApiPropertyOptional({ description: 'Procedure name' })
  @IsOptional()
  @IsString()
  procedureName?: string;

  @ApiPropertyOptional({ description: 'Procedure code' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ description: 'Diet type' })
  @IsOptional()
  @IsString()
  dietType?: string;

  @ApiPropertyOptional({ description: 'Caloric target' })
  @IsOptional()
  @IsInt()
  caloricTarget?: number;

  @ApiPropertyOptional({ description: 'Restrictions' })
  @IsOptional()
  @IsString()
  restrictions?: string;

  @ApiPropertyOptional({ description: 'Supplements' })
  @IsOptional()
  @IsString()
  supplements?: string;

  @ApiPropertyOptional({ description: 'Is controlled substance' })
  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;

  @ApiPropertyOptional({ description: 'Controlled schedule', enum: ControlledSchedule })
  @IsOptional()
  @IsEnum(ControlledSchedule)
  controlledSchedule?: ControlledSchedule;

  @ApiPropertyOptional({ description: 'Is antibiotic' })
  @IsOptional()
  @IsBoolean()
  isAntibiotic?: boolean;

  @ApiPropertyOptional({ description: 'Antibiotic justification' })
  @IsOptional()
  @IsString()
  antibioticJustification?: string;

  @ApiPropertyOptional({ description: 'Is high alert medication' })
  @IsOptional()
  @IsBoolean()
  isHighAlert?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
