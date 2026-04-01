import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum PartogramContractionType {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
}

export enum DialysisType {
  HEMODIALYSIS = 'HEMODIALYSIS',
  PERITONEAL = 'PERITONEAL',
  CRRT = 'CRRT',
  SLOW_LOW = 'SLOW_LOW',
}

export enum VascularAccessType {
  AVF = 'AVF',
  AVG = 'AVG',
  TEMPORARY_CVC = 'TEMPORARY_CVC',
  TUNNELED_CVC = 'TUNNELED_CVC',
  PERITONEAL_CATHETER = 'PERITONEAL_CATHETER',
}

export enum GoldStage {
  GOLD_1 = 'GOLD_1',
  GOLD_2 = 'GOLD_2',
  GOLD_3 = 'GOLD_3',
  GOLD_4 = 'GOLD_4',
}

export enum OphthalmologyEye {
  RIGHT = 'RIGHT',
  LEFT = 'LEFT',
  BOTH = 'BOTH',
}

export enum FractureClassificationGroup {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum ImmobilizationType {
  CAST = 'CAST',
  SPLINT = 'SPLINT',
  BRACE = 'BRACE',
  EXTERNAL_FIXATOR = 'EXTERNAL_FIXATOR',
  TRACTION = 'TRACTION',
}

export enum DVTProphylaxisType {
  NONE = 'NONE',
  MECHANICAL = 'MECHANICAL',
  PHARMACOLOGICAL = 'PHARMACOLOGICAL',
  COMBINED = 'COMBINED',
}

// ============================================================================
// Nested DTOs — Partogram
// ============================================================================

export class PartogramDataPointDto {
  @ApiProperty({ description: 'Time of measurement (ISO 8601)', example: '2025-01-01T10:00:00Z' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ description: 'Value at this time point' })
  @IsNumber()
  value!: number;
}

export class PartogramContractionDto {
  @ApiProperty({ description: 'Time of contraction', example: '2025-01-01T10:00:00Z' })
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ description: 'Duration in seconds' })
  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @ApiProperty({ enum: PartogramContractionType })
  @IsEnum(PartogramContractionType)
  intensity!: PartogramContractionType;

  @ApiPropertyOptional({ description: 'Contractions per 10 minutes' })
  @IsOptional()
  @IsNumber()
  frequencyPer10min?: number;
}

