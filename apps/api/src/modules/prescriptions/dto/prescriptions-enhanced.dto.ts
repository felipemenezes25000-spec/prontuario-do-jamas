import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum FDAPregnancyCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  X = 'X',
}

export enum LactationSafety {
  SAFE = 'SAFE',
  PROBABLY_SAFE = 'PROBABLY_SAFE',
  POTENTIALLY_HAZARDOUS = 'POTENTIALLY_HAZARDOUS',
  CONTRAINDICATED = 'CONTRAINDICATED',
  UNKNOWN = 'UNKNOWN',
}

export enum ReconciliationType {
  ADMISSION = 'ADMISSION',
  DISCHARGE = 'DISCHARGE',
  TRANSFER = 'TRANSFER',
}

export enum ReconciliationAction {
  CONTINUE = 'CONTINUE',
  MODIFY = 'MODIFY',
  DISCONTINUE = 'DISCONTINUE',
  SUBSTITUTE = 'SUBSTITUTE',
  NEW = 'NEW',
}

// ============================================================================
// Pregnancy Alert DTOs
// ============================================================================

export class CheckPregnancyAlertDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() drugName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
}

// ============================================================================
// Lactation Alert DTOs
// ============================================================================

export class CheckLactationAlertDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() drugName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
}

// ============================================================================
// Food Interaction DTOs
// ============================================================================

export class CheckFoodInteractionDto {
  @ApiProperty() @IsString() drugName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
}

// ============================================================================
// Generic Equivalents DTOs
// ============================================================================

export class GetGenericEquivalentsDto {
  @ApiProperty() @IsString() drugName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
}

// ============================================================================
// Medication Reconciliation DTOs
// ============================================================================

export class ReconciliationMedicationDto {
  @ApiProperty() @IsString() medicationName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriber?: string;
  @ApiProperty({ enum: ReconciliationAction })
  @IsEnum(ReconciliationAction) action!: ReconciliationAction;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newDose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newFrequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() substitute?: string;
}

export class CreateMedicationReconciliationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty({ enum: ReconciliationType })
  @IsEnum(ReconciliationType) type!: ReconciliationType;
  @ApiProperty({ type: [ReconciliationMedicationDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReconciliationMedicationDto)
  homeMedications!: ReconciliationMedicationDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pharmacistNotes?: string;
}

export class CreateDischargeReconciliationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty({ type: [ReconciliationMedicationDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReconciliationMedicationDto)
  hospitalMedications!: ReconciliationMedicationDto[];
  @ApiProperty({ type: [ReconciliationMedicationDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReconciliationMedicationDto)
  dischargeMedications!: ReconciliationMedicationDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() patientInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pharmacistNotes?: string;
}

// ============================================================================
// Antimicrobial Stewardship DTOs
// ============================================================================

export class CreateAntimicrobialStewardshipDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsString() antimicrobialName!: string;
  @ApiProperty() @IsNumber() @Min(0) dailyDefinedDose!: number;
  @ApiProperty() @IsNumber() @Min(0) daysOfTherapy!: number;
  @ApiProperty() @IsString() indication!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cultureResult?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmpiric?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deEscalationPlan?: string;
}

export class AntimicrobialDashboardQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

// ============================================================================
// NPT (Parenteral Nutrition) DTOs
// ============================================================================

export class CalculateNPTDto {
  @ApiProperty() @IsNumber() @Min(0) patientWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) patientHeight!: number;
  @ApiProperty() @IsNumber() @Min(0) caloricTarget!: number;
  @ApiProperty() @IsNumber() @Min(0) proteinTarget!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lipidPercentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) glucosePercentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sodiumMEq?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) potassiumMEq?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) calciumMEq?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) magnesiumMEq?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) phosphorusMmol?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) volumeMl?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPeripheral?: boolean;
}

// ============================================================================
// PCA (Patient Controlled Analgesia) Protocol DTOs
// ============================================================================

export class CreatePCAProtocolDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsString() medication!: string;
  @ApiProperty() @IsNumber() @Min(0) concentration!: number;
  @ApiProperty() @IsString() concentrationUnit!: string;
  @ApiProperty() @IsNumber() @Min(0) demandDose!: number;
  @ApiProperty() @IsString() demandDoseUnit!: string;
  @ApiProperty() @IsNumber() @Min(0) lockoutMinutes!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) continuousRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() continuousRateUnit?: string;
  @ApiProperty() @IsNumber() @Min(0) maxDosePerHour!: number;
  @ApiProperty() @IsNumber() @Min(0) maxDosePer4Hours!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
}
