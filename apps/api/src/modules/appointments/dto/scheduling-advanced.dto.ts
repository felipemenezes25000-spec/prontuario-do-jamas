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
  Max,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export enum ConfirmationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
}

export enum ConfirmationResponse {
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
}

export enum WalkInUrgency {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  EMERGENCY = 'EMERGENCY',
}

export enum BlockReason {
  VACATION = 'vacation',
  CONFERENCE = 'conference',
  PERSONAL = 'personal',
  TRAINING = 'training',
  MAINTENANCE = 'maintenance',
}

export enum RecurringInterval {
  THREE_MONTHS = 3,
  SIX_MONTHS = 6,
  TWELVE_MONTHS = 12,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auto-Confirmation
// ═══════════════════════════════════════════════════════════════════════════════

export class AutoConfirmationDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ enum: ConfirmationChannel, description: 'Notification channel' })
  @IsEnum(ConfirmationChannel)
  channel: ConfirmationChannel;

  @ApiProperty({ description: 'ISO datetime when message was sent' })
  @IsDateString()
  sentAt: string;

  @ApiPropertyOptional({ description: 'ISO datetime when patient confirmed' })
  @IsOptional()
  @IsDateString()
  confirmedAt: string | null;

  @ApiPropertyOptional({ enum: ConfirmationResponse, description: 'Patient response' })
  @IsOptional()
  @IsEnum(ConfirmationResponse)
  response: ConfirmationResponse | null;
}

export class SendConfirmationDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ enum: ConfirmationChannel })
  @IsEnum(ConfirmationChannel)
  channel: ConfirmationChannel;
}

export class ProcessConfirmationResponseDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ enum: ConfirmationResponse })
  @IsEnum(ConfirmationResponse)
  response: ConfirmationResponse;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Waitlist (Advanced)
// ═══════════════════════════════════════════════════════════════════════════════

export class WaitlistDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Medical specialty' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiPropertyOptional({ description: 'Preferred doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctor: string | null;

  @ApiProperty({ description: '1 = highest priority' })
  @IsInt()
  @Min(1)
  @Max(5)
  priority: number;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  notifiedAt: string | null;

  @ApiPropertyOptional({ description: 'Slot offered ISO datetime' })
  @IsOptional()
  @IsDateString()
  slotOffered: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recurring Appointments
// ═══════════════════════════════════════════════════════════════════════════════

export class RecurringAppointmentDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ enum: [3, 6, 12], description: 'Interval in months' })
  @IsEnum([3, 6, 12])
  intervalMonths: 3 | 6 | 12;

  @ApiProperty({ description: 'ISO date for first occurrence' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Send auto-reminder before each appointment' })
  @IsBoolean()
  autoReminder: boolean;
}

export class CreateRecurringDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ enum: [3, 6, 12] })
  @IsEnum([3, 6, 12])
  intervalMonths: 3 | 6 | 12;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsBoolean()
  autoReminder: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agenda Block
// ═══════════════════════════════════════════════════════════════════════════════

export class AgendaBlockDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'Block start ISO datetime' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Block end ISO datetime' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: BlockReason })
  @IsEnum(BlockReason)
  reason: BlockReason;

  @ApiProperty({ description: 'Automatically reallocate existing patients to other slots' })
  @IsBoolean()
  autoReallocatePatients: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Queue / TV Panel
// ═══════════════════════════════════════════════════════════════════════════════

export class QueueCallDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Sequential queue number displayed on TV panel' })
  @IsInt()
  @IsPositive()
  queueNumber: number;

  @ApiProperty({ description: 'Whether call is shown on TV panel display' })
  @IsBoolean()
  tvPanelDisplay: boolean;

  @ApiProperty({ description: 'Staff member or system that called the patient' })
  @IsString()
  @IsNotEmpty()
  calledBy: string;

  @ApiProperty({ description: 'Room or desk where patient should go' })
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiProperty({ description: 'Estimated wait time in minutes' })
  @IsInt()
  @Min(0)
  waitTimeMinutes: number;
}

export class CallPatientDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  calledBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Walk-In / Encaixe
// ═══════════════════════════════════════════════════════════════════════════════

