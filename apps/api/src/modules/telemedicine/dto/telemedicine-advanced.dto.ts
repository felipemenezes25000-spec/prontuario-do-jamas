import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  IsInt,
  IsPositive,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export enum SharedContentType {
  EXAM = 'exam',
  IMAGE = 'image',
  REPORT = 'report',
}

export enum ParticipantRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  FAMILY = 'family',
  INTERPRETER = 'interpreter',
  RESIDENT = 'resident',
}

export enum RPMDevice {
  BP = 'BP',
  GLUCOSE = 'glucose',
  SPO2 = 'SpO2',
  WEIGHT = 'weight',
}

export enum RPMAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum WaitingRoomAdmitStatus {
  WAITING = 'WAITING',
  ADMITTED = 'ADMITTED',
  DISMISSED = 'DISMISSED',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen Sharing
// ═══════════════════════════════════════════════════════════════════════════════

export class ScreenShareDto {
  @ApiProperty({ description: 'Teleconsultation session UUID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'UUID of the participant sharing their screen' })
  @IsUUID()
  sharedBy: string;

  @ApiProperty({ enum: SharedContentType })
  @IsEnum(SharedContentType)
  contentType: SharedContentType;

  @ApiProperty({ description: 'ISO datetime sharing started' })
  @IsDateString()
  startedAt: string;

  @ApiPropertyOptional({ description: 'ISO datetime sharing ended' })
  @IsOptional()
  @IsDateString()
  endedAt: string | null;
}

export class StartScreenShareDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  sharedBy: string;

  @ApiProperty({ enum: SharedContentType })
  @IsEnum(SharedContentType)
  contentType: SharedContentType;
}

export class StopScreenShareDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  sharedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Text Chat
// ═══════════════════════════════════════════════════════════════════════════════

export class ChatAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;
}

export class TextChatDto {
  @ApiProperty({ description: 'Session UUID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Sender participant UUID' })
  @IsUUID()
  senderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ type: [ChatAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments: ChatAttachmentDto[];

  @ApiProperty({ description: 'ISO datetime' })
  @IsDateString()
  timestamp: string;
}

export class SendChatMessageDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  senderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [ChatAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments: ChatAttachmentDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Virtual Waiting Room
// ═══════════════════════════════════════════════════════════════════════════════

export class WaitingRoomDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'ISO datetime patient joined waiting room' })
  @IsDateString()
  joinedAt: string;

  @ApiProperty({ description: 'Position in queue' })
  @IsInt()
  @IsPositive()
  position: number;

  @ApiPropertyOptional({ description: 'ISO datetime doctor admitted patient' })
  @IsOptional()
  @IsDateString()
  admittedAt: string | null;

  @ApiPropertyOptional({ description: 'Doctor or staff who admitted patient' })
  @IsOptional()
  @IsUUID()
  admittedBy: string | null;

  @ApiProperty({ enum: WaitingRoomAdmitStatus })
  @IsEnum(WaitingRoomAdmitStatus)
  status: WaitingRoomAdmitStatus;
}

export class JoinWaitingRoomDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;
}

export class AdmitFromWaitingRoomDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Doctor/staff admitting the patient' })
  @IsUUID()
  admittedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recording
// ═══════════════════════════════════════════════════════════════════════════════

export class RecordingAccessEntry {
  @ApiProperty()
  @IsUUID()
  accessedBy: string;

  @ApiProperty()
  @IsDateString()
  accessedAt: string;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class RecordingDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Patient explicitly consented to recording (CFM compliance)' })
  @IsBoolean()
  consentGiven: boolean;

  @ApiPropertyOptional({ description: 'S3/CDN URL of the recording' })
  @IsOptional()
  @IsUrl()
  recordingUrl: string | null;

  @ApiProperty({ description: 'Duration in seconds' })
  @IsInt()
  @Min(0)
  duration: number;

  @ApiProperty({ type: [RecordingAccessEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordingAccessEntry)
  accessLog: RecordingAccessEntry[];
}

export class StartRecordingDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'True only if patient has explicitly consented' })
  @IsBoolean()
  consentGiven: boolean;
}

