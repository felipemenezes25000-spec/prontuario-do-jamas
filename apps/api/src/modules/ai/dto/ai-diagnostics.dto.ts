import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AI Antimicrobial Optimization
// ═══════════════════════════════════════════════════════════════════════════════

export type AntibioticInterpretation = 'S' | 'I' | 'R';

export class SensitivityEntryDto {
  @ApiProperty() @IsString() antibiotic!: string;
  @ApiProperty() @IsNumber() mic!: number;
  @ApiProperty({ enum: ['S', 'I', 'R'] }) @IsEnum(['S', 'I', 'R'] as const) interpretation!: AntibioticInterpretation;
}

export class CultureResultDto {
  @ApiProperty() @IsString() organism!: string;
  @ApiProperty({ type: [SensitivityEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensitivityEntryDto)
  sensitivities!: SensitivityEntryDto[];
}

export class RenalFunctionDto {
  @ApiProperty() @IsNumber() creatinine!: number;
  @ApiProperty() @IsNumber() gfr!: number;
}

export class AntimicrobialOptRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty({ type: CultureResultDto })
  @ValidateNested()
  @Type(() => CultureResultDto)
  cultureResult!: CultureResultDto;
  @ApiProperty() @IsString() currentAntibiotic!: string;
  @ApiProperty() @IsString() currentDose!: string;
  @ApiProperty() @IsNumber() @Min(1) dayOfTherapy!: number;
  @ApiProperty({ type: RenalFunctionDto })
  @ValidateNested()
  @Type(() => RenalFunctionDto)
  renalFunction!: RenalFunctionDto;
  @ApiProperty() @IsNumber() @Min(1) weight!: number;
}

export type AntimicrobialRecommendation = 'CONTINUE' | 'NARROW' | 'SWITCH' | 'ESCALATE' | 'STOP';

export interface PharmacokineticData {
  trough: number;
  peak: number;
  auc: number;
}

export interface CostComparison {
  current: number;
  suggested: number;
}

export interface AntimicrobialOptDto {
  recommendation: AntimicrobialRecommendation;
  suggestedAntibiotic: string;
  suggestedDose: string;
  route: string;
  duration: string;
  reasoning: string;
  deescalationOpportunity: boolean;
  pharmacokineticData: PharmacokineticData;
  costComparison: CostComparison;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AI Adverse Effect Prediction
// ═══════════════════════════════════════════════════════════════════════════════

export class GeneticProfileOptionalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() cyp2d6?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cyp2c19?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cyp2c9?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cyp3a4?: string;
}

export class PatientFactorsDto {
  @ApiProperty() @IsNumber() age!: number;
  @ApiProperty() @IsNumber() weight!: number;
  @ApiProperty({ type: RenalFunctionDto })
  @ValidateNested()
  @Type(() => RenalFunctionDto)
  renalFunction!: RenalFunctionDto;
  @ApiProperty() @IsNumber() @Min(0) @Max(40) hepaticFunction!: number; // Child-Pugh or MELD
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) comorbidities!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) otherMedications!: string[];
  @ApiPropertyOptional({ type: GeneticProfileOptionalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneticProfileOptionalDto)
  geneticProfile?: GeneticProfileOptionalDto;
}

export class AdverseEffectPredictionRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() medicationId!: string;
  @ApiProperty() @IsString() dose!: string;
  @ApiProperty() @IsString() route!: string;
  @ApiProperty({ type: PatientFactorsDto })
  @ValidateNested()
  @Type(() => PatientFactorsDto)
  patientFactors!: PatientFactorsDto;
}

export type AdverseEffectProbability = 'RARE' | 'UNCOMMON' | 'COMMON' | 'VERY_COMMON';
export type AdverseEffectSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export interface MonitoringPlan {
  test: string;
  frequency: string;
}

export interface AdverseEffectRisk {
  effectName: string;
  probability: AdverseEffectProbability;
  severity: AdverseEffectSeverity;
  timeframe: string;
  riskFactorsPresent: string[];
  monitoringPlan: MonitoringPlan;
  preventionStrategy: string;
}

