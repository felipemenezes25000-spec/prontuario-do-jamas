import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum DigitalTwinOrganSystem {
  CARDIOVASCULAR = 'CARDIOVASCULAR',
  RESPIRATORY = 'RESPIRATORY',
  RENAL = 'RENAL',
  HEPATIC = 'HEPATIC',
  NEUROLOGICAL = 'NEUROLOGICAL',
  ENDOCRINE = 'ENDOCRINE',
  HEMATOLOGICAL = 'HEMATOLOGICAL',
  MUSCULOSKELETAL = 'MUSCULOSKELETAL',
  GASTROINTESTINAL = 'GASTROINTESTINAL',
  IMMUNOLOGICAL = 'IMMUNOLOGICAL',
}

export enum CypEnzymeStatus {
  ULTRA_RAPID = 'ULTRA_RAPID',
  EXTENSIVE = 'EXTENSIVE',
  INTERMEDIATE = 'INTERMEDIATE',
  POOR = 'POOR',
}

export enum OncogenomicTherapyType {
  TARGETED = 'TARGETED',
  IMMUNOTHERAPY = 'IMMUNOTHERAPY',
  CHEMOTHERAPY = 'CHEMOTHERAPY',
  HORMONE = 'HORMONE',
  COMBINATION = 'COMBINATION',
}

export enum BiVisualizationType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  TABLE = 'table',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  KPI = 'kpi',
}

export enum HealthCoachCategory {
  MEDICATION_ADHERENCE = 'MEDICATION_ADHERENCE',
  NUTRITION = 'NUTRITION',
  EXERCISE = 'EXERCISE',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  CHRONIC_DISEASE = 'CHRONIC_DISEASE',
  PREVENTIVE_CARE = 'PREVENTIVE_CARE',
  SLEEP = 'SLEEP',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  OVERDUE = 'OVERDUE',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class DigitalTwinSimulateDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Treatment scenario to simulate' })
  @IsString()
  scenario!: string;

