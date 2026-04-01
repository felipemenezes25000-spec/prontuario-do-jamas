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
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum CountPhase {
  INITIAL = 'INITIAL',
  INTERIM = 'INTERIM',
  FINAL = 'FINAL',
}

export enum CountItemType {
  SPONGE = 'SPONGE',
  NEEDLE = 'NEEDLE',
  INSTRUMENT = 'INSTRUMENT',
  BLADE = 'BLADE',
}

export enum CountDiscrepancyAction {
  XRAY_ORDERED = 'XRAY_ORDERED',
  FOUND = 'FOUND',
  DOCUMENTED_MISSING = 'DOCUMENTED_MISSING',
}

export enum MallampatiClass {
  I = 1,
  II = 2,
  III = 3,
  IV = 4,
}

export enum MouthOpening {
  ADEQUATE = 'ADEQUATE',
  LIMITED = 'LIMITED',
  RESTRICTED = 'RESTRICTED',
}

export enum ThyromentalDistance {
  NORMAL = 'NORMAL',
  SHORT = 'SHORT',
}

export enum NeckMobility {
  FULL = 'FULL',
  LIMITED = 'LIMITED',
  FIXED = 'FIXED',
}

export enum Dentition {
  INTACT = 'INTACT',
  MISSING = 'MISSING',
  DENTURES = 'DENTURES',
  LOOSE_TEETH = 'LOOSE_TEETH',
}

export enum ASAClass {
  ASA_1 = 1,
  ASA_2 = 2,
  ASA_3 = 3,
  ASA_4 = 4,
  ASA_5 = 5,
  ASA_6 = 6,
}

export enum AnesthesiaTypeEnhanced {
  GENERAL = 'GENERAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  COMBINED = 'COMBINED',
  REGIONAL_BLOCK = 'REGIONAL_BLOCK',
  LOCAL = 'LOCAL',
  SEDATION = 'SEDATION',
}

export enum AirwayPlan {
  ETT = 'ETT',
  LMA = 'LMA',
  MASK = 'MASK',
  AWAKE_FIBEROPTIC = 'AWAKE_FIBEROPTIC',
}

export enum CardiacRisk {
  LOW = 'LOW',
  INTERMEDIATE = 'INTERMEDIATE',
  HIGH = 'HIGH',
}

export enum CormackLehane {
  GRADE_1 = 1,
  GRADE_2 = 2,
  GRADE_3 = 3,
  GRADE_4 = 4,
}

export enum MaintenanceAgent {
  SEVOFLURANE = 'SEVOFLURANE',
  DESFLURANE = 'DESFLURANE',
  ISOFLURANE = 'ISOFLURANE',
  PROPOFOL_TIVA = 'PROPOFOL_TIVA',
}

export enum ExtubationType {
  SMOOTH = 'SMOOTH',
  COUGHING = 'COUGHING',
  LARYNGOSPASM = 'LARYNGOSPASM',
}

export enum AnesthesiaComplicationType {
  NONE = 'NONE',
  DIFFICULT_AIRWAY = 'DIFFICULT_AIRWAY',
  BRONCHOSPASM = 'BRONCHOSPASM',
  HYPOTENSION = 'HYPOTENSION',
  ARRHYTHMIA = 'ARRHYTHMIA',
  ANAPHYLAXIS = 'ANAPHYLAXIS',
  AWARENESS = 'AWARENESS',
  OTHER = 'OTHER',
}

export enum ORRoomStatus {
  FREE = 'FREE',
  CLEANING = 'CLEANING',
  SETUP = 'SETUP',
  IN_USE = 'IN_USE',
  TURNOVER = 'TURNOVER',
}

export enum PositioningPreference {
  SUPINE = 'SUPINE',
  LATERAL = 'LATERAL',
  PRONE = 'PRONE',
  LITHOTOMY = 'LITHOTOMY',
  SITTING = 'SITTING',
  BEACH_CHAIR = 'BEACH_CHAIR',
}

