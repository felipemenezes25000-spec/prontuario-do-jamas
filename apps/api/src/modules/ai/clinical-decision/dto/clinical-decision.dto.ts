import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ClinicalCalculatorType {
  CHADS2_VASC = 'CHADS2_VASC',
  WELLS_DVT = 'WELLS_DVT',
  WELLS_PE = 'WELLS_PE',
  CURB65 = 'CURB65',
  MELD = 'MELD',
  CHILD_PUGH = 'CHILD_PUGH',
  APACHE_II = 'APACHE_II',
  GLASGOW = 'GLASGOW',
  NIHSS = 'NIHSS',
  NEWS2 = 'NEWS2',
  SOFA = 'SOFA',
  QSOFA = 'QSOFA',
  HEART_SCORE = 'HEART_SCORE',
  HAS_BLED = 'HAS_BLED',
  LACE_INDEX = 'LACE_INDEX',
}

export enum InteractionSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class DifferentialDiagnosisDto {
  @ApiProperty({ description: 'Patient ID for clinical context' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'List of symptoms presented', example: ['febre', 'tosse produtiva', 'dispneia'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  symptoms!: string[];

  @ApiPropertyOptional({ description: 'Physical examination findings', example: ['estertores crepitantes em base D', 'SpO2 92%'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  physicalFindings?: string[];

  @ApiPropertyOptional({ description: 'Relevant lab/imaging results', example: ['leucocitose 15.000', 'RX torax: opacidade em base D'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labResults?: string[];

  @ApiPropertyOptional({ description: 'Patient age in years' })
  @IsInt()
  @Min(0)
  @Max(150)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ description: 'Patient sex (M/F)', example: 'M' })
  @IsString()
  @IsOptional()
  sex?: string;

  @ApiPropertyOptional({ description: 'Known comorbidities', example: ['DM2', 'HAS', 'DPOC'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comorbidities?: string[];
}

export class ClinicalCalculatorDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Specific calculator to use (auto-detect if omitted)', enum: ClinicalCalculatorType })
  @IsEnum(ClinicalCalculatorType)
  @IsOptional()
  calculatorType?: ClinicalCalculatorType;

  @ApiProperty({ description: 'Clinical parameters as key-value pairs', example: { age: 72, sex: 'M', heartFailure: true, hypertension: true } })
  parameters!: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ description: 'Primary diagnosis context (CID-10)', example: 'I48' })
  @IsString()
  @IsOptional()
  diagnosisCid?: string;
}

export class ProtocolRecommendationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Primary diagnosis (CID-10 code)', example: 'J18.9' })
  @IsString()
  diagnosisCid!: string;

  @ApiPropertyOptional({ description: 'Diagnosis description in Portuguese', example: 'Pneumonia comunitaria' })
  @IsString()
  @IsOptional()
  diagnosisDescription?: string;

  @ApiPropertyOptional({ description: 'Current clinical severity', enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  severity?: RiskLevel;

  @ApiPropertyOptional({ description: 'Known comorbidities (CID-10 codes)', example: ['E11', 'I10'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comorbidities?: string[];
}

export class DrugInteractionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({
    description: 'List of medications to check (active + proposed)',
    example: ['Varfarina 5mg', 'Amiodarona 200mg', 'AAS 100mg'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  medications!: string[];

  @ApiPropertyOptional({ description: 'Include current patient medications from chart' })
  @IsOptional()
  includeCurrentMedications?: boolean;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class DiagnosisCandidate {
  @ApiProperty() cidCode!: string;
  @ApiProperty() name!: string;
  @ApiProperty() probability!: number;
  @ApiProperty() reasoning!: string;
  @ApiProperty({ type: [String] }) supportingEvidence!: string[];
  @ApiProperty({ type: [String] }) recommendedWorkup!: string[];
  @ApiProperty() urgency!: string;
}

export class DifferentialDiagnosisResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [DiagnosisCandidate] }) diagnoses!: DiagnosisCandidate[];
  @ApiProperty({ type: [String] }) criticalAlerts!: string[];
  @ApiProperty() aiConfidence!: number;
  @ApiProperty() modelVersion!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() disclaimer!: string;
}

export class CalculatorResultDto {
  @ApiProperty() calculatorType!: ClinicalCalculatorType;
  @ApiProperty() calculatorName!: string;
  @ApiProperty() score!: number;
  @ApiProperty() maxScore!: number;
  @ApiProperty() interpretation!: string;
  @ApiProperty() riskLevel!: RiskLevel;
  @ApiProperty() recommendation!: string;
  @ApiProperty() components!: Array<{ name: string; value: number; description: string }>;
  @ApiProperty({ type: [String] }) references!: string[];
}

export class ClinicalCalculatorResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [CalculatorResultDto] }) results!: CalculatorResultDto[];
  @ApiProperty() generatedAt!: Date;
}

export class PredictiveAlert {
  @ApiProperty() alertType!: string;
  @ApiProperty() riskLevel!: RiskLevel;
  @ApiProperty() probability!: number;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [String] }) riskFactors!: string[];
  @ApiProperty({ type: [String] }) suggestedInterventions!: string[];
  @ApiProperty() timeHorizon!: string;
  @ApiProperty() lastUpdated!: Date;
}

export class PredictiveAlertsResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [PredictiveAlert] }) alerts!: PredictiveAlert[];
  @ApiProperty() overallAcuity!: RiskLevel;
  @ApiProperty() generatedAt!: Date;
}

export class DrugInteractionResult {
  @ApiProperty() drug1!: string;
  @ApiProperty() drug2!: string;
  @ApiProperty({ enum: InteractionSeverity }) severity!: InteractionSeverity;
  @ApiProperty() mechanism!: string;
  @ApiProperty() clinicalEffect!: string;
  @ApiProperty() management!: string;
  @ApiProperty({ type: [String] }) references!: string[];
}

export class DrugInteractionResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [DrugInteractionResult] }) interactions!: DrugInteractionResult[];
  @ApiProperty() totalChecked!: number;
  @ApiProperty() criticalCount!: number;
  @ApiProperty() majorCount!: number;
  @ApiProperty() moderateCount!: number;
  @ApiProperty() minorCount!: number;
  @ApiProperty({ type: [String] }) overallRecommendations!: string[];
  @ApiProperty() generatedAt!: Date;
}

