import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateFluidBalanceDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Recorded at' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Period' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: 'Oral intake (mL)' })
  @IsOptional()
  @IsNumber()
  intakeOral?: number;

  @ApiPropertyOptional({ description: 'IV intake (mL)' })
  @IsOptional()
  @IsNumber()
  intakeIV?: number;

  @ApiPropertyOptional({ description: 'Other intake (mL)' })
  @IsOptional()
  @IsNumber()
  intakeOther?: number;

  @ApiPropertyOptional({ description: 'Urine output (mL)' })
  @IsOptional()
  @IsNumber()
  outputUrine?: number;

  @ApiPropertyOptional({ description: 'Drain output (mL)' })
  @IsOptional()
  @IsNumber()
  outputDrain?: number;

  @ApiPropertyOptional({ description: 'Emesis output (mL)' })
  @IsOptional()
  @IsNumber()
  outputEmesis?: number;

  @ApiPropertyOptional({ description: 'Stool output (mL)' })
  @IsOptional()
  @IsNumber()
  outputStool?: number;

  @ApiPropertyOptional({ description: 'Other output (mL)' })
  @IsOptional()
  @IsNumber()
  outputOther?: number;
}
