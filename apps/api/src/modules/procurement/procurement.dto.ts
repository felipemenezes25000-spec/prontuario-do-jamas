import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum RequisitionUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  PENDING_QUOTATION = 'PENDING_QUOTATION',
  QUOTING = 'QUOTING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// ─── Nested Items ───────────────────────────────────────────────────────────

export class RequisitionItemDto {
  @ApiProperty()
  @IsString()
  itemName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsString()
  specification!: string;

  @ApiProperty({ enum: RequisitionUrgency })
  @IsEnum(RequisitionUrgency)
  urgency!: RequisitionUrgency;
}

export class QuotationItemDto {
  @ApiProperty()
  @IsString()
  itemName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalPrice!: number;
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class CreateRequisitionDto {
  @ApiProperty({ type: [RequisitionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items!: RequisitionItemDto[];

  @ApiProperty()
  @IsString()
  requestedBy!: string;

  @ApiProperty()
  @IsString()
  department!: string;

  @ApiProperty()
  @IsString()
  justification!: string;
}

export class CreateQuotationDto {
  @ApiProperty({ description: 'Requisition UUID' })
  @IsUUID()
  requisitionId!: string;

  @ApiProperty()
  @IsString()
  supplierName!: string;

  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  deliveryDays!: number;

  @ApiProperty()
  @IsString()
  paymentTerms!: string;

  @ApiProperty({ description: 'Validity date (ISO string)' })
  @IsString()
  validUntil!: string;
}

export class ApproveQuotationDto {
  @ApiProperty({ description: 'Quotation UUID to approve' })
  @IsUUID()
  quotationId!: string;

  @ApiProperty()
  @IsString()
  approvedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Approved quotation UUID' })
  @IsUUID()
  quotationId!: string;
}

export class RecordDeliveryDto {
  @ApiProperty({ description: 'Purchase order UUID' })
  @IsUUID()
  purchaseOrderId!: string;

  @ApiProperty()
  @IsString()
  receivedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
