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
  @ApiProperty({ description: 'Medication name to check', example: 'Dipirona 500mg' })
  @IsString()
  medicationName!: string;

  @ApiPropertyOptional({ description: 'Prescribed dose', example: '1g' })
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
  @ApiProperty({ description: 'Warning type (e.g. interaction, allergy, contraindication)', example: 'interaction' })
  type!: string;

  @ApiProperty({ description: 'Warning severity (low, medium, high, critical)', example: 'high' })
  severity!: string;

  @ApiProperty({ description: 'Human-readable warning message', example: 'Interacao entre Varfarina e AAS aumenta risco de sangramento' })
  message!: string;

  @ApiProperty({ type: [String], description: 'Medication names involved in the warning' })
  items!: string[];
}

export class PrescriptionCheckSafetyResponseDto {
  @ApiProperty({ description: 'Whether the prescription passed all safety checks', example: false })
  safe!: boolean;

  @ApiProperty({ type: [SafetyWarningDto], description: 'List of safety warnings found' })
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
  @ApiProperty({ description: 'Suggested medication name', example: 'Amoxicilina 500mg' })
  medicationName!: string;

  @ApiProperty({ description: 'Recommended dose', example: '500mg' })
  dose!: string;

  @ApiProperty({ description: 'Route of administration', example: 'Oral' })
  route!: string;

  @ApiProperty({ description: 'Dosing frequency', example: '8/8h' })
  frequency!: string;

  @ApiProperty({ description: 'Clinical reason for suggestion', example: 'Primeira linha para infeccao bacteriana comunitaria' })
  reason!: string;

  @ApiProperty({ description: 'AI confidence score (0-1)', example: 0.88 })
  confidence!: number;
}

export class PrescriptionSuggestResponseDto {
  @ApiProperty({ type: [MedicationSuggestionDto], description: 'AI-generated medication suggestions' })
  suggestions!: MedicationSuggestionDto[];
}
