import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ManchesterLevel } from './create-triage.dto';

// ─── Risk Reclassification ───────────────────────────────────────────────────

export class ReclassifyRiskDto {
  @ApiProperty({ description: 'Author (nurse/doctor) ID' })
  @IsUUID()
  authorId: string;

  @ApiProperty({ description: 'New Manchester level', enum: ManchesterLevel })
  @IsEnum(ManchesterLevel)
  newManchesterLevel: ManchesterLevel;

  @ApiPropertyOptional({ description: 'Updated chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Updated pain scale (0-10)' })
  @IsOptional()
  @IsString()
  painScale?: string;

  @ApiProperty({ description: 'Clinical justification for reclassification' })
  @IsString()
  justification: string;
}

// ─── NEDOCS ──────────────────────────────────────────────────────────────────

export class CalculateNedocsDto {
  @ApiProperty({ description: 'Total ED beds (physical capacity)' })
  @IsNumber()
  @Min(1)
  totalEdBeds: number;

  @ApiProperty({ description: 'Total ED patients currently present' })
  @IsNumber()
  @Min(0)
  totalEdPatients: number;

  @ApiProperty({ description: 'Patients on ventilators (intubated)' })
  @IsNumber()
  @Min(0)
  ventilatorsInUse: number;

  @ApiProperty({ description: 'Patients admitted waiting for inpatient beds' })
  @IsNumber()
  @Min(0)
  admittedWaitingBed: number;

  @ApiProperty({ description: 'Longest waiting patient time in hours' })
  @IsNumber()
  @Min(0)
  longestWaitHours: number;

  @ApiProperty({ description: 'Total hospital beds' })
  @IsNumber()
  @Min(1)
  totalHospitalBeds: number;

  @ApiProperty({ description: 'Total hospital admissions in last hour' })
  @IsNumber()
  @Min(0)
  admissionsLastHour: number;
}
