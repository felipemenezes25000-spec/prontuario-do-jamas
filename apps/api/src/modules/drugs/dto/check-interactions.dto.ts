import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class CheckInteractionsDto {
  @ApiProperty({ description: 'Array of drug IDs to check for interactions', type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  drugIds: string[];
}
