import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  IsInt,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Shared Enums ───────────────────────────────────────────────────────────

export enum CurrentLoad {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  OVERCROWDED = 'OVERCROWDED',
}

export enum TriageColor {
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
}

export enum ArrivalMode {
  AMBULANCE = 'AMBULANCE',
  WALK_IN = 'WALK_IN',
  REFERRAL = 'REFERRAL',
}

export enum PredictedUnit {
  WARD = 'WARD',
  ICU = 'ICU',
  SEMI_INTENSIVE = 'SEMI_INTENSIVE',
  OBSERVATION = 'OBSERVATION',
  DISCHARGE = 'DISCHARGE',
}

export enum BedRecommendationType {
  TRANSFER = 'TRANSFER',
  EARLY_DISCHARGE = 'EARLY_DISCHARGE',
  ADMISSION = 'ADMISSION',
  ISOLATION_CHANGE = 'ISOLATION_CHANGE',
}

export enum OptimizationGoal {
  MINIMIZE_WAIT = 'MINIMIZE_WAIT',
  MAXIMIZE_UTILIZATION = 'MAXIMIZE_UTILIZATION',
  BALANCE_COMPLEXITY = 'BALANCE_COMPLEXITY',
}

export enum SlotComplexity {
  SIMPLE = 'SIMPLE',
  MODERATE = 'MODERATE',
  COMPLEX = 'COMPLEX',
}

export enum DemandDepartment {
  ED = 'ED',
  INPATIENT = 'INPATIENT',
  SURGICAL = 'SURGICAL',
  OUTPATIENT = 'OUTPATIENT',
  ICU = 'ICU',
}

export enum IndicatorType {
  INFECTION_RATE = 'INFECTION_RATE',
  MORTALITY = 'MORTALITY',
  LOS = 'LOS',
  READMISSION = 'READMISSION',
  FALL_RATE = 'FALL_RATE',
  PRESSURE_INJURY = 'PRESSURE_INJURY',
  SURGICAL_SITE_INFECTION = 'SURGICAL_SITE_INFECTION',
  HAND_HYGIENE = 'HAND_HYGIENE',
  MEDICATION_ERROR = 'MEDICATION_ERROR',
}

export enum AnomalySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum AnomalyTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}

export enum SuggestedUrgency {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  SEMI_URGENT = 'SEMI_URGENT',
  NON_URGENT = 'NON_URGENT',
  SELF_CARE = 'SELF_CARE',
}

export enum RecommendedAction {
  CALL_911 = 'CALL_911',
  GO_TO_ER = 'GO_TO_ER',
  SCHEDULE_URGENT = 'SCHEDULE_URGENT',
  SCHEDULE_ROUTINE = 'SCHEDULE_ROUTINE',
  SELF_CARE = 'SELF_CARE',
}

export enum ConversationRole {
  PATIENT = 'patient',
  ASSISTANT = 'assistant',
}

export enum HealthCoachMessageType {
  MEDICATION_REMINDER = 'MEDICATION_REMINDER',
  LIFESTYLE_TIP = 'LIFESTYLE_TIP',
  DIET_SUGGESTION = 'DIET_SUGGESTION',
  EXERCISE_RECOMMENDATION = 'EXERCISE_RECOMMENDATION',
  WARNING_SIGN = 'WARNING_SIGN',
  FOLLOW_UP_REMINDER = 'FOLLOW_UP_REMINDER',
}

export enum CDISpecificity {
  CURRENT = 'CURRENT',
  HIGHER_AVAILABLE = 'HIGHER_AVAILABLE',
}

export enum RevenueLeakageType {
  UNDOCUMENTED_PROCEDURE = 'UNDOCUMENTED_PROCEDURE',
  UNBILLED_MATERIAL = 'UNBILLED_MATERIAL',
  MISSED_CHARGE = 'MISSED_CHARGE',
  UNDERCODE = 'UNDERCODE',
  LATE_BILLING = 'LATE_BILLING',
}

// ─── Nested DTOs ────────────────────────────────────────────────────────────

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsString()
  endDate!: string;
}

export class ConversationMessageDto {
  @ApiProperty({ enum: ConversationRole })
  @IsEnum(ConversationRole)
  role!: ConversationRole;

  @ApiProperty()
  @IsString()
  content!: string;
}

export class LabResultDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  value!: number;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. WAIT TIME PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

