import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum CalculatorType {
  CHADS2_VASC = 'CHADS2_VASC',
  MELD = 'MELD',
  CHILD_PUGH = 'CHILD_PUGH',
  APACHE_II = 'APACHE_II',
  WELLS_DVT = 'WELLS_DVT',
  WELLS_PE = 'WELLS_PE',
  CURB65 = 'CURB65',
  SOFA = 'SOFA',
  GRACE = 'GRACE',
  HAS_BLED = 'HAS_BLED',
}

// ============================================================================
// DTOs
// ============================================================================

export class CalculateScoreDto {
  @ApiProperty({ enum: CalculatorType, description: 'Calculator to use' })
  @IsEnum(CalculatorType)
  calculator!: CalculatorType;

  @ApiProperty({ description: 'Input values for the calculator' })
  @IsObject()
  inputs!: Record<string, number>;

  @ApiPropertyOptional({ description: 'Patient UUID for auto-fill and saving results' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class AutoFillDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: CalculatorType, description: 'Calculator to auto-fill for' })
  @IsEnum(CalculatorType)
  calculator!: CalculatorType;
}

// ============================================================================
// Calculator metadata interface
// ============================================================================

export interface CalculatorMeta {
  name: string;
  description: string;
  requiredInputs: Array<{
    key: string;
    label: string;
    type: 'boolean' | 'number' | 'select';
    options?: Array<{ value: number; label: string }>;
    min?: number;
    max?: number;
  }>;
}

export interface CalculatorResult {
  calculator: CalculatorType;
  score: number;
  maxScore: number;
  interpretation: string;
  risk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  details: Record<string, unknown>;
}
