import { IsString, IsUUID, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHomeVisitDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsDateString() scheduledDate!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() visitType?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() objectives?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() procedures?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() vitalSigns?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() evolution?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class UpdateHomeVisitDto {
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() procedures?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() vitalSigns?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() evolution?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
