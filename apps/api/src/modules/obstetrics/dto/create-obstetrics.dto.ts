import { IsString, IsUUID, IsOptional, IsObject, IsNumber, IsDateString, Min } from 'class-validator';
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
  @ApiPropertyOptional({ description: 'Number of cesarean sections' }) @IsNumber() @IsOptional() cesareanCount?: number;
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

export class CreateObstetricHistoryDto {
  @ApiProperty({ description: 'Patient UUID' }) @IsUUID() patientId!: string;
  @ApiProperty({ description: 'Total pregnancies (gravida / G)' }) @IsNumber() @Min(0) gravida!: number;
  @ApiProperty({ description: 'Total deliveries (para / P)' }) @IsNumber() @Min(0) para!: number;
  @ApiProperty({ description: 'Number of abortions (A)' }) @IsNumber() @Min(0) abortions!: number;
  @ApiProperty({ description: 'Number of cesarean sections (C)' }) @IsNumber() @Min(0) cesareans!: number;
  @ApiProperty({ description: 'Number of living children' }) @IsNumber() @Min(0) livingChildren!: number;
  @ApiPropertyOptional({ description: 'Last menstrual period (ISO date)' }) @IsDateString() @IsOptional() lastMenstrualPeriod?: string;
  @ApiPropertyOptional({ description: 'Additional clinical notes' }) @IsString() @IsOptional() notes?: string;
}
