import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum HousekeepingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum HousekeepingType {
  TERMINAL = 'TERMINAL',
  CONCURRENT = 'CONCURRENT',
  DISCHARGE = 'DISCHARGE',
  EMERGENCY = 'EMERGENCY',
}

export class CreateHousekeepingRequestDto {
  @ApiProperty({ description: 'Ward/location' }) @IsString() location!: string;
  @ApiPropertyOptional({ description: 'Room number' }) @IsString() @IsOptional() room?: string;
  @ApiPropertyOptional({ description: 'Bed ID' }) @IsUUID() @IsOptional() bedId?: string;
  @ApiProperty({ enum: HousekeepingType }) @IsEnum(HousekeepingType) type!: HousekeepingType;
  @ApiPropertyOptional({ description: 'Priority level' }) @IsString() @IsOptional() priority?: string;
  @ApiPropertyOptional({ description: 'Additional notes' }) @IsString() @IsOptional() notes?: string;
}

export class UpdateHousekeepingStatusDto {
  @ApiProperty({ enum: HousekeepingStatus }) @IsEnum(HousekeepingStatus) status!: HousekeepingStatus;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() assignedTo?: string;
}

export class CreateLaundryOrderDto {
  @ApiProperty() @IsString() location!: string;
  @ApiProperty() @IsString() itemType!: string;
  @ApiPropertyOptional() @IsOptional() quantity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() priority?: string;
}

export class RegisterCompanionDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() companionName!: string;
  @ApiProperty() @IsString() companionCpf!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() relationship?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() badgeNumber?: string;
}

export class HousekeepingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() location!: string;
  @ApiPropertyOptional() room?: string;
  @ApiProperty({ enum: HousekeepingType }) type!: HousekeepingType;
  @ApiProperty({ enum: HousekeepingStatus }) status!: HousekeepingStatus;
  @ApiPropertyOptional() assignedTo?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() requestedAt!: Date;
  @ApiPropertyOptional() completedAt?: Date;
}

export class LaundryOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() location!: string;
  @ApiProperty() itemType!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() status!: string;
  @ApiProperty() orderedAt!: Date;
}

export class CompanionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() companionName!: string;
  @ApiProperty() companionCpf!: string;
  @ApiPropertyOptional() relationship?: string;
  @ApiPropertyOptional() badgeNumber?: string;
  @ApiProperty() registeredAt!: Date;
}

export class HospitalityDashboardResponseDto {
  @ApiProperty() pendingRequests!: number;
  @ApiProperty() inProgressRequests!: number;
  @ApiProperty() completedToday!: number;
  @ApiProperty() avgCompletionTimeMinutes!: number;
  @ApiProperty() laundryOrdersToday!: number;
  @ApiProperty() activeCompanions!: number;
  @ApiProperty() requestsByType!: Record<string, number>;
}
