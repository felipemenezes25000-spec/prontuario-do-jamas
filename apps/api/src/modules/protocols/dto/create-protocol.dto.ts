import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TriggerCriterionDto {
  @ApiProperty({ description: 'Field name to evaluate (e.g. triageLevel, temperature)' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'],
  })
  @IsString()
  @IsNotEmpty()
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

  @ApiProperty({ description: 'Value to compare against' })
  @IsNotEmpty()
  value: string | number | boolean | string[];
}

export class ProtocolActionDto {
  @ApiProperty({ description: 'Action type (e.g. ALERT, ORDER, NOTIFICATION)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Action parameters' })
  @IsNotEmpty()
  params: Record<string, unknown>;
}

export class CreateProtocolDto {
  @ApiProperty({ description: 'Protocol name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Protocol name in English' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'Protocol description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Protocol category',
    enum: ['SEPSIS', 'ACS', 'STROKE', 'FALL', 'DVT', 'PAIN', 'PEDIATRIC', 'OBSTETRIC'],
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Trigger criteria array', type: [TriggerCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerCriterionDto)
  triggerCriteria: TriggerCriterionDto[];

  @ApiProperty({ description: 'Protocol actions', type: [ProtocolActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProtocolActionDto)
  actions: ProtocolActionDto[];

  @ApiPropertyOptional({ description: 'Priority (higher = more important)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Whether the protocol is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
