import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateDrugInventoryDto {
  @ApiProperty({ description: 'Drug name' })
  @IsString()
  @IsNotEmpty()
  drugName: string;

  @ApiPropertyOptional({ description: 'Drug ID reference' })
  @IsOptional()
  @IsString()
  drugId?: string;

  @ApiProperty({ description: 'Lot number' })
  @IsString()
  @IsNotEmpty()
  lot: string;

  @ApiProperty({ description: 'Expiration date' })
  @IsDateString()
  expirationDate: string;

  @ApiProperty({ description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Minimum quantity threshold' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @ApiProperty({ description: 'Location (e.g. Farmacia Central, Satelite UTI)' })
  @IsString()
  @IsNotEmpty()
  location: string;
}
