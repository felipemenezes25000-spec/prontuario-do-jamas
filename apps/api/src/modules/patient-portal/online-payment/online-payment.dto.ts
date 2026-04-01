import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, Min, Max, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Billing entry UUID' })
  @IsUUID()
  billingEntryId!: string;

  @ApiProperty({ description: 'Payment method: PIX, CREDIT_CARD, DEBIT_CARD, BOLETO' })
  @IsIn(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO'])
  paymentMethod!: string;

  @ApiPropertyOptional({ description: 'CPF for receipt' })
  @IsOptional()
  @IsString()
  cpf?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Payment UUID' })
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ description: 'Payment status from gateway' })
  @IsIn(['PAID', 'FAILED', 'REFUNDED', 'EXPIRED'])
  status!: 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED';

  @ApiPropertyOptional({ description: 'Gateway transaction ID' })
  @IsOptional()
  @IsString()
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ description: 'ISO datetime of payment' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class GeneratePixDto {
  @ApiProperty({ description: 'Billing entry UUID' })
  @IsUUID()
  billingEntryId!: string;

  @ApiPropertyOptional({ description: 'CPF for PIX receipt' })
  @IsOptional()
  @IsString()
  cpf?: string;
}

export class SetupInstallmentsDto {
  @ApiProperty({ description: 'Number of installments (2-12)' })
  @IsInt()
  @Min(2)
  @Max(12)
  installments!: number;

  @ApiPropertyOptional({ description: 'First installment due date ISO 8601' })
  @IsOptional()
  @IsString()
  firstDueDate?: string;
}
