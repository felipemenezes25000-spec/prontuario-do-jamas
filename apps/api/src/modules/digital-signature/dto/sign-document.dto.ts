import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { SignatureStandard } from '@prisma/client';

/**
 * DTO for signing a clinical document with an ICP-Brasil certificate.
 * Compliant with CFM Resolution 2.299/2021.
 */
export class SignDocumentDto {
  @ApiProperty({
    description: 'Base64-encoded PFX/P12 certificate file (ICP-Brasil A1/A3)',
    example: 'MIIKYQIBAzCCCicGCSqGSIb3DQEHAaCCChgEggoU...',
  })
  @IsString()
  @IsNotEmpty()
  certificateBase64: string;

  @ApiPropertyOptional({
    description: 'Password to unlock the PFX/P12 certificate',
  })
  @IsOptional()
  @IsString()
  certificatePassword?: string;

  @ApiProperty({
    description: 'Signature standard to use (CAdES-BES, CAdES-T, PAdES-B, XAdES-BES)',
    enum: SignatureStandard,
    example: 'CADES_BES',
  })
  @IsEnum(SignatureStandard)
  signatureStandard: SignatureStandard;
}
