import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// Waitlist
// ═══════════════════════════════════════════════════════════════════════════════

export enum WaitlistTimeSlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  ANY = 'ANY',
}

export enum WaitlistUrgency {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  URGENT = 'URGENT',
}

export enum WaitlistStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export class AddToWaitlistDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Medical specialty (e.g. Cardiologia, Ortopedia)' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiPropertyOptional({ description: 'Preferred doctor ID' })
  @IsOptional()
  @IsUUID()
  preferredDoctorId?: string;

  @ApiPropertyOptional({ description: 'Preferred days of the week (0=Sun to 6=Sat)', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  preferredDays?: number[];

  @ApiProperty({ description: 'Preferred time slot', enum: WaitlistTimeSlot })
  @IsEnum(WaitlistTimeSlot)
  preferredTimeSlot: WaitlistTimeSlot;

  @ApiProperty({ description: 'Clinical urgency', enum: WaitlistUrgency })
  @IsEnum(WaitlistUrgency)
  urgency: WaitlistUrgency;
}

export interface WaitlistEntryDto {
  id: string;
  patientId: string;
  specialty: string;
  preferredDoctorId: string | null;
  preferredDays: number[];
  preferredTimeSlot: WaitlistTimeSlot;
  urgency: WaitlistUrgency;
  addedDate: Date;
  notifiedDate: Date | null;
  bookedDate: Date | null;
  status: WaitlistStatus;
  tenantId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auto-Confirmation / Reminders
// ═══════════════════════════════════════════════════════════════════════════════

export enum ReminderChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum ReminderResponse {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_RESPONSE = 'NO_RESPONSE',
}

export class SendReminderDto {
  @ApiProperty({ description: 'Appointment ID' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Notification channel', enum: ReminderChannel })
  @IsEnum(ReminderChannel)
  channel: ReminderChannel;
}

export class ProcessReminderResponseDto {
  @ApiProperty({ description: 'Appointment ID' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Patient response', enum: ReminderResponse })
  @IsEnum(ReminderResponse)
  response: ReminderResponse;
}

export interface AppointmentReminderDto {
  id: string;
  appointmentId: string;
  patientId: string;
  channel: ReminderChannel;
  sentAt: Date;
  response: ReminderResponse;
  respondedAt: Date | null;
}

export class ReminderConfigDto {
  @ApiPropertyOptional({ description: 'Hours before appointment for first reminder (default 48)', example: 48 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  hoursBeforeFirst?: number;

  @ApiPropertyOptional({ description: 'Hours before appointment for second reminder (default 24)', example: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  hoursBeforeSecond?: number;

  @ApiPropertyOptional({ description: 'Channels to use for reminders', enum: ReminderChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ReminderChannel, { each: true })
  channels?: ReminderChannel[];

  @ApiPropertyOptional({ description: 'Custom message template (use {{patientName}}, {{date}}, {{time}}, {{doctor}})' })
  @IsOptional()
  @IsString()
  messageTemplate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QR Check-in
// ═══════════════════════════════════════════════════════════════════════════════

export interface CheckInTokenDto {
  appointmentId: string;
  patientId: string;
  qrCode: string;
  generatedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export class ProcessQRCheckInDto {
  @ApiProperty({ description: 'QR token scanned at kiosk/reception' })
  @IsString()
  @IsNotEmpty()
  qrCode: string;
}

export interface CheckInResultDto {
  appointmentId: string;
  patientId: string;
  checkedInAt: Date;
  position: number;
  estimatedWaitMinutes: number;
}

export class QueueStatusQueryDto {
  @ApiPropertyOptional({ description: 'Filter by doctor ID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Date (YYYY-MM-DD), defaults to today' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export interface QueueStatusDto {
  doctorId: string | null;
  specialty: string | null;
  currentPosition: number;
  totalWaiting: number;
  averageWaitMinutes: number;
  entries: Array<{
    appointmentId: string;
    patientId: string;
    position: number;
    checkedInAt: Date;
    estimatedWaitMinutes: number;
  }>;
}
