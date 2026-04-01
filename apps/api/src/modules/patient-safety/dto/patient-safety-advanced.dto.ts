import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum AdverseEventType {
  FALL = 'FALL',
  MEDICATION = 'MEDICATION',
  INFECTION = 'INFECTION',
  PROCEDURE = 'PROCEDURE',
  PRESSURE_INJURY = 'PRESSURE_INJURY',
  SURGICAL = 'SURGICAL',
  BLOOD_TRANSFUSION = 'BLOOD_TRANSFUSION',
  EQUIPMENT = 'EQUIPMENT',
  OTHER = 'OTHER',
}

export enum AdverseEventSeverity {
  NEAR_MISS = 'NEAR_MISS',
  NO_HARM = 'NO_HARM',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  DEATH = 'DEATH',
}

export enum AdverseEventHarmCategory {
  A = 'A', // Circumstances or events capable of causing error
  B = 'B', // Error occurred but did not reach patient
  C = 'C', // Error reached patient — no harm
  D = 'D', // Error reached patient — monitoring required
  E = 'E', // Error contributed to temporary harm — intervention needed
  F = 'F', // Error contributed to temporary harm — hospitalization
  G = 'G', // Error contributed to permanent harm
  H = 'H', // Error requiring life-sustaining intervention
  I = 'I', // Error contributed to death
}

export enum AllergyDisplayType {
  HEADER_ICON = 'HEADER_ICON',
  POPUP = 'POPUP',
  WRISTBAND = 'WRISTBAND',
  ALL = 'ALL',
}

export enum InvasiveProcedureType {
  BIOPSY = 'BIOPSY',
  CVC_INSERTION = 'CVC_INSERTION',
  CHEST_DRAIN = 'CHEST_DRAIN',
  LUMBAR_PUNCTURE = 'LUMBAR_PUNCTURE',
  PARACENTESIS = 'PARACENTESIS',
  THORACENTESIS = 'THORACENTESIS',
  ARTERIAL_LINE = 'ARTERIAL_LINE',
  PICC = 'PICC',
  GASTROSTOMY = 'GASTROSTOMY',
  OTHER = 'OTHER',
}

export enum WasteTypeSafety {
  INFECTIOUS = 'INFECTIOUS',
  SHARP = 'SHARP',
  CHEMICAL = 'CHEMICAL',
  RADIOACTIVE = 'RADIOACTIVE',
  COMMON = 'COMMON',
}

export enum VteProphylaxisType {
  NONE = 'NONE',
  GRADUATED_COMPRESSION = 'GRADUATED_COMPRESSION',
  INTERMITTENT_PNEUMATIC = 'INTERMITTENT_PNEUMATIC',
  LMWH = 'LMWH',
  UFH = 'UFH',
  FONDAPARINUX = 'FONDAPARINUX',
  COMBINED = 'COMBINED',
}

export enum WhoTaxonomyType {
  CLINICAL_MANAGEMENT = 'CLINICAL_MANAGEMENT',
  MEDICATION = 'MEDICATION',
  BLOOD_BLOOD_PRODUCTS = 'BLOOD_BLOOD_PRODUCTS',
  NUTRITION = 'NUTRITION',
  OXYGEN_GAS = 'OXYGEN_GAS',
  MEDICAL_DEVICE = 'MEDICAL_DEVICE',
  BEHAVIOUR = 'BEHAVIOUR',
  PATIENT_ACCIDENTS = 'PATIENT_ACCIDENTS',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  RESOURCES_ORGANIZATIONAL = 'RESOURCES_ORGANIZATIONAL',
}

export enum DeviceType {
  IMPLANT_ORTHOPEDIC = 'IMPLANT_ORTHOPEDIC',
  IMPLANT_CARDIAC = 'IMPLANT_CARDIAC',
  IMPLANT_VASCULAR = 'IMPLANT_VASCULAR',
  EXTERNAL_FIXATOR = 'EXTERNAL_FIXATOR',
  PROSTHESIS = 'PROSTHESIS',
  PUMP_INFUSION = 'PUMP_INFUSION',
  VENTILATOR = 'VENTILATOR',
  DEFIBRILLATOR = 'DEFIBRILLATOR',
  OTHER = 'OTHER',
}