export class PartogramMedicationDto {
  @ApiProperty({ description: 'Medication name', example: 'Ocitocina' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Dose', example: '5 UI/500mL' })
  @IsString()
  @IsNotEmpty()
  dose!: string;

  @ApiProperty({ description: 'Time administered' })
  @IsDateString()
  administeredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;
}

// ============================================================================
// PartogramDto
// ============================================================================

export class PartogramDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Cervical dilation measurements (cm) over time' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartogramDataPointDto)
  cervicalDilation!: PartogramDataPointDto[];

  @ApiProperty({ description: 'Fetal descent measurements (station -5 to +5) over time' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartogramDataPointDto)
  fetalDescent!: PartogramDataPointDto[];

  @ApiProperty({ description: 'Contraction records' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartogramContractionDto)
  contractions!: PartogramContractionDto[];

  @ApiProperty({ description: 'Fetal heart rate measurements (bpm) over time' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartogramDataPointDto)
  fetalHeartRate!: PartogramDataPointDto[];

  @ApiPropertyOptional({ description: 'Medications administered during labor' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartogramMedicationDto)
  medications?: PartogramMedicationDto[];

  @ApiPropertyOptional({ description: 'Base64 encoded partogram graph image or SVG string' })
  @IsOptional()
  @IsString()
  partogramGraph?: string;
}

// ============================================================================
// CardiologyDto
// ============================================================================

export class CardiologyEcgDto {
  @ApiProperty({ example: 'Sinusal' })
  @IsString()
  @IsNotEmpty()
  rhythm!: string;

  @ApiProperty({ example: 72 })
  @IsInt()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional({ example: 'Normal' })
  @IsOptional()
  @IsString()
  axis?: string;

  @ApiPropertyOptional({ description: 'PR interval ms', example: 160 })
  @IsOptional()
  @IsNumber()
  prIntervalMs?: number;

  @ApiPropertyOptional({ description: 'QRS duration ms', example: 80 })
  @IsOptional()
  @IsNumber()
  qrsDurationMs?: number;

  @ApiPropertyOptional({ description: 'QTc interval ms', example: 440 })
  @IsOptional()
  @IsNumber()
  qtcIntervalMs?: number;

  @ApiPropertyOptional({ description: 'ST segment changes', example: 'Supradesnivelamento V1-V4' })
  @IsOptional()
  @IsString()
  stChanges?: string;

  @ApiProperty({ description: 'ECG interpretation' })
  @IsString()
  @IsNotEmpty()
  interpretation!: string;
}

export class CardiologyEchoDto {
  @ApiProperty({ description: 'Left ventricular ejection fraction (%)', example: 65 })
  @IsNumber()
  @Min(0)
  @Max(100)
  lvef!: number;

  @ApiPropertyOptional({ description: 'LV end-diastolic diameter mm' })
  @IsOptional()
  @IsNumber()
  lveddMm?: number;

  @ApiPropertyOptional({ description: 'LV end-systolic diameter mm' })
  @IsOptional()
  @IsNumber()
  lvesdMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wallMotionAbnormality?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valvularFindings?: string[];

  @ApiPropertyOptional({ example: 'Função diastólica preservada' })
  @IsOptional()
  @IsString()
  diastolicFunction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pericardialEffusion?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  interpretation!: string;
}

export class CardiologyCathDto {
  @ApiProperty({ example: 'Femoral direita' })
  @IsString()
  @IsNotEmpty()
  accessSite!: string;

  @ApiProperty({ description: 'Coronary findings per vessel' })
  @IsArray()
  coronaryFindings!: Array<{ vessel: string; stenosisPercent: number; intervention?: string }>;

  @ApiPropertyOptional({ description: 'LV end-diastolic pressure mmHg' })
  @IsOptional()
  @IsNumber()
  lvEndDiastolicPressureMmhg?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conclusion!: string;
}

export class CardiologyFraminghamDto {
  @ApiProperty() @IsInt() @Min(20) @Max(100) age!: number;
  @ApiProperty() @IsNumber() totalCholesterol!: number;
  @ApiProperty() @IsNumber() hdl!: number;
  @ApiProperty() @IsInt() systolicBp!: number;
  @ApiProperty() @IsBoolean() smoker!: boolean;
  @ApiProperty() @IsBoolean() diabetes!: boolean;
  @ApiProperty({ example: 'M' }) @IsString() gender!: string;
}

export class CardiologyAscvdDto {
  @ApiProperty() @IsInt() @Min(20) @Max(100) age!: number;
  @ApiProperty() @IsNumber() totalCholesterol!: number;
  @ApiProperty() @IsNumber() hdl!: number;
  @ApiProperty() @IsInt() systolicBp!: number;
  @ApiProperty() @IsBoolean() bpTreated!: boolean;
  @ApiProperty() @IsBoolean() smoker!: boolean;
  @ApiProperty() @IsBoolean() diabetes!: boolean;
  @ApiProperty({ example: 'M' }) @IsString() gender!: string;
  @ApiProperty({ example: 'white' }) @IsString() race!: string;
}

export class CardiologyCHADS2VascDto {
  @ApiProperty({ description: 'Congestive heart failure' }) @IsBoolean() chf!: boolean;
  @ApiProperty() @IsBoolean() hypertension!: boolean;
  @ApiProperty({ description: 'Age ≥ 75' }) @IsBoolean() age75!: boolean;
  @ApiProperty() @IsBoolean() diabetes!: boolean;
  @ApiProperty({ description: 'Prior stroke/TIA' }) @IsBoolean() stroke!: boolean;
  @ApiProperty({ description: 'Vascular disease' }) @IsBoolean() vascular!: boolean;
  @ApiProperty({ description: 'Age 65–74' }) @IsBoolean() age65to74!: boolean;
  @ApiProperty({ description: 'Female sex' }) @IsBoolean() female!: boolean;
}

export class CardiologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ type: CardiologyEcgDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyEcgDto)
  ecgData?: CardiologyEcgDto;

  @ApiPropertyOptional({ type: CardiologyEchoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyEchoDto)
  echoReport?: CardiologyEchoDto;

  @ApiPropertyOptional({ type: CardiologyCathDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyCathDto)
  catheterizationRecord?: CardiologyCathDto;

  @ApiPropertyOptional({ type: CardiologyFraminghamDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyFraminghamDto)
  framinghamScore?: CardiologyFraminghamDto;

  @ApiPropertyOptional({ type: CardiologyAscvdDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyAscvdDto)
  ascvdScore?: CardiologyAscvdDto;

  @ApiPropertyOptional({ type: CardiologyCHADS2VascDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardiologyCHADS2VascDto)
  chadsVascScore?: CardiologyCHADS2VascDto;
}

// ============================================================================
// NephrologyDto
// ============================================================================

export class DialysisPrescriptionDto {
  @ApiProperty({ enum: DialysisType }) @IsEnum(DialysisType) type!: DialysisType;
  @ApiPropertyOptional({ description: 'Session duration hours' }) @IsOptional() @IsNumber() durationHours?: number;
  @ApiPropertyOptional({ description: 'Blood flow rate mL/min' }) @IsOptional() @IsNumber() bloodFlowMlMin?: number;
  @ApiPropertyOptional({ description: 'Dialysate flow rate mL/min' }) @IsOptional() @IsNumber() dialysateFlowMlMin?: number;
  @ApiPropertyOptional({ description: 'Ultrafiltration goal mL' }) @IsOptional() @IsNumber() ultrafiltrationGoalMl?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() anticoagulation?: string;
  @ApiPropertyOptional({ description: 'Membrane/filter type' }) @IsOptional() @IsString() membrane?: string;
}

export class DialysisSessionDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ description: 'Pre-session weight kg' }) @IsNumber() preWeightKg!: number;
  @ApiProperty({ description: 'Post-session weight kg' }) @IsNumber() postWeightKg!: number;
  @ApiProperty({ description: 'Duration achieved hours' }) @IsNumber() durationHours!: number;
  @ApiProperty({ description: 'Ultrafiltration achieved mL' }) @IsNumber() ultrafiltrationMl!: number;
  @ApiProperty({ description: 'Calculated Kt/V' }) @IsNumber() ktv!: number;
  @ApiPropertyOptional({ description: 'Complications during session' }) @IsOptional() @IsString() complications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nurseId?: string;
}

export class NephrologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ description: 'Serum creatinine mg/dL for CKD-EPI calculation' })
  @IsNumber()
  @Min(0)
  creatinineMgDl!: number;

  @ApiProperty({ description: 'Patient age for CKD-EPI' }) @IsInt() @Min(18) age!: number;
  @ApiProperty({ description: 'Patient gender (M/F) for CKD-EPI', example: 'F' }) @IsString() gender!: string;
  @ApiPropertyOptional({ description: 'Race for CKD-EPI (black/other)' }) @IsOptional() @IsString() race?: string;

  @ApiPropertyOptional({ type: DialysisPrescriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DialysisPrescriptionDto)
  dialysisPrescription?: DialysisPrescriptionDto;

  @ApiPropertyOptional({ enum: VascularAccessType })
  @IsOptional()
  @IsEnum(VascularAccessType)
  vascularAccess?: VascularAccessType;

  @ApiPropertyOptional({ description: 'Vascular access details (site, creation date, etc.)' })
  @IsOptional()
  @IsString()
  vascularAccessDetails?: string;

  @ApiPropertyOptional({ description: 'Dialysis session records', type: [DialysisSessionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DialysisSessionDto)
  sessionRecords?: DialysisSessionDto[];

  @ApiPropertyOptional({ description: 'Target Kt/V (adequacy goal)', example: 1.4 })
  @IsOptional()
  @IsNumber()
  ktvTarget?: number;

  @ApiPropertyOptional({ description: 'GFR — filled by service (CKD-EPI)' })
  @IsOptional()
  @IsNumber()
  gfr?: number;
}

// ============================================================================
// NeurologyDto
// ============================================================================

export class SeizureEventDto {
  @ApiProperty() @IsDateString() timestamp!: string;
  @ApiProperty({ description: 'Duration seconds' }) @IsInt() @Min(0) durationSeconds!: number;
  @ApiProperty({ description: 'Seizure type (focal/generalized/unknown)' }) @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postictalState?: string;
  @ApiPropertyOptional({ description: 'Rescue medication administered' }) @IsOptional() @IsString() rescueMedication?: string;
}

export class NeurologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ description: 'NIHSS score (0-42)', minimum: 0, maximum: 42 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(42)
  nihssScore?: number;

  @ApiPropertyOptional({ description: 'Modified Rankin Scale score (0-6)', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  mrankinScore?: number;

  @ApiPropertyOptional({ description: 'EDSS score (0.0-10.0) for MS patients' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  edssScore?: number;

  @ApiPropertyOptional({ description: 'EEG report narrative' })
  @IsOptional()
  @IsString()
  eegReport?: string;

  @ApiPropertyOptional({ description: 'EMG/nerve conduction report' })
  @IsOptional()
  @IsString()
  emgReport?: string;

  @ApiPropertyOptional({ description: 'Seizure log entries', type: [SeizureEventDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeizureEventDto)
  seizureLog?: SeizureEventDto[];

  @ApiPropertyOptional({ description: 'Neuroimaging findings (CT/MRI)' })
  @IsOptional()
  @IsString()
  neuroimagingFindings?: string;
}

// ============================================================================
// OrthopedicsDto
// ============================================================================

export class OrthopedicsDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ description: 'AO/OTA fracture classification (e.g. 42-A3)', example: '42-A3' })
  @IsOptional()
  @IsString()
  fractureClassificationAO?: string;

  @ApiPropertyOptional({ description: 'Anatomical location of fracture', example: 'Diáfise tibial' })
  @IsOptional()
  @IsString()
  fractureLocation?: string;

  @ApiPropertyOptional({ enum: FractureClassificationGroup, description: 'AO group (A/B/C)' })
  @IsOptional()
  @IsEnum(FractureClassificationGroup)
  fractureGroup?: FractureClassificationGroup;

  @ApiPropertyOptional({ enum: ImmobilizationType })
  @IsOptional()
  @IsEnum(ImmobilizationType)
  immobilization?: ImmobilizationType;

  @ApiPropertyOptional({ description: 'Immobilization details (material, location, time)' })
  @IsOptional()
  @IsString()
  immobilizationDetails?: string;

  @ApiPropertyOptional({ description: 'Traction type and weight' })
  @IsOptional()
  @IsString()
  traction?: string;

  @ApiPropertyOptional({ enum: DVTProphylaxisType })
  @IsOptional()
  @IsEnum(DVTProphylaxisType)
  dvtProphylaxis?: DVTProphylaxisType;

  @ApiPropertyOptional({ description: 'DVT prophylaxis drug and dose' })
  @IsOptional()
  @IsString()
  dvtProphylaxisDetails?: string;

  @ApiPropertyOptional({ description: 'Surgical plan notes' })
  @IsOptional()
  @IsString()
  surgicalPlan?: string;

  @ApiPropertyOptional({ description: 'Neurovascular assessment' })
  @IsOptional()
  @IsString()
  neurovascularAssessment?: string;
}

// ============================================================================
// DermatologyDto
// ============================================================================

export class NevusMappingDto {
  @ApiProperty({ description: 'Nevus identifier', example: 'L-1' }) @IsString() @IsNotEmpty() id!: string;
  @ApiProperty({ description: 'Body location', example: 'Dorso superior esquerdo' }) @IsString() @IsNotEmpty() location!: string;
  @ApiPropertyOptional({ description: 'Size mm', example: 5 }) @IsOptional() @IsNumber() sizeMm?: number;
  @ApiPropertyOptional({ description: 'ABCDE criteria notes' }) @IsOptional() @IsString() abcdeCriteria?: string;
  @ApiPropertyOptional({ description: 'Dermoscopy pattern', example: 'Reticular' }) @IsOptional() @IsString() dermoscopyPattern?: string;
  @ApiPropertyOptional({ description: 'Management recommendation' }) @IsOptional() @IsString() management?: string;
  @ApiPropertyOptional({ description: 'Dates of follow-up photos', type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) followUpDates?: string[];
}

export class DermatologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ description: 'Array of clinical photo S3 keys or URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Digital dermoscopy image key or URL' })
  @IsOptional()
  @IsString()
  dermoscopyDigital?: string;

  @ApiPropertyOptional({ description: 'Mapped nevi', type: [NevusMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NevusMappingDto)
  nevusMapping?: NevusMappingDto[];

  @ApiPropertyOptional({ description: 'Temporal tracking notes (comparison with previous visit)' })
  @IsOptional()
  @IsString()
  temporalTracking?: string;

  @ApiPropertyOptional({ description: 'Diagnosis or differential diagnosis' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: 'Treatment plan' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}

// ============================================================================
// OphthalmologyDto
// ============================================================================

export class SnellenAcuityDto {
  @ApiProperty({ enum: OphthalmologyEye }) @IsEnum(OphthalmologyEye) eye!: OphthalmologyEye;
  @ApiProperty({ description: 'Visual acuity numerator', example: 20 }) @IsInt() numerator!: number;
  @ApiProperty({ description: 'Visual acuity denominator', example: 20 }) @IsInt() denominator!: number;
  @ApiPropertyOptional({ description: 'With correction (glasses/contact)' }) @IsOptional() @IsBoolean() corrected?: boolean;
}

export class OphthalmologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ type: [SnellenAcuityDto], description: 'Snellen visual acuity (OD/OS)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnellenAcuityDto)
  snellenAcuity?: SnellenAcuityDto[];

  @ApiPropertyOptional({ description: 'Intraocular pressure OD mmHg' })
  @IsOptional()
  @IsNumber()
  tonometryOdMmhg?: number;

  @ApiPropertyOptional({ description: 'Intraocular pressure OS mmHg' })
  @IsOptional()
  @IsNumber()
  tonometryOsMmhg?: number;

  @ApiPropertyOptional({ description: 'OCT report narrative or key' })
  @IsOptional()
  @IsString()
  octReport?: string;

  @ApiPropertyOptional({ description: 'Visual field test result (Humphrey/Goldmann)' })
  @IsOptional()
  @IsString()
  visualFieldTest?: string;

  @ApiPropertyOptional({ description: 'Slit-lamp findings' })
  @IsOptional()
  @IsString()
  slitLampFindings?: string;

  @ApiPropertyOptional({ description: 'Fundoscopy findings' })
  @IsOptional()
  @IsString()
  fundoscopyFindings?: string;
}

// ============================================================================
// EndocrinologyDto
// ============================================================================

export class InsulinSlidingScaleDto {
  @ApiProperty({ description: 'Minimum blood glucose mg/dL', example: 180 }) @IsInt() minGlucose!: number;
  @ApiProperty({ description: 'Maximum blood glucose mg/dL', example: 240 }) @IsInt() maxGlucose!: number;
  @ApiProperty({ description: 'Insulin units to administer', example: 4 }) @IsNumber() units!: number;
  @ApiProperty({ description: 'Insulin type', example: 'Regular' }) @IsString() insulinType!: string;
}

export class EndocrinologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ description: 'Hospital insulin protocol name', example: 'Basal-Bolus' })
  @IsOptional()
  @IsString()
  insulinProtocol?: string;

  @ApiPropertyOptional({ description: 'Basal insulin dose units/day' })
  @IsOptional()
  @IsNumber()
  basalInsulinUnits?: number;

  @ApiPropertyOptional({ description: 'Basal insulin type', example: 'Glargina' })
  @IsOptional()
  @IsString()
  basalInsulinType?: string;

  @ApiPropertyOptional({ description: 'Sliding scale correction doses', type: [InsulinSlidingScaleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsulinSlidingScaleDto)
  slidingScale?: InsulinSlidingScaleDto[];

  @ApiPropertyOptional({ description: 'HbA1c (%)', example: 7.5 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(20)
  hba1c?: number;

  @ApiPropertyOptional({ description: 'TSH mUI/L' })
  @IsOptional()
  @IsNumber()
  tsh?: number;

  @ApiPropertyOptional({ description: 'Free T4 ng/dL' })
  @IsOptional()
  @IsNumber()
  freeT4?: number;

  @ApiPropertyOptional({ description: 'Free T3 pg/mL' })
  @IsOptional()
  @IsNumber()
  freeT3?: number;

  @ApiPropertyOptional({ description: 'Thyroid panel interpretation' })
  @IsOptional()
  @IsString()
  thyroidInterpretation?: string;

  @ApiPropertyOptional({ description: 'Glucose monitoring target range mg/dL', example: '140-180' })
  @IsOptional()
  @IsString()
  glucoseTarget?: string;
}

// ============================================================================
// PulmonologyDto
// ============================================================================

export class SpirometryDto {
  @ApiPropertyOptional({ description: 'FEV1 L' }) @IsOptional() @IsNumber() fev1L?: number;
  @ApiPropertyOptional({ description: 'FVC L' }) @IsOptional() @IsNumber() fvcL?: number;
  @ApiPropertyOptional({ description: 'FEV1/FVC ratio', example: 0.7 }) @IsOptional() @IsNumber() fev1FvcRatio?: number;
  @ApiPropertyOptional({ description: 'FEV1 % predicted' }) @IsOptional() @IsNumber() fev1Percent?: number;
  @ApiPropertyOptional({ description: 'TLC % predicted' }) @IsOptional() @IsNumber() tlcPercent?: number;
  @ApiPropertyOptional({ description: 'Spirometry interpretation', example: 'Distúrbio ventilatório obstrutivo moderado' })
  @IsOptional()
  @IsString()
  interpretation?: string;

  @ApiPropertyOptional({ description: 'Bronchodilator response' }) @IsOptional() @IsBoolean() bronchodilatorResponse?: boolean;
}

export class PulmonologyDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiPropertyOptional({ type: SpirometryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpirometryDto)
  spirometry?: SpirometryDto;

  @ApiPropertyOptional({ enum: GoldStage, description: 'COPD GOLD staging' })
  @IsOptional()
  @IsEnum(GoldStage)
  goldStaging?: GoldStage;

  @ApiPropertyOptional({ description: 'CAT score (COPD Assessment Test, 0-40)', minimum: 0, maximum: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  catScore?: number;

  @ApiPropertyOptional({ description: 'ACT score (Asthma Control Test, 5-25)', minimum: 5, maximum: 25 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(25)
  actScore?: number;

  @ApiPropertyOptional({ description: 'Home oxygen prescribed' })
  @IsOptional()
  @IsBoolean()
  homeOxygen?: boolean;

  @ApiPropertyOptional({ description: 'Home oxygen flow rate L/min' })
  @IsOptional()
  @IsNumber()
  oxygenFlowLMin?: number;

  @ApiPropertyOptional({ description: 'Home oxygen hours/day', example: 16 })
  @IsOptional()
  @IsInt()
  oxygenHoursDay?: number;

  @ApiPropertyOptional({ description: 'SpO2 target %', example: '88-92' })
  @IsOptional()
  @IsString()
  spo2Target?: string;

  @ApiPropertyOptional({ description: 'Inhaler technique assessment' })
  @IsOptional()
  @IsString()
  inhalerTechniqueAssessment?: string;
}
