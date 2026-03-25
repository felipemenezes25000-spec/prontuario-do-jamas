import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export enum RadiologyPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
  ASAP = 'ASAP',
}

export enum RadiologyOrderStatus {
  ORDERED = 'ORDERED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DICTATED = 'DICTATED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

export enum Modality {
  CR = 'CR',
  CT = 'CT',
  MR = 'MR',
  US = 'US',
  NM = 'NM',
  PT = 'PT',
  XA = 'XA',
  MG = 'MG',
  DX = 'DX',
  RF = 'RF',
  OT = 'OT',
}

export enum FollowUpPriority {
  ROUTINE = 'ROUTINE',
  SOON = 'SOON',
  URGENT = 'URGENT',
}

export class CreateRadiologyOrderDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Procedure name' })
  @IsString()
  @IsNotEmpty()
  procedureName: string;

  @ApiPropertyOptional({ description: 'Procedure code' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiProperty({ description: 'Modality', enum: Modality })
  @IsEnum(Modality)
  modality: Modality;

  @ApiPropertyOptional({ description: 'Priority', enum: RadiologyPriority })
  @IsOptional()
  @IsEnum(RadiologyPriority)
  priority?: RadiologyPriority;

  @ApiPropertyOptional({ description: 'Clinical indication' })
  @IsOptional()
  @IsString()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Body part' })
  @IsOptional()
  @IsString()
  bodyPart?: string;

  @ApiPropertyOptional({ description: 'Laterality' })
  @IsOptional()
  @IsString()
  laterality?: string;

  @ApiPropertyOptional({ description: 'Contrast required' })
  @IsOptional()
  @IsBoolean()
  contrastRequired?: boolean;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Scheduled date/time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class CreateRadiologyReportDto {
  @ApiProperty({ description: 'Order/Exam ID' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Findings section' })
  @IsString()
  @IsNotEmpty()
  findings: string;

  @ApiProperty({ description: 'Impression/Conclusion' })
  @IsString()
  @IsNotEmpty()
  impression: string;

  @ApiPropertyOptional({ description: 'Technique description' })
  @IsOptional()
  @IsString()
  technique?: string;

  @ApiPropertyOptional({ description: 'Comparison studies' })
  @IsOptional()
  @IsString()
  comparison?: string;

  @ApiPropertyOptional({ description: 'Template ID used' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Structured measurements (JSON)' })
  @IsOptional()
  measurements?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Incidental findings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incidentalFindings?: string[];

  @ApiPropertyOptional({ description: 'BI-RADS, TI-RADS, LI-RADS etc. category' })
  @IsOptional()
  @IsString()
  classificationCategory?: string;
}

export class IncidentalFindingFollowUpDto {
  @ApiProperty({ description: 'Finding description' })
  @IsString()
  @IsNotEmpty()
  findingDescription: string;

  @ApiProperty({ description: 'Recommended follow-up action' })
  @IsString()
  @IsNotEmpty()
  recommendedAction: string;

  @ApiPropertyOptional({ description: 'Follow-up priority', enum: FollowUpPriority })
  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;

  @ApiPropertyOptional({ description: 'Follow-up due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Assigned physician ID' })
  @IsOptional()
  @IsUUID()
  assignedPhysicianId?: string;
}
