import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum TicketType {
  COMPLAINT = 'COMPLAINT',
  PRAISE = 'PRAISE',
  SUGGESTION = 'SUGGESTION',
  QUESTION = 'QUESTION',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  FORWARDED = 'FORWARDED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class CreateComplaintDto {
  @ApiProperty({ enum: TicketType, description: 'Ticket type' })
  @IsEnum(TicketType)
  type!: TicketType;

  @ApiProperty({ description: 'Subject of the ticket' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Related department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Whether the complaint is anonymous' })
  @IsBoolean()
  isAnonymous!: boolean;
}

export class RespondComplaintDto {
  @ApiProperty({ description: 'Response text' })
  @IsString()
  response!: string;

  @ApiProperty({ enum: [TicketStatus.IN_PROGRESS, TicketStatus.FORWARDED, TicketStatus.RESOLVED, TicketStatus.CLOSED] })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
