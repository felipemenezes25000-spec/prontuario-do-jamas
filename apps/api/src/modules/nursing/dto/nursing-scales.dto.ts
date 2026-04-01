import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  IsDateString,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum PainScaleType {
  EVA = 'EVA',
  FLACC = 'FLACC',
  BPS = 'BPS',
}

export enum BristolStoolType {
  TYPE_1 = 1,
  TYPE_2 = 2,
  TYPE_3 = 3,
  TYPE_4 = 4,
  TYPE_5 = 5,
  TYPE_6 = 6,
  TYPE_7 = 7,
}

export enum DecubitusPosition {
  DLE = 'DLE',   // Decúbito lateral esquerdo
  DLD = 'DLD',   // Decúbito lateral direito
  DD = 'DD',     // Decúbito dorsal
  PRONE = 'PRONE',
  FOWLER = 'FOWLER',
  SEMI_FOWLER = 'SEMI_FOWLER',
}

export enum FugulinScaleClass {
  MINIMAL = 'MINIMAL',
  INTERMEDIATE = 'INTERMEDIATE',
  SEMI_INTENSIVE = 'SEMI_INTENSIVE',
  INTENSIVE = 'INTENSIVE',
}

export enum NursingShiftType {
  SHIFT_12X36 = '12X36',
  SHIFT_6H = '6H',
  SHIFT_8H = '8H',
  SHIFT_24H = '24H',
}

export enum WoundHealingTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}

export enum CatheterType {
  PERIPHERAL_IV = 'PERIPHERAL_IV',
  CENTRAL_VENOUS = 'CENTRAL_VENOUS',
  URINARY = 'URINARY',
  ARTERIAL = 'ARTERIAL',
  NASOGASTRIC = 'NASOGASTRIC',
}

// ============================================================================
// 1. PainScaleDto
// ============================================================================

