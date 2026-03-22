import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateAppealDto {
  @ApiProperty({ description: 'Billing entry ID' })
  @IsUUID()
  @IsNotEmpty()
  billingEntryId: string;

  @ApiProperty({ description: 'Codes of items that were denied (glosed)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  glosedItemCodes: string[];

  @ApiProperty({ description: 'Total amount denied by the insurance' })
  @IsNumber()
  @Min(0)
  glosedAmount: number;

  @ApiProperty({ description: 'Amount being appealed for recovery' })
  @IsNumber()
  @Min(0)
  appealedAmount: number;

  @ApiProperty({ description: 'Written justification for the appeal' })
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({ description: 'URLs or references to supporting documents', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingDocs?: string[];
}
