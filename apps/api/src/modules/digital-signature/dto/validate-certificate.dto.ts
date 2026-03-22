import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * DTO for validating an ICP-Brasil certificate.
 * Used to check certificate expiry, chain, and revocation status.
 */
export class ValidateCertificateDto {
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
}
