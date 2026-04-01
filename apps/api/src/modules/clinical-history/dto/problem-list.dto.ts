import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

// ============================================================================
// Enums
// ============================================================================

export enum ProblemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESOLVED = 'RESOLVED',
  CHRONIC = 'CHRONIC',
}

export enum ProblemType {
  ACUTE = 'ACUTE',
  CHRONIC = 'CHRONIC',
  EPISODIC = 'EPISODIC',
}

export enum ProblemSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

// ============================================================================
// Create / Update
// ============================================================================

export class CreateProblemDto {
  @ApiProperty({ description: 'ICD-10 code (e.g. J45.0)' })
  @IsString()
  @MaxLength(20)
  icd10Code!: string;

  @ApiProperty({ description: 'Human-readable diagnosis name' })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiProperty({ enum: ProblemStatus, default: ProblemStatus.ACTIVE })
  @IsEnum(ProblemStatus)
  status!: ProblemStatus;

  @ApiProperty({ enum: ProblemType })
  @IsEnum(ProblemType)
  type!: ProblemType;

  @ApiPropertyOptional({ enum: ProblemSeverity })
  @IsOptional()
  @IsEnum(ProblemSeverity)
  severity?: ProblemSeverity;

  @ApiPropertyOptional({ description: 'Onset date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  onsetDate?: string;

  @ApiPropertyOptional({ description: 'Resolution date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  resolutionDate?: string;

  @ApiPropertyOptional({ description: 'Clinical notes about this problem' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Flag as requiring priority attention' })
  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;
}

export class UpdateProblemDto {
  @ApiPropertyOptional({ description: 'ICD-10 code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  icd10Code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ enum: ProblemStatus })
  @IsOptional()
  @IsEnum(ProblemStatus)
  status?: ProblemStatus;

  @ApiPropertyOptional({ enum: ProblemType })
  @IsOptional()
  @IsEnum(ProblemType)
  type?: ProblemType;

  @ApiPropertyOptional({ enum: ProblemSeverity })
  @IsOptional()
  @IsEnum(ProblemSeverity)
  severity?: ProblemSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onsetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolutionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;
}

// ============================================================================
// Result
// ============================================================================

export class ProblemListItemDto {
  id!: string;
  patientId!: string;
  tenantId!: string;
  icd10Code!: string;
  description!: string;
  status!: ProblemStatus;
  type!: ProblemType;
  severity!: ProblemSeverity | null;
  onsetDate!: string | null;
  resolutionDate!: string | null;
  notes!: string | null;
  isPriority!: boolean;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
