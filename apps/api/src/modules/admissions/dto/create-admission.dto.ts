import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { AdmissionType, IsolationType } from '@prisma/client';

export class CreateAdmissionDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Admitting doctor ID' })
  @IsUUID()
  @IsNotEmpty()
  admittingDoctorId: string;

  @ApiPropertyOptional({ description: 'Attending doctor ID' })
  @IsOptional()
  @IsUUID()
  attendingDoctorId?: string;

  @ApiProperty({ description: 'Admission type', enum: AdmissionType })
  @IsEnum(AdmissionType)
  admissionType: AdmissionType;

  @ApiPropertyOptional({ description: 'Bed ID' })
  @IsOptional()
  @IsUUID()
  bedId?: string;

  @ApiPropertyOptional({ description: 'Admission date' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ description: 'Expected discharge date' })
  @IsOptional()
  @IsDateString()
  expectedDischargeDate?: string;

  @ApiPropertyOptional({ description: 'Isolation required' })
  @IsOptional()
  @IsBoolean()
  isolationRequired?: boolean;

  @ApiPropertyOptional({ description: 'Isolation type', enum: IsolationType })
  @IsOptional()
  @IsEnum(IsolationType)
  isolationType?: IsolationType;

  @ApiPropertyOptional({ description: 'AIH number' })
  @IsOptional()
  @IsString()
  aihNumber?: string;

  @ApiPropertyOptional({ description: 'Diagnosis at admission' })
  @IsOptional()
  @IsString()
  diagnosisAtAdmission?: string;
}
