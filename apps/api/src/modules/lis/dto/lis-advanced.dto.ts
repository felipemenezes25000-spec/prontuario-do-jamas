import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Reflex Testing ──────────────────────────────────────────────────────────

export enum ReflexCondition {
  ABOVE_HIGH = 'ABOVE_HIGH',
  BELOW_LOW = 'BELOW_LOW',
  ABNORMAL = 'ABNORMAL',
  POSITIVE = 'POSITIVE',
}

export class CreateReflexRuleDto {
  @ApiProperty({ description: 'Trigger analyte (e.g. TSH)' })
  @IsString()
  @IsNotEmpty()
  triggerAnalyte: string;

  @ApiProperty({ description: 'Condition that triggers reflex', enum: ReflexCondition })
  @IsEnum(ReflexCondition)
  condition: ReflexCondition;

  @ApiPropertyOptional({ description: 'Threshold value for numeric conditions' })
  @IsOptional()
  @IsNumber()
  thresholdValue?: number;

  @ApiProperty({ description: 'Reflex test to auto-order (e.g. T4L)' })
  @IsString()
  @IsNotEmpty()
  reflexTest: string;

  @ApiPropertyOptional({ description: 'Notes/rationale' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Add-on Testing ──────────────────────────────────────────────────────────

export class RequestAddOnDto {
  @ApiProperty({ description: 'Sample barcode to add test to' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Test name to add' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiProperty({ description: 'Test code' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Clinical justification' })
  @IsOptional()
  @IsString()
  justification?: string;
}

// ─── POC Testing ─────────────────────────────────────────────────────────────

export enum PocDeviceType {
  GLUCOMETER = 'GLUCOMETER',
  BLOOD_GAS = 'BLOOD_GAS',
  COAGULATION = 'COAGULATION',
  CARDIAC_MARKER = 'CARDIAC_MARKER',
  URINALYSIS = 'URINALYSIS',
  OTHER = 'OTHER',
}

export class PocResultItemDto {
  @ApiProperty({ description: 'Analyte name' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiProperty({ description: 'Result value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Reference range min' })
  @IsOptional()
  @IsNumber()
  referenceMin?: number;

  @ApiPropertyOptional({ description: 'Reference range max' })
  @IsOptional()
  @IsNumber()
  referenceMax?: number;

  @ApiPropertyOptional({ description: 'Flag: H, L, C' })
  @IsOptional()
  @IsString()
  flag?: string;
}

export class RecordPocResultDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'POC device type', enum: PocDeviceType })
  @IsEnum(PocDeviceType)
  deviceType: PocDeviceType;

  @ApiProperty({ description: 'Device serial/ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Operator (nurse/doctor) ID' })
  @IsUUID()
  operatorId: string;

  @ApiProperty({ description: 'Results array', type: [PocResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PocResultItemDto)
  results: PocResultItemDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── AI: Lab Panel Interpretation ────────────────────────────────────────────

export class LabPanelResultItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() analyte: string;
  @ApiProperty() @IsString() @IsNotEmpty() value: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() referenceMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() referenceMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() flag?: string;
}

export class InterpretLabPanelDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Panel results', type: [LabPanelResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabPanelResultItemDto)
  results: LabPanelResultItemDto[];

  @ApiPropertyOptional({ description: 'Clinical context for AI' })
  @IsOptional()
  @IsString()
  clinicalContext?: string;
}

// ─── AI: Result Prediction ───────────────────────────────────────────────────

export class PredictResultDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Target analyte to predict (e.g. hemoglobin)' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiPropertyOptional({ description: 'Clinical context' })
  @IsOptional()
  @IsString()
  clinicalContext?: string;
}

// ─── AI: Sample Swap Detection ───────────────────────────────────────────────

export class DetectSampleSwapDto {
  @ApiProperty({ description: 'Patient ID to check' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Exam result ID with results to validate' })
  @IsUUID()
  examResultId: string;

  @ApiPropertyOptional({ description: 'Include demographic cross-check (gender, age)' })
  @IsOptional()
  @IsBoolean()
  includeDemographicCheck?: boolean;
}

// ─── Reference Ranges ───────────────────────────────────────────────────────

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

// ─── Panic Value Alert ──────────────────────────────────────────────────────

export enum PanicValueStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ESCALATED = 'ESCALATED',
}

export class CreatePanicValueAlertDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Analyte with critical value (e.g. Potassium)' })
  @IsString()
  @IsNotEmpty()
  analyte: string;

  @ApiProperty({ description: 'Critical result value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Normal reference range (e.g. "3.5-5.0")' })
  @IsString()
  @IsNotEmpty()
  referenceRange: string;

  @ApiPropertyOptional({ description: 'Responsible physician ID to notify' })
  @IsOptional()
  @IsUUID()
  responsiblePhysicianId?: string;

  @ApiPropertyOptional({ description: 'Lab technician who detected the value' })
  @IsOptional()
  @IsUUID()
  detectedById?: string;

  @ApiPropertyOptional({ description: 'Exam result ID' })
  @IsOptional()
  @IsUUID()
  examResultId?: string;
}

// ─── Lab Trend ──────────────────────────────────────────────────────────────

// ─── Institutional Antibiogram ──────────────────────────────────────────────

// ─── Blood Gas Interpretation ───────────────────────────────────────────────

export enum BloodGasSampleType {
  ARTERIAL = 'ARTERIAL',
  VENOUS = 'VENOUS',
  CAPILLARY = 'CAPILLARY',
}

export class InterpretBloodGasDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Sample type', enum: BloodGasSampleType })
  @IsEnum(BloodGasSampleType)
  sampleType: BloodGasSampleType;

  @ApiProperty({ description: 'pH value' })
  @IsNumber()
  ph: number;

  @ApiProperty({ description: 'pCO2 in mmHg' })
  @IsNumber()
  pCO2: number;

  @ApiProperty({ description: 'pO2 in mmHg' })
  @IsNumber()
  pO2: number;

  @ApiProperty({ description: 'HCO3 in mEq/L' })
  @IsNumber()
  hco3: number;

  @ApiPropertyOptional({ description: 'Base excess in mEq/L' })
  @IsOptional()
  @IsNumber()
  baseExcess?: number;

  @ApiPropertyOptional({ description: 'SaO2 percentage' })
  @IsOptional()
  @IsNumber()
  saO2?: number;

  @ApiPropertyOptional({ description: 'Lactate in mmol/L' })
  @IsOptional()
  @IsNumber()
  lactate?: number;

  @ApiPropertyOptional({ description: 'Sodium in mEq/L' })
  @IsOptional()
  @IsNumber()
  sodium?: number;

  @ApiPropertyOptional({ description: 'Potassium in mEq/L' })
  @IsOptional()
  @IsNumber()
  potassium?: number;

  @ApiPropertyOptional({ description: 'Chloride in mEq/L' })
  @IsOptional()
  @IsNumber()
  chloride?: number;

  @ApiPropertyOptional({ description: 'FiO2 fraction' })
  @IsOptional()
  @IsNumber()
  fiO2?: number;

  @ApiPropertyOptional({ description: 'Patient temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  temperature?: number;
}

// ─── Pathology Report ───────────────────────────────────────────────────────

export enum PathologyReportType {
  BIOPSY = 'BIOPSY',
  SURGICAL = 'SURGICAL',
  CYTOLOGY = 'CYTOLOGY',
  FINE_NEEDLE_ASPIRATION = 'FINE_NEEDLE_ASPIRATION',
  FROZEN_SECTION = 'FROZEN_SECTION',
}

export class CreatePathologyReportDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Report type', enum: PathologyReportType })
  @IsEnum(PathologyReportType)
  reportType: PathologyReportType;

  @ApiProperty({ description: 'Specimen site (e.g. "Skin, left forearm")' })
  @IsString()
  @IsNotEmpty()
  specimenSite: string;

  @ApiProperty({ description: 'Clinical history' })
  @IsString()
  @IsNotEmpty()
  clinicalHistory: string;

  @ApiProperty({ description: 'Macroscopic description' })
  @IsString()
  @IsNotEmpty()
  macroscopy: string;

  @ApiProperty({ description: 'Microscopic description' })
  @IsString()
  @IsNotEmpty()
  microscopy: string;

  @ApiPropertyOptional({ description: 'Immunohistochemistry results' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ihqResults?: string[];

  @ApiPropertyOptional({ description: 'Special stains used' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialStains?: string[];

  @ApiProperty({ description: 'Final diagnosis' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiPropertyOptional({ description: 'Tumor staging (TNM) if applicable' })
  @IsOptional()
  @IsString()
  staging?: string;

  @ApiPropertyOptional({ description: 'Margin status' })
  @IsOptional()
  @IsString()
  marginStatus?: string;

  @ApiPropertyOptional({ description: 'Pathologist comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Pathologist ID' })
  @IsUUID()
  pathologistId: string;
}

// ─── Microbiology Result ────────────────────────────────────────────────────

export enum MicrobiologySampleSource {
  BLOOD = 'BLOOD',
  URINE = 'URINE',
  SPUTUM = 'SPUTUM',
  WOUND = 'WOUND',
  CSF = 'CSF',
  STOOL = 'STOOL',
  TISSUE = 'TISSUE',
  RESPIRATORY = 'RESPIRATORY',
  GENITAL = 'GENITAL',
  OTHER = 'OTHER',
}

export enum SensitivityResult {
  SENSITIVE = 'S',
  INTERMEDIATE = 'I',
  RESISTANT = 'R',
}

export class AntibiogramEntryDto {
  @ApiProperty({ description: 'Antibiotic name' })
  @IsString()
  @IsNotEmpty()
  antibiotic: string;

  @ApiProperty({ description: 'Sensitivity result', enum: SensitivityResult })
  @IsEnum(SensitivityResult)
  result: SensitivityResult;

  @ApiPropertyOptional({ description: 'MIC value (ug/mL)' })
  @IsOptional()
  @IsNumber()
  mic?: number;

  @ApiPropertyOptional({ description: 'Disk zone diameter (mm)' })
  @IsOptional()
  @IsNumber()
  diskZone?: number;
}

export class CreateMicrobiologyResultDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Sample source', enum: MicrobiologySampleSource })
  @IsEnum(MicrobiologySampleSource)
  sampleSource: MicrobiologySampleSource;

  @ApiProperty({ description: 'Culture result (e.g. "Positive" or "No growth")' })
  @IsString()
  @IsNotEmpty()
  cultureResult: string;

  @ApiPropertyOptional({ description: 'Organism identified' })
  @IsOptional()
  @IsString()
  organism?: string;

  @ApiPropertyOptional({ description: 'Colony count (e.g. ">100,000 CFU/mL")' })
  @IsOptional()
  @IsString()
  colonyCount?: string;

  @ApiPropertyOptional({ description: 'Gram stain result' })
  @IsOptional()
  @IsString()
  gramStain?: string;

  @ApiPropertyOptional({ description: 'Antibiogram entries', type: [AntibiogramEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AntibiogramEntryDto)
  antibiogram?: AntibiogramEntryDto[];

  @ApiPropertyOptional({ description: 'Incubation days' })
  @IsOptional()
  @IsNumber()
  incubationDays?: number;

  @ApiPropertyOptional({ description: 'Microbiologist notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Microbiologist ID' })
  @IsUUID()
  microbiologistId: string;
}