export class WaitTimePredictionRequestDto {
  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ description: 'Current queue size' })
  @IsInt()
  @Min(0)
  currentQueueSize!: number;

  @ApiProperty({ description: 'Day of week (0=Sunday, 6=Saturday)' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ description: 'Hour of day (0-23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  hourOfDay!: number;

  @ApiPropertyOptional({ description: 'Specialty ID for more accurate prediction' })
  @IsUUID()
  @IsOptional()
  specialtyId?: string;
}

export class WaitTimeFactorDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  impact!: number;
}

export class ConfidenceIntervalDto {
  @ApiProperty()
  min!: number;

  @ApiProperty()
  max!: number;
}

export class WaitTimePredictionDto {
  @ApiProperty()
  estimatedMinutes!: number;

  @ApiProperty({ type: ConfidenceIntervalDto })
  confidenceInterval!: ConfidenceIntervalDto;

  @ApiProperty({ type: [WaitTimeFactorDto] })
  factors!: WaitTimeFactorDto[];

  @ApiProperty()
  historicalAverage!: number;

  @ApiProperty({ enum: CurrentLoad })
  currentLoad!: CurrentLoad;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ED ADMISSION PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

export class EDAdmissionPredictionRequestDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: TriageColor })
  @IsEnum(TriageColor)
  triageColor!: TriageColor;

  @ApiProperty()
  @IsString()
  chiefComplaint!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(150)
  age!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  comorbidityCount!: number;

  @ApiProperty({ enum: ArrivalMode })
  @IsEnum(ArrivalMode)
  arrivalMode!: ArrivalMode;
}

export class AdmissionFactorDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  impact!: number;
}

export class EDAdmissionPredictionDto {
  @ApiProperty({ description: 'Admission probability 0-100' })
  admissionProbability!: number;

  @ApiProperty({ enum: PredictedUnit })
  predictedUnit!: PredictedUnit;

  @ApiProperty({ description: 'Estimated length of stay in days' })
  estimatedLOS!: number;

  @ApiProperty()
  suggestReserveBed!: boolean;

  @ApiProperty({ type: [AdmissionFactorDto] })
  factors!: AdmissionFactorDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. BED OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

export class BedOptimizationRequestDto {
  @ApiPropertyOptional({ description: 'Unit ID (all units if omitted)' })
  @IsUUID()
  @IsOptional()
  unitId?: string;
}

export class BedRecommendationDto {
  @ApiProperty({ enum: BedRecommendationType })
  type!: BedRecommendationType;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  currentBed!: string;

  @ApiProperty()
  suggestedBed!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  priority!: string;

  @ApiPropertyOptional()
  estimatedDischarge?: string;
}

export class BottleneckDto {
  @ApiProperty()
  unit!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  severity!: string;
}

export class BedOptimizationDto {
  @ApiProperty({ type: [BedRecommendationDto] })
  recommendations!: BedRecommendationDto[];

  @ApiProperty()
  occupancyRate!: number;

  @ApiProperty()
  projectedOccupancy24h!: number;

  @ApiProperty({ type: [BottleneckDto] })
  bottlenecks!: BottleneckDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SMART SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════

export class SmartSchedulingRequestDto {
  @ApiProperty()
  @IsUUID()
  providerId!: string;

  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;

  @ApiProperty({ enum: OptimizationGoal })
  @IsEnum(OptimizationGoal)
  optimizationGoal!: OptimizationGoal;
}

export class OptimizedSlotDto {
  @ApiProperty()
  time!: string;

  @ApiProperty({ description: 'Duration in minutes' })
  duration!: number;

  @ApiProperty()
  appointmentType!: string;

  @ApiProperty({ enum: SlotComplexity })
  complexity!: SlotComplexity;

  @ApiProperty()
  reason!: string;
}

export class SchedulingMetricsDto {
  @ApiProperty()
  utilizationRate!: number;

  @ApiProperty()
  expectedWaitTime!: number;

  @ApiProperty()
  complexityBalance!: number;
}

export class SmartSchedulingDto {
  @ApiProperty({ type: [OptimizedSlotDto] })
  optimizedSlots!: OptimizedSlotDto[];

  @ApiProperty({ type: [String] })
  predictedNoShowSlots!: string[];

  @ApiProperty({ type: [String] })
  suggestedOverbookSlots!: string[];