// ============================================================================
// A) Sponge / Instrument Count DTOs
// ============================================================================

export class CountItemDto {
  @ApiProperty({ enum: CountItemType })
  @IsEnum(CountItemType)
  type!: CountItemType;

  @ApiProperty({ description: 'Item name/description' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Initial count' })
  @IsInt()
  @Min(0)
  initialCount!: number;

  @ApiProperty({ description: 'Final count' })
  @IsInt()
  @Min(0)
  finalCount!: number;

  @ApiProperty({ description: 'Whether there is a discrepancy' })
  @IsBoolean()
  discrepancy!: boolean;
}

export class SurgicalCountDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Procedure UUID' })
  @IsUUID()
  procedureId!: string;

  @ApiProperty({ enum: CountPhase, description: 'Count phase' })
  @IsEnum(CountPhase)
  phase!: CountPhase;

  @ApiProperty({ description: 'Nurse performing the count' })
  @IsUUID()
  countedBy!: string;

  @ApiProperty({ description: 'Second nurse verifying the count' })
  @IsUUID()
  verifiedBy!: string;

  @ApiProperty({ description: 'Timestamp of the count' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ type: [CountItemDto], description: 'Items counted' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  items!: CountItemDto[];
}

export class CountDiscrepancyDetailDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  item!: string;

  @ApiProperty({ description: 'Expected count' })
  @IsInt()
  @Min(0)
  expected!: number;

  @ApiProperty({ description: 'Found count' })
  @IsInt()
  @Min(0)
  found!: number;
}

export class CountReconciliationDto {
  @ApiProperty({ description: 'Procedure UUID' })
  @IsUUID()
  procedureId!: string;

  @ApiProperty({ description: 'Whether all counts are reconciled' })
  @IsBoolean()
  allReconciled!: boolean;

  @ApiProperty({ type: [CountDiscrepancyDetailDto], description: 'Discrepancies found' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountDiscrepancyDetailDto)
  discrepancies!: CountDiscrepancyDetailDto[];

  @ApiProperty({ enum: CountDiscrepancyAction, description: 'Action taken for discrepancy' })
  @IsEnum(CountDiscrepancyAction)
  actionTaken!: CountDiscrepancyAction;

  @ApiProperty({ description: 'Whether reconciliation has been signed off' })
  @IsBoolean()
  signedOff!: boolean;
}

// ============================================================================
// B) Pre-Anesthetic Assessment (APA) DTOs
// ============================================================================

export class AirwayAssessmentDto {
  @ApiProperty({ description: 'Mallampati class (1-4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  mallampatiClass!: number;

  @ApiProperty({ enum: MouthOpening })
  @IsEnum(MouthOpening)
  mouthOpening!: MouthOpening;

  @ApiProperty({ enum: ThyromentalDistance })
  @IsEnum(ThyromentalDistance)
  thyromentalDistance!: ThyromentalDistance;

  @ApiProperty({ enum: NeckMobility })
  @IsEnum(NeckMobility)
  neckMobility!: NeckMobility;

  @ApiProperty({ enum: Dentition })
  @IsEnum(Dentition)
  dentition!: Dentition;

  @ApiProperty({ description: 'Whether patient has a beard' })
  @IsBoolean()
  beardPresent!: boolean;

  @ApiProperty({ description: 'Predicted difficult airway' })
  @IsBoolean()
  predictedDifficultAirway!: boolean;
}

export class ASAClassificationDto {
  @ApiProperty({ description: 'ASA physical status class (1-6)', minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  asaClass!: number;

  @ApiProperty({ description: 'Emergency modifier (E)' })
  @IsBoolean()
  emergencyModifier!: boolean;

  @ApiProperty({ description: 'ASA classification description' })
  @IsString()
  description!: string;
}

export class FastingStatusDto {
  @ApiProperty({ description: 'Last solid food intake (ISO datetime)' })
  @IsDateString()
  lastSolid!: string;

  @ApiProperty({ description: 'Last clear liquid intake (ISO datetime)' })
  @IsDateString()
  lastClear!: string;

  @ApiProperty({ description: 'Whether fasting is adequate (solids >= 6h, clears >= 2h)' })
  @IsBoolean()
  adequateFasting!: boolean;
}

export class AnesthesiaPlanDto {
  @ApiProperty({ enum: AnesthesiaTypeEnhanced })
  @IsEnum(AnesthesiaTypeEnhanced)
  type!: AnesthesiaTypeEnhanced;

  @ApiProperty({ enum: AirwayPlan })
  @IsEnum(AirwayPlan)
  airwayPlan!: AirwayPlan;

  @ApiProperty({ description: 'Monitoring plan items', type: [String] })
  @IsArray()
  @IsString({ each: true })
  monitoringPlan!: string[];

  @ApiProperty({ description: 'Whether blood products are reserved' })
  @IsBoolean()
  bloodProductsReserved!: boolean;

  @ApiProperty({ description: 'Whether ICU bed is reserved' })
  @IsBoolean()
  icuReserved!: boolean;
}

export class PreOpExamsDto {
  @ApiPropertyOptional({ description: 'Hemoglobin (g/dL)' })
  @IsOptional()
  @IsNumber()
  hb?: number;

  @ApiPropertyOptional({ description: 'Platelet count (x10^3/uL)' })
  @IsOptional()
  @IsNumber()
  platelets?: number;

  @ApiPropertyOptional({ description: 'INR coagulation' })
  @IsOptional()
  @IsNumber()
  coagulationINR?: number;

  @ApiPropertyOptional({ description: 'aPTT (seconds)' })
  @IsOptional()
  @IsNumber()
  aPTT?: number;

  @ApiPropertyOptional({ description: 'Creatinine (mg/dL)' })
  @IsOptional()
  @IsNumber()
  creatinine?: number;

  @ApiPropertyOptional({ description: 'Glucose (mg/dL)' })
  @IsOptional()
  @IsNumber()
  glucose?: number;

  @ApiPropertyOptional({ description: 'Sodium (mEq/L)' })
  @IsOptional()
  @IsNumber()
  sodium?: number;

  @ApiPropertyOptional({ description: 'Potassium (mEq/L)' })
  @IsOptional()
  @IsNumber()
  potassium?: number;

  @ApiProperty({ description: 'ECG done' })
  @IsBoolean()
  ecgDone!: boolean;

  @ApiProperty({ description: 'Chest X-ray done' })
  @IsBoolean()
  chestXrayDone!: boolean;

  @ApiPropertyOptional({ description: 'Special tests performed', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialTests?: string[];
}

export class RiskAssessmentDto {
  @ApiProperty({ enum: CardiacRisk })
  @IsEnum(CardiacRisk)
  cardiacRisk!: CardiacRisk;

  @ApiProperty({ description: 'Lee criteria score (0-6)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  leeCriteria!: number;

  @ApiPropertyOptional({ description: 'Pulmonary risk assessment' })
  @IsOptional()
  @IsString()
  pulmonaryRisk?: string;

  @ApiPropertyOptional({ description: 'Renal risk assessment' })
  @IsOptional()
  @IsString()
  renalRisk?: string;

  @ApiPropertyOptional({ description: 'Thrombotic risk assessment' })
  @IsOptional()
  @IsString()
  thromboticRisk?: string;
}

export class PreAnestheticDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Procedure UUID' })
  @IsUUID()
  procedureId!: string;

  @ApiProperty({ description: 'Anesthesiologist UUID' })
  @IsUUID()
  assessorId!: string;

  @ApiProperty({ type: AirwayAssessmentDto })
  @ValidateNested()
  @Type(() => AirwayAssessmentDto)
  airway!: AirwayAssessmentDto;

  @ApiProperty({ type: ASAClassificationDto })
  @ValidateNested()
  @Type(() => ASAClassificationDto)
  asaClassification!: ASAClassificationDto;

  @ApiProperty({ type: FastingStatusDto })
  @ValidateNested()
  @Type(() => FastingStatusDto)
  fasting!: FastingStatusDto;

  @ApiProperty({ type: AnesthesiaPlanDto })
  @ValidateNested()
  @Type(() => AnesthesiaPlanDto)
  anesthesiaPlan!: AnesthesiaPlanDto;

  @ApiProperty({ type: PreOpExamsDto })
  @ValidateNested()
  @Type(() => PreOpExamsDto)
  preOpExams!: PreOpExamsDto;

  @ApiProperty({ type: RiskAssessmentDto })
  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  riskAssessment!: RiskAssessmentDto;

  @ApiPropertyOptional({ description: 'Additional observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// C) Anesthesia Record (Ficha Anestesica) DTOs
// ============================================================================

export class InductionDrugDto {
  @ApiProperty({ description: 'Drug name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Dose with unit (e.g. "200mg")' })
  @IsString()
  dose!: string;

  @ApiProperty({ description: 'Route of administration (IV, IM, etc.)' })
  @IsString()
  route!: string;

  @ApiProperty({ description: 'Administration time (ISO datetime)' })
  @IsDateString()
  time!: string;
}

export class InductionPhaseDto {
  @ApiProperty({ type: [InductionDrugDto], description: 'Induction drugs administered' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InductionDrugDto)
  drugs!: InductionDrugDto[];

  @ApiProperty({ description: 'Number of intubation attempts', minimum: 0 })
  @IsInt()
  @Min(0)
  intubationAttempts!: number;

  @ApiPropertyOptional({ description: 'Cormack-Lehane grade (1-4)', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  cormackLehane?: number;

  @ApiPropertyOptional({ description: 'Endotracheal tube size' })
  @IsOptional()
  @IsString()
  tubeSize?: string;

  @ApiPropertyOptional({ description: 'Tube depth (cm)' })
  @IsOptional()
  @IsNumber()
  tubeDepth?: number;

  @ApiPropertyOptional({ description: 'Cuff pressure (cmH2O)' })
  @IsOptional()
  @IsNumber()
  cuffPressure?: number;
}

export class MaintenanceMedicationDto {
  @ApiProperty({ description: 'Medication name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Dose with unit' })
  @IsString()
  dose!: string;

  @ApiProperty({ description: 'Administration timestamp' })
  @IsDateString()
  timestamp!: string;
}

export class FluidAdministeredDto {
  @ApiProperty({ description: 'Fluid type (e.g. RL, NS, Albumin)' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Volume in mL' })
  @IsNumber()
  @Min(0)
  volume!: number;
}

export class MaintenancePhaseDto {
  @ApiProperty({ enum: MaintenanceAgent })
  @IsEnum(MaintenanceAgent)
  agent!: MaintenanceAgent;

  @ApiPropertyOptional({ description: 'Agent concentration (%)' })
  @IsOptional()
  @IsNumber()
  concentration?: number;

  @ApiProperty({ type: [MaintenanceMedicationDto], description: 'Medications given during maintenance' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceMedicationDto)
  medications!: MaintenanceMedicationDto[];

  @ApiProperty({ type: [FluidAdministeredDto], description: 'Fluids administered' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FluidAdministeredDto)
  fluidsAdministered!: FluidAdministeredDto[];
}

export class VitalsReadingDto {
  @ApiProperty({ description: 'Reading timestamp (ISO datetime)' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ description: 'Heart rate (bpm)' })
  @IsInt()
  @Min(0)
  @Max(300)
  hr!: number;

  @ApiProperty({ description: 'Systolic blood pressure (mmHg)' })
  @IsInt()
  @Min(0)
  @Max(400)
  bpSystolic!: number;

  @ApiProperty({ description: 'Diastolic blood pressure (mmHg)' })
  @IsInt()
  @Min(0)
  @Max(300)
  bpDiastolic!: number;

  @ApiProperty({ description: 'SpO2 (%)', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  spo2!: number;

  @ApiPropertyOptional({ description: 'End-tidal CO2 (mmHg)' })
  @IsOptional()
  @IsNumber()
  etCo2?: number;

  @ApiPropertyOptional({ description: 'Temperature (Celsius)' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'BIS (Bispectral Index) value' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bis?: number;

  @ApiPropertyOptional({ description: 'Urine output (mL)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  urineOutput?: number;
}

export class AnesthesiaComplicationDto {
  @ApiProperty({ enum: AnesthesiaComplicationType })
  @IsEnum(AnesthesiaComplicationType)
  type!: AnesthesiaComplicationType;

  @ApiPropertyOptional({ description: 'Complication description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Management / actions taken' })
  @IsOptional()
  @IsString()
  management?: string;
}

export class EmergencePhaseDto {
  @ApiPropertyOptional({ description: 'Extubation time (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  extubationTime?: string;

  @ApiProperty({ enum: ExtubationType })
  @IsEnum(ExtubationType)
  extubationType!: ExtubationType;

  @ApiProperty({ description: 'Aldrete score (0-10)', minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  aldretScore!: number;

  @ApiPropertyOptional({ description: 'PACU admission time (ISO datetime)' })
  @IsOptional()
  @IsDateString()
  pacuAdmissionTime?: string;
}

export class AnesthesiaRecordDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Procedure UUID' })
  @IsUUID()
  procedureId!: string;

  @ApiProperty({ description: 'Anesthesiologist UUID' })
  @IsUUID()
  anesthesiologistId!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: InductionPhaseDto })
  @ValidateNested()
  @Type(() => InductionPhaseDto)
  induction!: InductionPhaseDto;

  @ApiProperty({ type: MaintenancePhaseDto })
  @ValidateNested()
  @Type(() => MaintenancePhaseDto)
  maintenance!: MaintenancePhaseDto;

  @ApiPropertyOptional({ type: [AnesthesiaComplicationDto], description: 'Complications during anesthesia' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnesthesiaComplicationDto)
  complications?: AnesthesiaComplicationDto[];

  @ApiPropertyOptional({ description: 'Additional observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class AddVitalsReadingDto {
  @ApiProperty({ type: VitalsReadingDto })
  @ValidateNested()
  @Type(() => VitalsReadingDto)
  reading!: VitalsReadingDto;
}

export class AddDrugAdministrationDto {
  @ApiProperty({ description: 'Drug name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Dose with unit' })
  @IsString()
  dose!: string;

  @ApiProperty({ description: 'Route of administration' })
  @IsString()
  route!: string;

  @ApiProperty({ description: 'Administration time (ISO datetime)' })
  @IsDateString()
  time!: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteAnesthesiaRecordDto {
  @ApiProperty({ type: EmergencePhaseDto })
  @ValidateNested()
  @Type(() => EmergencePhaseDto)
  emergence!: EmergencePhaseDto;

  @ApiPropertyOptional({ type: [AnesthesiaComplicationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnesthesiaComplicationDto)
  complications?: AnesthesiaComplicationDto[];

  @ApiPropertyOptional({ description: 'Final observations' })
  @IsOptional()
  @IsString()
  observations?: string;
}

// ============================================================================
// D) OR Room Map (Operating Room Dashboard) DTOs
// ============================================================================

export interface CurrentProcedureInfo {
  name: string;
  surgeonId: string;
  surgeonName: string;
  patientId: string;
  patientName: string;
  startTime: string;
  estimatedDuration: number;
  estimatedEndTime: string;
  elapsedMinutes: number;
}

export interface NextProcedureInfo {
  scheduledTime: string;
  surgeonId: string;
  surgeonName: string;
  patientId: string;
  patientName: string;
  procedure: string;
}

export interface ORRoomStatusResponse {
  roomId: string;
  roomName: string;
  status: ORRoomStatus;
  currentProcedure: CurrentProcedureInfo | null;
  nextProcedure: NextProcedureInfo | null;
}

export interface ORDashboardResponse {
  rooms: ORRoomStatusResponse[];
  utilizationRate: number;
  averageTurnoverMinutes: number;
  onTimeStartRate: number;
  cancellationRate: number;
}

export class UpdateORRoomStatusDto {
  @ApiProperty({ enum: ORRoomStatus, description: 'New room status' })
  @IsEnum(ORRoomStatus)
  status!: ORRoomStatus;

  @ApiPropertyOptional({ description: 'Notes about the status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// E) Preference Cards (Surgeon Preferences) DTOs
// ============================================================================

export class SutureItemDto {
  @ApiProperty({ description: 'Suture type (e.g. Vicryl, Prolene)' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Suture size (e.g. 2-0, 3-0)' })
  @IsString()
  size!: string;

  @ApiProperty({ description: 'Needle type (e.g. CT-1, SH)' })
  @IsString()
  needle!: string;
}

export class EquipmentSettingsDto {
  @ApiPropertyOptional({ description: 'Electrocautery cut setting (W)' })
  @IsOptional()
  @IsNumber()
  electrocauteryCut?: number;

  @ApiPropertyOptional({ description: 'Electrocautery coag setting (W)' })
  @IsOptional()
  @IsNumber()
  electrocauteryCoag?: number;

  @ApiPropertyOptional({ description: 'Positioning details' })
  @IsOptional()
  @IsString()
  positioning?: string;

  @ApiPropertyOptional({ description: 'Other equipment notes' })
  @IsOptional()
  @IsString()
  other?: string;
}

export class CreatePreferenceCardDto {
  @ApiProperty({ description: 'Surgeon UUID' })
  @IsUUID()
  surgeonId!: string;

  @ApiProperty({ description: 'Procedure type / name' })
  @IsString()
  procedureType!: string;

  @ApiProperty({ description: 'Card name / label' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Instruments list', type: [String] })
  @IsArray()
  @IsString({ each: true })
  instruments!: string[];

  @ApiProperty({ type: [SutureItemDto], description: 'Sutures preferences' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SutureItemDto)
  sutures!: SutureItemDto[];

  @ApiPropertyOptional({ description: 'Implants list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  implants?: string[];

  @ApiPropertyOptional({ type: EquipmentSettingsDto, description: 'Equipment settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EquipmentSettingsDto)
  equipment?: EquipmentSettingsDto;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ enum: PositioningPreference })
  @IsEnum(PositioningPreference)
  positioningPreference!: PositioningPreference;

  @ApiPropertyOptional({ description: 'Skin preparation preferences' })
  @IsOptional()
  @IsString()
  skinPrep?: string;

  @ApiPropertyOptional({ description: 'Draping preferences' })
  @IsOptional()
  @IsString()
  draping?: string;
}

export class UpdatePreferenceCardDto {
  @ApiPropertyOptional({ description: 'Card name / label' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Instruments list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instruments?: string[];

  @ApiPropertyOptional({ type: [SutureItemDto], description: 'Sutures preferences' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SutureItemDto)
  sutures?: SutureItemDto[];

  @ApiPropertyOptional({ description: 'Implants list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  implants?: string[];

  @ApiPropertyOptional({ type: EquipmentSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EquipmentSettingsDto)
  equipment?: EquipmentSettingsDto;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ enum: PositioningPreference })
  @IsOptional()
  @IsEnum(PositioningPreference)
  positioningPreference?: PositioningPreference;

  @ApiPropertyOptional({ description: 'Skin preparation preferences' })
  @IsOptional()
  @IsString()
  skinPrep?: string;

  @ApiPropertyOptional({ description: 'Draping preferences' })
  @IsOptional()
  @IsString()
  draping?: string;
}
