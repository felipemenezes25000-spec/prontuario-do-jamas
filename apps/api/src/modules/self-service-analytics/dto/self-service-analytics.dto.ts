import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class ExecuteQueryDto {
  @ApiProperty({ description: 'Dimensions to group by' })
  @IsArray() @IsString({ each: true })
  dimensions!: string[];

  @ApiProperty({ description: 'Measures to calculate' })
  @IsArray() @IsString({ each: true })
  measures!: string[];

  @ApiPropertyOptional({ description: 'Filters to apply' })
  @IsArray() @IsOptional()
  filters?: Array<{ dimension: string; operator: string; value: string }>;

  @ApiPropertyOptional({ description: 'Date range start' }) @IsString() @IsOptional() fromDate?: string;
  @ApiPropertyOptional({ description: 'Date range end' }) @IsString() @IsOptional() toDate?: string;
  @ApiPropertyOptional({ description: 'Max rows to return' }) @IsOptional() limit?: number;
}

export class SaveQueryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsObject() query!: ExecuteQueryDto;
}

export class DimensionDto {
  @ApiProperty() name!: string;
  @ApiProperty() label!: string;
  @ApiProperty() type!: string;
  @ApiProperty() category!: string;
  @ApiPropertyOptional() values?: string[];
}

export class MeasureDto {
  @ApiProperty() name!: string;
  @ApiProperty() label!: string;
  @ApiProperty() type!: string;
  @ApiProperty() aggregation!: string;
  @ApiPropertyOptional() unit?: string;
}

export class QueryResultResponseDto {
  @ApiProperty() columns!: string[];
  @ApiProperty() rows!: Array<Record<string, unknown>>;
  @ApiProperty() totalRows!: number;
  @ApiProperty() executionTimeMs!: number;
}

export class SavedQueryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() query!: ExecuteQueryDto;
  @ApiProperty() createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() lastRunAt?: Date;
}
