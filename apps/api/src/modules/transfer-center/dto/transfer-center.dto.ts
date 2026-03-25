import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum TransferRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TransferUrgency {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export class CreateTransferRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() admissionId!: string;
  @ApiProperty({ description: 'Destination facility name or ID' }) @IsString() destinationFacility!: string;
  @ApiProperty({ enum: TransferUrgency }) @IsEnum(TransferUrgency) urgency!: TransferUrgency;
  @ApiProperty() @IsString() clinicalReason!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() requiredSpecialty?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() requiredBedType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transportRequirements?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() clinicalSummary?: string;
}

export class TransferDecisionDto {
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() assignedBed?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() estimatedArrival?: string;
}

export class TransferRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() originFacility!: string;
  @ApiProperty() destinationFacility!: string;
  @ApiProperty({ enum: TransferRequestStatus }) status!: TransferRequestStatus;
  @ApiProperty({ enum: TransferUrgency }) urgency!: TransferUrgency;
  @ApiProperty() clinicalReason!: string;
  @ApiPropertyOptional() requiredSpecialty?: string;
  @ApiPropertyOptional() requiredBedType?: string;
  @ApiPropertyOptional() transportRequirements?: string;
  @ApiPropertyOptional() acceptedById?: string;
  @ApiPropertyOptional() rejectionReason?: string;
  @ApiProperty() requestedById!: string;
  @ApiProperty() requestedAt!: Date;
  @ApiPropertyOptional() decidedAt?: Date;
}

export class AvailableBedsResponseDto {
  @ApiProperty() facilities!: Array<{
    facilityName: string;
    facilityId: string;
    beds: Array<{
      bedId: string;
      ward: string;
      room: string;
      bedNumber: string;
      type: string;
      status: string;
    }>;
    totalAvailable: number;
  }>;
}

export class TransferDashboardResponseDto {
  @ApiProperty() pendingRequests!: number;
  @ApiProperty() activeTransfers!: number;
  @ApiProperty() completedToday!: number;
  @ApiProperty() rejectedToday!: number;
  @ApiProperty() avgResponseTimeMinutes!: number;
  @ApiProperty() byUrgency!: Record<string, number>;
  @ApiProperty() recentTransfers!: Array<{
    id: string;
    patientName: string;
    origin: string;
    destination: string;
    status: TransferRequestStatus;
    urgency: TransferUrgency;
    requestedAt: Date;
  }>;
}
