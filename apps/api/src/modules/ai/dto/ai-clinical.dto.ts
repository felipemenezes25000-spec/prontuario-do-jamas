import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export enum DiagnosisProbability {
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
}

export enum SeverityLevel {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum QuestionCategory {
  HISTORY = 'HISTORY',
  SYMPTOMS = 'SYMPTOMS',
  RISK_FACTORS = 'RISK_FACTORS',
  REVIEW_OF_SYSTEMS = 'REVIEW_OF_SYSTEMS',
  SOCIAL = 'SOCIAL',
  FAMILY = 'FAMILY',
}

export enum InconsistencyType {
  ALLERGY_MEDICATION = 'ALLERGY_MEDICATION',
  DIAGNOSIS_MEDICATION = 'DIAGNOSIS_MEDICATION',
  HISTORY_VITALS = 'HISTORY_VITALS',
  DUPLICATE_DIAGNOSIS = 'DUPLICATE_DIAGNOSIS',
  CONFLICTING_NOTES = 'CONFLICTING_NOTES',
  LAB_MEDICATION = 'LAB_MEDICATION',
}

export enum InconsistencySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum NoteType {
  SOAP = 'SOAP',
  EVOLUTION = 'EVOLUTION',
  ADMISSION = 'ADMISSION',
  DISCHARGE = 'DISCHARGE',
}

export enum AutoCompleteSuggestionSource {
  PATIENT_DATA = 'PATIENT_DATA',
  TEMPLATE = 'TEMPLATE',
  CLINICAL_CONTEXT = 'CLINICAL_CONTEXT',
}

export enum SupportedLanguage {
  PT_BR = 'pt-BR',
  EN = 'en',
  ES = 'es',
  FR = 'fr',
}

export enum TargetAudience {
  PATIENT = 'PATIENT',
  FAMILY = 'FAMILY',
  CAREGIVER = 'CAREGIVER',
}

export enum PCRTimeframe {
  FOUR_HOURS = '4H',
  EIGHT_HOURS = '8H',
  TWELVE_HOURS = '12H',
  TWENTY_FOUR_HOURS = '24H',
}

export enum PCRRiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}

export enum ECGRhythm {
  SINUS = 'SINUS',
  AFIB = 'AFIB',
  AFLUTTER = 'AFLUTTER',
  VT = 'VT',
  VF = 'VF',
  SVT = 'SVT',
  BRADYCARDIA = 'BRADYCARDIA',
  HEART_BLOCK_1 = 'HEART_BLOCK_1',
  HEART_BLOCK_2_1 = 'HEART_BLOCK_2_1',
  HEART_BLOCK_2_2 = 'HEART_BLOCK_2_2',
  HEART_BLOCK_3 = 'HEART_BLOCK_3',
  PVC = 'PVC',
  PAC = 'PAC',
}

