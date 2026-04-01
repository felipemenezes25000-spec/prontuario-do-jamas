import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum TeleconsultationType {
  SYNCHRONOUS = 'SYNCHRONOUS',
  ASYNCHRONOUS = 'ASYNCHRONOUS',
  TELECONSULTORIA = 'TELECONSULTORIA',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING_ROOM = 'WAITING_ROOM',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum ParticipantRole {
  PATIENT = 'PATIENT',
  PROVIDER = 'PROVIDER',
  FAMILY = 'FAMILY',
  INTERPRETER = 'INTERPRETER',
  RESIDENT = 'RESIDENT',
  SPECIALIST = 'SPECIALIST',
}

export enum WaitingRoomStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  ADMITTED = 'ADMITTED',
  LEFT = 'LEFT',
}

export enum ScreenShareContentType {
  EXAM_RESULTS = 'EXAM_RESULTS',
  IMAGING = 'IMAGING',
  DOCUMENT = 'DOCUMENT',
  SCREEN = 'SCREEN',
  PRESENTATION = 'PRESENTATION',
}

export enum ConsentMethod {
  VERBAL = 'VERBAL',
  WRITTEN = 'WRITTEN',
  DIGITAL = 'DIGITAL',
}

export enum RetentionPolicy {
  STANDARD_5Y = 'STANDARD_5Y',
  EXTENDED_20Y = 'EXTENDED_20Y',
}

export enum StoreForwardAttachmentType {
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
  LAB_RESULT = 'LAB_RESULT',
  IMAGING = 'IMAGING',
}

export enum StoreForwardUrgency {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  URGENT = 'URGENT',
}

export enum StoreForwardStatus {
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export enum RPMCondition {
  HYPERTENSION = 'HYPERTENSION',
  DIABETES = 'DIABETES',
  CHF = 'CHF',
  COPD = 'COPD',
  POST_SURGICAL = 'POST_SURGICAL',
  PREGNANCY = 'PREGNANCY',
}

export enum RPMDeviceType {
  BP_MONITOR = 'BP_MONITOR',
  GLUCOMETER = 'GLUCOMETER',
  PULSE_OXIMETER = 'PULSE_OXIMETER',
  SCALE = 'SCALE',
  THERMOMETER = 'THERMOMETER',
  ECG_PATCH = 'ECG_PATCH',
}

export enum RPMReadingSource {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  WEARABLE = 'WEARABLE',
}

export enum RPMAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum TeleconsultoriaMethod {
  VIDEO = 'VIDEO',
  PHONE = 'PHONE',
  CHAT = 'CHAT',
  ASYNC = 'ASYNC',
}

export enum MultiParticipantRole {
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  INTERPRETER_LIBRAS = 'INTERPRETER_LIBRAS',
  INTERPRETER_LANGUAGE = 'INTERPRETER_LANGUAGE',
  RESIDENT = 'RESIDENT',
  PRECEPTOR = 'PRECEPTOR',
  SPECIALIST = 'SPECIALIST',
  SOCIAL_WORKER = 'SOCIAL_WORKER',
}

// ============================================================================
// (a) Video Session Management
// ============================================================================

export class SessionParticipantDto {
  @ApiProperty() @IsUUID() id!: string;

  @ApiProperty({ enum: ParticipantRole })
  @IsEnum(ParticipantRole)
  role!: ParticipantRole;
}

export class CreateTeleconsultationDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() providerId!: string;

  @ApiProperty({ enum: TeleconsultationType })
  @IsEnum(TeleconsultationType)
  type!: TeleconsultationType;

  @ApiProperty() @IsDateString() scheduledAt!: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  @Min(5)
  @Max(480)
  duration!: number;

  @ApiProperty({ type: [SessionParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionParticipantDto)
  participants!: SessionParticipantDto[];
}

export class SessionStatusDto {
  @ApiProperty() @IsUUID() sessionId!: string;

  @ApiProperty({ enum: SessionStatus })
  @IsEnum(SessionStatus)
  status!: SessionStatus;

  @ApiPropertyOptional() @IsDateString() @IsOptional() startedAt?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endedAt?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() actualDuration?: number;
}

// ============================================================================
// (b) Virtual Waiting Room
// ============================================================================

export class WaitingRoomDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() joinedAt?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() position?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() estimatedWaitMinutes?: number;

  @ApiPropertyOptional({ enum: WaitingRoomStatus })
  @IsEnum(WaitingRoomStatus)
  @IsOptional()
  status?: WaitingRoomStatus;
}

export class WaitingRoomPatientInfoDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsNumber() waitMinutes!: number;
  @ApiProperty() @IsString() appointmentType!: string;

