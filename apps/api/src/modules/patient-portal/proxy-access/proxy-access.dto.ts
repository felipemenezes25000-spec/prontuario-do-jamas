import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class GrantProxyDto {
  @ApiProperty({ description: 'Patient UUID being proxied (e.g. child)' })
  @IsUUID()
  proxiedPatientId!: string;

  @ApiProperty({ description: 'Relationship (PARENT, CAREGIVER, LEGAL_GUARDIAN, SPOUSE)' })
  @IsIn(['PARENT', 'CAREGIVER', 'LEGAL_GUARDIAN', 'SPOUSE'])
  relationship!: string;

  @ApiPropertyOptional({ description: 'Legal document reference' })
  @IsOptional()
  @IsString()
  legalDocumentRef?: string;

  @ApiPropertyOptional({ description: 'Expiry date ISO 8601' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
