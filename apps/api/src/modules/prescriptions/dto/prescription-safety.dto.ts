import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ─────────────────────────────────────────────────────────────────────

export enum FDACategory {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  X = 'X',
}

export enum LactationRiskLevel {
  SAFE = 'SAFE',
  PROBABLY_SAFE = 'PROBABLY_SAFE',
  POTENTIALLY_HAZARDOUS = 'POTENTIALLY_HAZARDOUS',
  CONTRAINDICATED = 'CONTRAINDICATED',
  UNKNOWN = 'UNKNOWN',
}

export enum GFRFormula {
  CKD_EPI = 'CKD_EPI',
  COCKCROFT_GAULT = 'COCKCROFT_GAULT',
  MDRD = 'MDRD',
}

export enum ChildPughClass {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum DrugFoodSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CONTRAINDICATED = 'CONTRAINDICATED',
}

export enum EPrescribingPlatform {
  MEMED = 'MEMED',
  NEXODATA = 'NEXODATA',
  RECEITA_DIGITAL = 'RECEITA_DIGITAL',
  CLINICAL_WEB = 'CLINICAL_WEB',
}

export enum PCAMode {
  PCA_ONLY = 'PCA_ONLY',
  CONTINUOUS_PLUS_PCA = 'CONTINUOUS_PLUS_PCA',
  BASAL_PLUS_PCA = 'BASAL_PLUS_PCA',
}

export enum ProtocolDeviationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

// ─── Pregnancy Alert ───────────────────────────────────────────────────────────

