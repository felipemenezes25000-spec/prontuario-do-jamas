import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum PredictionType {
  SEPSIS = 'sepsis',
  CARDIAC_ARREST = 'cardiac-arrest',
  READMISSION = 'readmission',
  LENGTH_OF_STAY = 'length-of-stay',
  MORTALITY = 'mortality',
  DEMAND_FORECAST = 'demand-forecast',
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum BedType {
  ENFERMARIA = 'ENFERMARIA',
  UTI = 'UTI',
  UCI = 'UCI',
  ISOLAMENTO = 'ISOLAMENTO',
  PEDIATRIA = 'PEDIATRIA',
  OBSTETRICA = 'OBSTETRICA',
  CIRURGICA = 'CIRURGICA',
}

export enum UnitType {
  PRONTO_SOCORRO = 'PRONTO_SOCORRO',
  UTI_ADULTO = 'UTI_ADULTO',
  UTI_PEDIATRICA = 'UTI_PEDIATRICA',
  ENFERMARIA_CLINICA = 'ENFERMARIA_CLINICA',
  ENFERMARIA_CIRURGICA = 'ENFERMARIA_CIRURGICA',
  CENTRO_CIRURGICO = 'CENTRO_CIRURGICO',
  MATERNIDADE = 'MATERNIDADE',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class DemandForecastQueryDto {
  @ApiPropertyOptional({ enum: UnitType, description: 'Filter by hospital unit' })
  @IsEnum(UnitType)
  @IsOptional()
  unit?: UnitType;

  @ApiPropertyOptional({ description: 'Forecast horizon in days (1-30)', default: 7 })
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  @Type(() => Number)
  horizonDays?: number;
}

export class BedOptimizationDto {
  @ApiProperty({ description: 'Hospital unit for optimization', enum: UnitType })
  @IsEnum(UnitType)
  unit!: UnitType;

  @ApiPropertyOptional({ description: 'Include discharge predictions in optimization', default: true })
  @IsOptional()
  includeDischarges?: boolean;

  @ApiPropertyOptional({ description: 'Maximum patient transfers to suggest', default: 5 })
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  maxTransfers?: number;

  @ApiPropertyOptional({ description: 'Priority patients (IDs) for bed assignment' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  priorityPatientIds?: string[];
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: UnitType, description: 'Filter by hospital unit' })
  @IsEnum(UnitType)
  @IsOptional()
  unit?: UnitType;

  @ApiPropertyOptional({ description: 'Minimum risk score to include (0-100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  minRiskScore?: number;
}

export class FeatureImportanceQueryDto {
  @ApiPropertyOptional({ description: 'Patient ID to get individual SHAP values' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Number of top features to return', default: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  topN?: number;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class ContributingFeatureDto {
  @ApiProperty({ example: 'Lactato sérico' }) featureName!: string;
  @ApiProperty({ example: 0.23 }) importanceWeight!: number;
  @ApiProperty({ example: '4.2 mmol/L' }) currentValue!: string;
  @ApiProperty({ example: '< 2.0 mmol/L' }) normalRange!: string;
  @ApiProperty({ example: 'positive' }) direction!: 'positive' | 'negative' | 'neutral';
}

export class RecommendedActionDto {
  @ApiProperty({ example: 'Colher hemoculturas e iniciar antibioticoterapia empírica' })
  action!: string;

  @ApiProperty({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  priority!: string;

  @ApiProperty({ example: 'Protocolo de sepse institucional — passo 2' })
  rationale!: string;

  @ApiPropertyOptional({ example: 30 })
  timeWindowMinutes?: number;
}

export class ModelMetadataDto {
  @ApiProperty({ example: 'sepsis-prediction-v3.2.1' }) modelVersion!: string;
  @ApiProperty({ example: '2026-03-01T00:00:00Z' }) lastTrainingDate!: string;
  @ApiProperty({ example: 0.91 }) auroc!: number;
  @ApiProperty({ example: 45230 }) trainingDatasetSize!: number;
  @ApiProperty({ example: 'XGBoost + LSTM ensemble' }) modelType!: string;
}

export class RiskPredictionResponseDto {
  @ApiProperty({ description: 'Prediction UUID' }) predictionId!: string;
  @ApiProperty({ description: 'Patient UUID' }) patientId!: string;
  @ApiProperty({ enum: PredictionType }) predictionType!: PredictionType;
  @ApiProperty({ description: 'Risk score 0-100', example: 73 }) riskScore!: number;
  @ApiProperty({ enum: RiskLevel }) riskLevel!: RiskLevel;
  @ApiProperty({ description: 'Confidence interval lower bound', example: 65 }) confidenceLower!: number;
  @ApiProperty({ description: 'Confidence interval upper bound', example: 81 }) confidenceUpper!: number;
  @ApiProperty({ description: 'Time horizon description', example: '4-6 horas' }) timeHorizon!: string;
  @ApiProperty({ type: [ContributingFeatureDto] }) contributingFeatures!: ContributingFeatureDto[];
  @ApiProperty({ type: [RecommendedActionDto] }) recommendedActions!: RecommendedActionDto[];
  @ApiProperty({ type: ModelMetadataDto }) modelMetadata!: ModelMetadataDto;
  @ApiProperty() calculatedAt!: string;
  @ApiPropertyOptional({ description: 'Previous risk score for trend analysis' }) previousScore?: number;
  @ApiPropertyOptional({ description: 'Score change direction' }) trend?: 'improving' | 'worsening' | 'stable';
}

export class LosPredictionResponseDto {
  @ApiProperty() predictionId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ example: 'length-of-stay', enum: PredictionType }) predictionType!: PredictionType;
  @ApiProperty({ description: 'Predicted LOS in days', example: 7.5 }) predictedDays!: number;
  @ApiProperty({ example: 5.2 }) confidenceLowerDays!: number;
  @ApiProperty({ example: 10.1 }) confidenceUpperDays!: number;
  @ApiProperty({ description: 'Expected discharge date', example: '2026-04-01' }) expectedDischargeDate!: string;
  @ApiProperty({ type: [ContributingFeatureDto] }) contributingFeatures!: ContributingFeatureDto[];
  @ApiProperty({ type: [RecommendedActionDto] }) recommendedActions!: RecommendedActionDto[];
  @ApiProperty({ type: ModelMetadataDto }) modelMetadata!: ModelMetadataDto;
  @ApiProperty() calculatedAt!: string;
}

export class DailyDemandDto {
  @ApiProperty({ example: '2026-03-26' }) date!: string;
  @ApiProperty({ example: 'Quarta-feira' }) dayOfWeek!: string;
  @ApiProperty({ example: 145 }) predictedAdmissions!: number;
  @ApiProperty({ example: 130 }) predictedDischarges!: number;
  @ApiProperty({ example: 22 }) predictedEmergencyVisits!: number;
  @ApiProperty({ example: 8 }) predictedSurgeries!: number;
  @ApiProperty({ example: 87 }) bedOccupancyPercent!: number;
  @ApiProperty({ example: 135 }) confidenceLower!: number;
  @ApiProperty({ example: 155 }) confidenceUpper!: number;
}

export class DemandForecastResponseDto {
  @ApiProperty() forecastId!: string;
  @ApiPropertyOptional({ enum: UnitType }) unit?: UnitType;
  @ApiProperty() horizonDays!: number;
  @ApiProperty({ type: [DailyDemandDto] }) dailyForecasts!: DailyDemandDto[];
  @ApiProperty({ description: 'Peak demand day' }) peakDemandDate!: string;
  @ApiProperty({ description: 'Peak occupancy %' }) peakOccupancy!: number;
  @ApiProperty({ type: [RecommendedActionDto] }) recommendations!: RecommendedActionDto[];
  @ApiProperty({ type: ModelMetadataDto }) modelMetadata!: ModelMetadataDto;
  @ApiProperty() calculatedAt!: string;
}

export class BedSuggestionDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ enum: BedType }) suggestedBedType!: BedType;
  @ApiProperty({ example: 'Enf. 4 — Leito 12B' }) suggestedBed!: string;
  @ApiProperty({ example: 85 }) matchScore!: number;
  @ApiProperty() rationale!: string;
  @ApiPropertyOptional({ description: 'Current bed if transfer' }) currentBed?: string;
  @ApiProperty() isTransfer!: boolean;
}

export class BedOptimizationResponseDto {
  @ApiProperty() optimizationId!: string;
  @ApiProperty({ enum: UnitType }) unit!: UnitType;
  @ApiProperty({ type: [BedSuggestionDto] }) suggestions!: BedSuggestionDto[];
  @ApiProperty({ example: 87 }) currentOccupancy!: number;
  @ApiProperty({ example: 82 }) projectedOccupancy!: number;
  @ApiProperty({ example: 5.2 }) efficiencyGainPercent!: number;
  @ApiProperty() pendingDischarges!: number;
  @ApiProperty() availableBeds!: number;
  @ApiProperty({ type: ModelMetadataDto }) modelMetadata!: ModelMetadataDto;
  @ApiProperty() calculatedAt!: string;
}

export class PatientRiskSummaryDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ example: 'Enf. 3 — Leito 8A' }) location!: string;
  @ApiProperty({ example: 73 }) sepsisRisk!: number;
  @ApiProperty({ example: 45 }) cardiacArrestRisk!: number;
  @ApiProperty({ example: 28 }) readmissionRisk!: number;
  @ApiProperty({ example: 15 }) mortalityRisk!: number;
  @ApiProperty({ enum: RiskLevel }) highestRiskLevel!: RiskLevel;
  @ApiProperty() highestRiskType!: string;
  @ApiProperty({ type: [String] }) activeAlerts!: string[];
}

