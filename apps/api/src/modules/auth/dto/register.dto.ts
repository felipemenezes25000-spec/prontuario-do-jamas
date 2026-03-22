import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 12 chars, must include uppercase, lowercase, number, special char)',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{12,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({ description: 'Full name', example: 'Dr. Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'CPF (Brazilian ID)', example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ description: 'User role', example: 'DOCTOR' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Tenant ID (organization)' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}
