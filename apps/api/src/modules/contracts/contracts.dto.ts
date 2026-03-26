import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum ContractType {
  SUPPLIER = 'SUPPLIER',
  INSURANCE = 'INSURANCE',
  SERVICE = 'SERVICE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
  CANCELLED = 'CANCELLED',
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class CreateContractDto {
  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  type!: ContractType;

  @ApiProperty({ description: 'Counterparty name (supplier, insurer, etc.)' })
  @IsString()
  counterparty!: string;

  @ApiProperty({ description: 'Contract description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO string)' })
  @IsString()
  endDate!: string;

  @ApiProperty({ description: 'Total contract value in BRL' })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ description: 'Whether contract auto-renews' })
  @IsBoolean()
  autoRenew!: boolean;

  @ApiPropertyOptional({ description: 'SLA terms' })
  @IsOptional()
  @IsString()
  slaTerms?: string;

  @ApiProperty({ description: 'Payment terms description' })
  @IsString()
  paymentTerms!: string;
}

export class RenewContractDto {
  @ApiProperty({ description: 'New end date (ISO string)' })
  @IsString()
  newEndDate!: string;

  @ApiPropertyOptional({ description: 'New contract value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  newValue?: number;

  @ApiPropertyOptional({ description: 'Value adjustment percentage' })
  @IsOptional()
  @IsNumber()
  adjustmentPct?: number;
}
