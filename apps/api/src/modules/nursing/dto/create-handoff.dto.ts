import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SbarDto {
  @ApiProperty({ description: 'Situation' })
  @IsString()
  s: string;

  @ApiProperty({ description: 'Background' })
  @IsString()
  b: string;

  @ApiProperty({ description: 'Assessment' })
  @IsString()
  a: string;

  @ApiProperty({ description: 'Recommendation' })
  @IsString()
  r: string;
}

export class HandoffPatientDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'SBAR data' })
  @ValidateNested()
  @Type(() => SbarDto)
  sbar: SbarDto;

  @ApiPropertyOptional({ description: 'Nurse notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateHandoffDto {
  @ApiPropertyOptional({ description: 'Sector/ward ID' })
  @IsOptional()
  @IsString()
  sectorId?: string;

  @ApiProperty({ description: 'Nurse handing off' })
  @IsUUID()
  @IsNotEmpty()
  fromNurseId: string;

  @ApiProperty({ description: 'Nurse receiving' })
  @IsUUID()
  @IsNotEmpty()
  toNurseId: string;

  @ApiProperty({ description: 'List of patients with SBAR', type: [HandoffPatientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoffPatientDto)
  patients: HandoffPatientDto[];

  @ApiPropertyOptional({ description: 'Shift (MORNING, AFTERNOON, NIGHT)' })
  @IsOptional()
  @IsString()
  @IsIn(['MORNING', 'AFTERNOON', 'NIGHT'])
  shift?: string;
}
