import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export enum TransactionType {
  DISPENSE = 'DISPENSE',
  RETURN = 'RETURN',
  RESTOCK = 'RESTOCK',
  WASTE = 'WASTE',
  OVERRIDE = 'OVERRIDE',
}

export class DispenseDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ description: 'Prescription item ID' })
  @IsOptional()
  @IsUUID()
  prescriptionItemId?: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ description: 'Quantity dispensed' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Cabinet/drawer ID' })
  @IsOptional()
  @IsString()
  cabinetId?: string;

  @ApiPropertyOptional({ description: 'Drawer/pocket ID' })
  @IsOptional()
  @IsString()
  drawerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class RestockRequestDto {
  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ description: 'Quantity to restock' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Cabinet ID' })
  @IsOptional()
  @IsString()
  cabinetId?: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