export class LogRecordingAccessDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  accessedBy: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store-and-Forward (Asynchronous Teleconsultation)
// ═══════════════════════════════════════════════════════════════════════════════

export class StoreForwardDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Specialty (e.g. Dermatologia, Oftalmologia)' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({ description: 'S3 URLs of clinical images' })
  @IsArray()
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({ description: 'Clinical description / history' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: "Specialist's written response" })
  @IsOptional()
  @IsString()
  doctorResponse: string | null;

  @ApiPropertyOptional({ description: 'Hours taken for specialist to respond' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  responseTime: number | null;
}

export class CreateStoreForwardDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty()
  @IsArray()
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class RespondStoreForwardDto {
  @ApiProperty()
  @IsUUID()
  caseId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorResponse: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Remote Patient Monitoring (RPM)
// ═══════════════════════════════════════════════════════════════════════════════

export class RPMThresholdDto {
  @ApiProperty({ enum: RPMDevice })
  @IsEnum(RPMDevice)
  device: RPMDevice;

  @ApiProperty({ description: 'Minimum normal value' })
  @IsNumber()
  min: number;

  @ApiProperty({ description: 'Maximum normal value' })
  @IsNumber()
  max: number;
}

export class RPMReadingDto {
  @ApiProperty({ enum: RPMDevice })
  @IsEnum(RPMDevice)
  device: RPMDevice;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'ISO datetime of the reading' })
  @IsDateString()
  recordedAt: string;
}

export class RPMAlertDto {
  @ApiProperty({ enum: RPMDevice })
  device: RPMDevice;

  @ApiProperty()
  value: number;

  @ApiProperty({ enum: RPMAlertSeverity })
  severity: RPMAlertSeverity;

  @ApiProperty()
  message: string;

  @ApiProperty()
  triggeredAt: string;
}

export class RemoteMonitoringDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: RPMDevice, isArray: true })
  @IsArray()
  @IsEnum(RPMDevice, { each: true })
  devices: RPMDevice[];

  @ApiProperty({ type: [RPMReadingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RPMReadingDto)
  readings: RPMReadingDto[];

  @ApiProperty({ type: [RPMThresholdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RPMThresholdDto)
  alertThresholds: RPMThresholdDto[];

  @ApiProperty({ type: [RPMAlertDto] })
  alerts: RPMAlertDto[];
}

export class EnrollRPMDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: RPMDevice, isArray: true })
  @IsArray()
  @IsEnum(RPMDevice, { each: true })
  devices: RPMDevice[];

  @ApiProperty({ type: [RPMThresholdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RPMThresholdDto)
  alertThresholds: RPMThresholdDto[];
}

export class SubmitRPMReadingDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: RPMDevice })
  @IsEnum(RPMDevice)
  device: RPMDevice;

  @ApiProperty()
  @IsNumber()
  value: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Doctor-to-Doctor Teleconsultancy
// ═══════════════════════════════════════════════════════════════════════════════

export class TeleconsultancyDto {
  @ApiProperty({ description: 'Requesting doctor UUID' })
  @IsUUID()
  requestingDoctor: string;

  @ApiProperty({ description: 'Specialist doctor UUID' })
  @IsUUID()
  specialist: string;

  @ApiProperty({ description: 'Specialist specialty (e.g. Cardiologia, Dermatologia)' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Clinical question or reason for teleconsultancy' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({ description: "Specialist's answer" })
  @IsOptional()
  @IsString()
  response: string | null;
}

export class CreateTeleconsultancyDto {
  @ApiProperty()
  @IsUUID()
  requestingDoctor: string;

  @ApiProperty()
  @IsUUID()
  specialist: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class RespondTeleconsultancyDto {
  @ApiProperty()
  @IsUUID()
  consultancyId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  response: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-Participant Calls
// ═══════════════════════════════════════════════════════════════════════════════

export class ParticipantDto {
  @ApiProperty({ enum: ParticipantRole })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ISO datetime participant joined' })
  @IsDateString()
  joinedAt: string;
}

export class MultiParticipantDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ type: [ParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
}

export class AddParticipantDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ enum: ParticipantRole })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class RemoveParticipantDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
