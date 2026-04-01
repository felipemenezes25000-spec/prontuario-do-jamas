import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum TubeType {
  RED = 'RED',           // Soro — bioquímica
  PURPLE = 'PURPLE',     // EDTA — hemograma
  BLUE = 'BLUE',         // Citrato — coagulação
  GREEN = 'GREEN',       // Heparina — gasometria
  YELLOW = 'YELLOW',     // ACD — banco de sangue
  GREY = 'GREY',         // Fluoreto — glicemia
  BLACK = 'BLACK',       // Citrato — VHS
  URINE = 'URINE',
  SWAB = 'SWAB',
  CSFLIQUID = 'CSFLIQUID',
  OTHER = 'OTHER',
}

export enum AgeGroup {
  NEWBORN = 'NEWBORN',
  INFANT = 'INFANT',
  CHILD = 'CHILD',
  ADOLESCENT = 'ADOLESCENT',
  ADULT = 'ADULT',
  ELDERLY = 'ELDERLY',
}

export enum BiologicalSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum Sensitivity {
  SENSITIVE = 'S',
  INTERMEDIATE = 'I',
  RESISTANT = 'R',
}

export enum ResistanceMechanism {
  ESBL = 'ESBL',
  KPC = 'KPC',
  MBL = 'MBL',
  MRSA = 'MRSA',
  VRE = 'VRE',
  CRKP = 'CRKP',
  MSSA = 'MSSA',
  NONE = 'NONE',
}

export enum BloodGasInterpretation {
  NORMAL = 'NORMAL',
  RESPIRATORY_ACIDOSIS = 'RESPIRATORY_ACIDOSIS',
  RESPIRATORY_ALKALOSIS = 'RESPIRATORY_ALKALOSIS',
  METABOLIC_ACIDOSIS = 'METABOLIC_ACIDOSIS',
  METABOLIC_ALKALOSIS = 'METABOLIC_ALKALOSIS',
  MIXED_DISORDER = 'MIXED_DISORDER',
  COMPENSATED_RESPIRATORY_ACIDOSIS = 'COMPENSATED_RESPIRATORY_ACIDOSIS',
  COMPENSATED_RESPIRATORY_ALKALOSIS = 'COMPENSATED_RESPIRATORY_ALKALOSIS',
  COMPENSATED_METABOLIC_ACIDOSIS = 'COMPENSATED_METABOLIC_ACIDOSIS',
  COMPENSATED_METABOLIC_ALKALOSIS = 'COMPENSATED_METABOLIC_ALKALOSIS',
}

export enum PocTestType {
  GLUCOMETER = 'GLUCOMETER',
  ABG = 'ABG',
  COAGULATION = 'COAGULATION',
  RAPID_TROPONIN = 'RAPID_TROPONIN',
  RAPID_CRP = 'RAPID_CRP',
  RAPID_STREP = 'RAPID_STREP',
  RAPID_COVID = 'RAPID_COVID',
  RAPID_INFLUENZA = 'RAPID_INFLUENZA',
  LACTATE = 'LACTATE',
}

export enum AutoVerificationStatus {
  AUTO_RELEASED = 'AUTO_RELEASED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  DELTA_CHECK_FAILED = 'DELTA_CHECK_FAILED',
  PANIC_VALUE = 'PANIC_VALUE',
  INSTRUMENT_FLAG = 'INSTRUMENT_FLAG',
}

// ─── Sample Collection ────────────────────────────────────────────────────────

