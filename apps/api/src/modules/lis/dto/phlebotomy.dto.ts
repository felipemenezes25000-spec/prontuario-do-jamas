import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class PhlebotomyFilterDto {
  @ApiPropertyOptional({ description: 'Ward / floor filter' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ description: 'Date filter (ISO date string)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Sort urgent samples first' })
  @IsOptional()
  @IsBoolean()
  urgentFirst?: boolean;
}

export class MarkCollectedDto {
  @ApiProperty({ description: 'ID of the professional who collected the sample' })
  @IsUUID()
  @IsNotEmpty()
  collectedBy: string;

  @ApiProperty({ description: 'Date/time of collection (ISO string)' })
  @IsDateString()
  @IsNotEmpty()
  collectedAt: string;

  @ApiPropertyOptional({ description: 'Additional notes about the collection' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Response Interfaces (used internally, not DTOs) ─────────────────────────

export interface TubeNeeded {
  color: string;
  sampleType: string;
  examName: string;
}

export type PhlebotomyUrgency = 'STAT' | 'URGENT' | 'ROUTINE';

export interface PhlebotomyWorklistItem {
  sampleId: string;
  patientId: string;
  patientName: string;
  room: string;
  bed: string;
  tubesNeeded: TubeNeeded[];
  fastingRequired: boolean;
  specialInstructions: string | null;
  collectionTime: string;
  urgency: PhlebotomyUrgency;
  ward: string;
}

export interface PhlebotomyStats {
  date: string;
  totalPending: number;
  totalCollected: number;
  totalRefused: number;
  byHour: Array<{ hour: number; pending: number; collected: number }>;
}
