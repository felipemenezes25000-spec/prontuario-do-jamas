import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SSOTokenExchangeDto {
  @ApiProperty({ description: 'OAuth provider name (google, microsoft)' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ description: 'SSO exchange token from callback' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class SSODetectDto {
  @ApiProperty({ description: 'Email to check for SSO configuration' })
  @IsEmail()
  email!: string;
}

export class SSOConfigureDto {
  @ApiProperty({ description: 'Enable or disable SSO' })
  @IsBoolean()
  ssoEnabled!: boolean;

  @ApiPropertyOptional({ description: 'SSO provider: google, microsoft, saml, oidc' })
  @IsOptional()
  @IsString()
  ssoProvider?: string;

  @ApiPropertyOptional({ description: 'Provider-specific configuration (clientId, tenantId, etc.)' })
  @IsOptional()
  @IsObject()
  ssoConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Email domain for auto-detection (e.g. hospital.com.br)' })
  @IsOptional()
  @IsString()
  ssoDomain?: string;

  @ApiPropertyOptional({ description: 'Auto-create users on first SSO login' })
  @IsOptional()
  @IsBoolean()
  ssoAutoProvision?: boolean;
}
