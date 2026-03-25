import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsPositive,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Price Table DTOs ────────────────────────────────────────────────────────

export class PriceItemDto {
  @ApiProperty({ description: 'Procedure/service code (CBHPM, TUSS or internal)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Procedure/service description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Unit price in BRL' })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Category (e.g., Consulta, Exame, Cirurgia)' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class CreatePriceTableDto {
  @ApiProperty({ description: 'Price table name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description or notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price items', type: [PriceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  items: PriceItemDto[];
}

// ─── Budget DTOs ─────────────────────────────────────────────────────────────

export class BudgetItemDto {
  @ApiProperty({ description: 'Procedure/service code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Unit price in BRL' })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateBudgetDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Price table UUID to pre-fill prices' })
  @IsOptional()
  @IsUUID()
  priceTableId?: string;

  @ApiPropertyOptional({ description: 'Budget expiration in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  validDays?: number;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Budget items', type: [BudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}

export enum BudgetStatusEnum {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateBudgetStatusDto {
  @ApiProperty({ enum: BudgetStatusEnum, description: 'New budget status' })
  @IsEnum(BudgetStatusEnum)
  status: BudgetStatusEnum;

  @ApiPropertyOptional({ description: 'Reason for rejection or notes' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Installment Plan DTOs ───────────────────────────────────────────────────

export class CreateInstallmentPlanDto {
  @ApiProperty({ description: 'Budget UUID' })
  @IsUUID()
  budgetId: string;

  @ApiProperty({ description: 'Number of installments', minimum: 1, maximum: 60 })
  @IsNumber()
  @Min(1)
  @Max(60)
  installments: number;

  @ApiPropertyOptional({ description: 'Down payment in BRL', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional({ description: 'Monthly interest rate (%), default 0' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRateMonthly?: number;

  @ApiPropertyOptional({ description: 'First due date (ISO string)' })
  @IsOptional()
  @IsString()
  firstDueDate?: string;
}
