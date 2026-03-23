import { IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdministerMedicationDto {
  @ApiProperty({ description: 'Prescription item UUID' })
  @IsUUID()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId: string;

  @ApiProperty({ description: 'Scheduled time (ISO datetime)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Actual administration time (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  checkedAt?: string;

  @ApiPropertyOptional({ description: 'Medication lot number' })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({ description: 'Observations about the administration' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class SkipMedicationDto {
  @ApiProperty({ description: 'Prescription item UUID' })
  @IsUUID()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId: string;

  @ApiProperty({ description: 'Scheduled time (ISO datetime)' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'Reason for skipping' })
  @IsString()
  observations: string;
}

export class SuspendMedicationDto {
  @ApiProperty({ description: 'Prescription item UUID' })
  @IsUUID()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId: string;

  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  observations: string;
}
