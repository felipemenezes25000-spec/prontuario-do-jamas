import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { InventoryStatus } from '@prisma/client';

export class UpdateDrugInventoryDto {
  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity threshold' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: InventoryStatus, description: 'Inventory status' })
  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;
}