export enum ECGUrgency {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum MedicationErrorType {
  WRONG_DOSE = 'WRONG_DOSE',
  WRONG_ROUTE = 'WRONG_ROUTE',
  WRONG_FREQUENCY = 'WRONG_FREQUENCY',
  DUPLICATE = 'DUPLICATE',
  OMISSION = 'OMISSION',
  WRONG_PATIENT_CONTEXT = 'WRONG_PATIENT_CONTEXT',
  CONTRAINDICATED = 'CONTRAINDICATED',
}

export enum MedicationErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ReadmissionRiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum InterventionCategory {
  FOLLOW_UP = 'FOLLOW_UP',
  HOME_CARE = 'HOME_CARE',
  EDUCATION = 'EDUCATION',
  MEDICATION = 'MEDICATION',
  SOCIAL = 'SOCIAL',
}

export enum WorkupUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum OrderType {
  MEDICATION = 'MEDICATION',
  LAB = 'LAB',
  IMAGING = 'IMAGING',
  PROCEDURE = 'PROCEDURE',
  NURSING = 'NURSING',
  DIET = 'DIET',
  CONSULT = 'CONSULT',
}

export enum OrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Differential Diagnosis
// ═══════════════════════════════════════════════════════════════════════════════

export class SymptomDetailDto {
  @ApiProperty({ description: 'Symptom name', example: 'Dor torácica' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Time of onset', example: 'Há 2 horas' })
  @IsString()
  onset!: string;

  @ApiProperty({ description: 'Severity 1-10', example: 7 })
  @IsInt()
  @Min(1)
  @Max(10)
  severity!: number;

  @ApiPropertyOptional({ description: 'Duration', example: 'Contínua' })
  @IsString()
  @IsOptional()
  duration?: string;
}

export class VitalSignsDataDto {
  @ApiPropertyOptional() @IsNumber() @IsOptional() systolicBP?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() diastolicBP?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() heartRate?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() respiratoryRate?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() temperature?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() oxygenSaturation?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() painScale?: number;
}

export class LabResultDataDto {
  @ApiProperty({ example: 'Hemoglobina' })
  @IsString()
  testName!: string;

  @ApiProperty({ example: '9.5' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'g/dL' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ example: '12.0-16.0' })
  @IsString()
  @IsOptional()
  referenceRange?: string;
}

export class DifferentialDiagnosisRequestDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsUUID()
  encounterId!: string;

  @ApiProperty({ example: 'Dor torácica aguda' })
  @IsString()
  chiefComplaint!: string;

  @ApiProperty({ type: [SymptomDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomDetailDto)
  @ArrayMinSize(1)
  symptoms!: SymptomDetailDto[];

  @ApiPropertyOptional({ type: VitalSignsDataDto })
  @ValidateNested()
  @Type(() => VitalSignsDataDto)
  @IsOptional()
  vitalSigns?: VitalSignsDataDto;

  @ApiPropertyOptional({ type: [LabResultDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultDataDto)
  @IsOptional()
  labResults?: LabResultDataDto[];

  @ApiProperty({ example: 55 })
  @IsInt()
  @Min(0)
  @Max(150)
  age!: number;

  @ApiProperty({ example: 'M' })
  @IsString()
  gender!: string;

  @ApiPropertyOptional({ type: [String], example: ['DM2', 'HAS'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comorbidities?: string[];
}

// --- Differential Diagnosis Response ---

export class SuggestedWorkupItemDto {
  @ApiProperty({ example: 'Troponina I seriada' })
  test!: string;

  @ApiProperty({ enum: WorkupUrgency })
  urgency!: WorkupUrgency;
}

export class DiagnosisCandidateDto {
  @ApiProperty({ example: 1 }) rank!: number;
  @ApiProperty({ example: 'I21.9' }) icdCode!: string;
  @ApiProperty({ example: 'Infarto agudo do miocárdio' }) name!: string;
  @ApiProperty({ enum: DiagnosisProbability }) probability!: DiagnosisProbability;
  @ApiProperty() reasoning!: string;
  @ApiProperty({ type: [String] }) keyFindings!: string[];
  @ApiProperty({ type: [SuggestedWorkupItemDto] }) suggestedWorkup!: SuggestedWorkupItemDto[];
  @ApiProperty({ type: [String] }) redFlags!: string[];
}

export class DifferentialDiagnosisResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ type: [DiagnosisCandidateDto] }) diagnoses!: DiagnosisCandidateDto[];
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() disclaimer!: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Clinical Pathway Recommendation
// ═══════════════════════════════════════════════════════════════════════════════

export class PathwayRecommendationRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;

  @ApiProperty({ description: 'ICD-10 code', example: 'J18.9' })
  @IsString()
  diagnosis!: string;

  @ApiProperty({ enum: SeverityLevel })
  @IsEnum(SeverityLevel)
  severity!: SeverityLevel;
}

export class PathwayOrderDto {
  @ApiProperty({ enum: OrderType }) type!: OrderType;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: OrderPriority }) priority!: OrderPriority;
}

export class PhaseEscalationCriteriaDto {
  @ApiProperty({ type: [String] }) escalation!: string[];
  @ApiProperty({ type: [String] }) deEscalation!: string[];
}

export class PathwayPhaseDto {
  @ApiProperty({ example: 'Fase Aguda (D1-D3)' }) name!: string;
  @ApiProperty({ example: '1-3' }) day!: string;
  @ApiProperty({ type: [PathwayOrderDto] }) orders!: PathwayOrderDto[];
  @ApiProperty({ type: [String] }) goals!: string[];
  @ApiProperty({ type: PhaseEscalationCriteriaDto }) criteria!: PhaseEscalationCriteriaDto;
}

export class ClinicalPathwayDto {
  @ApiProperty({ type: [PathwayPhaseDto] }) phases!: PathwayPhaseDto[];
}

export class PathwayRecommendationResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() diagnosis!: string;
  @ApiProperty({ type: ClinicalPathwayDto }) pathway!: ClinicalPathwayDto;
  @ApiProperty({ example: 7 }) estimatedLOS!: number;
  @ApiProperty() expectedOutcome!: string;
  @ApiProperty() guidelineSource!: string;
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Anamnesis Assistant
// ═══════════════════════════════════════════════════════════════════════════════

export class AnamnesisAssistantRequestDto {
  @ApiProperty({ example: 'Dor abdominal' })
  @IsString()
  chiefComplaint!: string;

  @ApiPropertyOptional({ description: 'What is already documented' })
  @IsString()
  @IsOptional()
  currentFindings?: string;

  @ApiPropertyOptional({ example: 'Cardiologia' })
  @IsString()
  @IsOptional()
  specialty?: string;
}

export class SuggestedQuestionDto {
  @ApiProperty() question!: string;
  @ApiProperty({ enum: QuestionCategory }) category!: QuestionCategory;
  @ApiProperty({ example: 1 }) priority!: number;
  @ApiProperty() rationale!: string;
}

export class SuggestedQuestionsResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ type: [SuggestedQuestionDto] }) questions!: SuggestedQuestionDto[];
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. History Inconsistency Detection
// ═══════════════════════════════════════════════════════════════════════════════

export class InconsistencyCheckRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
}

export class InconsistencyItemDto {
  @ApiProperty({ enum: InconsistencyType }) type!: InconsistencyType;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: InconsistencySeverity }) severity!: InconsistencySeverity;
  @ApiProperty({ example: 'Alergia a AAS' }) field1!: string;
  @ApiProperty({ example: 'Prescrição de AAS 100mg' }) field2!: string;
  @ApiProperty() recommendation!: string;
}

