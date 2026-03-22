import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