export class DashboardResponseDto {
  @ApiPropertyOptional({ enum: UnitType }) unit?: UnitType;
  @ApiProperty() totalPatientsMonitored!: number;
  @ApiProperty() criticalRiskCount!: number;
  @ApiProperty() highRiskCount!: number;
  @ApiProperty() moderateRiskCount!: number;
  @ApiProperty() lowRiskCount!: number;
  @ApiProperty({ type: [PatientRiskSummaryDto] }) patients!: PatientRiskSummaryDto[];
  @ApiProperty({ description: 'Models last updated' }) modelsLastUpdated!: string;
  @ApiProperty({ description: 'Overall prediction accuracy last 30d' }) accuracyLast30d!: number;
  @ApiProperty() calculatedAt!: string;
}

export class ShapFeatureDto {
  @ApiProperty({ example: 'Lactato sérico' }) featureName!: string;
  @ApiProperty({ example: 0.23 }) shapValue!: number;
  @ApiProperty({ example: 'Elevação de lactato indica hipoperfusão tecidual' }) explanation!: string;
  @ApiProperty({ example: 'vital-sign' }) featureCategory!: string;
}

export class FeatureImportanceResponseDto {
  @ApiProperty({ enum: PredictionType }) predictionType!: PredictionType;
  @ApiPropertyOptional() patientId?: string;
  @ApiProperty({ type: [ShapFeatureDto] }) features!: ShapFeatureDto[];
  @ApiProperty({ type: ModelMetadataDto }) modelMetadata!: ModelMetadataDto;
  @ApiProperty() calculatedAt!: string;
}
