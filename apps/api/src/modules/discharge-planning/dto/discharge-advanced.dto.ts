/**
 * discharge-advanced.dto.ts
 *
 * Supplemental DTOs for the advanced discharge-planning features.
 * Core DTOs (DischargeInstructionsDto, DischargePrescriptionDto,
 * SafeDischargeChecklistDto, BedRequestDto, etc.) live in
 * discharge-enhanced.dto.ts and are re-exported here for convenience.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  IsNotEmpty,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Re-exports from discharge-enhanced.dto ──────────────────────────────────

export {
  DischargeLanguage,
  ActivityLevel,
  AlarmSignAction,
  ChecklistCategory,
  ChecklistItemStatus,
  BarrierType,
  BedType,
  BedRequestUrgency,
  BedRequestStatus,
  DischargeMedicationInstructionDto,
  DischargeDietDto,
  DischargeActivityDto,
  DischargeWoundCareDto,
  AlarmSignDto,
  FollowUpDto,
  DischargeSectionsDto,
  DischargeInstructionsDto,
  DischargeMedicationDto,
  DischargePrescriptionDto,
  ChecklistItemDto,
  SafeDischargeChecklistDto,
  UpdateChecklistItemDto,
  DischargeBarrierDto,
  ResolveBarrierDto,
  RoundingDto,
  BedRequestDto,
  UpdateBedRequestStatusDto,
} from './discharge-enhanced.dto';

// ─── Enums (Advanced) ─────────────────────────────────────────────────────────

export enum BarrierToDischargeType {
  AWAITING_EXAM = 'AWAITING_EXAM',
  AWAITING_SPECIALIST = 'AWAITING_SPECIALIST',
  REHAB_BED = 'REHAB_BED',
  SOCIAL_ISSUE = 'SOCIAL_ISSUE',
  INSURANCE_AUTHORIZATION = 'INSURANCE_AUTHORIZATION',
  EQUIPMENT_NOT_READY = 'EQUIPMENT_NOT_READY',
  CAREGIVER_NOT_AVAILABLE = 'CAREGIVER_NOT_AVAILABLE',
  CLINICAL_INSTABILITY = 'CLINICAL_INSTABILITY',
  PATIENT_REFUSAL = 'PATIENT_REFUSAL',
  OTHER = 'OTHER',
}

export enum RegulationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  TRANSFERRED = 'TRANSFERRED',
  CANCELLED = 'CANCELLED',
}

export enum RoundingParticipantRole {
  PHYSICIAN = 'PHYSICIAN',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  NUTRITIONIST = 'NUTRITIONIST',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  SOCIAL_WORKER = 'SOCIAL_WORKER',
  CASE_MANAGER = 'CASE_MANAGER',
  SPEECH_THERAPIST = 'SPEECH_THERAPIST',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  RESIDENT = 'RESIDENT',
}

// ─── Safe Discharge Checklist (named variant for spec) ────────────────────────

export class SafeDischargeChecklistAdvancedDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ description: 'Medication reconciliation completed' })
  @IsBoolean()
  reconciliationDone!: boolean;

  @ApiProperty({ description: 'Discharge instructions given to patient/family' })
  @IsBoolean()
  instructionsGiven!: boolean;

  @ApiProperty({ description: 'Follow-up appointment scheduled' })
  @IsBoolean()
  followUpScheduled!: boolean;

  @ApiProperty({ description: 'Specialist referrals made and documented' })
  @IsBoolean()
  referralsMade!: boolean;

  @ApiProperty({ description: 'Pending exams reviewed and cleared for discharge' })
  @IsBoolean()
  examsReviewed!: boolean;

  @ApiProperty({ description: 'Companion / caregiver present at discharge' })
  @IsBoolean()
  companionPresent!: boolean;

  @ApiPropertyOptional({ description: 'Transportation arranged' })
  @IsOptional()
  @IsBoolean()
  transportationArranged?: boolean;

  @ApiPropertyOptional({ description: 'Home care services arranged' })
  @IsOptional()
  @IsBoolean()
  homeCareArranged?: boolean;

  @ApiPropertyOptional({ description: 'Equipment / devices delivered to home' })
  @IsOptional()
  @IsBoolean()
  equipmentDelivered?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Bed Regulation Center ────────────────────────────────────────────────────

export class BedRegulationDto {
  @ApiProperty({ description: 'Regulation request UUID (generated server-side)' })
  requestId!: string;

  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ description: 'Clinical complexity level (1-5, 5 = most complex)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  complexity!: number;

  @ApiProperty({ description: 'Request urgency description' })
  @IsString()
  @IsNotEmpty()
  urgency!: string;

  @ApiProperty({ description: 'Requesting physician or unit name' })
  @IsString()
  @IsNotEmpty()
  requestedBy!: string;

  @ApiProperty({ enum: RegulationRequestStatus })
  @IsEnum(RegulationRequestStatus)
  status!: RegulationRequestStatus;

  @ApiPropertyOptional({ description: 'Transfer details once approved' })
  @IsOptional()
  @IsString()
  transferDetails?: string;

  @ApiPropertyOptional({ description: 'Municipal/state regulation protocol number' })
  @IsOptional()
  @IsString()
  regulationProtocol?: string;

  @ApiPropertyOptional({ description: 'Destination facility / unit' })
  @IsOptional()
  @IsString()
  destinationFacility?: string;
}

export class CreateBedRegulationDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;

  @ApiProperty({ description: 'Clinical complexity level (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  complexity!: number;

  @ApiProperty({ description: 'Urgency level / justification' })
  @IsString()
  @IsNotEmpty()
  urgency!: string;

  @ApiProperty({ description: 'Requesting physician / unit' })
  @IsString()
  @IsNotEmpty()
  requestedBy!: string;

  @ApiPropertyOptional({ description: 'Destination facility preference' })
  @IsOptional()
  @IsString()
  destinationFacility?: string;

  @ApiPropertyOptional({ description: 'Clinical summary for receiving facility' })
  @IsOptional()
  @IsString()
  clinicalSummary?: string;
}

// ─── Barrier to Discharge (Advanced) ─────────────────────────────────────────

export class BarrierItemDto {
  @ApiProperty({ enum: BarrierToDischargeType })
  @IsEnum(BarrierToDischargeType)
  type!: BarrierToDischargeType;

  @ApiProperty({ description: 'Detailed description of the barrier' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Expected resolution date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  estimatedResolution?: string;

  @ApiPropertyOptional({ description: 'Team responsible for resolving this barrier' })
  @IsOptional()
  @IsString()
  responsibleTeam?: string;

  @ApiPropertyOptional({ description: 'Barrier already resolved' })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ description: 'Resolution date' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}

export class BarrierToDischargeDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;

  @ApiProperty({ type: [BarrierItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BarrierItemDto)
  barriers!: BarrierItemDto[];
}

// ─── Multidisciplinary Rounding (Advanced) ───────────────────────────────────

export class MultidisciplinaryRoundParticipantDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ enum: RoundingParticipantRole }) @IsEnum(RoundingParticipantRole) role!: RoundingParticipantRole;
  @ApiProperty() @IsBoolean() present!: boolean;
}

export class RoundChecklistItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() item!: string;
  @ApiProperty() @IsBoolean() completed!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() completedBy?: string;
}

export class RoundPendingTaskDto {
  @ApiProperty() @IsString() @IsNotEmpty() task!: string;
  @ApiProperty() @IsString() @IsNotEmpty() assignedTo!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiProperty() @IsBoolean() completed!: boolean;
}

export class MultidisciplinaryRoundDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsDateString() date!: string;

  @ApiProperty({ type: [MultidisciplinaryRoundParticipantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MultidisciplinaryRoundParticipantDto)
  participants!: MultidisciplinaryRoundParticipantDto[];

  @ApiProperty({ type: [RoundChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundChecklistItemDto)
  checklist!: RoundChecklistItemDto[];

  @ApiProperty({ type: [RoundPendingTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundPendingTaskDto)
  pendingTasks!: RoundPendingTaskDto[];

  @ApiProperty({ description: 'Goals for the day' })
  @IsArray()
  @IsString({ each: true })
  dayGoals!: string[];

  @ApiPropertyOptional({ description: 'Expected discharge date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dischargeExpected?: string;

  @ApiPropertyOptional({ description: 'Additional clinical notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
