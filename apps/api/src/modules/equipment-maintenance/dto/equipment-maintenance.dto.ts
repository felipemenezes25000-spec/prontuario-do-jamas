import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  CALIBRATION = 'CALIBRATION',
  INSPECTION = 'INSPECTION',
}

export enum EquipmentStatus {
  OPERATIONAL = 'OPERATIONAL',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export class RegisterEquipmentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() model!: string;
  @ApiProperty() @IsString() manufacturer!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() serialNumber?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() anvisaRegistration?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() department?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() purchaseDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() warrantyExpiry?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() preventiveIntervalDays?: number;
}

export class RecordMaintenanceDto {
  @ApiProperty({ enum: MaintenanceType }) @IsEnum(MaintenanceType) type!: MaintenanceType;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() technician?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() serviceProvider?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cost?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() partsReplaced?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() nextScheduledDate?: string;
}

export class RecordCalibrationDto {
  @ApiProperty() @IsString() standard!: string;
  @ApiProperty() @IsString() result!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() certificate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() nextCalibrationDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() calibratedBy?: string;
}

export class EquipmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() model!: string;
  @ApiProperty() manufacturer!: string;
  @ApiPropertyOptional() serialNumber?: string;
  @ApiProperty({ enum: EquipmentStatus }) status!: EquipmentStatus;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() department?: string;
  @ApiPropertyOptional() lastMaintenanceAt?: Date;
  @ApiPropertyOptional() nextMaintenanceAt?: Date;
  @ApiProperty() createdAt!: Date;
}

export class MaintenanceEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() equipmentId!: string;
  @ApiProperty({ enum: MaintenanceType }) type!: MaintenanceType;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() technician?: string;
  @ApiPropertyOptional() cost?: number;
  @ApiProperty() performedAt!: Date;
  @ApiPropertyOptional() nextScheduledDate?: Date;
}

export class MaintenanceCalendarResponseDto {
  @ApiProperty() items!: Array<{
    equipmentId: string;
    equipmentName: string;
    type: MaintenanceType;
    scheduledDate: Date;
    department?: string;
    overdue: boolean;
  }>;
}

export class OverdueMaintenanceResponseDto {
  @ApiProperty() alerts!: Array<{
    equipmentId: string;
    equipmentName: string;
    type: string;
    scheduledDate: Date;
    daysOverdue: number;
    department?: string;
  }>;
  @ApiProperty() totalOverdue!: number;
}
