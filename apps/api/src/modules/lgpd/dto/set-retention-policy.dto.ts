import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, Min } from 'class-validator';
import { DataCategory } from '@prisma/client';

export class SetRetentionPolicyDto {
  @ApiProperty({ description: 'Category of data subject to retention', enum: DataCategory })
  @IsEnum(DataCategory)
  dataCategory!: DataCategory;

  @ApiProperty({ description: 'Retention period in years', example: 20, minimum: 1 })
  @IsInt()
  @Min(1)
  retentionYears!: number;

  @ApiProperty({ description: 'Legal basis for the retention period (e.g. CFM Resolution)', example: 'CFM Resolucao 1.821/2007 — minimo 20 anos' })
  @IsString()
  legalBasis!: string;

  @ApiProperty({ description: 'Human-readable description of the policy', example: 'Prontuarios medicos devem ser retidos por no minimo 20 anos' })
  @IsString()
  description!: string;
}
