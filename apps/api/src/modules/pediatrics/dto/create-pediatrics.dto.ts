import { IsString, IsUUID, IsOptional, IsObject, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordGrowthDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() headCircumference?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ageInMonths?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordVaccinationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() vaccineName!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() manufacturer?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lot?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() dose?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() site?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() route?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() administeredAt?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() nextDoseDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class RecordDevelopmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ageInMonths?: number;
  @ApiPropertyOptional() @IsObject() @IsOptional() motorMilestones?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() languageMilestones?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() socialMilestones?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() cognitiveMilestones?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() denverResult?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class PediatricDoseQuery {
  @ApiProperty() medication!: string;
  @ApiProperty() weightKg!: number;
  @ApiPropertyOptional() ageInMonths?: number;
}
