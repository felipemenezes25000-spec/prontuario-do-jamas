import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

// ─── RASS (Richmond Agitation-Sedation Scale) ─────────────────────────────────

export class CreateRassAssessmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({
    description: 'RASS score (-5 to +4)',
    minimum: -5,
    maximum: 4,
    examples: [-5, -3, 0, 2, 4],
  })
  @IsNumber()
  @Min(-5)
  @Max(4)
  score: number;

  @ApiPropertyOptional({ description: 'Additional description or observations' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ─── CAM-ICU (Confusion Assessment Method for ICU) ─────────────────────────────

export class CreateCamIcuDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Feature 1: Acute onset or fluctuating course' })
  @IsBoolean()
  feature1_acuteOnset: boolean;

  @ApiProperty({ description: 'Feature 2: Inattention' })
  @IsBoolean()
  feature2_inattention: boolean;

  @ApiProperty({ description: 'Feature 3: Altered level of consciousness (RASS != 0)' })
  @IsBoolean()
  feature3_alteredLoc: boolean;

  @ApiProperty({ description: 'Feature 4: Disorganized thinking' })
  @IsBoolean()
  feature4_disorganizedThinking: boolean;

  @ApiPropertyOptional({ description: 'Linked RASS score for reference', minimum: -5, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(-5)
  @Max(4)
  rassScore?: number;
}

// ─── BIS (Bispectral Index) ────────────────────────────────────────────────────

export class RecordBisDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'BIS value (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  bisValue: number;

  @ApiPropertyOptional({ description: 'EMG artifact value' })
  @IsOptional()
  @IsNumber()
  emgValue?: number;

  @ApiPropertyOptional({ description: 'Signal Quality Index (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sqiValue?: number;

  @ApiPropertyOptional({ description: 'Anesthetic agent in use' })
  @IsOptional()
  @IsString()
  anestheticAgent?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