export interface AdverseEffectPredictionDto {
  risks: AdverseEffectRisk[];
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AI Pharmacogenomics
// ═══════════════════════════════════════════════════════════════════════════════

export type MetabolizerStatus = 'POOR' | 'INTERMEDIATE' | 'NORMAL' | 'RAPID' | 'ULTRA_RAPID';

export class PharmacogenomicsGeneticProfileDto {
  @ApiPropertyOptional({ enum: ['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] })
  @IsOptional() @IsEnum(['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] as const)
  cyp2d6?: MetabolizerStatus;

  @ApiPropertyOptional({ enum: ['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] })
  @IsOptional() @IsEnum(['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] as const)
  cyp2c19?: MetabolizerStatus;

  @ApiPropertyOptional({ enum: ['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] })
  @IsOptional() @IsEnum(['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] as const)
  cyp2c9?: MetabolizerStatus;

  @ApiPropertyOptional({ enum: ['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] })
  @IsOptional() @IsEnum(['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] as const)
  cyp3a4?: MetabolizerStatus;

  @ApiPropertyOptional({ enum: ['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] })
  @IsOptional() @IsEnum(['POOR', 'INTERMEDIATE', 'NORMAL', 'RAPID', 'ULTRA_RAPID'] as const)
  vkorc1?: MetabolizerStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() hlab5701?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dpyd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tpmt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ugt1a1?: string;
}

export class PharmacogenomicsRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() medicationId!: string;
  @ApiProperty({ type: PharmacogenomicsGeneticProfileDto })
  @ValidateNested()
  @Type(() => PharmacogenomicsGeneticProfileDto)
  geneticProfile!: PharmacogenomicsGeneticProfileDto;
}

export type PgxRecommendation = 'STANDARD_DOSE' | 'REDUCE_DOSE' | 'INCREASE_DOSE' | 'AVOID' | 'USE_ALTERNATIVE';
export type EvidenceLevel = 'STRONG' | 'MODERATE' | 'LIMITED';

export interface PharmacogenomicsDto {
  metabolizerStatus: MetabolizerStatus;
  recommendation: PgxRecommendation;
  adjustedDose: string;
  alternativeMedications: string[];
  evidence: EvidenceLevel;
  cpicGuideline: string;
  clinicalImplication: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AI Lab Panel Interpretation
// ═══════════════════════════════════════════════════════════════════════════════

export class LabResultEntryDto {
  @ApiProperty() @IsString() testName!: string;
  @ApiProperty() @IsNumber() value!: number;
  @ApiProperty() @IsString() unit!: string;
  @ApiProperty() @IsNumber() referenceMin!: number;
  @ApiProperty() @IsNumber() referenceMax!: number;
}

export class LabPanelInterpretationRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ type: [LabResultEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultEntryDto)
  results!: LabResultEntryDto[];
}

export type PatternSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LabPattern {
  pattern: string;
  description: string;
  suggestedDiagnoses: string[];
  severity: PatternSeverity;
}

export interface AbnormalResult {
  test: string;
  value: number;
  deviation: string;
  clinicalSignificance: string;
}

export interface LabPanelInterpretationDto {
  patterns: LabPattern[];
  abnormalResults: AbnormalResult[];
  suggestedAdditionalTests: string[];
  overallAssessment: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AI Result Prediction
// ═══════════════════════════════════════════════════════════════════════════════

export class ResultPredictionRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() testOrdered!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentVitals?: string;
  @ApiProperty() @IsString() recentHistory!: string;
}

export interface PredictedResult {
  value: number;
  range: string;
}

export interface ResultPredictionDto {
  predictedResult: PredictedResult;
  abnormalProbability: number;
  confidence: number;
  reasoning: string;
  clinicalImplication: string;
  suggestedEarlyAction: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AI Sample Swap Detection
// ═══════════════════════════════════════════════════════════════════════════════

export class SampleResultEntryDto {
  @ApiProperty() @IsString() test!: string;
  @ApiProperty() @IsNumber() value!: number;
}

export class SampleSwapCheckRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsString() specimenId!: string;
  @ApiProperty({ type: [SampleResultEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SampleResultEntryDto)
  results!: SampleResultEntryDto[];
}

export type SampleSwapRecommendation = 'RELEASE' | 'REVIEW' | 'RECOLLECT';

export interface SampleSwapFlag {
  test: string;
  currentValue: number;
  historicalMean: number;
  historicalSD: number;
  zScore: number;
  suspicious: boolean;
}

export interface DeltaCheck {
  test: string;
  previousValue: number;
  currentValue: number;
  change: number;
  maxExpected: number;
  exceeded: boolean;
}

export interface SampleSwapCheckDto {
  swapProbability: number;
  flags: SampleSwapFlag[];
  recommendation: SampleSwapRecommendation;
  deltaChecks: DeltaCheck[];
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AI Imaging Analysis
// ═══════════════════════════════════════════════════════════════════════════════

export type ImagingModality = 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'MAMMOGRAPHY';
export type FindingSeverity = 'NORMAL' | 'INCIDENTAL' | 'ABNORMAL' | 'CRITICAL';
export type ImagingUrgency = 'ROUTINE' | 'SOON' | 'URGENT' | 'CRITICAL';

export class ImagingAnalysisRequestDto {
  @ApiProperty() @IsString() studyId!: string;
  @ApiProperty({ enum: ['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY'] })
  @IsEnum(['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY'] as const)
  modality!: ImagingModality;
  @ApiProperty() @IsString() bodyPart!: string;
  @ApiProperty() @IsString() clinicalIndication!: string;
}

export interface ImagingFinding {
  finding: string;
  location: string;
  severity: FindingSeverity;
  confidence: number;
  measurementsIfApplicable: string;
}

export interface SuggestedFollowUp {
  action: string;
  timeframe: string;
  modality: string;
}

export interface ImagingAnalysisDto {
  findings: ImagingFinding[];
  impressions: string[];
  urgency: ImagingUrgency;
  suggestedFollowUp: SuggestedFollowUp;
  prioritizeWorklist: boolean;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. AI CAD Mammography
// ═══════════════════════════════════════════════════════════════════════════════

export type BreastDensity = 'A' | 'B' | 'C' | 'D';
export type MammographyFindingType = 'MASS' | 'CALCIFICATION' | 'ARCHITECTURAL_DISTORTION' | 'ASYMMETRY';
export type MammographyRecommendation = 'ROUTINE_SCREENING' | 'SHORT_INTERVAL_FOLLOWUP' | 'BIOPSY' | 'ADDITIONAL_IMAGING';

export class MammographyCADRequestDto {
  @ApiProperty() @IsString() studyId!: string;
  @ApiProperty() @IsNumber() @Min(18) @Max(120) patientAge!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() priorStudyId?: string;
  @ApiProperty({ enum: ['A', 'B', 'C', 'D'] })
  @IsEnum(['A', 'B', 'C', 'D'] as const)
  breastDensity!: BreastDensity;
}

export interface MammographyFindingLocation {
  laterality: string;
  quadrant: string;
  clockPosition: string;
  depth: string;
}

export interface MammographyFinding {
  type: MammographyFindingType;
  location: MammographyFindingLocation;
  size: string;
  morphology: string;
  biradsCategory: number;
  suspicionLevel: number;
}

export interface MammographyCADDto {
  findings: MammographyFinding[];
  overallBIRADS: number;
  recommendation: MammographyRecommendation;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. AI Auto-measurement
// ═══════════════════════════════════════════════════════════════════════════════

export type MeasurementType =
  | 'CARDIOTHORACIC_RATIO'
  | 'LUNG_VOLUME'
  | 'BONE_DENSITY'
  | 'NODULE_SIZE'
  | 'PLEURAL_EFFUSION'
  | 'AORTIC_DIAMETER'
  | 'VENTRICLE_SIZE';

export class AutoMeasurementRequestDto {
  @ApiProperty() @IsString() studyId!: string;
  @ApiProperty({ enum: ['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY'] })
  @IsEnum(['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY'] as const)
  modality!: ImagingModality;
  @ApiProperty({
    enum: [
      'CARDIOTHORACIC_RATIO', 'LUNG_VOLUME', 'BONE_DENSITY', 'NODULE_SIZE',
      'PLEURAL_EFFUSION', 'AORTIC_DIAMETER', 'VENTRICLE_SIZE',
    ],
  })
  @IsEnum([
    'CARDIOTHORACIC_RATIO', 'LUNG_VOLUME', 'BONE_DENSITY', 'NODULE_SIZE',
    'PLEURAL_EFFUSION', 'AORTIC_DIAMETER', 'VENTRICLE_SIZE',
  ] as const)
  measurementType!: MeasurementType;
}

export interface AutoMeasurementEntry {
  type: MeasurementType;
  value: number;
  unit: string;
  normalRange: string;
  interpretation: string;
}

export interface ComparisonWithPrior {
  previousValue: number;
  change: number;
  changePercent: number;
  trend: string;
}

export interface AutoMeasurementDto {
  measurements: AutoMeasurementEntry[];
  comparisonWithPrior: ComparisonWithPrior | null;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. AI Surgical Duration Estimation
// ═══════════════════════════════════════════════════════════════════════════════

export class SurgicalDurationRequestDto {
  @ApiProperty() @IsString() procedureCode!: string;
  @ApiProperty() @IsString() surgeonId!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(120) patientAge!: number;
  @ApiProperty() @IsNumber() @Min(10) @Max(80) bmi!: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(6) asaClass!: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) comorbidities!: string[];
  @ApiProperty() @IsBoolean() isRevision!: boolean;
  @ApiProperty() @IsBoolean() isEmergency!: boolean;
}

export interface DurationFactor {
  factor: string;
  impact: 'INCREASES' | 'DECREASES' | 'NEUTRAL';
  minutes: number;
}

export interface SurgicalDurationDto {
  estimatedMinutes: number;
  confidenceInterval: { min: number; max: number };
  factors: DurationFactor[];
  surgeonAverageForProcedure: number;
  hospitalAverageForProcedure: number;
  suggestedBlockTime: number;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. AI Sepsis Early Warning
// ═══════════════════════════════════════════════════════════════════════════════

export type SepsisRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type SepsisTimeToOnset = 'IMMINENT' | '4_6H' | '6_12H' | '12_24H';
export type SepsisBundle = 'NONE' | 'SCREENING' | 'BUNDLE_1H' | 'BUNDLE_3H';

export class SepsisEarlyWarningRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
}

export interface SepsisTrigger {
  parameter: string;
  value: string;
  trend: string;
  contribution: number;
}

export interface QSofaResult {
  score: number;
  criteria: string[];
}

export interface SofaOrganScore {
  organ: string;
  score: number;
}

export interface SofaResult {
  score: number;
  organScores: SofaOrganScore[];
}

export interface SepsisEarlyWarningDto {
  risk: number;
  riskLevel: SepsisRiskLevel;
  timeToOnset: SepsisTimeToOnset;
  triggers: SepsisTrigger[];
  qsofa: QSofaResult;
  sofa: SofaResult;
  recommendedBundle: SepsisBundle;
  actionItems: string[];
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. AI Extubation Success Prediction
// ═══════════════════════════════════════════════════════════════════════════════

export type SbtResultType = 'PASSED' | 'FAILED';
export type CoughStrength = 'WEAK' | 'MODERATE' | 'STRONG';
export type SecretionLevel = 'MINIMAL' | 'MODERATE' | 'COPIOUS';
export type ExtubationRecommendation = 'EXTUBATE' | 'DELAY' | 'TRACHEOSTOMY_CONSIDER';

export class ExtubationPredictionRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty({ enum: ['PASSED', 'FAILED'] })
  @IsEnum(['PASSED', 'FAILED'] as const)
  sbtResult!: SbtResultType;
  @ApiProperty() @IsNumber() @Min(0) sbtDuration!: number;
  @ApiProperty() @IsNumber() @Min(0) rsbi!: number;
  @ApiProperty() @IsNumber() @Min(0) pFRatio!: number;
  @ApiProperty() @IsNumber() @Min(3) @Max(15) gcs!: number;
  @ApiProperty({ enum: ['WEAK', 'MODERATE', 'STRONG'] })
  @IsEnum(['WEAK', 'MODERATE', 'STRONG'] as const)
  coughStrength!: CoughStrength;
  @ApiProperty({ enum: ['MINIMAL', 'MODERATE', 'COPIOUS'] })
  @IsEnum(['MINIMAL', 'MODERATE', 'COPIOUS'] as const)
  secretions!: SecretionLevel;
  @ApiProperty() @IsNumber() @Min(0) daysOnVent!: number;
}

export interface ExtubationRiskFactor {
  factor: string;
  impact: string;
}

export interface PostExtubationPlan {
  niv: boolean;
  highFlowNasal: boolean;
  monitoring: string;
}

export interface ExtubationPredictionDto {
  successProbability: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  riskFactors: ExtubationRiskFactor[];
  recommendation: ExtubationRecommendation;
  postExtubationPlan: PostExtubationPlan;
  disclaimer: string;
}
