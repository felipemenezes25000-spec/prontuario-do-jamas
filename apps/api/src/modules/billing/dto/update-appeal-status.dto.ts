import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AppealStatus } from '@prisma/client';

export class UpdateAppealStatusDto {
  @ApiProperty({ description: 'New appeal status', enum: AppealStatus })
  @IsEnum(AppealStatus)
  @IsNotEmpty()
  status: AppealStatus;

  @ApiPropertyOptional({ description: 'Resolution text when closing the appeal' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ description: 'Amount recovered (for ACCEPTED or PARTIALLY_ACCEPTED)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  recoveredAmount?: number;
}
