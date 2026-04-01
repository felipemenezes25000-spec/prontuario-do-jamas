import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum DischargeLanguage {
  PT_BR = 'pt-BR',
  EN = 'en',
  ES = 'es',
}

export enum ActivityLevel {
  BED_REST = 'BED_REST',
  LIMITED = 'LIMITED',
  MODERATE = 'MODERATE',
  NORMAL = 'NORMAL',
}

export enum AlarmSignAction {
  CALL_DOCTOR = 'CALL_DOCTOR',
  GO_TO_ER = 'GO_TO_ER',
  CALL_911 = 'CALL_911',
}

export enum ChecklistCategory {
  RECONCILIATION = 'RECONCILIATION',
  INSTRUCTIONS = 'INSTRUCTIONS',
  FOLLOW_UP = 'FOLLOW_UP',
  EDUCATION = 'EDUCATION',
  SOCIAL = 'SOCIAL',
  TRANSPORT = 'TRANSPORT',
  EQUIPMENT = 'EQUIPMENT',
}

export enum ChecklistItemStatus {
  DONE = 'DONE',
  PENDING = 'PENDING',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum BarrierType {
  CLINICAL = 'CLINICAL',
  LAB_PENDING = 'LAB_PENDING',
  IMAGING_PENDING = 'IMAGING_PENDING',
  SOCIAL = 'SOCIAL',
  INSURANCE = 'INSURANCE',
  EQUIPMENT = 'EQUIPMENT',
  REHAB_BED = 'REHAB_BED',
  HOME_CARE_SETUP = 'HOME_CARE_SETUP',
  FAMILY = 'FAMILY',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export enum BedType {
  WARD = 'WARD',
  ICU = 'ICU',
  SEMI_INTENSIVE = 'SEMI_INTENSIVE',
  ISOLATION = 'ISOLATION',
  PEDIATRIC = 'PEDIATRIC',
  OBSTETRIC = 'OBSTETRIC',
  PSYCHIATRIC = 'PSYCHIATRIC',
}

export enum BedRequestUrgency {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum BedRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  ALLOCATED = 'ALLOCATED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// Discharge Instructions (Section 1)
// ============================================================================

export class DischargeMedicationInstructionDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() dose!: string;
  @ApiProperty() @IsString() @IsNotEmpty() frequency!: string;
  @ApiProperty() @IsString() @IsNotEmpty() duration!: string;
  @ApiProperty() @IsString() @IsNotEmpty() instructions!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warnings?: string;
}

export class DischargeDietDto {
  @ApiProperty() @IsString() @IsNotEmpty() type!: string;
  @ApiProperty() @IsArray() @IsString({ each: true }) restrictions!: string[];
  @ApiProperty() @IsArray() @IsString({ each: true }) recommendations!: string[];
}

export class DischargeActivityDto {
  @ApiProperty({ enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  level!: ActivityLevel;

  @ApiProperty() @IsArray() @IsString({ each: true }) restrictions!: string[];
  @ApiProperty() @IsString() @IsNotEmpty() progressionPlan!: string;
}

export class DischargeWoundCareDto {
  @ApiProperty() @IsString() @IsNotEmpty() instructions!: string;
  @ApiProperty() @IsString() @IsNotEmpty() dressings!: string;
  @ApiProperty() @IsString() @IsNotEmpty() changeFrequency!: string;
}

export class AlarmSignDto {
  @ApiProperty() @IsString() @IsNotEmpty() sign!: string;
  @ApiProperty({ enum: AlarmSignAction })
  @IsEnum(AlarmSignAction)
  action!: AlarmSignAction;
}

export class FollowUpDto {
  @ApiProperty() @IsString() @IsNotEmpty() specialty!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() provider?: string;
  @ApiProperty() @IsString() @IsNotEmpty() timeframe!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class DischargeSectionsDto {
  @ApiProperty({ type: [DischargeMedicationInstructionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DischargeMedicationInstructionDto)
  medications!: DischargeMedicationInstructionDto[];

  @ApiProperty({ type: DischargeDietDto })
  @ValidateNested()
  @Type(() => DischargeDietDto)
  diet!: DischargeDietDto;

  @ApiProperty({ type: DischargeActivityDto })
  @ValidateNested()
  @Type(() => DischargeActivityDto)
  activity!: DischargeActivityDto;

  @ApiPropertyOptional({ type: DischargeWoundCareDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DischargeWoundCareDto)
  woundCare?: DischargeWoundCareDto;

  @ApiProperty({ type: [AlarmSignDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlarmSignDto)
  alarmSigns!: AlarmSignDto[];

  @ApiProperty({ type: [FollowUpDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FollowUpDto)
  followUp!: FollowUpDto[];

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  restrictions?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  additionalInstructions?: string;
}

export class DischargeInstructionsDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ enum: DischargeLanguage })
  @IsEnum(DischargeLanguage)
  language!: DischargeLanguage;

  @ApiProperty({ type: DischargeSectionsDto })
  @ValidateNested()
  @Type(() => DischargeSectionsDto)
  sections!: DischargeSectionsDto;
}

// ============================================================================
// Discharge Prescription / Home Medications (Section 2)
// ============================================================================

export class DischargeMedicationDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() dose!: string;
  @ApiProperty() @IsString() @IsNotEmpty() frequency!: string;
  @ApiProperty() @IsString() @IsNotEmpty() route!: string;
  @ApiProperty() @IsString() @IsNotEmpty() duration!: string;
  @ApiProperty() @IsInt() @Min(0) quantityDispensed!: number;
  @ApiProperty() @IsInt() @Min(0) refills!: number;
  @ApiProperty() @IsBoolean() isNew!: boolean;
  @ApiProperty() @IsBoolean() wasContinuedFromHome!: boolean;
  @ApiProperty() @IsBoolean() wasModified!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}

export class DischargePrescriptionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ type: [DischargeMedicationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DischargeMedicationDto)
  medications!: DischargeMedicationDto[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  reconciliationNotes?: string;
}

// ============================================================================
// Safe Discharge Checklist (Section 3)
// ============================================================================

export class ChecklistItemDto {
  @ApiProperty({ enum: ChecklistCategory })
  @IsEnum(ChecklistCategory)
  category!: ChecklistCategory;

  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiProperty({ enum: ChecklistItemStatus })
  @IsEnum(ChecklistItemStatus)
  status!: ChecklistItemStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() responsible?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() completedBy?: string;
}

export class SafeDischargeChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;

  @ApiProperty({ type: [ChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[];
}

export class UpdateChecklistItemDto {
  @ApiProperty() @IsInt() @Min(0) itemIndex!: number;

  @ApiProperty({ enum: ChecklistItemStatus })
  @IsEnum(ChecklistItemStatus)
  status!: ChecklistItemStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() completedBy?: string;
}

// ============================================================================
// Barrier to Discharge (Section 4)
// ============================================================================

export class DischargeBarrierDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ enum: BarrierType })
  @IsEnum(BarrierType)
  barrierType!: BarrierType;

  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiProperty() @IsDateString() identifiedDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedResolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() resolvedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleTeam?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() escalated?: boolean;
}

export class ResolveBarrierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNotes?: string;
}

// ============================================================================
// Multidisciplinary Rounding (Section 5)
// ============================================================================

export class RoundingParticipantDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() role!: string;
  @ApiProperty() @IsBoolean() present!: boolean;
}

export class PendingTaskDto {
  @ApiProperty() @IsString() @IsNotEmpty() task!: string;
  @ApiProperty() @IsString() @IsNotEmpty() responsible!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() due?: string;
}

export class RoundingClinicalStatusDto {
  @ApiProperty() @IsString() @IsNotEmpty() assessment!: string;
  @ApiProperty() @IsString() @IsNotEmpty() plan!: string;
}

export class RoundingMedicationsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() changes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() concerns?: string;
}

export class RoundingNutritionDto {
  @ApiProperty() @IsString() @IsNotEmpty() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plan?: string;
}

export class RoundingMobilityDto {
  @ApiProperty() @IsString() @IsNotEmpty() current!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goal?: string;
}

export class RoundingDischargeDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() estimatedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) barriers?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() readiness?: string;
}

export class RoundingPainDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10) currentScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() plan?: string;
}

