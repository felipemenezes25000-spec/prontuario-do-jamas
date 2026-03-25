import { IsString, IsUUID, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNicuAdmissionDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() gestationalAge?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() birthWeight?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() apgar1?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() apgar5?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() apgar10?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() capurroScore?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() deliveryType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() resuscitationMeasures?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() maternalHistory?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() admissionReason?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordNeonatalWeightDto {
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsNumber() weight!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordPhototherapyDto {
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() bilirubinLevel?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() phototherapyType?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() irradiance?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() startTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
