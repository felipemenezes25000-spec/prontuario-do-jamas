import { IsString, IsUUID, IsOptional, IsObject, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrenatalCardDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() lmp?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() edd?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() gravida?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() para?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() abortions?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() bloodType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() riskClassification?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() riskFactors?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() labResults?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordPartogramDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cervicalDilation?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() fetalStation?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() contractionFrequency?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() contractionDuration?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() fetalHeartRate?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() amnioticFluid?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() maternalVitals?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordUltrasoundDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() gestationalAge?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() estimatedFetalWeight?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() presentation?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() placentaLocation?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() amnioticFluidIndex?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() biometry?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() doppler?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
