import { IsString, IsUUID, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ManchesterLevel {
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
}

export enum EmergencyStatus {
  WAITING = 'WAITING',
  IN_TRIAGE = 'IN_TRIAGE',
  IN_TREATMENT = 'IN_TREATMENT',
  OBSERVATION = 'OBSERVATION',
  DISCHARGED = 'DISCHARGED',
  ADMITTED = 'ADMITTED',
  TRANSFERRED = 'TRANSFERRED',
  LEFT_WITHOUT_TREATMENT = 'LEFT_WITHOUT_TREATMENT',
}

export class CreateTriageDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty({ enum: ManchesterLevel }) @IsEnum(ManchesterLevel) manchesterLevel!: ManchesterLevel;
  @ApiProperty() @IsString() chiefComplaint!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() painScale?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() vitalSigns?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() doorTime?: string;
}

export class UpdateEmergencyStatusDto {
  @ApiProperty({ enum: EmergencyStatus }) @IsEnum(EmergencyStatus) status!: EmergencyStatus;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
}

export class ActivateProtocolDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty({ description: 'Protocol type: AVC, IAM, SEPSIS, TRAUMA' })
  @IsString() protocolType!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() protocolData?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