  @ApiProperty({ type: SchedulingMetricsDto })
  metrics!: SchedulingMetricsDto;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. DEMAND PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

export class DemandPredictionRequestDto {
  @ApiProperty({ enum: DemandDepartment })
  @IsEnum(DemandDepartment)
  department!: DemandDepartment;

  @ApiProperty({ description: 'Forecast horizon in days (1-30)' })
  @IsInt()
  @Min(1)
  @Max(30)
  forecastDays!: number;
}

export class DailyPredictionDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  expectedVolume!: number;

  @ApiProperty()
  lowerBound!: number;

  @ApiProperty()
  upperBound!: number;

  @ApiProperty()
  dayOfWeek!: number;

  @ApiProperty()
  isHoliday!: boolean;

  @ApiProperty()
  seasonalFactor!: number;
}

export class StaffingRecommendationDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  nurses!: number;

  @ApiProperty()
  doctors!: number;

  @ApiProperty()
  techs!: number;
}

export class DemandPredictionDto {
  @ApiProperty({ type: [DailyPredictionDto] })
  predictions!: DailyPredictionDto[];

  @ApiProperty({ type: [String] })
  peakDays!: string[];

  @ApiProperty({ type: [StaffingRecommendationDto] })
  staffingRecommendations!: StaffingRecommendationDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export class AnomalyDetectionRequestDto {
  @ApiProperty({ enum: IndicatorType })
  @IsEnum(IndicatorType)
  indicatorType!: IndicatorType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;
}

export class AnomalyItemDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  actualValue!: number;

  @ApiProperty()
  expectedValue!: number;

  @ApiProperty()
  deviation!: number;

  @ApiProperty({ enum: AnomalySeverity })
  severity!: AnomalySeverity;

  @ApiProperty({ type: [String] })
  possibleCauses!: string[];

  @ApiProperty({ type: [String] })
  suggestedActions!: string[];
}

export class AnomalyDetectionDto {
  @ApiProperty({ type: [AnomalyItemDto] })
  anomalies!: AnomalyItemDto[];

  @ApiProperty({ enum: AnomalyTrend })
  trend!: AnomalyTrend;

  @ApiProperty()
  statisticalSignificance!: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. COMPLIANCE MONITORING
// ═══════════════════════════════════════════════════════════════════════════

export class ComplianceMonitoringRequestDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  protocolId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;
}

export class CommonDeviationDto {
  @ApiProperty()
  deviation!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  percentage!: number;
}

export class ProtocolComplianceDto {
  @ApiProperty()
  protocolName!: string;

  @ApiProperty()
  compliance!: number;

  @ApiProperty()
  totalCases!: number;

  @ApiProperty()
  compliantCases!: number;

  @ApiProperty({ type: [CommonDeviationDto] })
  commonDeviations!: CommonDeviationDto[];
}

export class ComplianceTrendDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  compliance!: number;
}

export class ComplianceAlertDto {
  @ApiProperty()
  protocol!: string;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  threshold!: number;

  @ApiProperty()
  currentValue!: number;

  @ApiProperty()
  message!: string;
}

export class ComplianceMonitoringDto {
  @ApiProperty()
  overallCompliance!: number;

  @ApiProperty({ type: [ProtocolComplianceDto] })
  byProtocol!: ProtocolComplianceDto[];

  @ApiProperty({ type: [ComplianceTrendDto] })
  trends!: ComplianceTrendDto[];

  @ApiProperty({ type: [ComplianceAlertDto] })
  alerts!: ComplianceAlertDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. GLOSA (DENIAL) PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

export class GlosaPredictionRequestDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;

  @ApiProperty()
  @IsUUID()
  insuranceId!: string;
}

export class ItemRiskDto {
  @ApiProperty()
  item!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  denialProbability!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  correction!: string;
}

export class GlosaPredictionDto {
  @ApiProperty({ description: 'Overall denial risk 0-100' })
  overallDenialRisk!: number;

  @ApiProperty({ type: [ItemRiskDto] })
  itemRisks!: ItemRiskDto[];

  @ApiProperty()
  estimatedDenialAmount!: number;

  @ApiProperty({ type: [String] })
  suggestedCorrections!: string[];

  @ApiProperty()
  historicalDenialRate!: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. REVENUE LEAKAGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export class RevenueLeakageRequestDto {
  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange!: DateRangeDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;
}

export class LeakageItemDto {
  @ApiProperty({ enum: RevenueLeakageType })
  type!: RevenueLeakageType;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  estimatedAmount!: number;