export class ProtocolStep {
  @ApiProperty() order!: number;
  @ApiProperty() phase!: string;
  @ApiProperty() action!: string;
  @ApiProperty() details!: string;
  @ApiProperty() timeframe!: string;
  @ApiPropertyOptional() medication?: string;
  @ApiPropertyOptional() dose?: string;
}

export class ProtocolRecommendationResponseDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() protocolName!: string;
  @ApiProperty() protocolVersion!: string;
  @ApiProperty() applicability!: number;
  @ApiProperty() diagnosisCid!: string;
  @ApiProperty() diagnosisName!: string;
  @ApiProperty({ type: [ProtocolStep] }) steps!: ProtocolStep[];
  @ApiProperty({ type: [String] }) contraindicationsFound!: string[];
  @ApiProperty({ type: [String] }) adaptations!: string[];
  @ApiProperty({ type: [String] }) references!: string[];
  @ApiProperty() generatedAt!: Date;
}

export class RiskTimelinePoint {
  @ApiProperty() date!: string;
  @ApiProperty() sepsisRisk!: number;
  @ApiProperty() fallRisk!: number;
  @ApiProperty() readmissionRisk!: number;
  @ApiProperty() mortalityRisk!: number;
  @ApiPropertyOptional() event?: string;
}

export class RiskTimelineResponseDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ type: [RiskTimelinePoint] }) timeline!: RiskTimelinePoint[];
  @ApiProperty() periodDays!: number;
  @ApiProperty() generatedAt!: Date;
}

export class CdsMetricsResponseDto {
  @ApiProperty() totalQueries!: number;
  @ApiProperty() queriesLast24h!: number;
  @ApiProperty() queriesLast7d!: number;
  @ApiProperty() avgResponseTimeMs!: number;
  @ApiProperty() byEndpoint!: Array<{
    endpoint: string;
    count: number;
    avgResponseTimeMs: number;
    acceptanceRate: number;
  }>;
  @ApiProperty() alertsGenerated!: number;
  @ApiProperty() alertsAccepted!: number;
  @ApiProperty() alertsOverridden!: number;
  @ApiProperty() topDiagnoses!: Array<{ cidCode: string; name: string; count: number }>;
  @ApiProperty() topCalculators!: Array<{ type: string; count: number }>;
  @ApiProperty() generatedAt!: Date;
}
