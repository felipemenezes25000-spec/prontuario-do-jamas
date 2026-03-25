import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum ValidationResult {
  APPROVED = 'APPROVED',
  APPROVED_WITH_NOTES = 'APPROVED_WITH_NOTES',
  REJECTED = 'REJECTED',
  REQUIRES_MODIFICATION = 'REQUIRES_MODIFICATION',
  PENDING_INFO = 'PENDING_INFO',
}

export enum InterventionType {
  DOSE_ADJUSTMENT = 'DOSE_ADJUSTMENT',
  ROUTE_CHANGE = 'ROUTE_CHANGE',
  FREQUENCY_CHANGE = 'FREQUENCY_CHANGE',
  DRUG_SUBSTITUTION = 'DRUG_SUBSTITUTION',
  DRUG_INTERACTION = 'DRUG_INTERACTION',
  ALLERGY_ALERT = 'ALLERGY_ALERT',
  RENAL_ADJUSTMENT = 'RENAL_ADJUSTMENT',
  HEPATIC_ADJUSTMENT = 'HEPATIC_ADJUSTMENT',
  THERAPEUTIC_DUPLICATION = 'THERAPEUTIC_DUPLICATION',
  COST_OPTIMIZATION = 'COST_OPTIMIZATION',
  FORMULATION_CHANGE = 'FORMULATION_CHANGE',
  CLINICAL_RECOMMENDATION = 'CLINICAL_RECOMMENDATION',
  OTHER = 'OTHER',
}

export enum InterventionOutcome {
  ACCEPTED = 'ACCEPTED',
  PARTIALLY_ACCEPTED = 'PARTIALLY_ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export class ValidatePrescriptionDto {
  @ApiProperty({ description: 'Prescription ID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionId: string;

  @ApiProperty({ enum: ValidationResult })
  @IsEnum(ValidationResult)
  result: ValidationResult;

  @ApiPropertyOptional({ description: 'Validation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Drug interaction warnings', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  drugInteractionWarnings?: string[];

  @ApiPropertyOptional({ description: 'Dose alerts', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  doseAlerts?: string[];

  @ApiPropertyOptional({ description: 'Allergy concerns', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergyConcerns?: string[];
}

export class CreateInterventionDto {
  @ApiProperty({ description: 'Prescription ID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionId: string;

  @ApiPropertyOptional({ description: 'Prescription item ID' })
  @IsOptional()
  @IsUUID()
  prescriptionItemId?: string;

  @ApiProperty({ enum: InterventionType })
  @IsEnum(InterventionType)
  type: InterventionType;

  @ApiProperty({ description: 'Intervention description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Recommendation' })
  @IsOptional()
  @IsString()
  recommendation?: string;

  @ApiPropertyOptional({ description: 'Clinical justification' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ enum: InterventionOutcome })
  @IsOptional()
  @IsEnum(InterventionOutcome)
  outcome?: InterventionOutcome;
}
