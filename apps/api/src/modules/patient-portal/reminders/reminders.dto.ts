import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsDateString } from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ description: 'Type: APPOINTMENT, VACCINE, FOLLOW_UP, MEDICATION, CUSTOM' })
  @IsIn(['APPOINTMENT', 'VACCINE', 'FOLLOW_UP', 'MEDICATION', 'CUSTOM'])
  reminderType!: string;

  @ApiProperty({ description: 'Channel: SMS, WHATSAPP, EMAIL, PUSH' })
  @IsIn(['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'])
  channel!: string;

  @ApiProperty({ description: 'Reminder title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Reminder message body' })
  @IsString()
  message!: string;

  @ApiProperty({ description: 'When to send ISO 8601' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Related entity UUID (appointment, etc.)' })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional({ description: 'Whether this is a recurring reminder' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Recurrence rule (e.g. RRULE:FREQ=MONTHLY)' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;
}
