import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';

export enum NptType {
  TPN = 'TPN', // Total Parenteral Nutrition
  PPN = 'PPN', // Peripheral Parenteral Nutrition
}

export class CalculateNptDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Patient weight in kg' })
  @IsNumber()
  @Min(0.5)
  weightKg: number;

  @ApiPropertyOptional({ description: 'Patient height in cm' })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiProperty({ description: 'Caloric target (kcal/kg/day)' })
  @IsNumber()
  @Min(0)
  caloricTargetPerKg: number;

  @ApiProperty({ description: 'Protein target (g/kg/day)' })
  @IsNumber()
  @Min(0)
  proteinTargetPerKg: number;

  @ApiPropertyOptional({ description: 'Lipid percentage of total calories (20-40%)' })
  @IsOptional()
  @IsNumber()
  lipidPercentage?: number;

  @ApiPropertyOptional({ description: 'Volume limit mL' })
  @IsOptional()
  @IsNumber()
  volumeLimitMl?: number;

  @ApiPropertyOptional({ description: 'Glucose infusion rate target (mg/kg/min)' })
  @IsOptional()
  @IsNumber()
  girTarget?: number;

  @ApiPropertyOptional({ enum: NptType })
  @IsOptional()
  @IsEnum(NptType)
  type?: NptType;
}

export class CreateNptOrderDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ enum: NptType })
  @IsEnum(NptType)
  type: NptType;

  @ApiProperty({ description: 'Total volume mL' })
  @IsNumber()
  @Min(1)
  totalVolumeMl: number;

  @ApiProperty({ description: 'Infusion rate mL/h' })
  @IsNumber()
  @Min(0.1)
  infusionRateMlH: number;

  @ApiProperty({ description: 'Total calories kcal' })
  @IsNumber()
  totalCalories: number;

  @ApiProperty({ description: 'Amino acids (g)' })
  @IsNumber()
  aminoAcidsG: number;

  @ApiProperty({ description: 'Glucose (g)' })
  @IsNumber()
  glucoseG: number;

  @ApiProperty({ description: 'Lipids (g)' })
  @IsNumber()
  lipidsG: number;

  @ApiPropertyOptional({ description: 'Sodium mEq' })
  @IsOptional()
  @IsNumber()
  sodiumMeq?: number;

  @ApiPropertyOptional({ description: 'Potassium mEq' })
  @IsOptional()
  @IsNumber()
  potassiumMeq?: number;

  @ApiPropertyOptional({ description: 'Calcium mEq' })
  @IsOptional()
  @IsNumber()
  calciumMeq?: number;

  @ApiPropertyOptional({ description: 'Magnesium mEq' })
  @IsOptional()
  @IsNumber()
  magnesiumMeq?: number;

  @ApiPropertyOptional({ description: 'Phosphate mmol' })
  @IsOptional()
  @IsNumber()
  phosphateMmol?: number;

  @ApiPropertyOptional({ description: 'Trace elements included' })
  @IsOptional()
  traceElements?: boolean;

  @ApiPropertyOptional({ description: 'Multivitamins included' })
  @IsOptional()
  multivitamins?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
