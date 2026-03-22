import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AlertType, AlertSeverity, AlertSource } from '@prisma/client';

export class CreateAlertDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Alert type', enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ description: 'Alert severity', enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Alert details' })
  @IsOptional()
  details?: Record<string, unknown>;

  @ApiProperty({ description: 'Alert source', enum: AlertSource })
  @IsEnum(AlertSource)
  source: AlertSource;
}
