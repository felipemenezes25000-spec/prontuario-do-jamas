import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

// ─── Discharge Instructions ───────────────────────────────────────────────

export class CreateDischargeInstructionsDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'Medication instructions' })
  @IsArray()
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    specialInstructions?: string;
  }>;

  @ApiProperty({ description: 'Diet instructions' })
  @IsString() @IsNotEmpty()
  dietInstructions: string;

  @ApiProperty({ description: 'Activity restrictions' })
  @IsString() @IsNotEmpty()
  activityRestrictions: string;

  @ApiProperty({ description: 'Warning signs to seek emergency care' })
  @IsArray()
  warningSigns: string[];

  @ApiProperty({ description: 'Follow-up appointments' })
  @IsArray()
  followUpAppointments: Array<{
    specialty: string;
    daysAfterDischarge: number;
    location?: string;
    notes?: string;
  }>;

  @ApiPropertyOptional({ description: 'Wound care instructions' })
  @IsOptional() @IsString()
  woundCareInstructions?: string;

  @ApiPropertyOptional({ description: 'Additional instructions' })
  @IsOptional() @IsString()
  additionalInstructions?: string;
}

// ─── Home Prescription ────────────────────────────────────────────────────

export class CreateHomePrescriptionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'Medications for home use' })
  @IsArray()
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    route: string;
    duration: string;
    continuousUse: boolean;
    specialInstructions?: string;
  }>;

  @ApiPropertyOptional() @IsOptional() @IsString()
  pharmacyNotes?: string;
}

// ─── Safe Discharge Checklist ─────────────────────────────────────────────

export class CreateDischargeChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty() @IsBoolean() medicationReconciliationDone: boolean;
  @ApiProperty() @IsBoolean() dischargeInstructionsGiven: boolean;
  @ApiProperty() @IsBoolean() followUpScheduled: boolean;
  @ApiProperty() @IsBoolean() pendingTestsReviewed: boolean;
  @ApiProperty() @IsBoolean() patientEducationCompleted: boolean;
  @ApiProperty() @IsBoolean() transportArranged: boolean;
  @ApiProperty() @IsBoolean() equipmentArranged: boolean;
  @ApiProperty() @IsBoolean() homeCareReferralDone: boolean;
  @ApiProperty() @IsBoolean() primaryCarePhysicianNotified: boolean;
  @ApiProperty() @IsBoolean() dischargeSummaryCompleted: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  additionalNotes?: string;
}

// ─── Barrier to Discharge ─────────────────────────────────────────────────

export class CreateDischargeBarrierDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: ['PENDING_TEST', 'PENDING_CONSULT', 'SOCIAL_ISSUE', 'INSURANCE', 'FAMILY_READINESS', 'CLINICAL_INSTABILITY', 'MEDICATION', 'EQUIPMENT', 'HOME_CARE', 'OTHER'] })
  @IsString() @IsNotEmpty()
  barrierType: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  description: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  responsiblePerson?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  expectedResolutionDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'IN_PROGRESS', 'RESOLVED'] })
  @IsOptional() @IsString()
  status?: string;
}

export class ResolveDischargeBarrierDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() barrierDocumentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNotes?: string;
}

// ─── Multidisciplinary Rounding ───────────────────────────────────────────

export class CreateMultidisciplinaryRoundDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'Participants in the round' })
  @IsArray()
  participants: Array<{
    name: string;
    role: string;
  }>;

  @ApiProperty({ description: 'Pending tasks' })
  @IsArray()
  pendingTasks: Array<{
    description: string;
    assignedTo: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }>;

  @ApiProperty({ description: 'Daily goals discussed' })
  @IsString() @IsNotEmpty()
  dailyGoals: string;

  @ApiPropertyOptional({ description: 'Estimated discharge date' })
  @IsOptional() @IsDateString()
  estimatedDischargeDate?: string;

  @ApiPropertyOptional({ description: 'Discharge readiness assessment' })
  @IsOptional() @IsString()
  dischargeReadiness?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

// ─── AI Bed Allocation ────────────────────────────────────────────────────

export class BedAllocationSuggestionDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
  @ApiPropertyOptional({ description: 'Required bed type: ICU, SEMI_ICU, WARD, ISOLATION' })
  @IsOptional() @IsString()
  requiredBedType?: string;
}
