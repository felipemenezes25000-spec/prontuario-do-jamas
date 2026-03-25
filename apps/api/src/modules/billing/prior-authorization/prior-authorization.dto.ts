import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsIn, IsArray } from 'class-validator';

export class CreatePriorAuthDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Insurance provider name' })
  @IsString()
  insuranceProvider!: string;

  @ApiProperty({ description: 'Insurance plan number' })
  @IsString()
  insurancePlanNumber!: string;

  @ApiProperty({ description: 'Procedure or service description' })
  @IsString()
  procedureDescription!: string;

  @ApiPropertyOptional({ description: 'TUSS or CBHPM codes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  procedureCodes?: string[];

  @ApiProperty({ description: 'Clinical justification' })
  @IsString()
  clinicalJustification!: string;

  @ApiPropertyOptional({ description: 'CID-10 code' })
  @IsOptional()
  @IsString()
  cidCode?: string;

  @ApiPropertyOptional({ description: 'Urgency level' })
  @IsOptional()
  @IsIn(['ROUTINE', 'URGENT', 'EMERGENCY'])
  urgency?: string;
}

export class UpdatePriorAuthStatusDto {
  @ApiProperty({ description: 'New status' })
  @IsIn(['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'APPEAL'])
  status!: string;

  @ApiPropertyOptional({ description: 'Authorization number (if approved)' })
  @IsOptional()
  @IsString()
  authorizationNumber?: string;

  @ApiPropertyOptional({ description: 'Notes from reviewer' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Denial reason' })
  @IsOptional()
  @IsString()
  denialReason?: string;
}
