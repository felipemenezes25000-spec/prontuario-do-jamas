import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ReverseDischargeDto {
  @ApiProperty({ description: 'Reason for reversing the discharge' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Reason must be at least 10 characters long',
  })
  reason: string;
}