export class SampleCollectionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Lab order / exam-request UUID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Tube type', enum: TubeType })
  @IsEnum(TubeType)
  tubeType: TubeType;

  @ApiProperty({ description: 'Barcode label printed on tube' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'ID of the professional who collected the sample' })
  @IsUUID()
  collectedBy: string;

  @ApiPropertyOptional({ description: 'ISO date-time of collection (defaults to now)' })
  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @ApiProperty({ description: 'Collection location (e.g. ward/bed, outpatient)' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ description: 'Fasting status (hours fasted)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fastingHours?: number;

  @ApiPropertyOptional({ description: 'Volume collected in mL' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  volumeMl?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Phlebotomy Worklist ──────────────────────────────────────────────────────

export class PhlebotomyWorklistQueryDto {
  @ApiProperty({ description: 'Hospital unit/wing (e.g. UTI-A)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: 'Include only fasting collections' })
  @IsOptional()
  @IsBoolean()
  fastingOnly?: boolean;
}

// ─── Panic / Critical Values ──────────────────────────────────────────────────

export class PanicValueAcknowledgeDto {
  @ApiProperty({ description: 'Panic value alert UUID' })
  @IsUUID()
  alertId: string;

  @ApiProperty({ description: 'Professional who is acknowledging' })
  @IsUUID()
  acknowledgedBy: string;

  @ApiProperty({
    description:
      'Read-back confirmation — the receiving clinician repeats the critical value verbally',
  })
  @IsBoolean()
  readBackConfirmed: boolean;

  @ApiPropertyOptional({ description: 'Action taken' })
  @IsOptional()
  @IsString()
  actionTaken?: string;
}

// ─── Reference Ranges ─────────────────────────────────────────────────────────

export class ReferenceRangeDto {
  @ApiProperty({ description: 'Analyte / test code (e.g. K, Na, HGB)' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ description: 'Age group for range', enum: AgeGroup })
  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @ApiProperty({ description: 'Biological sex', enum: BiologicalSex })
  @IsEnum(BiologicalSex)
  sex: BiologicalSex;

  @ApiProperty({ description: 'Lower bound of normal range' })
  @IsNumber()
  normalMin: number;

  @ApiProperty({ description: 'Upper bound of normal range' })
  @IsNumber()
  normalMax: number;

  @ApiProperty({ description: 'Unit of measurement (e.g. mEq/L, g/dL)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Lower critical (panic low) value' })
  @IsOptional()
  @IsNumber()
  criticalLow?: number;

  @ApiPropertyOptional({ description: 'Upper critical (panic high) value' })
  @IsOptional()
  @IsNumber()
  criticalHigh?: number;
}

export class UpsertReferenceRangeDto extends ReferenceRangeDto {}

// ─── Delta Check ──────────────────────────────────────────────────────────────

export class DeltaCheckQueryDto {
  @ApiProperty({ description: 'Analyte / test code' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Current result value' })
  @IsNumber()
  currentResult: number;

  @ApiPropertyOptional({
    description: 'Previous result value (if known; otherwise looked up automatically)',
  })
  @IsOptional()
  @IsNumber()
  previousResult?: number;
}

// ─── Reflex Testing ──────────────────────────────────────────────────────────

export class ReflexTestingEvaluateDto {
  @ApiProperty({ description: 'Trigger test code (e.g. TSH)' })
  @IsString()
  @IsNotEmpty()
  triggerTest: string;

  @ApiProperty({ description: 'Numeric result of the trigger test' })
  @IsNumber()
  triggerResult: number;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Sample barcode' })
  @IsString()
  @IsNotEmpty()
  sampleBarcode: string;

  @ApiPropertyOptional({ description: 'Encounter UUID for ordering context' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// ─── Auto-Verification ────────────────────────────────────────────────────────

export class AutoVerificationDto {
  @ApiProperty({ description: 'Exam result / test instance UUID' })
  @IsUUID()
  testId: string;

  @ApiProperty({ description: 'Analyte code' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ description: 'Numeric result' })
  @IsNumber()
  result: number;

  @ApiProperty({ description: 'Patient UUID (for reference range lookup)' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Instrument flags from analyzer' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instrumentFlags?: string[];
}

// ─── Add-on Testing ──────────────────────────────────────────────────────────

export class AddOnTestDto {
  @ApiProperty({ description: 'Barcode of existing sample' })
  @IsString()
  @IsNotEmpty()
  sampleBarcode: string;

  @ApiProperty({ description: 'Additional tests to add', type: [String] })
  @IsArray()
  @IsString({ each: true })
  additionalTests: string[];

  @ApiPropertyOptional({
    description: 'Sample stability deadline (ISO date-time)',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Clinical justification' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiProperty({ description: 'Requesting clinician UUID' })
  @IsUUID()
  requestedBy: string;
}

// ─── Blood Gas ────────────────────────────────────────────────────────────────

export class GasometryDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'pH', example: 7.38 })
  @IsNumber()
  @Min(6.5)
  @Max(8.0)
  pH: number;

  @ApiProperty({ description: 'pCO2 mmHg', example: 40 })
  @IsNumber()
  @IsPositive()
  pCO2: number;

  @ApiProperty({ description: 'pO2 mmHg', example: 95 })
  @IsNumber()
  @IsPositive()
  pO2: number;

  @ApiProperty({ description: 'HCO3 mEq/L', example: 24 })
  @IsNumber()
  @IsPositive()
  HCO3: number;

  @ApiProperty({ description: 'Base Excess mEq/L', example: 0 })
  @IsNumber()
  BE: number;

  @ApiPropertyOptional({ description: 'Lactate mmol/L' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lactate?: number;

  @ApiPropertyOptional({ description: 'SpO2 %' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sO2?: number;

  @ApiPropertyOptional({ description: 'FiO2 fraction (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0.21)
  @Max(1.0)
  fiO2?: number;

  @ApiPropertyOptional({ description: 'Operator / analyzer UUID' })
  @IsOptional()
  @IsString()
  operator?: string;
}

// ─── Microbiology ────────────────────────────────────────────────────────────

export class AntibioticSensitivityItemDto {
  @ApiProperty({ description: 'Antibiotic name' })
  @IsString()
  @IsNotEmpty()
  antibiotic: string;

  @ApiProperty({ description: 'Minimum Inhibitory Concentration (mg/L)' })
  @IsNumber()
  @Min(0)
  mic: number;

  @ApiProperty({ description: 'Sensitivity interpretation', enum: Sensitivity })
  @IsEnum(Sensitivity)
  sensitivity: Sensitivity;
}

export class MicrobiologyDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Specimen type (e.g. Blood, Urine, Sputum, CSF)' })
  @IsString()
  @IsNotEmpty()
  specimen: string;

  @ApiProperty({
    description: 'Organism identified (e.g. Escherichia coli, Staphylococcus aureus)',
  })
  @IsString()
  @IsNotEmpty()
  organism: string;

  @ApiProperty({ description: 'Antibiogram', type: [AntibioticSensitivityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AntibioticSensitivityItemDto)
  antibiogram: AntibioticSensitivityItemDto[];

  @ApiProperty({ description: 'Resistance mechanisms detected', enum: ResistanceMechanism, isArray: true })
  @IsArray()
  @IsEnum(ResistanceMechanism, { each: true })
  resistanceMechanisms: ResistanceMechanism[];

  @ApiPropertyOptional({ description: 'Colony count (CFU/mL)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  colonyCount?: number;

  @ApiPropertyOptional({ description: 'Incubation days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  incubationDays?: number;

  @ApiProperty({ description: 'Microbiologist UUID' })
  @IsUUID()
  reportedBy: string;
}

// ─── Point-of-Care Testing ───────────────────────────────────────────────────

export class PocTestingDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Test type', enum: PocTestType })
  @IsEnum(PocTestType)
  testType: PocTestType;

  @ApiProperty({ description: 'POC device / analyzer ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Whether QC was passed before this test run' })
  @IsBoolean()
  qcPassed: boolean;

  @ApiProperty({ description: 'Numeric or text result' })
  @IsString()
  @IsNotEmpty()
  result: string;

  @ApiPropertyOptional({ description: 'Unit of result (e.g. mg/dL, mmol/L)' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Operator UUID' })
  @IsUUID()
  operator: string;

  @ApiPropertyOptional({ description: 'Reagent lot number for traceability' })
  @IsOptional()
  @IsString()
  reagentLot?: string;
}
