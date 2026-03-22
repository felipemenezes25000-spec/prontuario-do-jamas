import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Protocol ID' })
  @IsUUID()
  @IsNotEmpty()
  protocolId: string;

  @ApiProperty({ description: 'Cycle number' })
  @IsInt()
  @Min(1)
  cycleNumber: number;

  @ApiProperty({ description: 'Scheduled date (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({ description: 'Patient weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;

  @ApiPropertyOptional({ description: 'Patient height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: 'Nurse notes' })
  @IsOptional()
  @IsString()
  nurseNotes?: string;

  @ApiPropertyOptional({ description: 'Doctor notes' })
  @IsOptional()
  @IsString()
  doctorNotes?: string;
}
