import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: '6-digit TOTP code to confirm MFA disable', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;
}

export class MfaBackupDto {
  @ApiProperty({ description: '8-character alphanumeric backup code', example: 'A1B2C3D4' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 8, { message: 'Backup code must be exactly 8 characters' })
  backupCode: string;
}