export class PregnancyAlertDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Medication UUID or name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationId: string;

  @ApiProperty({ enum: FDACategory, description: 'FDA pregnancy safety category' })
  @IsEnum(FDACategory)
  fdaCategory: FDACategory;

  @ApiPropertyOptional({ description: 'Gestational age in weeks', minimum: 0, maximum: 42 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(42)
  gestationalAgeWeeks?: number;

  @ApiPropertyOptional({ description: 'Specific risk description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  riskDescription?: string;

  @ApiPropertyOptional({ description: 'Recommended alternative medications', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternatives?: string[];
}

export class CheckPregnancyRiskDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'List of medication names to check', type: [String] })
  @IsArray()
  @IsString({ each: true })
  medications: string[];
}

// ─── Lactation Alert ──────────────────────────────────────────────────────────

export class LactationAlertDto {
  @ApiProperty({ description: 'Medication name or ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationId: string;

  @ApiProperty({ enum: LactationRiskLevel })
  @IsEnum(LactationRiskLevel)
  riskLevel: LactationRiskLevel;

  @ApiPropertyOptional({ description: 'Whether the drug is excreted into breast milk' })
  @IsOptional()
  @IsBoolean()
  passesToMilk?: boolean;

  @ApiPropertyOptional({ description: 'M/P ratio (milk-to-plasma) if known', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  milkPlasmaRatio?: number;

  @ApiPropertyOptional({ description: 'Potential risk to nursing infant', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  infantRisk?: string;

  @ApiPropertyOptional({ description: 'Clinical recommendation or alternative', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recommendation?: string;
}

export class CheckLactationRiskDto {
  @ApiProperty({ description: 'List of medication names to check', type: [String] })
  @IsArray()
  @IsString({ each: true })
  medications: string[];
}

// ─── Renal Dose Adjustment ─────────────────────────────────────────────────────

export class RenalAdjustmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medication: string;

  @ApiProperty({ description: 'Serum creatinine in mg/dL', minimum: 0 })
  @IsNumber()
  @Min(0)
  creatinine: number;

  @ApiPropertyOptional({ description: 'GFR calculation formula to use', enum: GFRFormula })
  @IsOptional()
  @IsEnum(GFRFormula)
  gfrFormula?: GFRFormula;

  @ApiPropertyOptional({ description: 'Pre-calculated GFR in mL/min/1.73m² (skips calculation)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  providedGFR?: number;

  @ApiPropertyOptional({ description: 'Standard prescribed dose for adjustment reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  standardDose?: string;
}

// ─── Hepatic Dose Adjustment ───────────────────────────────────────────────────

export class HepaticAdjustmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medication: string;

  @ApiProperty({
    description: 'Child-Pugh classification (A = mild, B = moderate, C = severe)',
    enum: ChildPughClass,
  })
  @IsEnum(ChildPughClass)
  childPughScore: ChildPughClass;

  @ApiPropertyOptional({ description: 'Standard prescribed dose for reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  standardDose?: string;
}

// ─── Drug-Food Interaction ─────────────────────────────────────────────────────

export class DrugFoodInteractionDto {
  @ApiProperty({ description: 'Medication name or ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationId: string;

  @ApiProperty({ description: 'Food/beverage involved in the interaction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  food: string;

  @ApiProperty({ enum: DrugFoodSeverity })
  @IsEnum(DrugFoodSeverity)
  severity: DrugFoodSeverity;

  @ApiProperty({ description: 'Clinical effect and management recommendation', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  recommendation: string;

  @ApiPropertyOptional({ description: 'Mechanism of the interaction', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mechanism?: string;
}

export class CheckDrugFoodInteractionDto {
  @ApiProperty({ description: 'List of medication names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  medications: string[];
}

// ─── Generic Equivalence ──────────────────────────────────────────────────────

export class GenericAlternativeDto {
  @ApiProperty({ description: 'Generic medication name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  genericName: string;

  @ApiProperty({ description: 'Active ingredient (INN)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  activeIngredient: string;

  @ApiPropertyOptional({ description: 'Estimated price in BRL per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'ANVISA registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  anvisaRegistration?: string;

  @ApiPropertyOptional({ description: 'Whether bioequivalence studies exist' })
  @IsOptional()
  @IsBoolean()
  bioequivalenceProven?: boolean;
}

export class GenericEquivalenceDto {
  @ApiProperty({ description: 'Brand-name medication to look up' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  brandName: string;

  @ApiPropertyOptional({ description: 'Available generic/similar alternatives', type: [GenericAlternativeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenericAlternativeDto)
  genericAlternatives?: GenericAlternativeDto[];
}

export class LookupGenericEquivalencesDto {
  @ApiProperty({ description: 'Brand name to look up' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  brandName: string;
}

// ─── e-Prescribing ────────────────────────────────────────────────────────────

export class EPrescribingDto {
  @ApiProperty({ description: 'Internal prescription UUID' })
  @IsUUID()
  @IsNotEmpty()
  prescriptionId: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ enum: EPrescribingPlatform, description: 'External e-prescribing platform' })
  @IsEnum(EPrescribingPlatform)
  externalPlatform: EPrescribingPlatform;

  @ApiPropertyOptional({ description: 'Digital signature hash for the prescription' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  digitalSignature?: string;

  @ApiPropertyOptional({ description: 'Send prescription directly to patient phone/email' })
  @IsOptional()
  @IsBoolean()
  sendDirectToPatient?: boolean;

  @ApiPropertyOptional({ description: 'Patient contact (phone or email) for direct delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  patientContact?: string;
}

// ─── Protocol-based Prescription ──────────────────────────────────────────────

export class ProtocolDeviationDto {
  @ApiProperty({ description: 'Prescription item field that deviates', example: 'dose' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ description: 'Protocol-defined expected value' })
  @IsString()
  @IsNotEmpty()
  expectedValue: string;

  @ApiProperty({ description: 'Actual value prescribed' })
  @IsString()
  @IsNotEmpty()
  actualValue: string;

  @ApiProperty({ enum: ProtocolDeviationSeverity })
  @IsEnum(ProtocolDeviationSeverity)
  severity: ProtocolDeviationSeverity;

  @ApiPropertyOptional({ description: 'Clinical justification for deviation', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;
}

export class ValidateProtocolPrescriptionDto {
  @ApiProperty({ description: 'Protocol name or ID', example: 'sepsis-bundle-surviving-sepsis' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  protocolName: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationName: string;

  @ApiProperty({ description: 'Prescribed dose', example: '4g' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dose: string;

  @ApiProperty({ description: 'Prescribed route', example: 'IV' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  route: string;

  @ApiProperty({ description: 'Prescribed frequency', example: 'Q6H' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frequency: string;

  @ApiPropertyOptional({ description: 'Patient weight in kg (for weight-based dosing)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientWeightKg?: number;
}

// ─── PCA Prescription ─────────────────────────────────────────────────────────

export class PCAPrescriptionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Opioid analgesic name', example: 'Morphine' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medication: string;

  @ApiProperty({ description: 'PCA bolus dose (patient-triggered)', example: '1mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bolusDose: string;

  @ApiProperty({ description: 'Lockout interval in minutes', minimum: 1 })
  @IsInt()
  @Min(1)
  lockoutMinutes: number;

  @ApiProperty({ enum: PCAMode })
  @IsEnum(PCAMode)
  mode: PCAMode;

  @ApiPropertyOptional({ description: 'Continuous background infusion rate (if applicable)', example: '0.5mg/h' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  continuousRate?: string;

  @ApiPropertyOptional({ description: '1-hour dose limit', example: '10mg' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  hourlyLimit?: string;

  @ApiPropertyOptional({ description: '4-hour dose limit', example: '30mg' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fourHourLimit?: string;

  @ApiPropertyOptional({ description: 'Concentration of the PCA solution', example: '1mg/mL in 100mL NS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  concentration?: string;

  @ApiPropertyOptional({ description: 'Special instructions or monitoring requirements', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;
}

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface PregnancyRiskCheckResult {
  patientId: string;
  isPregnant: boolean;
  gestationalAgeWeeks: number | null;
  medications: {
    name: string;
    fdaCategory: FDACategory | null;
    riskLevel: 'safe' | 'caution' | 'contraindicated' | 'unknown';
    recommendation: string;
  }[];
}

export interface LactationRiskCheckResult {
  medications: {
    name: string;
    riskLevel: LactationRiskLevel;
    passesToMilk: boolean | null;
    infantRisk: string | null;
    recommendation: string;
  }[];
}

export interface RenalAdjustmentResult {
  patientId: string;
  medication: string;
  creatinine: number;
  gfr: number;
  gfrFormula: GFRFormula;
  ckdStage: string;
  adjustmentRequired: boolean;
  suggestedDose: string;
  interval: string | null;
  contraindicated: boolean;
  notes: string;
}

export interface HepaticAdjustmentResult {
  patientId: string;
  medication: string;
  childPughClass: ChildPughClass;
  adjustmentRequired: boolean;
  suggestedDose: string;
  contraindicated: boolean;
  notes: string;
}

export interface DrugFoodInteractionCheckResult {
  medications: {
    name: string;
    interactions: {
      food: string;
      severity: DrugFoodSeverity;
      recommendation: string;
      mechanism: string | null;
    }[];
  }[];
}

export interface GenericEquivalenceResult {
  brandName: string;
  activeIngredient: string;
  brandPricePerUnit: number | null;
  alternatives: GenericAlternativeDto[];
  estimatedSavingsPercent: number | null;
}

export interface EPrescribingResult {
  prescriptionId: string;
  externalId: string;
  platform: EPrescribingPlatform;
  status: 'sent' | 'pending' | 'failed';
  patientLink: string | null;
  pharmacyQrCode: string | null;
  sentAt: Date;
}

export interface ProtocolValidationResult {
  protocolName: string;
  compliant: boolean;
  deviations: ProtocolDeviationDto[];
  overallSeverity: ProtocolDeviationSeverity | null;
  requiresJustification: boolean;
}

export interface PCAPrescriptionRecord {
  id: string;
  patientId: string;
  medication: string;
  bolusDose: string;
  lockoutMinutes: number;
  mode: PCAMode;
  continuousRate: string | null;
  hourlyLimit: string | null;
  fourHourLimit: string | null;
  concentration: string | null;
  specialInstructions: string | null;
  createdAt: Date;
  prescribedById: string;
}
