import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsArray, IsNumber } from 'class-validator';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum RevolutionaryFeature {
  DIAGNOSIS_DIFFERENTIAL = 'DIAGNOSIS_DIFFERENTIAL',
  CLINICAL_PATHWAY = 'CLINICAL_PATHWAY',
  ECG_INTERPRETATION = 'ECG_INTERPRETATION',
  DIGITAL_PATHOLOGY = 'DIGITAL_PATHOLOGY',
  MORTALITY_PREDICTION = 'MORTALITY_PREDICTION',
  CONVERSATIONAL_BI = 'CONVERSATIONAL_BI',
  GENOMICS_TREATMENT = 'GENOMICS_TREATMENT',
  DIGITAL_TWIN = 'DIGITAL_TWIN',
  MULTIMODAL_ANALYSIS = 'MULTIMODAL_ANALYSIS',
  AUTONOMOUS_CODING = 'AUTONOMOUS_CODING',
  PRE_VISIT_PREP = 'PRE_VISIT_PREP',
  POST_VISIT_FOLLOWUP = 'POST_VISIT_FOLLOWUP',
  INBOX_MANAGEMENT = 'INBOX_MANAGEMENT',
  PRIOR_AUTH_AGENT = 'PRIOR_AUTH_AGENT',
  INTELLIGENT_REFERRAL = 'INTELLIGENT_REFERRAL',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class DiagnosisDifferentialDto {
  @ApiProperty({ description: 'Clinical text with symptoms and findings' })
  @IsString()
  clinicalText!: string;

  @ApiPropertyOptional({ description: 'Patient ID for context' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Patient age' })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ description: 'Patient gender' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Known comorbidities' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comorbidities?: string[];
}

export class ClinicalPathwayDto {
  @ApiProperty({ description: 'Diagnosis CID-10 code' })
  @IsString()
  diagnosisCode!: string;

  @ApiPropertyOptional({ description: 'Patient ID for personalization' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Severity level' })
  @IsString()
  @IsOptional()
  severity?: string;
}

export class EcgInterpretationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'ECG file URL or base64 data' })
  @IsString()
  @IsOptional()
  ecgData?: string;

  @ApiPropertyOptional({ description: 'Clinical indication' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;
}

export class DigitalPathologyDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Slide image URL' })
  @IsString()
  @IsOptional()
  slideUrl?: string;

  @ApiPropertyOptional({ description: 'Tissue type' })
  @IsString()
  @IsOptional()
  tissueType?: string;

  @ApiPropertyOptional({ description: 'Staining method' })
  @IsString()
  @IsOptional()
  stainingMethod?: string;
}

export class MortalityPredictionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Admission ID' })
  @IsUUID()
  @IsOptional()
  admissionId?: string;
}

export class ConversationalBiDto {
  @ApiProperty({ description: 'Natural language question' })
  @IsString()
  question!: string;

  @ApiPropertyOptional({ description: 'Date range start' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date range end' })
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class GenomicsTreatmentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Genetic variants' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variants?: string[];

  @ApiPropertyOptional({ description: 'Diagnosis for treatment guidance' })
  @IsString()
  @IsOptional()
  diagnosis?: string;
}

export class DigitalTwinDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Simulation scenario' })
  @IsString()
  @IsOptional()
  scenario?: string;

  @ApiPropertyOptional({ description: 'Treatment options to simulate' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  treatmentOptions?: string[];
}

export class MultimodalAnalysisDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Clinical text' })
  @IsString()
  @IsOptional()
  clinicalText?: string;

  @ApiPropertyOptional({ description: 'Image URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'Lab results summary' })
  @IsString()
  @IsOptional()
  labSummary?: string;

  @ApiPropertyOptional({ description: 'Voice transcription' })
  @IsString()
  @IsOptional()
  voiceTranscript?: string;
}

export class AutonomousCodingDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Auto-submit billing' })
  @IsOptional()
  autoSubmit?: boolean;
}

export class PostVisitFollowupDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiPropertyOptional({ description: 'Follow-up questions' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questions?: string[];
}

export class InboxManagementDto {
  @ApiPropertyOptional({ description: 'Doctor user ID (default: current user)' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Max messages to process' })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class PriorAuthAgentDto {
  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ description: 'Procedure codes to authorize' })
  @IsArray()
  @IsString({ each: true })
  procedureCodes!: string[];

  @ApiPropertyOptional({ description: 'Insurance plan ID' })
  @IsString()
  @IsOptional()
  insurancePlanId?: string;
}

export class IntelligentReferralDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Suspected specialty needed' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Clinical reason for referral' })
  @IsString()
  @IsOptional()
  clinicalReason?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class DifferentialDiagnosisItem {
  @ApiProperty() diagnosis!: string;
  @ApiProperty() icdCode!: string;
  @ApiProperty() probability!: number;
  @ApiProperty() reasoning!: string;
  @ApiPropertyOptional() supportingEvidence?: string[];
  @ApiPropertyOptional() suggestedWorkup?: string[];
}

export class DiagnosisDifferentialResponseDto {
  @ApiProperty({ type: [DifferentialDiagnosisItem] }) differentials!: DifferentialDiagnosisItem[];
  @ApiPropertyOptional() redFlags?: string[];
  @ApiPropertyOptional() cannotExclude?: string[];
  @ApiProperty() aiModel!: string;
}

export class ClinicalPathwayStepDto {
  @ApiProperty() order!: number;
  @ApiProperty() phase!: string;
  @ApiProperty() action!: string;
  @ApiPropertyOptional() timeframe?: string;
  @ApiPropertyOptional() responsible?: string;
  @ApiPropertyOptional() evidenceLevel?: string;
}

export class ClinicalPathwayResponseDto {
  @ApiProperty() diagnosisCode!: string;
  @ApiProperty() diagnosisName!: string;
  @ApiProperty({ type: [ClinicalPathwayStepDto] }) steps!: ClinicalPathwayStepDto[];
  @ApiPropertyOptional() guidelineSource?: string;
  @ApiPropertyOptional() expectedOutcomes?: string[];
  @ApiProperty() aiModel!: string;
}

export class EcgInterpretationResponseDto {
  @ApiProperty() rhythm!: string;
  @ApiProperty() heartRate!: number;
  @ApiPropertyOptional() axis?: string;
  @ApiPropertyOptional() prInterval?: string;
  @ApiPropertyOptional() qrsDuration?: string;
  @ApiPropertyOptional() qtcInterval?: string;
  @ApiPropertyOptional() stChanges?: string;
  @ApiProperty({ type: [String] }) findings!: string[];
  @ApiProperty() impression!: string;
  @ApiProperty() isNormal!: boolean;
  @ApiPropertyOptional() urgency?: string;
  @ApiProperty() aiModel!: string;
  @ApiPropertyOptional() confidence?: number;
}

export class DigitalPathologyResponseDto {
  @ApiProperty() tissueType!: string;
  @ApiProperty({ type: [String] }) findings!: string[];
  @ApiPropertyOptional() neoplasticCellsDetected?: boolean;
  @ApiPropertyOptional() classification?: string;
  @ApiPropertyOptional() grade?: string;
  @ApiPropertyOptional() margins?: string;
  @ApiProperty() impression!: string;
  @ApiProperty() aiModel!: string;
  @ApiPropertyOptional() confidence?: number;
}

export class MortalityPredictionResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() riskScore!: number;
  @ApiProperty() riskLevel!: string;
  @ApiProperty({ type: [String] }) contributingFactors!: string[];
  @ApiPropertyOptional() suggestedInterventions?: string[];
  @ApiPropertyOptional() palliativeCareRecommended?: boolean;
  @ApiProperty() aiModel!: string;
  @ApiProperty() calculatedAt!: Date;
}

export class ConversationalBiResponseDto {
  @ApiProperty() question!: string;
  @ApiProperty() sqlGenerated!: string;
  @ApiProperty() answer!: string;
  @ApiPropertyOptional() chartType?: string;
  @ApiPropertyOptional() chartData?: Record<string, unknown>[];
  @ApiPropertyOptional() summary?: string;
  @ApiProperty() aiModel!: string;
}

export class GenomicsTreatmentResponseDto {
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() variants?: Array<{
    gene: string;
    variant: string;
    significance: string;
    drugImplications: string[];
  }>;
  @ApiPropertyOptional() recommendedTreatments?: Array<{
    treatment: string;
    evidenceLevel: string;
    recommendation: string;
  }>;
  @ApiPropertyOptional() contraindicatedDrugs?: string[];
  @ApiProperty() aiModel!: string;
}

export class DigitalTwinResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() scenario!: string;
  @ApiPropertyOptional() simulations?: Array<{
    treatment: string;
    predictedOutcome: string;
    probability: number;
    timeToEffect: string;
    sideEffects: string[];
  }>;
  @ApiPropertyOptional() optimalStrategy?: string;
  @ApiProperty() aiModel!: string;
}

export class MultimodalAnalysisResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() integratedInsight!: string;
  @ApiPropertyOptional() textFindings?: string[];
  @ApiPropertyOptional() imageFindings?: string[];
  @ApiPropertyOptional() labFindings?: string[];
  @ApiPropertyOptional() voiceFindings?: string[];
  @ApiPropertyOptional() synthesizedConclusion?: string;
  @ApiPropertyOptional() suggestedActions?: string[];
  @ApiProperty() aiModel!: string;
}

export class AutonomousCodingResponseDto {
  @ApiProperty() encounterId!: string;
  @ApiPropertyOptional() diagnosisCodes?: Array<{
    code: string;
    description: string;
    confidence: number;
  }>;
  @ApiPropertyOptional() procedureCodes?: Array<{
    code: string;
    system: string;
    description: string;
    confidence: number;
  }>;
  @ApiPropertyOptional() totalBilled?: number;
  @ApiPropertyOptional() billingStatus?: string;
  @ApiProperty() requiresReview!: boolean;
  @ApiProperty() aiModel!: string;
}

export class PostVisitFollowupResponseDto {
  @ApiProperty() taskId!: string;
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() scheduledContact?: string;
  @ApiPropertyOptional() questions?: string[];
  @ApiPropertyOptional() responseReceived?: boolean;
  @ApiPropertyOptional() patientResponses?: Array<{
    question: string;
    answer: string;
    needsEscalation: boolean;
  }>;
  @ApiPropertyOptional() escalationTriggered?: boolean;
}

export class InboxManagementResponseDto {
  @ApiProperty() totalMessages!: number;
  @ApiProperty() triaged!: number;
  @ApiPropertyOptional() urgent?: Array<{
    messageId: string;
    patientName: string;
    subject: string;
    urgencyReason: string;
    suggestedResponse: string;
  }>;
  @ApiPropertyOptional() routine?: Array<{
    messageId: string;
    patientName: string;
    subject: string;
    suggestedResponse: string;
  }>;
  @ApiPropertyOptional() informational?: Array<{
    messageId: string;
    patientName: string;
    subject: string;
  }>;
}

export class PriorAuthAgentResponseDto {
  @ApiProperty() taskId!: string;
  @ApiProperty() encounterId!: string;
  @ApiPropertyOptional() formGenerated?: boolean;
  @ApiPropertyOptional() clinicalJustification?: string;
  @ApiPropertyOptional() supportingDocuments?: string[];
  @ApiPropertyOptional() submissionStatus?: string;
  @ApiPropertyOptional() estimatedResponseTime?: string;
  @ApiPropertyOptional() approvalProbability?: number;
}

export class IntelligentReferralResponseDto {
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() recommendedSpecialty?: string;
  @ApiPropertyOptional() reasoning?: string;
  @ApiPropertyOptional() suggestedSpecialists?: Array<{
    name: string;
    specialty: string;
    availability: string;
  }>;
  @ApiPropertyOptional() referralLetter?: string;
  @ApiPropertyOptional() urgency?: string;
}