export class InconsistencyCheckResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [InconsistencyItemDto] }) inconsistencies!: InconsistencyItemDto[];
  @ApiProperty() checkedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Auto-complete Notes
// ═══════════════════════════════════════════════════════════════════════════════

export class AutoCompleteRequestDto {
  @ApiProperty() @IsUUID() noteId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;

  @ApiProperty({ description: 'Current note text' })
  @IsString()
  currentText!: string;

  @ApiProperty({ description: 'Cursor position in text' })
  @IsInt()
  @Min(0)
  cursorPosition!: number;

  @ApiProperty({ enum: NoteType })
  @IsEnum(NoteType)
  noteType!: NoteType;

  @ApiPropertyOptional({ example: 'Cardiologia' })
  @IsString()
  @IsOptional()
  specialty?: string;
}

export class AutoCompleteSuggestionDto {
  @ApiProperty() text!: string;
  @ApiProperty({ example: 0.92 }) confidence!: number;
  @ApiProperty({ enum: AutoCompleteSuggestionSource }) source!: AutoCompleteSuggestionSource;
}

export class AutoCompleteResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ type: [AutoCompleteSuggestionDto] }) suggestions!: AutoCompleteSuggestionDto[];
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Note Translation
// ═══════════════════════════════════════════════════════════════════════════════

export class TranslateNoteRequestDto {
  @ApiProperty() @IsUUID() noteId!: string;

  @ApiProperty({ enum: ['pt-BR'], example: 'pt-BR' })
  @IsString()
  sourceLanguage!: string;

  @ApiProperty({ enum: ['en', 'es', 'fr'], example: 'en' })
  @IsString()
  targetLanguage!: string;

  @ApiProperty({ description: 'Preserve medical terminology untranslated' })
  @IsBoolean()
  preserveMedicalTerms!: boolean;
}

export class TranslatedNoteResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() originalText!: string;
  @ApiProperty() translatedText!: string;
  @ApiProperty({ type: [String] }) medicalTermsPreserved!: string[];
  @ApiProperty({ example: 0.95 }) translationConfidence!: number;
  @ApiProperty() disclaimerText!: string;
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Patient Summary (Lay Language)
// ═══════════════════════════════════════════════════════════════════════════════

export class PatientSummaryRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  encounterId?: string;

  @ApiProperty({ enum: SupportedLanguage, example: 'pt-BR' })
  @IsEnum(SupportedLanguage)
  language!: SupportedLanguage;

  @ApiProperty({ enum: TargetAudience })
  @IsEnum(TargetAudience)
  targetAudience!: TargetAudience;
}

export class SummarySectionDto {
  @ApiProperty() title!: string;
  @ApiProperty() content!: string;
}

export class PatientSummaryResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ type: [SummarySectionDto] }) sections!: SummarySectionDto[];
  @ApiProperty({ type: [String] }) keyTakeaways!: string[];
  @ApiProperty({ type: [String] }) medicationInstructions!: string[];
  @ApiProperty({ type: [String] }) followUpActions!: string[];
  @ApiProperty({ type: [String] }) emergencySignsToWatch!: string[];
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Cardiac Arrest Prediction (PCR)
// ═══════════════════════════════════════════════════════════════════════════════

export class PCRPredictionRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
}

export class PCRContributingFactorDto {
  @ApiProperty({ example: 'Hipotensão persistente' }) factor!: string;
  @ApiProperty({ example: 0.35 }) weight!: number;
  @ApiProperty({ example: 'PA 80/50 mmHg' }) value!: string;
  @ApiProperty({ enum: TrendDirection }) trend!: TrendDirection;
}

