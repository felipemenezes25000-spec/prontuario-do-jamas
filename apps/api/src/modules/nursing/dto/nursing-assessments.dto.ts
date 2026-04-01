import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum PainScale {
  EVA = 'EVA',
  FLACC = 'FLACC',
  BPS = 'BPS',
  NIPS = 'NIPS',
  WONG_BAKER = 'WONG_BAKER',
}

export enum PainCharacter {
  SHARP = 'SHARP',
  DULL = 'DULL',
  BURNING = 'BURNING',
  THROBBING = 'THROBBING',
  CRAMPING = 'CRAMPING',
  STABBING = 'STABBING',
}

export enum EliminationType {
  URINARY = 'URINARY',
  BOWEL = 'BOWEL',
  OSTOMY = 'OSTOMY',
}

export enum UrinaryAspect {
  CLEAR = 'CLEAR',
  CLOUDY = 'CLOUDY',
  HEMATURIA = 'HEMATURIA',
  CONCENTRATED = 'CONCENTRATED',
}

export enum CatheterType {
  NONE = 'NONE',
  INDWELLING = 'INDWELLING',
  INTERMITTENT = 'INTERMITTENT',
  CONDOM = 'CONDOM',
}

export enum BowelAmount {
  SMALL = 'SMALL',
  MODERATE = 'MODERATE',
  LARGE = 'LARGE',
}

export enum PatientPosition {
  SUPINE = 'SUPINE',
  LEFT_LATERAL = 'LEFT_LATERAL',
  RIGHT_LATERAL = 'RIGHT_LATERAL',
  PRONE = 'PRONE',
  SEMI_FOWLER = 'SEMI_FOWLER',
  HIGH_FOWLER = 'HIGH_FOWLER',
  TRENDELENBURG = 'TRENDELENBURG',
}

export enum SkinAssessment {
  INTACT = 'INTACT',
  REDNESS = 'REDNESS',
  BLANCHING = 'BLANCHING',
  NON_BLANCHING = 'NON_BLANCHING',
  BREAKDOWN = 'BREAKDOWN',
}

export enum FugulinClassification {
  MINIMAL = 'MINIMAL',
  INTERMEDIATE = 'INTERMEDIATE',
  SEMI_INTENSIVE = 'SEMI_INTENSIVE',
  INTENSIVE = 'INTENSIVE',
}

export enum StaffingComplianceStatus {
  ADEQUATE = 'ADEQUATE',
  BELOW_MINIMUM = 'BELOW_MINIMUM',
  CRITICAL = 'CRITICAL',
}

export enum PainTrendPeriod {
  H24 = '24h',
  D7 = '7d',
}

// ============================================================================
// Pain Assessment DTOs
// ============================================================================

export class FlaccSubscaleDto {
  @ApiProperty({ description: 'Face score (0-2)', minimum: 0, maximum: 2 })
  @IsInt()
  @Min(0)
  @Max(2)
  face!: number;

  @ApiProperty({ description: 'Legs score (0-2)', minimum: 0, maximum: 2 })
  @IsInt()
  @Min(0)
  @Max(2)
  legs!: number;

  @ApiProperty({ description: 'Activity score (0-2)', minimum: 0, maximum: 2 })
  @IsInt()
  @Min(0)
  @Max(2)
  activity!: number;

  @ApiProperty({ description: 'Cry score (0-2)', minimum: 0, maximum: 2 })
  @IsInt()
  @Min(0)
  @Max(2)
  cry!: number;

  @ApiProperty({ description: 'Consolability score (0-2)', minimum: 0, maximum: 2 })
  @IsInt()
  @Min(0)
  @Max(2)
  consolability!: number;
}

