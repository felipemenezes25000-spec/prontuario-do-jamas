import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { PrescriptionStatus } from '@prisma/client';

export class UpdatePrescriptionDto {
  @ApiPropertyOptional({ description: 'Status', enum: PrescriptionStatus })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Is one-time' })
  @IsOptional()
  @IsBoolean()
  isOneTime?: boolean;

  @ApiPropertyOptional({ description: 'Is continuous' })
  @IsOptional()
  @IsBoolean()
  isContinuous?: boolean;

  @ApiPropertyOptional({ description: 'Is PRN' })
  @IsOptional()
  @IsBoolean()
  isPRN?: boolean;
}
