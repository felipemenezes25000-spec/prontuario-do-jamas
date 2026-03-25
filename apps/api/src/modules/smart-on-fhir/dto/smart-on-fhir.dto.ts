import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
} from 'class-validator';

export class RegisterSmartAppDto {
  @ApiProperty({ description: 'App name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Client secret (for confidential apps)' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiProperty({ description: 'Redirect URIs' })
  @IsArray()
  @IsString({ each: true })
  redirectUris: string[];

  @ApiProperty({ description: 'Launch URL' })
  @IsString()
  @IsNotEmpty()
  launchUrl: string;

  @ApiProperty({ description: 'Required SMART scopes' })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @ApiPropertyOptional({ description: 'App description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'App logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'App vendor' })
  @IsOptional()
  @IsString()
  vendor?: string;
}

export class SmartLaunchDto {
  @ApiProperty({ description: 'SMART app ID' })
  @IsUUID()
  @IsNotEmpty()
  appId: string;

  @ApiPropertyOptional({ description: 'Patient ID (for patient context)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID (for encounter context)' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}