export class PainScaleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: PainScaleType, description: 'Pain assessment scale used' })
  @IsEnum(PainScaleType)
  scaleType!: PainScaleType;

  @ApiProperty({ description: 'Pain score (0-10 for EVA; 0-10 for FLACC; 3-12 for BPS)' })
  @IsInt()
  @Min(0)
  @Max(12)
  score!: number;

  @ApiPropertyOptional({ description: 'Location of pain on the body' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Pain characteristics (e.g. burning, sharp, dull)' })
  @IsOptional()
  @IsString()
  characteristics?: string;

  @ApiPropertyOptional({ description: 'Analgesic intervention given' })
  @IsOptional()
  @IsString()
  interventionGiven?: string;

  @ApiPropertyOptional({ description: 'Post-analgesia reassessment score' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  postAnalgesiaReassessment?: number;

  @ApiPropertyOptional({ description: 'ISO timestamp of assessment' })
  @IsOptional()
  @IsDateString()
  assessedAt?: string;
}

// ============================================================================
// 2. EliminationControlDto
// ============================================================================

export class EliminationControlDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Urine output volume in mL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  urineVolume?: number;

  @ApiPropertyOptional({ description: 'Urine appearance (clear, cloudy, hematuria, concentrated)' })
  @IsOptional()
  @IsString()
  urineAspect?: string;

  @ApiPropertyOptional({ enum: BristolStoolType, description: 'Bristol stool scale type (1-7)' })
  @IsOptional()
  @IsEnum(BristolStoolType)
  bowelBristol?: BristolStoolType;

  @ApiPropertyOptional({ description: 'Ostomy present and output description' })
  @IsOptional()
  @IsString()
  ostomy?: string;

  @ApiPropertyOptional({ description: 'Urinary catheter in place (type/description)' })
  @IsOptional()
  @IsString()
  catheter?: string;

  @ApiPropertyOptional({ description: 'ISO timestamp of elimination event' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// 3. DecubitusChangeDto
// ============================================================================

export class DecubitusChangeDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Scheduled time for the position change (ISO)' })
  @IsDateString()
  scheduledTime!: string;

  @ApiPropertyOptional({ description: 'Actual time position change was performed (ISO)' })
  @IsOptional()
  @IsDateString()
  actualTime?: string;

  @ApiProperty({ enum: DecubitusPosition, description: 'New patient position' })
  @IsEnum(DecubitusPosition)
  position!: DecubitusPosition;

  @ApiPropertyOptional({ description: 'Delay alert flag (set when actual time > scheduled + 30 min)' })
  @IsOptional()
  @IsBoolean()
  delayAlert?: boolean;

  @ApiPropertyOptional({ description: 'Nurse who performed the change' })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({ description: 'Skin integrity observations' })
  @IsOptional()
  @IsString()
  skinObservations?: string;
}

// ============================================================================
// 4. AdmissionChecklistDto
// ============================================================================

export class AdmissionChecklistDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Known allergies' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Current medications in use' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional({ description: 'Level of consciousness description' })
  @IsOptional()
  @IsString()
  consciousness?: string;

  @ApiPropertyOptional({ description: 'Skin integrity assessment notes' })
  @IsOptional()
  @IsString()
  skin?: string;

  @ApiPropertyOptional({ description: 'Initial pain score (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  pain?: number;

  @ApiPropertyOptional({ description: 'Fall risk score or classification' })
  @IsOptional()
  @IsString()
  fallRisk?: string;

  @ApiPropertyOptional({ type: [String], description: 'Orientations and guidelines provided to patient/family' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orientations?: string[];

  @ApiPropertyOptional({ description: 'Admitting nurse UUID' })
  @IsOptional()
  @IsUUID()
  admittedBy?: string;
}

// ============================================================================
// 5. WoundEvolutionDto
// ============================================================================

export class WoundEvolutionDto {
  @ApiProperty({ description: 'Wound document identifier' })
  @IsString()
  @IsNotEmpty()
  woundId!: string;

  @ApiPropertyOptional({ description: 'Patient UUID (required for new wounds)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Photo URL or S3 key' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ description: 'AI-measured wound area in cm²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  aiMeasurement?: number;

  @ApiPropertyOptional({ description: 'Previous measurement area in cm² for trend comparison' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  previousArea?: number;

  @ApiPropertyOptional({ enum: WoundHealingTrend, description: 'Healing trend based on area comparison' })
  @IsOptional()
  @IsEnum(WoundHealingTrend)
  healingTrend?: WoundHealingTrend;

  @ApiPropertyOptional({ description: 'Type of covering/dressing applied' })
  @IsOptional()
  @IsString()
  coveringApplied?: string;

  @ApiPropertyOptional({ description: 'Wound assessment notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ISO timestamp of assessment' })
  @IsOptional()
  @IsDateString()
  assessedAt?: string;
}

// ============================================================================
// 6. IndividualCarePlanDto
// ============================================================================

export class NursingInterventionDto {
  @ApiProperty() @IsString() diagnosis!: string;
  @ApiProperty() @IsString() intervention!: string;
  @ApiProperty() @IsString() frequency!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() outcomeExpected?: string;
}

export class IndividualCarePlanDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Nursing diagnoses (NANDA taxonomy)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nursingDiagnoses?: string[];

  @ApiPropertyOptional({ type: [NursingInterventionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NursingInterventionDto)
  interventions?: NursingInterventionDto[];

  @ApiPropertyOptional({ description: 'Responsible nurse UUID' })
  @IsOptional()
  @IsUUID()
  responsible?: string;

  @ApiPropertyOptional({ description: 'Outcome evaluation notes' })
  @IsOptional()
  @IsString()
  outcomeEvaluation?: string;

  @ApiPropertyOptional({ description: 'Planned review date (ISO)' })
  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

// ============================================================================
// 7. FugulinScaleDto
// ============================================================================

export class FugulinScaleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: FugulinScaleClass, description: 'Fugulin patient classification' })
  @IsEnum(FugulinScaleClass)
  classification!: FugulinScaleClass;

  @ApiProperty({ description: 'Total Fugulin score' })
  @IsInt()
  @Min(7)
  @Max(48)
  score!: number;

  @ApiPropertyOptional({ type: [String], description: 'Criteria items scored in the assessment' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];

  @ApiPropertyOptional({ description: 'Assessing nurse UUID' })
  @IsOptional()
  @IsUUID()
  assessedBy?: string;
}

// ============================================================================
// 8. StaffDimensioningDto
// ============================================================================

export class PatientsByClassificationDto {
  @ApiProperty() @IsInt() @Min(0) minimal!: number;
  @ApiProperty() @IsInt() @Min(0) intermediate!: number;
  @ApiProperty() @IsInt() @Min(0) semiIntensive!: number;
  @ApiProperty() @IsInt() @Min(0) intensive!: number;
}

export class StaffDimensioningDto {
  @ApiProperty({ description: 'Nursing unit name' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ type: () => PatientsByClassificationDto, description: 'Patient count by Fugulin classification' })
  @ValidateNested()
  @Type(() => PatientsByClassificationDto)
  patientsByClassification!: PatientsByClassificationDto;

  @ApiPropertyOptional({ description: 'Required nurses per COFEN 543/2017 (calculated if omitted)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredNurses?: number;

  @ApiPropertyOptional({ description: 'Required nursing technicians per COFEN 543/2017' })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredTechnicians?: number;
}

// ============================================================================
// 9. NursingScheduleDto
// ============================================================================

export class StaffMemberScheduleDto {
  @ApiProperty() @IsUUID() staffId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String], description: 'Scheduled shift dates (ISO date strings)' })
  @IsArray()
  @IsDateString({ strict: false }, { each: true })
  shiftDates!: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) overtimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bankHours?: number;
}

export class NursingScheduleDto {
  @ApiProperty({ description: 'Nursing unit name' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ enum: NursingShiftType, description: 'Shift model for the unit' })
  @IsEnum(NursingShiftType)
  shifts!: NursingShiftType;

  @ApiPropertyOptional({ type: [StaffMemberScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffMemberScheduleDto)
  staff?: StaffMemberScheduleDto[];

  @ApiPropertyOptional({ description: 'Schedule period start (ISO date)' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Schedule period end (ISO date)' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

// ============================================================================
// 10. CatheterBundleDto
// ============================================================================

export class CatheterBundleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: CatheterType, description: 'Catheter type' })
  @IsEnum(CatheterType)
  catheterType!: CatheterType;

  @ApiProperty({ description: 'Indication for catheter insertion' })
  @IsString()
  @IsNotEmpty()
  indication!: string;

  @ApiPropertyOptional({ description: 'Daily reassessment of catheter necessity performed' })
  @IsOptional()
  @IsBoolean()
  dailyReassessment?: boolean;

  @ApiPropertyOptional({ description: 'Number of days catheter has been in place' })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysInPlace?: number;

  @ApiPropertyOptional({ type: [String], description: 'Bundle care items performed today' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  care?: string[];

  @ApiPropertyOptional({ description: 'Alert flag for extended dwell time or missing reassessment' })
  @IsOptional()
  @IsBoolean()
  alert?: boolean;

  @ApiPropertyOptional({ description: 'Insertion date (ISO)' })
  @IsOptional()
  @IsDateString()
  insertedAt?: string;
}

// ============================================================================
// 11. CvcBundleDto
// ============================================================================

export class CvcBundleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Maximum sterile barrier precautions observed during insertion' })
  @IsOptional()
  @IsBoolean()
  maxBarrier?: boolean;

  @ApiPropertyOptional({ description: 'Chlorhexidine skin antisepsis used' })
  @IsOptional()
  @IsBoolean()
  chlorhexidine?: boolean;

  @ApiPropertyOptional({ description: 'Ultrasound guidance used for insertion' })
  @IsOptional()
  @IsBoolean()
  ultrasoundGuided?: boolean;

  @ApiPropertyOptional({ description: 'Daily maintenance bundle items completed' })
  @IsOptional()
  @IsBoolean()
  dailyMaintenance?: boolean;

  @ApiPropertyOptional({ description: 'Days central line has been in place' })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysInPlace?: number;

  @ApiPropertyOptional({ type: [String], description: 'CVC insertion and daily checklist items' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @ApiPropertyOptional({ description: 'Alert flag for extended dwell or missing daily bundle' })
  @IsOptional()
  @IsBoolean()
  alert?: boolean;

  @ApiPropertyOptional({ description: 'CVC insertion date (ISO)' })
  @IsOptional()
  @IsDateString()
  insertedAt?: string;

  @ApiPropertyOptional({ description: 'Inserting physician UUID' })
  @IsOptional()
  @IsUUID()
  insertedBy?: string;
}

// ============================================================================
// Response interfaces
// ============================================================================

export interface PainScaleResult {
  id: string;
  patientId: string;
  scaleType: PainScaleType;
  score: number;
  postAnalgesiaReassessment: number | null;
  createdAt: Date;
}

export interface PainTrendPoint {
  timestamp: string;
  score: number;
  scaleType: PainScaleType;
  intervention: string | null;
  postScore: number | null;
}

export interface EliminationResult {
  id: string;
  patientId: string;
  urineVolume: number | null;
  bowelBristol: number | null;
  createdAt: Date;
}

export interface DecubitusScheduleResult {
  patientId: string;
  lastChange: string | null;
  nextScheduled: string;
  currentPosition: DecubitusPosition | null;
  delayAlert: boolean;
}

export interface WoundEvolutionResult {
  id: string;
  woundId: string;
  aiMeasurement: number | null;
  previousArea: number | null;
  percentageChange: number | null;
  healingTrend: WoundHealingTrend | null;
  createdAt: Date;
}

export interface StaffDimensioningResult {
  unit: string;
  totalPatients: number;
  requiredNurses: number;
  requiredTechnicians: number;
  totalStaffRequired: number;
  cofen543Compliant: boolean;
  hoursPerPatientDay: number;
}

export interface FugulinResult {
  id: string;
  patientId: string;
  classification: FugulinScaleClass;
  score: number;
  nursingHoursRequired: number;
  createdAt: Date;
}

export interface CatheterBundleResult {
  id: string;
  patientId: string;
  catheterType: CatheterType;
  daysInPlace: number;
  alert: boolean;
  createdAt: Date;
}

export interface CvcBundleResult {
  id: string;
  patientId: string;
  daysInPlace: number;
  completedItems: number;
  totalItems: number;
  alert: boolean;
  createdAt: Date;
}
