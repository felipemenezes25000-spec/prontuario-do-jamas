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
import { EncounterType, Priority } from '@prisma/client';

export class CreateEncounterDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter type', enum: EncounterType })
  @IsEnum(EncounterType)
  type: EncounterType;

  @ApiPropertyOptional({ description: 'Priority', enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Scheduled date/time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Room' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Is follow-up encounter' })
  @IsOptional()
  @IsBoolean()
  isFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Previous encounter ID for follow-ups' })
  @IsOptional()
  @IsUUID()
  previousEncounterId?: string;

  @ApiPropertyOptional({ description: 'Primary doctor ID' })
  @IsOptional()
  @IsUUID()
  primaryDoctorId?: string;

  @ApiPropertyOptional({ description: 'Primary nurse ID' })
  @IsOptional()
  @IsUUID()
  primaryNurseId?: string;
}
