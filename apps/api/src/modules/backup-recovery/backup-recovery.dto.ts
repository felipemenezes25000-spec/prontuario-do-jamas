import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUUID,
  IsDateString,
  IsArray,
  Min,
  Max,
  Matches,
} from 'class-validator';

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
}

export enum BackupDestination {
  S3 = 'S3',
  LOCAL = 'LOCAL',
  AZURE_BLOB = 'AZURE_BLOB',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum TargetEnvironment {
  PRODUCTION = 'PRODUCTION',
  STAGING = 'STAGING',
  DR_SITE = 'DR_SITE',
}

export enum DrScenarioType {
  FULL_FAILOVER = 'FULL_FAILOVER',
  PARTIAL = 'PARTIAL',
  DATA_ONLY = 'DATA_ONLY',
  APPLICATION_ONLY = 'APPLICATION_ONLY',
}

export enum DrTestStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class BackupConfigDto {
  @ApiProperty({ enum: BackupType, description: 'Backup type' })
  @IsEnum(BackupType)
  @IsNotEmpty()
  type: BackupType;

  @ApiProperty({ description: 'Cron schedule expression (e.g. "0 2 * * *")' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d*,\-\/\s]+$/, { message: 'Invalid cron expression' })
  schedule: string;

  @ApiProperty({ description: 'Retention period in days' })
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays: number;

  @ApiProperty({ description: 'Whether to encrypt the backup' })
  @IsBoolean()
  encryptionEnabled: boolean;

  @ApiProperty({ enum: BackupDestination, description: 'Backup destination' })
  @IsEnum(BackupDestination)
  @IsNotEmpty()
  destination: BackupDestination;
}

export class RestoreRequestDto {
  @ApiProperty({ description: 'Backup ID to restore from' })
  @IsUUID()
  @IsNotEmpty()
  backupId: string;

  @ApiProperty({ enum: TargetEnvironment, description: 'Target environment for restore' })
  @IsEnum(TargetEnvironment)
  @IsNotEmpty()
  targetEnvironment: TargetEnvironment;

  @ApiProperty({ description: 'Whether to verify integrity after restore' })
  @IsBoolean()
  verification: boolean;
}

export class DrTestDto {
  @ApiProperty({ enum: DrScenarioType, description: 'DR test scenario type' })
  @IsEnum(DrScenarioType)
  @IsNotEmpty()
  scenarioType: DrScenarioType;

  @ApiProperty({ description: 'Scheduled date for the test' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({ description: 'Participant names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  participants: string[];
}

export class BackupFilterDto {
  @ApiPropertyOptional({ enum: BackupType })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiPropertyOptional({ enum: BackupStatus })
  @IsOptional()
  @IsEnum(BackupStatus)
  status?: BackupStatus;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
