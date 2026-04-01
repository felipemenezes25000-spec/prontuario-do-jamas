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

export enum AsaClassification {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
  VI = 'VI',
}

export enum MallampatiGrade {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
}

export enum AnesthesiaType {
  GENERAL_INHALATIONAL = 'GENERAL_INHALATIONAL',
  GENERAL_TIVA = 'GENERAL_TIVA',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  COMBINED_SPINAL_EPIDURAL = 'COMBINED_SPINAL_EPIDURAL',
  REGIONAL_BLOCK = 'REGIONAL_BLOCK',
  SEDATION_MODERATE = 'SEDATION_MODERATE',
  SEDATION_DEEP = 'SEDATION_DEEP',
  LOCAL = 'LOCAL',
}

export enum ORRoomStatusSafety {
  IN_USE = 'IN_USE',
  CLEANING = 'CLEANING',
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
}

export enum ErasPhase {
  PRE_OP = 'PRE_OP',
  INTRA_OP = 'INTRA_OP',
  POST_OP = 'POST_OP',
}

export enum PatientPositioning {
  SUPINE = 'SUPINE',
  PRONE = 'PRONE',
  LATERAL_RIGHT = 'LATERAL_RIGHT',
  LATERAL_LEFT = 'LATERAL_LEFT',
  LITHOTOMY = 'LITHOTOMY',
  TRENDELENBURG = 'TRENDELENBURG',
  REVERSE_TRENDELENBURG = 'REVERSE_TRENDELENBURG',
  BEACH_CHAIR = 'BEACH_CHAIR',
  SITTING = 'SITTING',
}

// ============================================================================
// 1. SpongeCountDto
// ============================================================================

export class SpongeCountDto {
  @ApiProperty({ description: 'Surgical procedure UUID' })
  @IsUUID()
  surgeryId!: string;

  @ApiProperty({ description: 'Number of sponges/items counted before the procedure' })
  @IsInt()
  @Min(0)
  countBefore!: number;

  @ApiProperty({ description: 'Number of sponges/items counted after the procedure' })
  @IsInt()
  @Min(0)
  countAfter!: number;

  @ApiProperty({ description: 'Whether count before equals count after' })
  @IsBoolean()
  matches!: boolean;

  @ApiPropertyOptional({ description: 'Alert message when a discrepancy is detected' })
  @IsOptional()
  @IsString()
  discrepancyAlert?: string;

  @ApiProperty({ description: 'User ID of the verifying professional' })
  @IsUUID()
  verifiedBy!: string;
}

// ============================================================================
// 2. PreAnesthesiaDto
// ============================================================================