export class BpsSubscaleDto {
  @ApiProperty({ description: 'Facial expression (1-4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  facialExpression!: number;

  @ApiProperty({ description: 'Upper limbs (1-4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  upperLimbs!: number;

  @ApiProperty({ description: 'Compliance with ventilation (1-4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  complianceWithVentilation!: number;
}

export class PainAssessmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ description: 'Pain scale type', enum: PainScale })
  @IsEnum(PainScale)
  scale!: PainScale;

  @ApiProperty({ description: 'Pain score (EVA/WONG_BAKER: 0-10, FLACC/NIPS: 0-10, BPS: 3-12)' })
  @IsNumber()
  @Min(0)
  @Max(12)
  score!: number;

  @ApiProperty({ description: 'Body region where pain is located' })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiPropertyOptional({ description: 'Pain character', enum: PainCharacter })
  @IsOptional()
  @IsEnum(PainCharacter)
  character?: PainCharacter;

  @ApiPropertyOptional({ description: 'Pain onset date/time' })
  @IsOptional()
  @IsDateString()
  onset?: string;

  @ApiPropertyOptional({ description: 'Duration description (e.g., "2 hours", "constant")' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Factors that aggravate the pain' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aggravatingFactors?: string[];

  @ApiPropertyOptional({ description: 'Factors that relieve the pain' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relievingFactors?: string[];

  @ApiPropertyOptional({ description: 'Intervention given (medication name or non-pharmacological method)' })
  @IsOptional()
  @IsString()
  interventionGiven?: string;

  @ApiPropertyOptional({ description: 'Scheduled reassessment time' })
  @IsOptional()
  @IsDateString()
  reassessmentTime?: string;

  @ApiPropertyOptional({ description: 'Score after intervention' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  postInterventionScore?: number;

  @ApiPropertyOptional({ description: 'FLACC subscale details (required when scale is FLACC)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlaccSubscaleDto)
  flaccDetails?: FlaccSubscaleDto;

  @ApiPropertyOptional({ description: 'BPS subscale details (required when scale is BPS)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BpsSubscaleDto)
  bpsDetails?: BpsSubscaleDto;
}

// ============================================================================
// Elimination DTOs
// ============================================================================

export class UrinaryOutputDto {
  @ApiProperty({ description: 'Volume in mL' })
  @IsNumber()
  @Min(0)
  volume!: number;

  @ApiPropertyOptional({ description: 'Urine aspect', enum: UrinaryAspect })
  @IsOptional()
  @IsEnum(UrinaryAspect)
  aspect?: UrinaryAspect;

  @ApiPropertyOptional({ description: 'Catheter type', enum: CatheterType, default: CatheterType.NONE })
  @IsOptional()
  @IsEnum(CatheterType)
  catheterType?: CatheterType;

  @ApiPropertyOptional({ description: 'Days since catheter insertion' })
  @IsOptional()
  @IsInt()
  @Min(0)
  catheterDays?: number;
}

export class BowelRecordDto {
  @ApiProperty({ description: 'Bristol Stool Scale (1=hard lumps, 2=lumpy sausage, 3=sausage with cracks, 4=smooth sausage, 5=soft blobs, 6=mushy, 7=watery)', minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  bristolScale!: number;

  @ApiPropertyOptional({ description: 'Frequency (times per day)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  frequency?: number;

  @ApiPropertyOptional({ description: 'Stool amount', enum: BowelAmount })
  @IsOptional()
  @IsEnum(BowelAmount)
  amount?: BowelAmount;

  @ApiPropertyOptional({ description: 'Stool color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Blood present in stool' })
  @IsOptional()
  @IsBoolean()
  blood?: boolean;

  @ApiPropertyOptional({ description: 'Ostomy output in mL (if applicable)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ostomyOutput?: number;
}

export class EliminationRecordDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ description: 'Elimination type', enum: EliminationType })
  @IsEnum(EliminationType)
  type!: EliminationType;

  @ApiPropertyOptional({ description: 'Timestamp of the record' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Urinary output details (required when type is URINARY)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UrinaryOutputDto)
  urinaryOutput?: UrinaryOutputDto;

  @ApiPropertyOptional({ description: 'Bowel record details (required when type is BOWEL or OSTOMY)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BowelRecordDto)
  bowelRecord?: BowelRecordDto;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// Position Change / Decubitus DTOs
// ============================================================================

export class PositionChangeDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ description: 'Patient position', enum: PatientPosition })
  @IsEnum(PatientPosition)
  position!: PatientPosition;

  @ApiPropertyOptional({ description: 'Timestamp of the position change' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ description: 'Skin assessment at pressure points', enum: SkinAssessment })
  @IsEnum(SkinAssessment)
  skinAssessment!: SkinAssessment;

  @ApiPropertyOptional({ description: 'Pressure points inspected' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pressurePoints?: string[];

  @ApiPropertyOptional({ description: 'Next position change due at' })
  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @ApiPropertyOptional({ description: 'Nurse name who performed the change' })
  @IsOptional()
  @IsString()
  nurseName?: string;
}

export class DecubitusScheduleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Interval in minutes (default 120)', default: 120 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(480)
  intervalMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether the schedule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// Fugulin Scale DTO
// ============================================================================

export class FugulinAssessmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId!: string;

  @ApiProperty({ description: 'Mental state (1=oriented, 2=confused periods, 3=unconscious, 4=agitated/aggressive)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  mentalState!: number;

  @ApiProperty({ description: 'Oxygenation (1=room air, 2=intermittent O2, 3=continuous O2, 4=mechanical ventilation)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  oxygenation!: number;

  @ApiProperty({ description: 'Vital signs (1=stable, 2=monitored non-invasive, 3=monitored invasive, 4=unstable)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  vitalSigns!: number;

  @ApiProperty({ description: 'Nutrition (1=self-feeding, 2=oral with help, 3=enteral, 4=parenteral)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  nutrition!: number;

  @ApiProperty({ description: 'Motility (1=walks alone, 2=limited movement, 3=bedridden with movement, 4=immobile)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  motility!: number;

  @ApiProperty({ description: 'Locomotion (1=walks alone, 2=walks with help, 3=wheelchair, 4=bedridden)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  locomotion!: number;

  @ApiProperty({ description: 'Body care (1=independent, 2=help needed, 3=significant help, 4=total dependence)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  bodyCare!: number;

  @ApiProperty({ description: 'Elimination (1=independent, 2=uses device/help, 3=catheter/ostomy, 4=dialysis)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  elimination!: number;

  @ApiProperty({ description: 'Therapeutics (1=oral/simple, 2=IV intermittent, 3=continuous IV, 4=vasoactive/chemo)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  therapeutics!: number;

  @ApiProperty({ description: 'Skin integrity (1=intact, 2=mild alteration, 3=moderate alteration, 4=severe/complex wound)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  skinIntegrity!: number;

  @ApiProperty({ description: 'Drainage (1=none, 2=simple drain, 3=multiple drains, 4=complex drainage)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  drainage!: number;

  @ApiProperty({ description: 'Curatives/dressings (1=none/simple, 2=up to 3, 3=more than 3, 4=complex wound care)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  curatives!: number;
}

// ============================================================================
// Staffing Calculation DTOs (COFEN 543/2017)
// ============================================================================

export class StaffingPatientDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Fugulin classification for this patient', enum: FugulinClassification })
  @IsEnum(FugulinClassification)
  classification!: FugulinClassification;
}

export class StaffingCalculationDto {
  @ApiProperty({ description: 'Unit/sector UUID' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ description: 'List of patients with their Fugulin classification', type: [StaffingPatientDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StaffingPatientDto)
  patients!: StaffingPatientDto[];

  @ApiProperty({ description: 'Shift duration in hours (6 or 12)', enum: [6, 12] })
  @IsInt()
  @IsEnum({ SIX: 6, TWELVE: 12 }, { message: 'shiftHours must be 6 or 12' })
  shiftHours!: 6 | 12;
}

// ============================================================================
// Staffing Result (response type, not a validation DTO)
// ============================================================================

export interface StaffingResultDto {
  unitId: string;
  minimalPatients: number;
  intermediatePatients: number;
  semiIntensivePatients: number;
  intensivePatients: number;
  totalPatients: number;
  totalHoursNeeded: number;
  requiredNurses: number;
  requiredTechs: number;
  totalStaff: number;
  nurseToPatientRatio: string;
  complianceStatus: StaffingComplianceStatus;
  details: {
    minimalStaff: { nurses: number; techs: number };
    intermediateStaff: { nurses: number; techs: number };
    semiIntensiveStaff: { nurses: number; techs: number };
    intensiveStaff: { nurses: number; techs: number };
  };
  reference: string;
}

// ============================================================================
// Decubitus Schedule Result (response type)
// ============================================================================

export interface DecubitusScheduleResultDto {
  patientId: string;
  intervalMinutes: number;
  isActive: boolean;
  lastChange: string | null;
  lastPosition: PatientPosition | null;
  nextDue: string | null;
  overdueAlert: boolean;
  overdueMinutes: number;
  records: PositionChangeRecord[];
}

export interface PositionChangeRecord {
  id: string;
  position: PatientPosition;
  skinAssessment: SkinAssessment;
  pressurePoints: string[];
  nurseName: string | null;
  timestamp: string;
}

// ============================================================================
// Pain Trend Result (response type)
// ============================================================================

export interface PainTrendPointDto {
  timestamp: string;
  scale: PainScale;
  score: number;
  postInterventionScore: number | null;
  location: string;
  interventionGiven: string | null;
}

export interface PainTrendResultDto {
  encounterId: string;
  period: PainTrendPeriod;
  dataPoints: PainTrendPointDto[];
  latestScore: number | null;
  averageScore: number | null;
  maxScore: number | null;
  minScore: number | null;
  trendDirection: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'INSUFFICIENT_DATA';
}

// ============================================================================
// Fluid Balance Result (response type)
// ============================================================================

export interface FluidBalanceResultDto {
  encounterId: string;
  periodStart: string;
  periodEnd: string;
  totalUrinaryOutput: number;
  totalIntake: number;
  balance: number;
  records: Array<{
    id: string;
    type: EliminationType;
    volume: number;
    timestamp: string;
  }>;
}

// ============================================================================
// Fugulin Result (response type)
// ============================================================================

export interface FugulinResultDto {
  encounterId: string;
  patientId: string;
  items: {
    mentalState: number;
    oxygenation: number;
    vitalSigns: number;
    nutrition: number;
    motility: number;
    locomotion: number;
    bodyCare: number;
    elimination: number;
    therapeutics: number;
    skinIntegrity: number;
    drainage: number;
    curatives: number;
  };
  totalScore: number;
  classification: FugulinClassification;
  assessedAt: string;
}
