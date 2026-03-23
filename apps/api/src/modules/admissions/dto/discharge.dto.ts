import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { DischargeType } from '@prisma/client';

export class DischargeDto {
  @ApiProperty({ description: 'Discharge type', enum: DischargeType })
  @IsEnum(DischargeType)
  dischargeType: DischargeType;

  @ApiPropertyOptional({ description: 'Discharge condition (e.g. STABLE, UNSTABLE, SEVERE, CRITICAL)' })
  @IsOptional()
  @IsString()
  dischargeCondition?: string;

  @ApiPropertyOptional({ description: 'Diagnosis at discharge' })
  @IsOptional()
  @IsString()
  diagnosisAtDischarge?: string;

  @ApiPropertyOptional({ description: 'Procedure performed' })
  @IsOptional()
  @IsString()
  procedurePerformed?: string;

  @ApiPropertyOptional({ description: 'Discharge notes / summary' })
  @IsOptional()
  @IsString()
  dischargeNotes?: string;

  @ApiPropertyOptional({ description: 'Discharge prescription / medications for home' })
  @IsOptional()
  @IsString()
  dischargePrescription?: string;

  @ApiPropertyOptional({ description: 'Discharge instructions for the patient' })
  @IsOptional()
  @IsString()
  dischargeInstructions?: string;

  @ApiPropertyOptional({ description: 'Activity restrictions' })
  @IsOptional()
  @IsString()
  restrictions?: string;

  @ApiPropertyOptional({ description: 'Alert signs for the patient to return' })
  @IsOptional()
  @IsString()
  alertSigns?: string;

  @ApiPropertyOptional({ description: 'Follow-up date' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'Follow-up specialty' })
  @IsOptional()
  @IsString()
  followUpSpecialty?: string;

  @ApiPropertyOptional({
    description: 'Documents to generate (e.g. SUMMARY, PRESCRIPTION, CERTIFICATE, INSTRUCTIONS)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  generateDocuments?: string[];
}