export class WalkInDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'ISO datetime of patient arrival' })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({ enum: WalkInUrgency })
  @IsEnum(WalkInUrgency)
  urgency: WalkInUrgency;

  @ApiProperty({ description: 'Position in walk-in queue' })
  @IsInt()
  @IsPositive()
  queuePosition: number;

  @ApiPropertyOptional({ description: 'Assigned doctor UUID' })
  @IsOptional()
  @IsUUID()
  assignedDoctor: string | null;
}

export class RegisterWalkInDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: WalkInUrgency })
  @IsEnum(WalkInUrgency)
  urgency: WalkInUrgency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  preferredDoctorId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Overbooking
// ═══════════════════════════════════════════════════════════════════════════════

export class OverbookingDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'ISO date for the schedule day' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Standard slots available' })
  @IsInt()
  @IsPositive()
  maxSlots: number;

  @ApiProperty({ description: 'Slots already booked' })
  @IsInt()
  @Min(0)
  bookedSlots: number;

  @ApiProperty({ description: 'Historical no-show rate 0–1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  noShowRate: number;

  @ApiProperty({ description: 'Extra slots allowed based on no-show rate' })
  @IsInt()
  @Min(0)
  allowedOverbook: number;
}

export class OverbookingConfigDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'ISO date' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Max overbook percentage (e.g. 0.2 = 20%)' })
  @IsNumber()
  @Min(0)
  @Max(0.5)
  maxOverbookRatio: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-Resource Availability
// ═══════════════════════════════════════════════════════════════════════════════

export class MultiResourceDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional({ description: 'Room/consultation room UUID' })
  @IsOptional()
  @IsUUID()
  roomId: string | null;

  @ApiPropertyOptional({ description: 'Equipment/device UUID' })
  @IsOptional()
  @IsUUID()
  equipmentId: string | null;

  @ApiProperty({ description: 'ISO date to check availability' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'All three resources are available simultaneously' })
  @IsBoolean()
  allAvailable: boolean;
}

export class CheckMultiResourceDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomId: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipmentId: string | null;

  @ApiProperty({ description: 'ISO datetime for start of desired slot' })
  @IsDateString()
  startDatetime: string;

  @ApiProperty({ description: 'ISO datetime for end of desired slot' })
  @IsDateString()
  endDatetime: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QR Check-In
// ═══════════════════════════════════════════════════════════════════════════════

export class QrCheckinDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  appointmentId: string;

  @ApiProperty({ description: 'QR code payload string' })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({ description: 'ISO datetime when patient scanned QR' })
  @IsDateString()
  checkinTime: string;

  @ApiProperty({ description: 'Whether appointment status was automatically updated to arrived' })
  @IsBoolean()
  autoStatusUpdate: boolean;
}

export class ProcessQrCheckinDto {
  @ApiProperty({ description: 'QR code payload scanned by patient' })
  @IsString()
  @IsNotEmpty()
  qrCode: string;
}

export class GenerateQrCheckinDto {
  @ApiProperty()
  @IsUUID()
  appointmentId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wait Time Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export class DoctorWaitAverageDto {
  @ApiProperty()
  doctorId: string;

  @ApiProperty()
  doctorName: string;

  @ApiProperty({ description: 'Average wait in minutes' })
  averageMinutes: number;
}

export class ShiftWaitAverageDto {
  @ApiProperty({ description: 'morning / afternoon / evening' })
  shift: string;

  @ApiProperty()
  averageMinutes: number;
}

export class WeekdayWaitAverageDto {
  @ApiProperty({ description: '0 = Sunday … 6 = Saturday' })
  weekday: number;

  @ApiProperty()
  weekdayLabel: string;

  @ApiProperty()
  averageMinutes: number;
}

export class RecordWaitTimeDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiProperty({ description: 'Wait time in minutes' })
  @IsInt()
  @Min(0)
  waitMinutes: number;
}

export class WaitTimeDashboardDto {
  @ApiProperty({ type: [DoctorWaitAverageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorWaitAverageDto)
  averageByDoctor: DoctorWaitAverageDto[];

  @ApiProperty({ type: [ShiftWaitAverageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftWaitAverageDto)
  averageByShift: ShiftWaitAverageDto[];

  @ApiProperty({ type: [WeekdayWaitAverageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeekdayWaitAverageDto)
  averageByWeekday: WeekdayWaitAverageDto[];

  @ApiProperty({ description: 'Bottleneck descriptions' })
  @IsArray()
  @IsString({ each: true })
  bottlenecks: string[];
}
