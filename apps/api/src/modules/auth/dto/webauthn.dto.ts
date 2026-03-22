import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class WebAuthnRegisterVerifyDto {
  @ApiProperty({ description: 'Registration credential response from browser' })
  @IsNotEmpty()
  credential: Record<string, unknown>;
}

export class WebAuthnLoginOptionsDto {
  @ApiProperty({ description: 'User email address', example: 'doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class WebAuthnLoginVerifyDto {
  @ApiProperty({ description: 'User email address', example: 'doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Authentication credential response from browser' })
  @IsNotEmpty()
  credential: Record<string, unknown>;
}

export class WebAuthnRemoveCredentialDto {
  @ApiProperty({ description: 'Credential ID to remove' })
  @IsString()
  @IsNotEmpty()
  id: string;
}
