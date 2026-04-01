import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// MPI Search Duplicates
// ============================================================================

export class MpiSearchDuplicatesDto {
  @ApiPropertyOptional({ description: 'Full name to search' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'CPF number (digits only)' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ description: 'Birth date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Minimum match score threshold (0-100)', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minScore?: number;
}

// ============================================================================
// MPI Merge
// ============================================================================

export class MpiMergeDto {
  @ApiProperty({ description: 'Primary patient ID (master record to keep)' })
  @IsUUID()
  masterId!: string;

  @ApiProperty({ description: 'Secondary patient IDs to merge into master' })
  @IsArray()
  @IsUUID('4', { each: true })
  secondaryIds!: string[];

  @ApiPropertyOptional({ description: 'Reason for merge' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============================================================================
// Result DTOs
// ============================================================================

export class MpiDuplicateCandidateDto {
  id!: string;
  fullName!: string;
  cpf!: string | null;
  birthDate!: Date | null;
  mrn!: string;
  phone!: string | null;
  email!: string | null;
  matchScore!: number;
  matchReasons!: string[];
  soundexCode!: string;
  metaphoneCode!: string;
}

export class MpiMergeResultDto {
  masterId!: string;
  masterName!: string;
  mergedIds!: string[];
  mergedCount!: number;
  mergedAt!: string;
}