  @ApiProperty({ enum: WaitingRoomStatus })
  @IsEnum(WaitingRoomStatus)
  status!: WaitingRoomStatus;
}

export class WaitingRoomDashboardDto {
  @ApiProperty() @IsNumber() totalWaiting!: number;
  @ApiProperty() @IsNumber() averageWaitMinutes!: number;

  @ApiProperty({ type: [WaitingRoomPatientInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaitingRoomPatientInfoDto)
  patients!: WaitingRoomPatientInfoDto[];
}

// ============================================================================
// (c) Screen Sharing
// ============================================================================

export class ScreenShareDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiProperty() @IsUUID() sharedBy!: string;

  @ApiProperty({ enum: ScreenShareContentType })
  @IsEnum(ScreenShareContentType)
  contentType!: ScreenShareContentType;

  @ApiPropertyOptional({ description: 'Reference to exam/image ID' })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional() @IsDateString() @IsOptional() startedAt?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endedAt?: string;
}

// ============================================================================
// (d) In-session Chat
// ============================================================================

export class ChatAttachmentDto {
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsUrl() url!: string;
  @ApiProperty() @IsString() name!: string;
}

export class SessionChatMessageDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiProperty() @IsUUID() senderId!: string;
  @ApiProperty() @IsString() senderRole!: string;
  @ApiProperty() @IsString() @MaxLength(5000) message!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() timestamp?: string;

  @ApiPropertyOptional({ type: [ChatAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  @IsOptional()
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional() @IsBoolean() @IsOptional() isSystemMessage?: boolean;
}

// ============================================================================
// (e) Recording with Consent
// ============================================================================

export class RecordingConsentDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsBoolean() consentGiven!: boolean;

  @ApiProperty({ enum: ConsentMethod })
  @IsEnum(ConsentMethod)
  consentMethod!: ConsentMethod;

  @ApiPropertyOptional() @IsDateString() @IsOptional() consentTimestamp?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() witnessId?: string;
}

export class RecordingDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startedAt?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endedAt?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() duration?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() storageKey?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() fileSize?: number;

  @ApiPropertyOptional({ enum: RetentionPolicy })
  @IsEnum(RetentionPolicy)
  @IsOptional()
  retentionPolicy?: RetentionPolicy;

  @ApiPropertyOptional() @IsUUID() @IsOptional() consentId?: string;
}

// ============================================================================
// (f) Store-and-Forward (Asynchronous)
// ============================================================================

export class StoreForwardAttachmentDto {
  @ApiProperty({ enum: StoreForwardAttachmentType })
  @IsEnum(StoreForwardAttachmentType)
  type!: StoreForwardAttachmentType;

  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() storageKey!: string;
}

export class StoreForwardCaseDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() requestingProviderId!: string;
  @ApiProperty() @IsString() targetSpecialty!: string;
  @ApiProperty() @IsString() @MaxLength(5000) clinicalQuestion!: string;

