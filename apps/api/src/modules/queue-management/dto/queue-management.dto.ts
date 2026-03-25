import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum QueueType {
  GENERAL = 'GENERAL',
  PRIORITY = 'PRIORITY',
  ELDERLY = 'ELDERLY',
  PREGNANT = 'PREGNANT',
  DISABILITY = 'DISABILITY',
  EMERGENCY = 'EMERGENCY',
}

export enum TicketStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_SERVICE = 'IN_SERVICE',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export class IssueTicketDto {
  @ApiPropertyOptional({ description: 'Patient ID if already registered' })
  @IsUUID() @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Patient name for display' })
  @IsString() @IsOptional()
  patientName?: string;

  @ApiProperty({ enum: QueueType }) @IsEnum(QueueType)
  queueType!: QueueType;

  @ApiPropertyOptional({ description: 'Service/department' })
  @IsString() @IsOptional()
  service?: string;

  @ApiPropertyOptional({ description: 'Specialty or sector' })
  @IsString() @IsOptional()
  specialty?: string;
}

export class CallNextDto {
  @ApiProperty({ description: 'Service point / guichê identifier' })
  @IsString()
  servicePoint!: string;

  @ApiPropertyOptional({ enum: QueueType, description: 'Preferred queue type' })
  @IsEnum(QueueType) @IsOptional()
  preferredQueue?: QueueType;

  @ApiPropertyOptional() @IsString() @IsOptional()
  service?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus }) @IsEnum(TicketStatus)
  status!: TicketStatus;

  @ApiPropertyOptional() @IsString() @IsOptional()
  notes?: string;
}

export class QueueTicketResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ticketNumber!: string;
  @ApiPropertyOptional() patientId?: string;
  @ApiPropertyOptional() patientName?: string;
  @ApiProperty({ enum: QueueType }) queueType!: QueueType;
  @ApiProperty({ enum: TicketStatus }) status!: TicketStatus;
  @ApiPropertyOptional() service?: string;
  @ApiPropertyOptional() servicePoint?: string;
  @ApiProperty() issuedAt!: Date;
  @ApiPropertyOptional() calledAt?: Date;
  @ApiPropertyOptional() completedAt?: Date;
  @ApiPropertyOptional() estimatedWaitMinutes?: number;
  @ApiPropertyOptional() positionInQueue?: number;
}

export class QueueDisplayResponseDto {
  @ApiProperty() currentlyServing!: Array<{
    ticketNumber: string;
    servicePoint: string;
    queueType: QueueType;
    calledAt: Date;
  }>;
  @ApiProperty() nextInLine!: Array<{
    ticketNumber: string;
    queueType: QueueType;
    position: number;
  }>;
  @ApiProperty() lastCalled!: Array<{
    ticketNumber: string;
    servicePoint: string;
    calledAt: Date;
  }>;
  @ApiProperty() updatedAt!: Date;
}

export class QueueStatusResponseDto {
  @ApiProperty() totalWaiting!: number;
  @ApiProperty() totalServing!: number;
  @ApiProperty() totalCompleted!: number;
  @ApiProperty() waitingByType!: Record<string, number>;
  @ApiProperty() avgWaitTimeMinutes!: number;
  @ApiProperty() longestWaitMinutes!: number;
}

export class WaitTimeResponseDto {
  @ApiProperty() estimates!: Array<{
    queueType: QueueType;
    service: string;
    estimatedMinutes: number;
    currentlyWaiting: number;
  }>;
  @ApiProperty() calculatedAt!: Date;
}

export class QueueMetricsResponseDto {
  @ApiProperty() totalTicketsToday!: number;
  @ApiProperty() avgWaitTimeMinutes!: number;
  @ApiProperty() avgServiceTimeMinutes!: number;
  @ApiProperty() noShowRate!: number;
  @ApiProperty() peakHour!: string;
  @ApiProperty() ticketsByHour!: Record<string, number>;
  @ApiProperty() waitTimeByHour!: Record<string, number>;
  @ApiProperty() servicePointEfficiency!: Record<string, number>;
}