export class PCRPredictionResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ example: 72 }) riskScore!: number;
  @ApiProperty({ enum: PCRRiskLevel }) riskLevel!: PCRRiskLevel;
  @ApiProperty({ enum: PCRTimeframe }) timeframe!: PCRTimeframe;
  @ApiProperty({ type: [PCRContributingFactorDto] }) contributingFactors!: PCRContributingFactorDto[];
  @ApiProperty({ type: [String] }) recommendedActions!: string[];
  @ApiProperty() lastUpdated!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ECG / Arrhythmia Detection
// ═══════════════════════════════════════════════════════════════════════════════

export class ECGLeadDataDto {
  @ApiProperty({ example: 'II' })
  @IsString()
  lead!: string;

  @ApiProperty({ type: [Number], description: 'Signal data points' })
  @IsArray()
  @IsNumber({}, { each: true })
  data!: number[];
}

export class ECGAnalysisRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;

  @ApiPropertyOptional({ type: [ECGLeadDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ECGLeadDataDto)
  @IsOptional()
  leadData?: ECGLeadDataDto[];

  @ApiPropertyOptional({ description: 'S3 storage key for ECG file' })
  @IsString()
  @IsOptional()
  storageKey?: string;

  @ApiProperty({ description: 'Time of ECG acquisition' })
  @IsString()
  acquisitionTime!: string;
}

export class ECGIntervalsDto {
  @ApiProperty({ example: 160 }) PR!: number;
  @ApiProperty({ example: 88 }) QRS!: number;
  @ApiProperty({ example: 380 }) QT!: number;
  @ApiProperty({ example: 420 }) QTc!: number;
}

export class ECGFindingDto {
  @ApiProperty() finding!: string;
  @ApiProperty({ example: 'MODERATE' }) severity!: string;
  @ApiPropertyOptional() location?: string;
}

export class ECGAnalysisResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ enum: ECGRhythm }) rhythm!: ECGRhythm;
  @ApiProperty({ example: 78 }) rate!: number;
  @ApiProperty({ type: ECGIntervalsDto }) intervals!: ECGIntervalsDto;
  @ApiProperty({ example: 45 }) axis!: number;
  @ApiProperty({ type: [ECGFindingDto] }) findings!: ECGFindingDto[];
  @ApiProperty() interpretation!: string;
  @ApiProperty({ enum: ECGUrgency }) urgency!: ECGUrgency;
  @ApiProperty({ type: [String] }) suggestedActions!: string[];
  @ApiProperty() generatedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Medication Error Detection
// ═══════════════════════════════════════════════════════════════════════════════

export class MedicationSafetyCheckRequestDto {
  @ApiProperty() @IsUUID() encounterId!: string;
  @ApiProperty() @IsUUID() prescriptionId!: string;
}

export class MedicationErrorItemDto {
  @ApiProperty({ enum: MedicationErrorType }) type!: MedicationErrorType;
  @ApiProperty({ enum: MedicationErrorSeverity }) severity!: MedicationErrorSeverity;
  @ApiProperty({ example: 'Metformina 850mg' }) medication!: string;
  @ApiProperty() description!: string;
  @ApiProperty() recommendation!: string;
  @ApiProperty() evidence!: string;
}

export class MedicationErrorResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ type: [MedicationErrorItemDto] }) errors!: MedicationErrorItemDto[];
  @ApiProperty() checkedAt!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Readmission Prediction
// ═══════════════════════════════════════════════════════════════════════════════

export class ReadmissionPredictionRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;
}

export class ReadmissionRiskFactorDto {
  @ApiProperty() factor!: string;
  @ApiProperty({ example: 0.2 }) weight!: number;
  @ApiProperty({ description: 'Whether this factor can be modified' }) modifiable!: boolean;
}

export class SuggestedInterventionDto {
  @ApiProperty() intervention!: string;
  @ApiProperty({ example: 'HIGH' }) impact!: string;
  @ApiProperty({ enum: InterventionCategory }) category!: InterventionCategory;
}

export class ReadmissionRiskResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty({ example: 42 }) riskScore!: number;
  @ApiProperty({ enum: ReadmissionRiskLevel }) riskLevel!: ReadmissionRiskLevel;
  @ApiProperty({ example: '30_DAYS' }) timeframe!: string;
  @ApiProperty({ type: [ReadmissionRiskFactorDto] }) riskFactors!: ReadmissionRiskFactorDto[];
  @ApiProperty({ type: [SuggestedInterventionDto] }) suggestedInterventions!: SuggestedInterventionDto[];
  @ApiProperty() generatedAt!: Date;
}