// ============================================================================
// AdverseEventDto
// ============================================================================

export class AdverseEventDto {
  @ApiProperty({ enum: AdverseEventType }) @IsEnum(AdverseEventType) type!: AdverseEventType;
  @ApiProperty({ enum: AdverseEventSeverity }) @IsEnum(AdverseEventSeverity) severity!: AdverseEventSeverity;
  @ApiProperty({ enum: AdverseEventHarmCategory, description: 'NCC MERP harm category (A–I)' })
  @IsEnum(AdverseEventHarmCategory)
  harm!: AdverseEventHarmCategory;

  @ApiProperty({ description: 'Free-text description of the event' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Anonymous report (no-blame culture)' })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Reporter user ID (omitted if anonymous)' })
  @IsOptional()
  @IsUUID()
  reportedBy?: string;

  @ApiPropertyOptional({ description: 'Event timestamp' })
  @IsOptional()
  @IsDateString()
  reportedAt?: string;

  @ApiPropertyOptional({ description: 'Patient involved (optional — some events are near-misses)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Encounter context' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Unit/ward where event occurred', example: 'UTI Adulto' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Immediate corrective actions taken' })
  @IsOptional()
  @IsString()
  immediateActions?: string;
}

// ============================================================================
// NearMissDto
// ============================================================================

export class NearMissDto {
  @ApiProperty({ enum: AdverseEventType, description: 'Type of near-miss event' })
  @IsEnum(AdverseEventType)
  type!: AdverseEventType;

  @ApiProperty({ description: 'Who intercepted the near-miss' })
  @IsString()
  @IsNotEmpty()
  interceptedBy!: string;

