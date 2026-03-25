import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';

export enum RuleCategory {
  DRUG_INTERACTION = 'DRUG_INTERACTION',
  ALLERGY_ALERT = 'ALLERGY_ALERT',
  DOSE_RANGE = 'DOSE_RANGE',
  LAB_CRITICAL = 'LAB_CRITICAL',
  VITAL_SIGN = 'VITAL_SIGN',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  PROTOCOL_DEVIATION = 'PROTOCOL_DEVIATION',
  SEPSIS_SCREENING = 'SEPSIS_SCREENING',
  FALL_RISK = 'FALL_RISK',
  DETERIORATION = 'DETERIORATION',
  RENAL_ADJUSTMENT = 'RENAL_ADJUSTMENT',
  CUSTOM = 'CUSTOM',
}

export enum RuleSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  BLOCKING = 'BLOCKING',
}

export class CreateRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Rule description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: RuleCategory })
  @IsEnum(RuleCategory)
  category: RuleCategory;

  @ApiProperty({ enum: RuleSeverity })
  @IsEnum(RuleSeverity)
  severity: RuleSeverity;

  @ApiProperty({
    description: 'Rule condition as JSON (e.g., { "field": "systolic_bp", "operator": ">", "value": 180 })',
  })
  @IsObject()
  condition: Record<string, unknown>;

  @ApiProperty({ description: 'Action to take when triggered' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ description: 'Alert message when triggered' })
  @IsOptional()
  @IsString()
  alertMessage?: string;

  @ApiPropertyOptional({ description: 'Is rule active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Applicable specialties', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}

export class UpdateRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RuleSeverity })
  @IsOptional()
  @IsEnum(RuleSeverity)
  severity?: RuleSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alertMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EvaluateRulesDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({
    description: 'Patient data context to evaluate against',
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
