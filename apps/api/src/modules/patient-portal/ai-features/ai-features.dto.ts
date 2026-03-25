import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class SendTriageMessageDto {
  @ApiProperty({ description: 'Patient message describing symptoms' })
  @IsString()
  message!: string;
}

export class UpdateGoalProgressDto {
  @ApiProperty({ description: 'Goal UUID' })
  @IsUUID()
  goalId!: string;

  @ApiProperty({ description: 'Progress percentage 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;
}
