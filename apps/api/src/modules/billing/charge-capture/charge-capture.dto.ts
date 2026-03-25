import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateChargeCaptureDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Manual charge items', type: [Object] })
  @IsOptional()
  @IsArray()
  items?: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    codingSystem?: string;
  }>;

  @ApiPropertyOptional({ description: 'Auto-capture from documentation' })
  @IsOptional()
  autoCapture?: boolean;
}

export class UpdateChargeDto {
  @ApiPropertyOptional({ description: 'Updated charge items', type: [Object] })
  @IsOptional()
  @IsArray()
  items?: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Status: CAPTURED, REVIEWED, BILLED, VOIDED' })
  @IsOptional()
  @IsString()
  status?: string;
}
