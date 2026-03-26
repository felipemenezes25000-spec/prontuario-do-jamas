import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum WasteGroup {
  A1 = 'A1',
  A2 = 'A2',
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum DisposalMethod {
  INCINERATION = 'INCINERATION',
  AUTOCLAVE = 'AUTOCLAVE',
  MICROWAVE = 'MICROWAVE',
  LANDFILL = 'LANDFILL',
  CHEMICAL = 'CHEMICAL',
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class RegisterWasteDto {
  @ApiProperty({ enum: WasteGroup, description: 'Waste group per RDC 222/2018' })
  @IsEnum(WasteGroup)
  wasteGroup!: WasteGroup;

  @ApiProperty({ description: 'Source ward/department' })
  @IsString()
  source!: string;

  @ApiProperty({ description: 'Weight in kilograms' })
  @IsNumber()
  @Min(0.01)
  weight!: number;

  @ApiPropertyOptional({ description: 'Container identifier' })
  @IsOptional()
  @IsString()
  containerId?: string;

  @ApiProperty({ description: 'Description of the waste' })
  @IsString()
  description!: string;
}

export class WeighingRecordDto {
  @ApiProperty({ description: 'Container identifier' })
  @IsString()
  containerId!: string;

  @ApiProperty({ description: 'Gross weight in kg' })
  @IsNumber()
  @Min(0)
  grossWeight!: number;

  @ApiProperty({ description: 'Net weight in kg' })
  @IsNumber()
  @Min(0)
  netWeight!: number;

  @ApiProperty({ description: 'Person who performed the weighing' })
  @IsString()
  weighedBy!: string;
}

export class DisposalRecordDto {
  @ApiProperty({ description: 'Manifest document ID' })
  @IsString()
  manifestId!: string;

  @ApiProperty({ description: 'Transport company name' })
  @IsString()
  transportCompany!: string;

  @ApiProperty({ description: 'Driver full name' })
  @IsString()
  driverName!: string;

  @ApiProperty({ description: 'Vehicle license plate' })
  @IsString()
  vehiclePlate!: string;

  @ApiProperty({ enum: DisposalMethod, description: 'Disposal method' })
  @IsEnum(DisposalMethod)
  disposalMethod!: DisposalMethod;

  @ApiPropertyOptional({ description: 'Disposal certificate number' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;
}
