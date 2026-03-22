import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class TransferBedDto {
  @ApiProperty({ description: 'Target bed ID' })
  @IsUUID()
  @IsNotEmpty()
  toBedId: string;

  @ApiPropertyOptional({ description: 'Reason for transfer' })
  @IsOptional()
  @IsString()
  reason?: string;
}
