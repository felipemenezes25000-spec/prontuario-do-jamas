import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
} from 'class-validator';
import { Laterality, AnesthesiaType } from '@prisma/client';

export class CreateSurgicalProcedureDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Surgeon ID' })
  @IsUUID()
  @IsNotEmpty()
  surgeonId: string;

  @ApiPropertyOptional({ description: 'First assistant ID' })
  @IsOptional()
  @IsUUID()
  firstAssistantId?: string;

  @ApiPropertyOptional({ description: 'Anesthesiologist ID' })
  @IsOptional()
  @IsUUID()
  anesthesiologistId?: string;

  @ApiPropertyOptional({ description: 'Scrub nurse ID' })
  @IsOptional()
  @IsUUID()
  scrubNurseId?: string;

  @ApiPropertyOptional({ description: 'Circulating nurse ID' })
  @IsOptional()
  @IsUUID()
  circulatingNurseId?: string;

  @ApiProperty({ description: 'Procedure name' })
  @IsString()
  @IsNotEmpty()
  procedureName: string;

  @ApiPropertyOptional({ description: 'Procedure code' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ description: 'Laterality', enum: Laterality })
  @IsOptional()
  @IsEnum(Laterality)
  laterality?: Laterality;

  @ApiPropertyOptional({ description: 'Anesthesia type', enum: AnesthesiaType })
  @IsOptional()
  @IsEnum(AnesthesiaType)
  anesthesiaType?: AnesthesiaType;

  @ApiPropertyOptional({ description: 'Scheduled date/time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
