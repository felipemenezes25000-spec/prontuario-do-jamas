import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateDispensationDto {
  @ApiProperty({ description: 'Prescription item ID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionItemId: string;

  @ApiProperty({ description: 'Quantity dispensed' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}