export class RoundingSafetyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fallRisk?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pressureInjuryRisk?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() isolationStatus?: string;
}

export class RoundingCommunicationDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() familyUpdated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) patientQuestions?: string[];
}

export class RoundingChecklistDto {
  @ApiProperty({ type: RoundingClinicalStatusDto })
  @ValidateNested()
  @Type(() => RoundingClinicalStatusDto)
  clinicalStatus!: RoundingClinicalStatusDto;

  @ApiProperty() @IsArray() @IsString({ each: true }) todaysGoals!: string[];

  @ApiProperty({ type: [PendingTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingTaskDto)
  pendingTasks!: PendingTaskDto[];

  @ApiPropertyOptional({ type: RoundingMedicationsDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingMedicationsDto)
  medications?: RoundingMedicationsDto;

  @ApiPropertyOptional({ type: RoundingNutritionDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingNutritionDto)
  nutrition?: RoundingNutritionDto;

  @ApiPropertyOptional({ type: RoundingMobilityDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingMobilityDto)
  mobility?: RoundingMobilityDto;

  @ApiPropertyOptional({ type: RoundingDischargeDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingDischargeDto)
  discharge?: RoundingDischargeDto;

  @ApiPropertyOptional({ type: RoundingPainDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingPainDto)
  painManagement?: RoundingPainDto;

  @ApiPropertyOptional({ type: RoundingSafetyDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingSafetyDto)
  safety?: RoundingSafetyDto;

  @ApiPropertyOptional({ type: RoundingCommunicationDto })
  @IsOptional() @ValidateNested() @Type(() => RoundingCommunicationDto)
  communication?: RoundingCommunicationDto;
}

export class RoundingDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() encounterId!: string;
  @ApiProperty() @IsDateString() date!: string;

  @ApiProperty({ type: [RoundingParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundingParticipantDto)
  participants!: RoundingParticipantDto[];

  @ApiProperty({ type: RoundingChecklistDto })
  @ValidateNested()
  @Type(() => RoundingChecklistDto)
  checklist!: RoundingChecklistDto;
}

// ============================================================================
// Bed Regulation / Central de Vagas (Section 6)
// ============================================================================

export class BedRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty() requestingUnit!: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId!: string;

  @ApiProperty({ enum: BedType })
  @IsEnum(BedType)
  requestedBedType!: BedType;

  @ApiProperty({ enum: BedRequestUrgency })
  @IsEnum(BedRequestUrgency)
  urgency!: BedRequestUrgency;

  @ApiProperty() @IsString() @IsNotEmpty() clinicalSummary!: string;
  @ApiProperty() @IsString() @IsNotEmpty() currentLocation!: string;
}

export class UpdateBedRequestStatusDto {
  @ApiProperty({ enum: BedRequestStatus })
  @IsEnum(BedRequestStatus)
  status!: BedRequestStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() allocatedBed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() denialReason?: string;
}
