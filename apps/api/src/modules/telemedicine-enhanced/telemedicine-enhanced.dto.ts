import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class JoinWaitingRoomDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Room name' })
  @IsString()
  roomName!: string;
}

export class StartRecordingDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Room name' })
  @IsString()
  roomName!: string;

  @ApiProperty({ description: 'Consent document UUID' })
  @IsUUID()
  consentDocId!: string;
}

export class StopRecordingDto {
  @ApiPropertyOptional({ description: 'Recording URL from provider' })
  @IsOptional()
  @IsString()
  recordingUrl?: string;
}

export class CreateAsyncConsultationDto {
  @ApiProperty({ description: 'Medical specialty' })
  @IsString()
  specialty!: string;

  @ApiProperty({ description: 'Description of symptoms/condition' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class RespondAsyncConsultationDto {
  @ApiProperty({ description: 'Diagnosis' })
  @IsString()
  diagnosis!: string;

  @ApiProperty({ description: 'Recommendation' })
  @IsString()
  recommendation!: string;

  @ApiProperty({ description: 'Whether in-person visit is needed' })
  @IsBoolean()
  needsInPerson!: boolean;
}

export class ConfigureRpmDto {
  @ApiProperty({ description: 'Monitored metrics configuration', type: [Object] })
  @IsArray()
  metrics!: Array<{
    metric: string;
    enabled: boolean;
    lowerThreshold?: number;
    upperThreshold?: number;
    frequency: string;
  }>;

  @ApiPropertyOptional({ description: 'Connected devices', type: [Object] })
  @IsOptional()
  @IsArray()
  devices?: Array<{ type: string; deviceId: string; brand: string }>;
}

export class SubmitRpmReadingDto {
  @ApiProperty({ description: 'Metric name: BP_SYSTOLIC, BP_DIASTOLIC, GLUCOSE, SPO2, WEIGHT, HEART_RATE' })
  @IsString()
  metric!: string;

  @ApiProperty({ description: 'Numeric value' })
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RequestDoctorConsultDto {
  @ApiProperty({ description: 'Encounter UUID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Target specialty' })
  @IsString()
  targetSpecialty!: string;

  @ApiPropertyOptional({ description: 'Target doctor UUID' })
  @IsOptional()
  @IsUUID()
  targetDoctorId?: string;

  @ApiProperty({ description: 'Consult type: TELE_ECG, TELE_DERMA, TELE_STROKE, GENERAL' })
  @IsIn(['TELE_ECG', 'TELE_DERMA', 'TELE_STROKE', 'GENERAL'])
  consultType!: string;

  @ApiProperty({ description: 'Urgency: ROUTINE, URGENT, EMERGENCY' })
  @IsIn(['ROUTINE', 'URGENT', 'EMERGENCY'])
  urgency!: string;

  @ApiProperty({ description: 'Clinical question' })
  @IsString()
  clinicalQuestion!: string;

  @ApiPropertyOptional({ description: 'Attachment URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class AddParticipantDto {
  @ApiProperty({ description: 'Participant name' })
  @IsString()
  participantName!: string;

  @ApiProperty({ description: 'Role: FAMILY_MEMBER, INTERPRETER, RESIDENT, SPECIALIST' })
  @IsIn(['FAMILY_MEMBER', 'INTERPRETER', 'RESIDENT', 'SPECIALIST'])
  role!: string;

  @ApiPropertyOptional({ description: 'Participant email for invitation' })
  @IsOptional()
  @IsString()
  email?: string;
}
