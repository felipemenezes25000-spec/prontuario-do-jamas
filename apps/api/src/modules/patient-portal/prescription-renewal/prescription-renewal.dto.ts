import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class RequestRenewalDto {
  @ApiProperty({ description: 'Prescription UUID to renew' })
  @IsUUID()
  prescriptionId!: string;

  @ApiPropertyOptional({ description: 'Patient justification' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ description: 'Preferred pharmacy' })
  @IsOptional()
  @IsString()
  preferredPharmacy?: string;
}

export class UpdateRenewalDto {
  @ApiProperty({ description: 'Decision: APPROVED or DENIED' })
  @IsIn(['APPROVED', 'DENIED'])
  decision!: string;

  @ApiPropertyOptional({ description: 'Doctor notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'New validity period in days' })
  @IsOptional()
  validityDays?: number;
}
