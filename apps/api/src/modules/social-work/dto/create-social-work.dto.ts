import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSocialAssessmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() familyStructure?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() housingConditions?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() economicStatus?: Record<string, unknown>;
  @ApiPropertyOptional() @IsObject() @IsOptional() socialSupport?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() vulnerabilities?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class CreateSocialReferralDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiProperty() @IsString() referralType!: string;
  @ApiProperty() @IsString() referralTo!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() urgency?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
