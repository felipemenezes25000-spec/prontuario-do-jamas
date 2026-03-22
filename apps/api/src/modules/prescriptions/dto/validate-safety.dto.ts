import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ControlledSchedule, MedicationRoute } from '@prisma/client';

export class ValidateSafetyDto {
  @ApiProperty({ description: 'Medication name' })
  @IsString()
  medicationName: string;

  @ApiPropertyOptional({ description: 'Active ingredient' })
  @IsOptional()
  @IsString()
  activeIngredient?: string;

  @ApiPropertyOptional({ description: 'Concentration' })
  @IsOptional()
  @IsString()
  concentration?: string;

  @ApiPropertyOptional({ description: 'Route of administration', enum: MedicationRoute })
  @IsOptional()
  @IsEnum(MedicationRoute)
  route?: MedicationRoute;

  @ApiPropertyOptional({ description: 'Frequency (e.g., "8/8h", "12/12h")' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ description: 'Duration in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Is controlled substance' })
  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;

  @ApiPropertyOptional({ description: 'Controlled substance type', enum: ControlledSchedule })
  @IsOptional()
  @IsEnum(ControlledSchedule)
  controlType?: ControlledSchedule;

  @ApiPropertyOptional({ description: 'Is antimicrobial' })
  @IsOptional()
  @IsBoolean()
  isAntimicrobial?: boolean;

  @ApiPropertyOptional({ description: 'Patient gender (M/F)' })
  @IsOptional()
  @IsString()
  patientGender?: string;

  @ApiPropertyOptional({ description: 'Patient age in years' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientAge?: number;
}
