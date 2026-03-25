import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ReconciliationType {
  ADMISSION = 'ADMISSION',
  TRANSFER = 'TRANSFER',
  DISCHARGE = 'DISCHARGE',
}

export enum DiscrepancyDecision {
  CONTINUE = 'CONTINUE',
  DISCONTINUE = 'DISCONTINUE',
  MODIFY = 'MODIFY',
  ADD = 'ADD',
  SUBSTITUTE = 'SUBSTITUTE',
  HOLD = 'HOLD',
}

export class StartReconciliationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ enum: ReconciliationType })
  @IsEnum(ReconciliationType)
  type: ReconciliationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class AddHomeMedicationDto {
  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiPropertyOptional({ description: 'Dose' })
  @IsOptional()
  @IsString()
  dose?: string;

  @ApiPropertyOptional({ description: 'Route' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'Frequency' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ description: 'Source of information' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Patient taking regularly' })
  @IsOptional()
  adherence?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompareDto {
  // Trigger comparison — no additional body needed
}

export class RecordDecisionDto {
  @ApiProperty({ description: 'Home medication name' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ enum: DiscrepancyDecision })
  @IsEnum(DiscrepancyDecision)
  decision: DiscrepancyDecision;

  @ApiPropertyOptional({ description: 'Clinical justification' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ description: 'New dose if modifying' })
  @IsOptional()
  @IsString()
  newDose?: string;

  @ApiPropertyOptional({ description: 'New route if modifying' })
  @IsOptional()
  @IsString()
  newRoute?: string;

  @ApiPropertyOptional({ description: 'New frequency if modifying' })
  @IsOptional()
  @IsString()
  newFrequency?: string;
}
