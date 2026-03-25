import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum BreakTheGlassReason {
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  PATIENT_UNRESPONSIVE = 'PATIENT_UNRESPONSIVE',
  CRITICAL_LAB_RESULT = 'CRITICAL_LAB_RESULT',
  MEDICATION_RECONCILIATION = 'MEDICATION_RECONCILIATION',
  PUBLIC_HEALTH_EMERGENCY = 'PUBLIC_HEALTH_EMERGENCY',
  OTHER = 'OTHER',
}

export enum BreakTheGlassStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVIEWED = 'REVIEWED',
  FLAGGED = 'FLAGGED',
}

export class RequestEmergencyAccessDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: BreakTheGlassReason }) @IsEnum(BreakTheGlassReason) reason!: BreakTheGlassReason;
  @ApiProperty({ description: 'Detailed justification for emergency access' })
  @IsString()
  justification!: string;
  @ApiPropertyOptional({ description: 'Duration in minutes (default: 60)' })
  @IsOptional()
  durationMinutes?: number;
}

export class BreakTheGlassEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty() userRole!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ enum: BreakTheGlassReason }) reason!: BreakTheGlassReason;
  @ApiProperty() justification!: string;
  @ApiProperty({ enum: BreakTheGlassStatus }) status!: BreakTheGlassStatus;
  @ApiProperty() accessGrantedAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiPropertyOptional() reviewedById?: string;
  @ApiPropertyOptional() reviewedAt?: Date;
  @ApiPropertyOptional() reviewNotes?: string;
  @ApiProperty() actionsPerformed!: string[];
}

export class BreakTheGlassAlertDto {
  @ApiProperty() eventId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ enum: BreakTheGlassReason }) reason!: BreakTheGlassReason;
  @ApiProperty() accessGrantedAt!: Date;
  @ApiProperty() requiresReview!: boolean;
  @ApiPropertyOptional() flagReason?: string;
}

export class BreakTheGlassAlertsResponseDto {
  @ApiProperty({ type: [BreakTheGlassAlertDto] }) alerts!: BreakTheGlassAlertDto[];
  @ApiProperty() totalUnreviewed!: number;
}
