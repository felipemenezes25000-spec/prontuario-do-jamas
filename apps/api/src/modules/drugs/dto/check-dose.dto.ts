import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CheckDoseDto {
  @ApiProperty({ description: 'Drug ID' })
  @IsUUID()
  @IsNotEmpty()
  drugId: string;

  @ApiProperty({ description: 'Dose amount' })
  @IsNumber()
  @Min(0)
  dose: number;

  @ApiProperty({ description: 'Dose unit (mg, mL, UI, etc.)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Frequency (e.g., "8/8h", "12/12h", "24/24h")' })
  @IsString()
  @IsNotEmpty()
  frequency: string;

  @ApiPropertyOptional({ description: 'Patient weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientWeight?: number;

  @ApiPropertyOptional({ description: 'Patient age in years' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientAge?: number;
}