  @ApiPropertyOptional({ description: 'Treatment options to compare' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  treatmentOptions?: string[];

  @ApiPropertyOptional({ description: 'Simulation duration in days' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Include organ system breakdown' })
  @IsBoolean()
  @IsOptional()
  includeOrganBreakdown?: boolean;
}

export class PharmacogenomicDrugDoseDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Drug name or ATC code' })
  @IsString()
  drugName!: string;

  @ApiPropertyOptional({ description: 'Standard dose in mg' })
  @IsNumber()
  @IsOptional()
  standardDoseMg?: number;

  @ApiPropertyOptional({ description: 'Route of administration' })
  @IsString()
  @IsOptional()
  route?: string;

  @ApiPropertyOptional({ description: 'Known CYP genotype overrides (JSON)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownGenotypes?: string[];
}

export class OncogenomicTherapyMatchDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Tumor type (e.g. NSCLC, breast, colorectal)' })
  @IsString()
  tumorType!: string;

  @ApiPropertyOptional({ description: 'Known mutations (e.g. EGFR L858R)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mutations?: string[];

  @ApiPropertyOptional({ description: 'Prior treatments tried' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  priorTreatments?: string[];

  @ApiPropertyOptional({ description: 'Include clinical trial eligibility' })
  @IsBoolean()
  @IsOptional()
  includeTrials?: boolean;
}

export class ConversationalBiQueryDto {
  @ApiProperty({ description: 'Natural language question in Portuguese' })
  @IsString()
  question!: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Department filter' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Preferred visualization type' })
  @IsEnum(BiVisualizationType)
  @IsOptional()
  preferredChart?: BiVisualizationType;
}

export class MultimodalInputDto {
  @ApiProperty({ description: 'Clinical text / notes' })
  @IsString()
  clinicalText!: string;

  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Image URLs (X-ray, CT, MRI)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'Lab results summary text' })
  @IsString()
  @IsOptional()
  labSummary?: string;

  @ApiPropertyOptional({ description: 'Voice transcript text' })
  @IsString()
  @IsOptional()
  voiceTranscript?: string;

  @ApiPropertyOptional({ description: 'ECG data (URL or base64)' })
  @IsString()
  @IsOptional()
  ecgData?: string;
}

export class HealthCoachRecommendationsDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Focus categories' })
  @IsArray()
  @IsEnum(HealthCoachCategory, { each: true })
  @IsOptional()
  categories?: HealthCoachCategory[];

  @ApiPropertyOptional({ description: 'Known conditions (CID-10 codes)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditions?: string[];

  @ApiPropertyOptional({ description: 'Current medications' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medications?: string[];
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

// Digital Twin
export class OrganSystemScoreDto {
  @ApiProperty() organSystem!: string;
  @ApiProperty() healthScore!: number;
  @ApiProperty() trend!: string;
  @ApiProperty() riskFactors!: string[];
}

export class TreatmentSimulationResultDto {
  @ApiProperty() treatment!: string;
  @ApiProperty() projectedOutcome!: string;
  @ApiProperty() successProbability!: number;
  @ApiProperty() timeToEffect!: string;
  @ApiProperty() sideEffectRisks!: string[];
  @ApiProperty() qualityOfLifeImpact!: string;
  @ApiProperty() costEstimate!: string;
}

export class DigitalTwinStatusResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() lastUpdated!: string;
  @ApiProperty() overallHealthScore!: number;
  @ApiProperty({ type: [OrganSystemScoreDto] }) organSystems!: OrganSystemScoreDto[];
  @ApiProperty() riskAlerts!: string[];
  @ApiProperty() aiModel!: string;
}

export class DigitalTwinSimulationResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() scenario!: string;
  @ApiProperty({ type: [TreatmentSimulationResultDto] }) simulations!: TreatmentSimulationResultDto[];
  @ApiProperty({ type: [OrganSystemScoreDto] }) organSystemImpact!: OrganSystemScoreDto[];
  @ApiProperty() optimalStrategy!: string;
  @ApiProperty() confidenceLevel!: number;
  @ApiProperty() aiModel!: string;
}

// Pharmacogenomics
export class CypEnzymeProfileDto {
  @ApiProperty() enzyme!: string;
  @ApiProperty() genotype!: string;
  @ApiProperty({ enum: CypEnzymeStatus }) phenotype!: CypEnzymeStatus;
  @ApiProperty() activityScore!: number;
  @ApiProperty() affectedDrugs!: string[];
}

export class DrugInteractionAlertDto {
  @ApiProperty() drugA!: string;
  @ApiProperty() drugB!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() mechanism!: string;
  @ApiProperty() recommendation!: string;
}

export class PharmacogenomicProfileResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [CypEnzymeProfileDto] }) enzymes!: CypEnzymeProfileDto[];
  @ApiProperty() highRiskDrugs!: string[];
  @ApiProperty({ type: [DrugInteractionAlertDto] }) interactionAlerts!: DrugInteractionAlertDto[];
  @ApiProperty() testDate!: string;
  @ApiProperty() aiModel!: string;
}

export class GenotypeDoseResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() drugName!: string;
  @ApiProperty() standardDoseMg!: number;
  @ApiProperty() adjustedDoseMg!: number;
  @ApiProperty() adjustmentReason!: string;
  @ApiProperty() relevantEnzyme!: string;
  @ApiProperty() phenotype!: string;
  @ApiProperty() evidenceLevel!: string;
  @ApiProperty() guidelineSource!: string;
  @ApiProperty() warnings!: string[];
  @ApiProperty() aiModel!: string;
}

// Oncogenomics
export class MutationProfileDto {
  @ApiProperty() gene!: string;
  @ApiProperty() variant!: string;
  @ApiProperty() significance!: string;
  @ApiProperty() frequency!: number;
  @ApiProperty() actionable!: boolean;
}

export class TargetedTherapyDto {
  @ApiProperty() therapyName!: string;
  @ApiProperty({ enum: OncogenomicTherapyType }) type!: OncogenomicTherapyType;
  @ApiProperty() targetMutation!: string;
  @ApiProperty() evidenceLevel!: string;
  @ApiProperty() responseRate!: number;
  @ApiProperty() medianPfs!: string;
  @ApiProperty() keyTrials!: string[];
}

export class ClinicalTrialDto {
  @ApiProperty() trialId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() phase!: string;
  @ApiProperty() eligibilityCriteriaMet!: string[];
  @ApiProperty() location!: string;
  @ApiProperty() status!: string;
}

export class OncogenomicProfileResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() tumorType!: string;
  @ApiProperty({ type: [MutationProfileDto] }) mutations!: MutationProfileDto[];
  @ApiProperty() tmbScore!: number;
  @ApiProperty() msiStatus!: string;
  @ApiProperty() pdl1Expression!: number;
  @ApiProperty() aiModel!: string;
}

export class OncogenomicTherapyMatchResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [TargetedTherapyDto] }) matchedTherapies!: TargetedTherapyDto[];
  @ApiProperty({ type: [ClinicalTrialDto] }) eligibleTrials!: ClinicalTrialDto[];
  @ApiProperty() resistanceMechanisms!: string[];
  @ApiProperty() summary!: string;
  @ApiProperty() aiModel!: string;
}

