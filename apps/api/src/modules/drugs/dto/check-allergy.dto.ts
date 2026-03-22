import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CheckAllergyDto {
  @ApiProperty({ description: 'Drug ID to check' })
  @IsUUID()
  @IsNotEmpty()
  drugId: string;

  @ApiProperty({ description: 'Patient ID to check allergies for' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;
}
