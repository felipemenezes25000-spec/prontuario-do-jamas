import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { DischargeType } from '@prisma/client';

export class DischargeDto {
  @ApiProperty({ description: 'Discharge type', enum: DischargeType })
  @IsEnum(DischargeType)
  dischargeType: DischargeType;

  @ApiPropertyOptional({ description: 'Diagnosis at discharge' })
  @IsOptional()
  @IsString()
  diagnosisAtDischarge?: string;

  @ApiPropertyOptional({ description: 'Procedure performed' })
  @IsOptional()
  @IsString()
  procedurePerformed?: string;

  @ApiPropertyOptional({ description: 'Discharge notes' })
  @IsOptional()
  @IsString()
  dischargeNotes?: string;

  @ApiPropertyOptional({ description: 'Discharge prescription' })
  @IsOptional()
  @IsString()
  dischargePrescription?: string;

  @ApiPropertyOptional({ description: 'Discharge instructions' })
  @IsOptional()
  @IsString()
  dischargeInstructions?: string;

  @ApiPropertyOptional({ description: 'Follow-up date' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