  @ApiProperty({ description: 'Description of what happened and how it was intercepted' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Lessons learned for system improvement' })
  @IsOptional()
  @IsString()
  lessonsLearned?: string;

  @ApiPropertyOptional({ description: 'Reporter (anonymous by default)' })
  @IsOptional()
  @IsUUID()
  reportedBy?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
}

// ============================================================================
// PositiveIdDto (2 patient identifiers before procedure)
// ============================================================================

export class PositiveIdDto {
  @ApiProperty({ description: 'Patient UUID' }) @IsUUID() patientId!: string;
  @ApiProperty({ description: 'First identifier used (e.g. full name)', example: 'Nome completo' })
  @IsString()
  @IsNotEmpty()
  identifier1!: string;

  @ApiProperty({ description: 'Second identifier used (e.g. date of birth / medical record number)', example: 'Data de nascimento' })
  @IsString()
  @IsNotEmpty()
  identifier2!: string;

  @ApiProperty({ description: 'User ID who verified identifiers' }) @IsUUID() verifiedBy!: string;
  @ApiProperty({ description: 'Procedure being performed', example: 'Coleta de sangue' })
  @IsString()
  @IsNotEmpty()
  procedureType!: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() timestamp?: string;
}

// ============================================================================
// AllergyAlertDto
// ============================================================================

export class AllergyAlertDto {
  @ApiProperty({ description: 'Patient UUID' }) @IsUUID() patientId!: string;

  @ApiProperty({ description: 'Known allergens', type: [String], example: ['Penicilina', 'AAS'] })
  @IsArray()
  @IsString({ each: true })
  allergens!: string[];

  @ApiProperty({ enum: AllergyDisplayType, description: 'How to display allergy alerts' })
  @IsEnum(AllergyDisplayType)
  displayType!: AllergyDisplayType;

  @ApiPropertyOptional({ description: 'Show popup when prescribing contraindicated drug' })
  @IsOptional()
  @IsBoolean()
  popupOnPrescription?: boolean;

  @ApiPropertyOptional({ description: 'Allergy severity level (mild/moderate/severe/life-threatening)' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Allergy reaction descriptions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reactions?: string[];
}

// ============================================================================
// InvasiveProcedureTimeoutDto
// ============================================================================

export class InvasiveProcedureTimeoutDto {
  @ApiProperty({ description: 'Patient UUID' }) @IsUUID() patientId!: string;
  @ApiProperty({ enum: InvasiveProcedureType }) @IsEnum(InvasiveProcedureType) procedureType!: InvasiveProcedureType;

  @ApiProperty({ description: 'Patient identity verified before procedure' }) @IsBoolean() patientVerified!: boolean;
  @ApiProperty({ description: 'Procedure site marked if applicable' }) @IsBoolean() siteMarked!: boolean;
  @ApiProperty({ description: 'Written informed consent signed' }) @IsBoolean() consentSigned!: boolean;
  @ApiProperty({ description: 'All required equipment checked and available' }) @IsBoolean() equipmentReady!: boolean;

  @ApiPropertyOptional({ description: 'Antibiotic prophylaxis administered if required' })
  @IsOptional()
  @IsBoolean()
  antibioticProphylaxis?: boolean;

  @ApiPropertyOptional({ description: 'Allergies reviewed' }) @IsOptional() @IsBoolean() allergiesReviewed?: boolean;
  @ApiPropertyOptional({ description: 'Operator performing procedure' }) @IsOptional() @IsUUID() operatorId?: string;
  @ApiPropertyOptional({ description: 'Checklist completion timestamp' }) @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional({ description: 'Additional notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// RootCauseAnalysisDto
// ============================================================================

export class IshikawaBranchDto {
  @ApiProperty({ description: 'Category (e.g. Método, Máquina, Mão-de-obra, Material, Meio-ambiente, Medição)' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Causes identified in this branch', type: [String] })
  @IsArray()
  @IsString({ each: true })
  causes!: string[];
}

export class CorrectiveActionDto {
  @ApiProperty({ description: 'Action description' }) @IsString() @IsNotEmpty() action!: string;
  @ApiProperty({ description: 'Responsible person or role' }) @IsString() @IsNotEmpty() responsible!: string;
  @ApiProperty({ description: 'Target completion date' }) @IsDateString() targetDate!: string;
  @ApiPropertyOptional({ description: 'Completion date' }) @IsOptional() @IsDateString() completedDate?: string;
  @ApiPropertyOptional({ description: 'Status (open/in_progress/completed/verified)' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class RootCauseAnalysisDto {
  @ApiProperty({ description: 'Adverse event UUID to analyze' }) @IsUUID() eventId!: string;

  @ApiPropertyOptional({ description: 'Ishikawa (fishbone) diagram branches', type: [IshikawaBranchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IshikawaBranchDto)
  ishikawaDiagram?: IshikawaBranchDto[];

  @ApiPropertyOptional({ description: '5-Whys chain (each item is one "why" answer)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fiveWhys?: string[];

  @ApiPropertyOptional({ description: 'Corrective and preventive action plan', type: [CorrectiveActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectiveActionDto)
  correctiveActions?: CorrectiveActionDto[];

  @ApiPropertyOptional({ description: 'Follow-up notes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  followUp?: string[];

  @ApiPropertyOptional({ description: 'Date RCA completed' }) @IsOptional() @IsDateString() completedAt?: string;
}

// ============================================================================
// EventClassificationDto
// ============================================================================

export class EventClassificationDto {
  @ApiProperty({ description: 'Adverse event UUID' }) @IsUUID() eventId!: string;
  @ApiPropertyOptional({ enum: WhoTaxonomyType }) @IsOptional() @IsEnum(WhoTaxonomyType) whoTaxonomy?: WhoTaxonomyType;
  @ApiPropertyOptional({ enum: AdverseEventHarmCategory, description: 'NCC MERP category A–I' })
  @IsOptional()
  @IsEnum(AdverseEventHarmCategory)
  nccMerpCategory?: AdverseEventHarmCategory;

  @ApiPropertyOptional({ enum: AdverseEventSeverity }) @IsOptional() @IsEnum(AdverseEventSeverity) severity?: AdverseEventSeverity;
  @ApiPropertyOptional({ description: 'Additional classification notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// DeviceTrackingDto
// ============================================================================

export class DeviceTrackingDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: DeviceType }) @IsEnum(DeviceType) deviceType!: DeviceType;
  @ApiProperty({ description: 'Manufacturer name' }) @IsString() @IsNotEmpty() manufacturer!: string;
  @ApiProperty({ description: 'ANVISA registry number', example: '80123456789' }) @IsString() @IsNotEmpty() anvisaRegistryNumber!: string;
  @ApiPropertyOptional({ description: 'Lot/batch number' }) @IsOptional() @IsString() lotNumber?: string;
  @ApiPropertyOptional({ description: 'Serial number' }) @IsOptional() @IsString() serialNumber?: string;
  @ApiProperty({ description: 'Implant or first-use date' }) @IsDateString() implantDate!: string;
  @ApiPropertyOptional({ description: 'Is device under an ANVISA recall?' }) @IsOptional() @IsBoolean() recallStatus?: boolean;
  @ApiPropertyOptional({ description: 'NOTIVISA report number if applicable' }) @IsOptional() @IsString() notivisaNotification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// SafetyDashboardDto (query/output shape)
// ============================================================================

export class SafetyDashboardQueryDto {
  @ApiProperty({ description: 'Start date for period', example: '2025-01-01' }) @IsDateString() startDate!: string;
  @ApiProperty({ description: 'End date for period', example: '2025-12-31' }) @IsDateString() endDate!: string;
  @ApiPropertyOptional({ description: 'Unit/ward filter' }) @IsOptional() @IsString() unit?: string;
}

export interface SafetyIndicator {
  name: string;
  value: number;
  unit: string;
  benchmark?: number;
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

export interface SafetyDashboardResultDto {
  period: { startDate: string; endDate: string };
  totalPatientDays: number;
  indicators: SafetyIndicator[];
  generatedAt: string;
}

// ============================================================================
// VteProphylaxisDto
// ============================================================================

export class VteProphylaxisDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ description: 'Caprini score (surgical patients)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  capriniScore?: number;

  @ApiPropertyOptional({ description: 'Padua score (medical patients)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  paduaScore?: number;

  @ApiProperty({ enum: VteProphylaxisType }) @IsEnum(VteProphylaxisType) prophylaxisType!: VteProphylaxisType;
  @ApiProperty({ description: 'Prophylaxis prescribed/ordered' }) @IsBoolean() prescribed!: boolean;

  @ApiPropertyOptional({ description: 'Drug name and dose if pharmacological' })
  @IsOptional()
  @IsString()
  drugDose?: string;

  @ApiPropertyOptional({ description: 'Alert if prophylaxis not prescribed for admitted patient' })
  @IsOptional()
  @IsBoolean()
  alertIfMissing?: boolean;

  @ApiPropertyOptional({ description: 'Contraindications to pharmacological prophylaxis' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];
}

// ============================================================================
// SsiPreventionDto
// ============================================================================

export class SsiPreventionDto {
  @ApiProperty({ description: 'Surgery/encounter UUID' }) @IsUUID() surgeryId!: string;
  @ApiProperty() @IsUUID() patientId!: string;

  @ApiPropertyOptional({ description: 'Antibiotic prophylaxis given within 60 min of incision' })
  @IsOptional()
  @IsBoolean()
  abxProphylaxisTiming?: boolean;

  @ApiPropertyOptional({ description: 'ABX name and dose' }) @IsOptional() @IsString() abxNameDose?: string;

  @ApiPropertyOptional({ description: 'Trichotomy performed (clipping only — razors increase SSI risk)' })
  @IsOptional()
  @IsBoolean()
  trichotomy?: boolean;

  @ApiPropertyOptional({ description: 'Intraoperative normothermia maintained (temp ≥ 36°C)' })
  @IsOptional()
  @IsBoolean()
  normothermia?: boolean;

  @ApiPropertyOptional({ description: 'Intraoperative blood glucose < 180 mg/dL' })
  @IsOptional()
  @IsBoolean()
  glycemicControl?: boolean;

  @ApiPropertyOptional({ description: 'Skin antisepsis agent used', example: 'Clorexidina alcoólica 2%' })
  @IsOptional()
  @IsString()
  skinAntisepsis?: string;

  @ApiPropertyOptional({ description: 'Compliance score (0–100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  complianceScore?: number;

  @ApiPropertyOptional({ description: 'Non-compliant items list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nonCompliantItems?: string[];
}
