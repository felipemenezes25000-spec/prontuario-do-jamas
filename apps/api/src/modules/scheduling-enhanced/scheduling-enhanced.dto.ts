import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, IsNumber, IsIn, IsDateString, Min, Max } from 'class-validator';

export class AddToWaitlistDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Preferred doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Priority 1-10 (1=highest)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class BlockScheduleDto {
  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Reason (e.g. Férias, Congresso)' })
  @IsString()
  reason!: string;

  @ApiProperty({ description: 'Block start date ISO 8601' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Block end date ISO 8601' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Whether to auto-reallocate affected appointments' })
  @IsBoolean()
  autoReallocate!: boolean;
}

export class RegisterWalkInDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Visit reason' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Urgency: LOW, MEDIUM, HIGH' })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  urgency?: string;
}

export class CheckMultiResourceDto {
  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiPropertyOptional({ description: 'Room identifier' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Equipment identifier' })
  @IsOptional()
  @IsString()
  equipmentId?: string;

  @ApiProperty({ description: 'Date YYYY-MM-DD' })
  @IsString()
  date!: string;

  @ApiProperty({ description: 'Time HH:mm' })
  @IsString()
  time!: string;
}

export class CallNextPatientDto {
  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Room/consultório' })
  @IsString()
  room!: string;
}

export class CreateRecurringScheduleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: 'Appointment type' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Interval in months: 3, 6 or 12', enum: [3, 6, 12] })
  @IsNumber()
  @IsIn([3, 6, 12])
  intervalMonths!: 3 | 6 | 12;

  @ApiProperty({ description: 'Number of occurrences (max 24)' })
  @IsNumber()
  @Min(1)
  @Max(24)
  occurrences!: number;

  @ApiProperty({ description: 'First appointment date ISO 8601' })
  @IsDateString()
  firstDate!: string;

  @ApiPropertyOptional({ description: 'Duration in minutes (default 30)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(240)
  duration?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SmartSchedulingDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Preferred doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ description: 'Consultation complexity', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  complexity!: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({ description: 'Preferred time slots HH:mm' })
  @IsOptional()
  preferredTimeSlots?: string[];
}
