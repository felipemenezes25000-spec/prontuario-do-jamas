import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Parse Voice Prescription ---

export class PrescriptionParseVoiceDto {
  @ApiProperty({ description: 'Dictated prescription text' })
  @IsString()
  text!: string;
}

export class PrescriptionParseVoiceResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        medicationName: { type: 'string' },
        dose: { type: 'string' },
        route: { type: 'string' },
        frequency: { type: 'string' },
        duration: { type: 'string' },
        instructions: { type: 'string' },
        confidence: { type: 'number' },
      },
    },
  })
  items!: Array<{
    medicationName: string;
    dose?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    confidence: number;
  }>;
}

// --- Check Safety ---

class SafetyCheckItemDto {
  @ApiProperty()
  @IsString()
  medicationName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dose?: string;
}

export class PrescriptionCheckSafetyDto {
  @ApiProperty({ type: [SafetyCheckItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyCheckItemDto)
  items!: SafetyCheckItemDto[];

  @ApiProperty({ description: 'Patient ID for safety cross-reference' })
  @IsUUID()
  patientId!: string;
}

export class SafetyWarningDto {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [String] })
  items!: string[];
}

export class PrescriptionCheckSafetyResponseDto {
  @ApiProperty()
  safe!: boolean;

  @ApiProperty({ type: [SafetyWarningDto] })
  warnings!: SafetyWarningDto[];
}

// --- Suggest ---

export class PrescriptionSuggestDto {
  @ApiProperty({ description: 'Diagnosis to suggest medications for' })
  @IsString()
  diagnosis!: string;

  @ApiProperty({ description: 'Patient ID for personalized suggestions' })
  @IsUUID()
  patientId!: string;
}

export class MedicationSuggestionDto {
  @ApiProperty()
  medicationName!: string;

  @ApiProperty()
  dose!: string;

  @ApiProperty()
  route!: string;

  @ApiProperty()
  frequency!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  confidence!: number;
}

export class PrescriptionSuggestResponseDto {
  @ApiProperty({ type: [MedicationSuggestionDto] })
  suggestions!: MedicationSuggestionDto[];
}