// Conversational BI
export class BiDataPointDto {
  @ApiProperty() label!: string;
  @ApiProperty() value!: number;
  @ApiPropertyOptional() category?: string;
}

export class ConversationalBiResponseDto {
  @ApiProperty() question!: string;
  @ApiProperty() sqlGenerated!: string;
  @ApiProperty() answer!: string;
  @ApiProperty({ enum: BiVisualizationType }) chartType!: BiVisualizationType;
  @ApiProperty({ type: [BiDataPointDto] }) chartData!: BiDataPointDto[];
  @ApiProperty() summary!: string;
  @ApiProperty() dataQualityWarnings!: string[];
  @ApiProperty() aiModel!: string;
}

// Multimodal Analysis
export class MultimodalAnalysisResponseDto {
  @ApiProperty() integratedInsight!: string;
  @ApiProperty() textFindings!: string[];
  @ApiProperty() imageFindings!: string[];
  @ApiProperty() labFindings!: string[];
  @ApiProperty() voiceFindings!: string[];
  @ApiProperty() ecgFindings!: string[];
  @ApiProperty() synthesizedConclusion!: string;
  @ApiProperty() suggestedActions!: string[];
  @ApiProperty() urgencyLevel!: string;
  @ApiProperty() confidence!: number;
  @ApiProperty() aiModel!: string;
}

// Health Coach
export class HealthRecommendationDto {
  @ApiProperty({ enum: HealthCoachCategory }) category!: HealthCoachCategory;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priority!: number;
  @ApiProperty() frequency!: string;
  @ApiPropertyOptional() relatedCondition?: string;
}

export class MedicationReminderDto {
  @ApiProperty() medicationName!: string;
  @ApiProperty() dosage!: string;
  @ApiProperty() schedule!: string[];
  @ApiProperty() instructions!: string;
  @ApiProperty() importanceNote!: string;
}

export class HealthCoachResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [HealthRecommendationDto] }) recommendations!: HealthRecommendationDto[];
  @ApiProperty({ type: [MedicationReminderDto] }) medicationReminders!: MedicationReminderDto[];
  @ApiProperty() lifestyleTips!: string[];
  @ApiProperty() motivationalMessage!: string;
  @ApiProperty() aiModel!: string;
}

export class HealthGoalDto {
  @ApiProperty() goalId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: HealthCoachCategory }) category!: HealthCoachCategory;
  @ApiProperty({ enum: GoalStatus }) status!: GoalStatus;
  @ApiProperty() targetDate!: string;
  @ApiProperty() progressPercent!: number;
  @ApiProperty() milestones!: string[];
}

export class HealthGoalsResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [HealthGoalDto] }) goals!: HealthGoalDto[];
  @ApiProperty() overallAdherence!: number;
  @ApiProperty() nextCheckIn!: string;
}
