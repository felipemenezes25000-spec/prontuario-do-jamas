import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, IsEnum, IsDateString, IsArray } from 'class-validator';

export enum SupplyCategory {
  MEDICATION = 'MEDICATION',
  MATERIAL = 'MATERIAL',
  EQUIPMENT = 'EQUIPMENT',
  REAGENT = 'REAGENT',
  IMPLANT = 'IMPLANT',
}

export enum AbcCurve {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT_TO_SUPPLIER = 'SENT_TO_SUPPLIER',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
}

// ─── Supply Items ────────────────────────────────────────────────────────

export class CreateSupplyItemDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty({ enum: SupplyCategory }) @IsEnum(SupplyCategory) category!: SupplyCategory;
  @ApiProperty() @IsNumber() currentStock!: number;
  @ApiProperty() @IsNumber() reorderPoint!: number;
  @ApiProperty() @IsNumber() maxStock!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() lot?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() expiryDate?: string;
  @ApiProperty() @IsNumber() unitCost!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() supplier?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
}

// ─── Purchase Orders ─────────────────────────────────────────────────────

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() supplierId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiProperty({ type: [Object] }) @IsArray() items!: Array<{
    supplyItemId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export class ApprovePurchaseOrderDto {
  @ApiProperty() @IsUUID() orderId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() approvalNotes?: string;
}

// ─── Contracts ───────────────────────────────────────────────────────────

export class CreateContractDto {
  @ApiProperty() @IsString() counterpartyName!: string;
  @ApiProperty() @IsString() counterpartyType!: string;
  @ApiProperty() @IsString() contractNumber!: string;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() totalValue?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() readjustmentIndex?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() slaDescription?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() alertDaysBefore?: number;
}
