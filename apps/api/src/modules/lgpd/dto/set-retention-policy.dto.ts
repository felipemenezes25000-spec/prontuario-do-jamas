import { IsString, IsEnum, IsInt, Min } from 'class-validator';
import { DataCategory } from '@prisma/client';

export class SetRetentionPolicyDto {
  @IsEnum(DataCategory)
  dataCategory!: DataCategory;

  @IsInt()
  @Min(1)
  retentionYears!: number;

  @IsString()
  legalBasis!: string;

  @IsString()
  description!: string;
}
