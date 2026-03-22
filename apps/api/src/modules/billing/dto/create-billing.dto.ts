import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { GuideType } from '@prisma/client';

export class CreateBillingDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Insurance provider' })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional({ description: 'Plan type' })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({ description: 'Guide number' })
  @IsOptional()
  @IsString()
  guideNumber?: string;

  @ApiPropertyOptional({ description: 'Guide type', enum: GuideType })
  @IsOptional()
  @IsEnum(GuideType)
  guideType?: GuideType;

  @ApiPropertyOptional({ description: 'Billing items' })
  @IsOptional()
  items?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Total amount' })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;
}
