import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum RecordPurpose {
  CLINICAL_CARE = 'CLINICAL_CARE',
  AUDIT = 'AUDIT',
  RESEARCH = 'RESEARCH',
  LEGAL = 'LEGAL',
  PATIENT_REQUEST = 'PATIENT_REQUEST',
}

export enum RecordUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
}

export enum LoanStatus {
  REQUESTED = 'REQUESTED',
  LOANED = 'LOANED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export enum RecordCondition {
  GOOD = 'GOOD',
  DAMAGED = 'DAMAGED',
  INCOMPLETE = 'INCOMPLETE',
}

// ============================================================================
// DTOs
// ============================================================================

export class RequestRecordDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Name of the person requesting the record' })
  @IsString()
  requestedBy!: string;

  @ApiProperty({ enum: RecordPurpose, description: 'Purpose for accessing the record' })
  @IsEnum(RecordPurpose)
  purpose!: RecordPurpose;

  @ApiProperty({ enum: RecordUrgency, description: 'Urgency level of the request' })
  @IsEnum(RecordUrgency)
  urgency!: RecordUrgency;
}

export class ReturnRecordDto {
  @ApiProperty({ description: 'Record document UUID' })
  @IsUUID()
  recordId!: string;

  @ApiProperty({ description: 'Name of the person returning the record' })
  @IsString()
  returnedBy!: string;

  @ApiProperty({ enum: RecordCondition, description: 'Condition of the returned record' })
  @IsEnum(RecordCondition)
  condition!: RecordCondition;
}

export class DigitizeRecordDto {
  @ApiProperty({ description: 'Record document UUID' })
  @IsUUID()
  recordId!: string;

  @ApiProperty({ description: 'Number of scanned pages', minimum: 1 })
  @IsNumber()
  @Min(1)
  scannedPages!: number;

  @ApiProperty({ description: 'Operator who performed the scanning' })
  @IsString()
  operator!: string;
}

export class CheckoutRecordDto {
  @ApiProperty({ description: 'Record document UUID' })
  @IsUUID()
  recordId!: string;

  @ApiProperty({ description: 'Name of the person checking out the record' })
  @IsString()
  checkedOutBy!: string;

  @ApiProperty({ enum: RecordPurpose, description: 'Purpose for the loan' })
  @IsEnum(RecordPurpose)
  purpose!: RecordPurpose;

  @ApiPropertyOptional({ description: 'Destination department' })
  @IsOptional()
  @IsString()
  department?: string;
}