export class PreAnesthesiaDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ type: [String], description: 'List of comorbidities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  comorbidities?: string[];

  @ApiProperty({ enum: MallampatiGrade, description: 'Mallampati airway classification (1-4)' })
  @IsEnum(MallampatiGrade)
  airway!: MallampatiGrade;

  @ApiProperty({ description: 'Fasting duration in hours before surgery' })
  @IsNumber()
  @Min(0)
  @Max(72)
  fastingHours!: number;

  @ApiPropertyOptional({ type: [String], description: 'Pre-operative exams performed' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preOpExams?: string[];

  @ApiProperty({ enum: AsaClassification, description: 'ASA physical status classification' })
  @IsEnum(AsaClassification)
  asaClassification!: AsaClassification;

  @ApiPropertyOptional({ enum: AnesthesiaType, description: 'Planned anesthesia technique' })
  @IsOptional()
  @IsEnum(AnesthesiaType)
  anesthesiaPlan?: AnesthesiaType;

  @ApiPropertyOptional({ description: 'Additional pre-anesthesia notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// 3. AnesthesiaRecordDto
// ============================================================================

export class AnesthesiaDrugDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() dose!: number;
  @ApiProperty() @IsString() unit!: string;
  @ApiProperty() @IsString() route!: string;
  @ApiProperty() @IsDateString() administeredAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() indication?: string;
}

export class AnesthesiaEventDto {
  @ApiProperty() @IsDateString() timestamp!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() intervention?: string;
}

export class VitalGraphPointDto {
  @ApiProperty() @IsDateString() timestamp!: string;
  @ApiProperty() @IsNumber() systolic!: number;
  @ApiProperty() @IsNumber() diastolic!: number;
  @ApiProperty() @IsInt() heartRate!: number;
  @ApiProperty() @IsInt() spo2!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() etco2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() temperature?: number;
}

export class AnesthesiaRecordSafetyDto {
  @ApiProperty({ description: 'Surgical procedure UUID' })
  @IsUUID()
  surgeryId!: string;

  @ApiPropertyOptional({ description: 'Pre-induction notes and patient state' })
  @IsOptional()
  @IsString()
  preInduction?: string;

  @ApiProperty({ description: 'Induction agent and technique description' })
  @IsString()
  induction!: string;

  @ApiProperty({ description: 'Maintenance technique and agents' })
  @IsString()
  maintenance!: string;

  @ApiPropertyOptional({ type: [AnesthesiaDrugDto], description: 'Drugs administered during the procedure' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnesthesiaDrugDto)
  drugs?: AnesthesiaDrugDto[];

  @ApiPropertyOptional({ type: [AnesthesiaEventDto], description: 'Intraoperative events and interventions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnesthesiaEventDto)
  events?: AnesthesiaEventDto[];

  @ApiPropertyOptional({ description: 'Awakening / emergence notes' })
  @IsOptional()
  @IsString()
  awakening?: string;

  @ApiPropertyOptional({ type: [VitalGraphPointDto], description: 'Time-series vital signs graph data' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VitalGraphPointDto)
  vitalGraphData?: VitalGraphPointDto[];
}

// ============================================================================
// 4. IntraopMonitoringDto (every 5 min)
// ============================================================================

export class IntraopMonitoringDto {
  @ApiProperty({ description: 'Surgical procedure UUID' })
  @IsUUID()
  surgeryId!: string;

  @ApiProperty({ description: 'ISO timestamp of this monitoring reading' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ description: 'Systolic blood pressure (mmHg)' })
  @IsInt()
  @Min(40)
  @Max(300)
  bpSystolic!: number;

  @ApiProperty({ description: 'Diastolic blood pressure (mmHg)' })
  @IsInt()
  @Min(20)
  @Max(200)
  bpDiastolic!: number;

  @ApiProperty({ description: 'Heart rate (bpm)' })
  @IsInt()
  @Min(20)
  @Max(300)
  hr!: number;

  @ApiProperty({ description: 'Oxygen saturation SpO2 (%)' })
  @IsInt()
  @Min(0)
  @Max(100)
  spo2!: number;

  @ApiPropertyOptional({ description: 'End-tidal CO2 (mmHg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(80)
  etco2?: number;

  @ApiPropertyOptional({ description: 'Bispectral Index (BIS) for depth of anesthesia (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bis?: number;

  @ApiPropertyOptional({ description: 'Core temperature (°C)' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(43)
  temperature?: number;
}

// ============================================================================
// 5. OperatingRoomMapDto
// ============================================================================

export class ORRoomEntryDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty({ enum: ORRoomStatusSafety }) @IsEnum(ORRoomStatusSafety) status!: ORRoomStatusSafety;
  @ApiPropertyOptional() @IsOptional() @IsString() surgeon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() procedure?: string;
  @ApiPropertyOptional({ description: 'Estimated remaining time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedTimeRemaining?: number;
}

export class OperatingRoomMapDto {
  @ApiProperty({ type: [ORRoomEntryDto], description: 'List of operating rooms and their current status' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ORRoomEntryDto)
  rooms!: ORRoomEntryDto[];
}

// ============================================================================
// 6. RoomUtilizationDto
// ============================================================================

export class RoomUtilizationDto {
  @ApiProperty({ description: 'Operating room identifier' })
  @IsString()
  roomId!: string;

  @ApiProperty({ description: 'Reporting period (e.g. 2024-01-15)' })
  @IsString()
  period!: string;

  @ApiProperty({ description: 'Total minutes room was in use' })
  @IsInt()
  @Min(0)
  usedMinutes!: number;

  @ApiProperty({ description: 'Total available minutes in the period' })
  @IsInt()
  @Min(1)
  availableMinutes!: number;

  @ApiPropertyOptional({ description: 'Average turnover time between cases (minutes)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  turnoverTime?: number;

  @ApiPropertyOptional({ description: 'Number of delays recorded' })
  @IsOptional()
  @IsInt()
  @Min(0)
  delays?: number;

  @ApiPropertyOptional({ description: 'Number of cancellations recorded' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellations?: number;

  @ApiPropertyOptional({ description: 'Whether the first scheduled case started on time' })
  @IsOptional()
  @IsBoolean()
  firstCaseOnTime?: boolean;
}

// ============================================================================
// 7. PreferenceCardDto
// ============================================================================

export class PreferenceCardDto {
  @ApiProperty({ description: 'Surgeon user UUID' })
  @IsUUID()
  surgeonId!: string;

  @ApiProperty({ description: 'Procedure type name (e.g. Laparoscopic Cholecystectomy)' })
  @IsString()
  procedureType!: string;

  @ApiPropertyOptional({ type: [String], description: 'Preferred instruments list' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instruments?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Preferred suture types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sutures?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Preferred materials and implants' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({ enum: PatientPositioning, description: 'Preferred patient positioning' })
  @IsOptional()
  @IsEnum(PatientPositioning)
  positioning?: PatientPositioning;

  @ApiPropertyOptional({ type: [String], description: 'Required equipment (e.g. C-arm, cell saver)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiPropertyOptional({ description: 'Additional special requests or notes' })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

// ============================================================================
// 8. ErasProtocolDto
// ============================================================================

export class ErasPreOpDto {
  @ApiPropertyOptional({ description: 'Pre-operative nutrition instructions given' })
  @IsOptional()
  @IsBoolean()
  nutrition?: boolean;

  @ApiPropertyOptional({ description: 'Pre-operative education and counselling provided' })
  @IsOptional()
  @IsBoolean()
  education?: boolean;

  @ApiPropertyOptional({ description: 'Pre-operative carbohydrate loading applied' })
  @IsOptional()
  @IsBoolean()
  carbohydrateLoading?: boolean;

  @ApiPropertyOptional({ description: 'Multimodal anxiolysis given' })
  @IsOptional()
  @IsBoolean()
  anxiolysis?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ErasIntraOpDto {
  @ApiPropertyOptional({ description: 'Active normothermia maintained' })
  @IsOptional()
  @IsBoolean()
  normothermia?: boolean;

  @ApiPropertyOptional({ description: 'Goal-directed fluid therapy applied' })
  @IsOptional()
  @IsBoolean()
  goalDirectedFluid?: boolean;

  @ApiPropertyOptional({ description: 'Short-acting anaesthetic agents used' })
  @IsOptional()
  @IsBoolean()
  shortActingAgents?: boolean;

  @ApiPropertyOptional({ description: 'Minimally invasive approach used' })
  @IsOptional()
  @IsBoolean()
  minimallyInvasive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ErasPostOpDto {
  @ApiPropertyOptional({ description: 'Early mobilisation initiated within 24h' })
  @IsOptional()
  @IsBoolean()
  earlyMobility?: boolean;

  @ApiPropertyOptional({ description: 'Early oral nutrition restarted' })
  @IsOptional()
  @IsBoolean()
  earlyNutrition?: boolean;

  @ApiPropertyOptional({ description: 'Multimodal pain management plan in place' })
  @IsOptional()
  @IsBoolean()
  multimodalPain?: boolean;

  @ApiPropertyOptional({ description: 'Urinary catheter removed early' })
  @IsOptional()
  @IsBoolean()
  earlyCatheterRemoval?: boolean;

  @ApiPropertyOptional({ description: 'VTE prophylaxis applied' })
  @IsOptional()
  @IsBoolean()
  vteProphylaxis?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ErasProtocolDto {
  @ApiProperty({ description: 'Surgical procedure UUID' })
  @IsUUID()
  surgeryId!: string;

  @ApiPropertyOptional({ type: () => ErasPreOpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErasPreOpDto)
  preOp?: ErasPreOpDto;

  @ApiPropertyOptional({ type: () => ErasIntraOpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErasIntraOpDto)
  intraOp?: ErasIntraOpDto;

  @ApiPropertyOptional({ type: () => ErasPostOpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErasPostOpDto)
  postOp?: ErasPostOpDto;

  @ApiPropertyOptional() @IsOptional() @IsString() responsibleId?: string;
}

// ============================================================================
// Response interfaces
// ============================================================================

export interface SpongeCountResult {
  id: string;
  surgeryId: string;
  matches: boolean;
  discrepancyAlert: string | null;
  createdAt: Date;
}

export interface IntraopMonitoringResult {
  id: string;
  surgeryId: string;
  timestamp: string;
  readings: number;
  createdAt: Date;
}

export interface ORMapResult {
  totalRooms: number;
  inUse: number;
  available: number;
  cleaning: number;
  rooms: ORRoomEntryDto[];
  asOf: string;
}

export interface RoomUtilizationResult {
  roomId: string;
  period: string;
  utilizationRate: number;
  usedMinutes: number;
  availableMinutes: number;
  turnoverTime: number;
  delays: number;
  cancellations: number;
  firstCaseOnTime: boolean;
}

export interface PreferenceCardResult {
  id: string;
  surgeonId: string;
  procedureType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErasProtocolResult {
  id: string;
  surgeryId: string;
  completionRate: number;
  phase: string;
  createdAt: Date;
}
