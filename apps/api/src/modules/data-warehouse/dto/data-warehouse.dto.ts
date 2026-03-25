import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateCohortDto {
  @ApiProperty({ description: 'Cohort name' }) @IsString() name!: string;
  @ApiPropertyOptional({ description: 'Cohort description' }) @IsString() @IsOptional() description?: string;
  @ApiProperty({ description: 'Filter criteria as structured query' })
  @IsObject()
  criteria!: Record<string, unknown>;
}

export class CohortResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() criteria!: Record<string, unknown>;
  @ApiProperty() patientCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() lastRunAt?: Date;
}

export class CohortsListResponseDto {
  @ApiProperty({ type: [CohortResponseDto] }) cohorts!: CohortResponseDto[];
  @ApiProperty() total!: number;
}

export class LongitudinalDataPointDto {
  @ApiProperty() date!: string;
  @ApiProperty() metric!: string;
  @ApiProperty() value!: number;
  @ApiPropertyOptional() unit?: string;
  @ApiPropertyOptional() context?: string;
}

export class LongitudinalAnalysisResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ type: [LongitudinalDataPointDto] }) dataPoints!: LongitudinalDataPointDto[];
  @ApiProperty() metrics!: string[];
  @ApiPropertyOptional() trends?: Record<string, string>;
  @ApiPropertyOptional() aiInsights?: string[];
}

export class BenchmarkItemDto {
  @ApiProperty() metric!: string;
  @ApiProperty() currentValue!: number;
  @ApiProperty() benchmarkValue!: number;
  @ApiProperty() percentile!: number;
  @ApiPropertyOptional() trend?: string;
  @ApiPropertyOptional() unit?: string;
}

export class BenchmarkResponseDto {
  @ApiProperty({ type: [BenchmarkItemDto] }) benchmarks!: BenchmarkItemDto[];
  @ApiProperty() period!: string;
  @ApiProperty() comparedTo!: string;
}
