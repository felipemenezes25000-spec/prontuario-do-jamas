import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class ComprehensiveCheckDto {
  @ApiProperty({ description: 'Array of drug IDs to check', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  drugIds: string[];

  @ApiProperty({ description: 'Patient ID for allergy and Beers checks' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;
}