  @ApiPropertyOptional({ type: [StoreForwardAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreForwardAttachmentDto)
  @IsOptional()
  attachments?: StoreForwardAttachmentDto[];

  @ApiPropertyOptional({ enum: StoreForwardUrgency })
  @IsEnum(StoreForwardUrgency)
  @IsOptional()
  urgency?: StoreForwardUrgency;

  @ApiPropertyOptional({ enum: StoreForwardStatus })
  @IsEnum(StoreForwardStatus)
  @IsOptional()
  status?: StoreForwardStatus;
}

export class StoreForwardResponseDto {
  @ApiProperty() @IsUUID() caseId!: string;
  @ApiProperty() @IsUUID() respondingProviderId!: string;
  @ApiProperty() @IsString() @MaxLength(10000) response!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recommendations?: string;
  @ApiProperty() @IsBoolean() followUpNeeded!: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() respondedAt?: string;
}

// ============================================================================
// (g) Remote Patient Monitoring (RPM)
// ============================================================================

export class RPMDeviceDto {
  @ApiProperty({ enum: RPMDeviceType })
  @IsEnum(RPMDeviceType)
  type!: RPMDeviceType;

  @ApiProperty() @IsString() brand!: string;
  @ApiProperty() @IsString() model!: string;
}

export class RPMAlertThresholdDto {
  @ApiProperty() @IsString() metric!: string;
  @ApiProperty() @IsNumber() min!: number;
  @ApiProperty() @IsNumber() max!: number;

  @ApiProperty({ enum: RPMAlertSeverity })
  @IsEnum(RPMAlertSeverity)
  severity!: RPMAlertSeverity;
}

export class RPMMonitoringPlanDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  metrics!: string[];

  @ApiProperty({ description: 'Frequency description, e.g. "2x daily"' })
  @IsString()
  frequency!: string;

  @ApiProperty({ type: [RPMAlertThresholdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RPMAlertThresholdDto)
  alertThresholds!: RPMAlertThresholdDto[];
}

export class RPMEnrollmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() providerId!: string;

  @ApiProperty({ enum: RPMCondition })
  @IsEnum(RPMCondition)
  condition!: RPMCondition;

  @ApiProperty({ type: [RPMDeviceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RPMDeviceDto)
  devices!: RPMDeviceDto[];

  @ApiProperty({ type: RPMMonitoringPlanDto })
  @ValidateNested()
  @Type(() => RPMMonitoringPlanDto)
  monitoringPlan!: RPMMonitoringPlanDto;
}

export class RPMReadingDto {
  @ApiProperty() @IsUUID() enrollmentId!: string;

  @ApiProperty({ enum: RPMDeviceType })
  @IsEnum(RPMDeviceType)
  deviceType!: RPMDeviceType;

  @ApiProperty({ description: 'Map of metric name to numeric value' })
  @IsObject()
  values!: Record<string, number>;

  @ApiProperty() @IsDateString() readingTimestamp!: string;

  @ApiProperty({ enum: RPMReadingSource })
  @IsEnum(RPMReadingSource)
  source!: RPMReadingSource;
}

export class RPMAlertDto {
  @ApiProperty() @IsUUID() enrollmentId!: string;
  @ApiProperty() @IsString() metric!: string;
  @ApiProperty() @IsNumber() value!: number;
  @ApiProperty() @IsNumber() threshold!: number;

  @ApiProperty({ enum: RPMAlertSeverity })
  @IsEnum(RPMAlertSeverity)
  severity!: RPMAlertSeverity;

  @ApiPropertyOptional() @IsBoolean() @IsOptional() acknowledged?: boolean;
}

// ============================================================================
// (h) Teleconsultoria (Provider-to-Provider)
// ============================================================================

export class TeleconsultoriaAttachmentDto {
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsString() storageKey!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

export class TeleconsultoriaDto {
  @ApiProperty() @IsUUID() requestingProviderId!: string;
  @ApiProperty() @IsString() requestingSpecialty!: string;
  @ApiProperty() @IsString() consultantSpecialty!: string;
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() @MaxLength(5000) clinicalQuestion!: string;

  @ApiPropertyOptional({ enum: StoreForwardUrgency })
  @IsEnum(StoreForwardUrgency)
  @IsOptional()
  urgency?: StoreForwardUrgency;

  @ApiPropertyOptional({ enum: TeleconsultoriaMethod })
  @IsEnum(TeleconsultoriaMethod)
  @IsOptional()
  preferredMethod?: TeleconsultoriaMethod;

  @ApiPropertyOptional({ type: [TeleconsultoriaAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeleconsultoriaAttachmentDto)
  @IsOptional()
  attachments?: TeleconsultoriaAttachmentDto[];
}

export class TeleconsultoriaResponseDto {
  @ApiProperty() @IsUUID() requestId!: string;
  @ApiProperty() @IsUUID() consultantId!: string;
  @ApiProperty() @IsString() @MaxLength(10000) response!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recommendations?: string;
  @ApiProperty() @IsBoolean() referralNeeded!: boolean;
}

// ============================================================================
// (i) Multi-participant Session
// ============================================================================

export class AddParticipantDto {
  @ApiProperty() @IsUUID() sessionId!: string;
  @ApiProperty() @IsUUID() participantId!: string;

  @ApiProperty({ enum: MultiParticipantRole })
  @IsEnum(MultiParticipantRole)
  role!: MultiParticipantRole;

  @ApiPropertyOptional() @IsDateString() @IsOptional() joinedAt?: string;
}
