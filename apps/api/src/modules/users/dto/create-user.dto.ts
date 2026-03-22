import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User email', example: 'doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password (min 12 chars, complexity required)', minLength: 12 })
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{12,}$/,
    { message: 'Password does not meet complexity requirements' },
  )
  password: string;

  @ApiProperty({ description: 'Full name', example: 'Dr. Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'CPF', example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ description: 'User role', example: 'DOCTOR' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ description: 'Medical speciality' })
  @IsOptional()
  @IsString()
  speciality?: string;

  @ApiPropertyOptional({ description: 'CRM number (for doctors)' })
  @IsOptional()
  @IsString()
  crm?: string;

  @ApiPropertyOptional({ description: 'COREN number (for nurses)' })
  @IsOptional()
  @IsString()
  coren?: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'User role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Medical speciality' })
  @IsOptional()
  @IsString()
  speciality?: string;

  @ApiPropertyOptional({ description: 'CRM number' })
  @IsOptional()
  @IsString()
  crm?: string;

  @ApiPropertyOptional({ description: 'COREN number' })
  @IsOptional()
  @IsString()
  coren?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 12 chars)', minLength: 12 })
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{12,}$/,
    { message: 'Password does not meet complexity requirements' },
  )
  newPassword: string;
}