  @ApiProperty()
  encounterId!: string;

  @ApiProperty()
  evidence!: string;
}

export class LeakageCategoryDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  count!: number;
}

export class RevenueLeakageDto {
  @ApiProperty({ type: [LeakageItemDto] })
  leakageItems!: LeakageItemDto[];

  @ApiProperty()
  totalEstimatedLeakage!: number;

  @ApiProperty({ type: [LeakageCategoryDto] })
  topCategories!: LeakageCategoryDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. TRIAGE CHATBOT
// ═══════════════════════════════════════════════════════════════════════════

export class TriageChatRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty()
  @IsString()
  patientMessage!: string;

  @ApiPropertyOptional({ type: [ConversationMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  @IsOptional()
  conversationHistory?: ConversationMessageDto[];
}

export class PreliminaryAnamnesisDto {
  @ApiProperty({ type: [String] })
  symptoms!: string[];

  @ApiPropertyOptional()
  duration?: string;

  @ApiPropertyOptional()
  onset?: string;

  @ApiPropertyOptional()
  severity?: string;

  @ApiProperty({ type: [String] })
  associatedSymptoms!: string[];
}

export class TriageChatResponseDto {
  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ enum: SuggestedUrgency })
  suggestedUrgency?: SuggestedUrgency;

  @ApiProperty({ type: [String] })
  symptomsExtracted!: string[];

  @ApiProperty({ type: [String] })
  redFlags!: string[];

  @ApiPropertyOptional()
  suggestedSpecialty?: string;

  @ApiPropertyOptional({ enum: RecommendedAction })
  recommendedAction?: RecommendedAction;

  @ApiProperty()
  conversationComplete!: boolean;

  @ApiPropertyOptional({ type: PreliminaryAnamnesisDto })
  preliminaryAnamnesis?: PreliminaryAnamnesisDto;
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. HEALTH COACH
// ═══════════════════════════════════════════════════════════════════════════

export class HealthCoachRequestDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'ICD codes for conditions' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  conditions!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  currentMedications!: string[];

  @ApiPropertyOptional({ type: [LabResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultDto)
  @IsOptional()
  recentLabs?: LabResultDto[];
}

export class HealthCoachMessageDto {
  @ApiProperty({ enum: HealthCoachMessageType })
  type!: HealthCoachMessageType;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  priority!: string;

  @ApiPropertyOptional()
  scheduledFor?: string;
}

export class WeeklyTaskDto {
  @ApiProperty()
  task!: string;

  @ApiProperty()
  frequency!: string;

  @ApiProperty()
  dayOfWeek?: string;
}

export class PersonalizedPlanDto {
  @ApiProperty({ type: [String] })
  goals!: string[];

  @ApiProperty({ type: [WeeklyTaskDto] })
  weeklyTasks!: WeeklyTaskDto[];
}

export class HealthCoachDto {
  @ApiProperty({ type: [HealthCoachMessageDto] })
  messages!: HealthCoachMessageDto[];

  @ApiProperty({ type: PersonalizedPlanDto })
  personalizedPlan!: PersonalizedPlanDto;

  @ApiProperty({ description: 'Adherence score 0-100' })
  adherenceScore!: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. CDI (Clinical Documentation Improvement) / AUTO-CODING
// ═══════════════════════════════════════════════════════════════════════════

export class CDIRequestDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;

  @ApiProperty()
  @IsString()
  noteText!: string;
}

export class SuggestedCodeDto {
  @ApiProperty()
  icdCode!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: CDISpecificity })
  specificity!: CDISpecificity;

  @ApiProperty()
  confidence!: number;

  @ApiProperty()
  evidenceInText!: string;

  @ApiPropertyOptional()
  suggestedSpecificCode?: string;
}

export class PhysicianQueryDto {
  @ApiProperty()
  question!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  impactOnCoding!: string;
}

export class DRGEstimateDto {
  @ApiProperty()
  current!: string;

  @ApiProperty()
  optimized!: string;
}

export class CDIResponseDto {
  @ApiProperty({ type: [SuggestedCodeDto] })
  suggestedCodes!: SuggestedCodeDto[];

  @ApiProperty({ type: [PhysicianQueryDto] })
  queriesForPhysician!: PhysicianQueryDto[];

  @ApiProperty({ type: DRGEstimateDto })
  estimatedDRG!: DRGEstimateDto;

  @ApiProperty()
  revenueImpact!: number;
}
