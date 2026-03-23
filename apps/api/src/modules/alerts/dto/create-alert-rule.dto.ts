import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsIn,
} from 'class-validator';
import { AlertSeverity } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'SpO2 Baixa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Vital sign or lab field to evaluate',
    example: 'spo2',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'spo2',
    'systolicBp',
    'diastolicBp',
    'heartRate',
    'respiratoryRate',
    'temperature',
    'gcs',
    'glucose',
    'painScale',
  ])
  field: string;

  @ApiProperty({
    description: 'Comparison operator',
    example: 'lt',
  })
  @IsString()
  @IsIn(['lt', 'gt', 'lte', 'gte', 'eq', 'between'])
  operator: string;

  @ApiProperty({ description: 'Threshold value', example: 92 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({
    description: 'Second value for "between" operator',
  })
  @IsOptional()
  @IsNumber()
  value2?: number;

  @ApiProperty({
    description: 'Alert severity',
    enum: AlertSeverity,
    default: 'WARNING',
  })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({
    description: 'Alert message to display',
    example: 'Avaliar oxigenoterapia',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Suggested action code',
    example: 'ORDER_O2',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Whether rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Vital sign or lab field' })
  @IsOptional()
  @IsString()
  @IsIn([
    'spo2',
    'systolicBp',
    'diastolicBp',
    'heartRate',
    'respiratoryRate',
    'temperature',
    'gcs',
    'glucose',
    'painScale',
  ])
  field?: string;

  @ApiPropertyOptional({ description: 'Comparison operator' })
  @IsOptional()
  @IsString()
  @IsIn(['lt', 'gt', 'lte', 'gte', 'eq', 'between'])
  operator?: string;

  @ApiPropertyOptional({ description: 'Threshold value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Second value for between' })
  @IsOptional()
  @IsNumber()
  value2?: number;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Alert message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Suggested action code' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Whether rule is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
