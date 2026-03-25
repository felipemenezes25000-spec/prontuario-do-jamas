import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsInt, IsIn, IsDateString, IsArray } from 'class-validator';

export class ScheduleAppointmentDto {
  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Desired date/time ISO 8601' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Appointment type (FIRST_VISIT, RETURN, FOLLOW_UP)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Whether telemedicine' })
  @IsOptional()
  @IsBoolean()
  isTelemedicine?: boolean;

  @ApiPropertyOptional({ description: 'Patient notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New date/time ISO 8601' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class JoinWaitlistDto {
  @ApiPropertyOptional({ description: 'Preferred doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Preferred days of week (0=Sun, 6=Sat)', type: [Number] })
  @IsOptional()
  @IsArray()
  preferredDays?: number[];

  @ApiPropertyOptional({ description: 'Preferred time start HH:mm' })
  @IsOptional()
  @IsString()
  preferredTimeStart?: string;

  @ApiPropertyOptional({ description: 'Preferred time end HH:mm' })
  @IsOptional()
  @IsString()
  preferredTimeEnd?: string;
}

export class CreateRecurringScheduleDto {
  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Interval in months (3, 6, or 12)' })
  @IsInt()
  @IsIn([3, 6, 12])
  intervalMonths!: number;

  @ApiPropertyOptional({ description: 'Appointment type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
