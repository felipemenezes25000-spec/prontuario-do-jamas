import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ChestXrayFindingType {
  PNEUMOTHORAX = 'PNEUMOTHORAX',
  CARDIOMEGALY = 'CARDIOMEGALY',
  PLEURAL_EFFUSION = 'PLEURAL_EFFUSION',
  PULMONARY_NODULE = 'PULMONARY_NODULE',
  CONSOLIDATION = 'CONSOLIDATION',
  ATELECTASIS = 'ATELECTASIS',
  MEDIASTINAL_WIDENING = 'MEDIASTINAL_WIDENING',
  RIB_FRACTURE = 'RIB_FRACTURE',
  NORMAL = 'NORMAL',
}

export enum StrokeType {
  ISCHEMIC = 'ISCHEMIC',
  HEMORRHAGIC = 'HEMORRHAGIC',
  TRANSIENT_ISCHEMIC_ATTACK = 'TRANSIENT_ISCHEMIC_ATTACK',
  NONE = 'NONE',
}

export enum BiRadsCategory {
  BIRADS_0 = '0',
  BIRADS_1 = '1',
  BIRADS_2 = '2',
  BIRADS_3 = '3',
  BIRADS_4A = '4A',
  BIRADS_4B = '4B',
  BIRADS_4C = '4C',
  BIRADS_5 = '5',
  BIRADS_6 = '6',
}

export enum FractureType {
  TRANSVERSE = 'TRANSVERSE',
  OBLIQUE = 'OBLIQUE',
  SPIRAL = 'SPIRAL',
  COMMINUTED = 'COMMINUTED',
  GREENSTICK = 'GREENSTICK',
  AVULSION = 'AVULSION',
  COMPRESSION = 'COMPRESSION',
  PATHOLOGIC = 'PATHOLOGIC',
  STRESS = 'STRESS',
}

export enum UrgencyLevel {
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
  MODERATE = 'MODERATE',
  ROUTINE = 'ROUTINE',
}

export enum MeasurementType {
  CARDIOTHORACIC_INDEX = 'CARDIOTHORACIC_INDEX',
  BONE_DENSITY = 'BONE_DENSITY',
  VOLUME = 'VOLUME',
  DIAMETER = 'DIAMETER',
  MIDLINE_SHIFT = 'MIDLINE_SHIFT',
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export class ChestXrayAnalysisDto {
  @ApiProperty({ description: 'ID do resultado do exame com imagens associadas' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Indicacao clinica para o exame' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Idade do paciente para contexto' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Sexo do paciente (M/F)' })
  @IsString()
  @IsOptional()
  patientSex?: string;

  @ApiPropertyOptional({ description: 'Incidencia: PA, AP, LATERAL' })
  @IsString()
  @IsOptional()
  projection?: string;
}

export class CtBrainAnalysisDto {
  @ApiProperty({ description: 'ID do resultado do exame' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Indicacao clinica' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Hora do inicio dos sintomas (ISO 8601)' })
  @IsString()
  @IsOptional()
  symptomOnset?: string;

  @ApiPropertyOptional({ description: 'Escore NIHSS inicial' })
  @IsNumber()
  @Min(0)
  @Max(42)
  @IsOptional()
  @Type(() => Number)
  nihssScore?: number;

  @ApiPropertyOptional({ description: 'Uso de contraste' })
  @IsBoolean()
  @IsOptional()
  contrastUsed?: boolean;
}

export class MammographyCadDto {
  @ApiProperty({ description: 'ID do resultado do exame' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Indicacao clinica' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Idade da paciente' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  patientAge?: number;

  @ApiPropertyOptional({ description: 'Historico familiar de cancer de mama' })
  @IsBoolean()
  @IsOptional()
  familyHistory?: boolean;

  @ApiPropertyOptional({ description: 'Classificacao BI-RADS anterior' })
  @IsString()
  @IsOptional()
  previousBirads?: string;

  @ApiPropertyOptional({ description: 'Densidade mamaria (A/B/C/D)' })
  @IsString()
  @IsOptional()
  breastDensity?: string;
}

export class FractureDetectionDto {
  @ApiProperty({ description: 'ID do resultado do exame' })
  @IsUUID()
  examResultId!: string;

  @ApiPropertyOptional({ description: 'Indicacao clinica' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ description: 'Regiao anatomica examinada' })
  @IsString()
  @IsOptional()
  bodyRegion?: string;

  @ApiPropertyOptional({ description: 'Mecanismo de trauma' })
  @IsString()
  @IsOptional()
  traumaMechanism?: string;

  @ApiPropertyOptional({ description: 'Idade do paciente' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  patientAge?: number;
}

export class CompareImagingDto {
  @ApiProperty({ description: 'ID do exame atual' })
  @IsUUID()
  currentExamId!: string;

  @ApiProperty({ description: 'ID do exame anterior para comparacao' })
  @IsUUID()
  priorExamId!: string;

  @ApiPropertyOptional({ description: 'Foco da comparacao' })
  @IsString()
  @IsOptional()
  comparisonFocus?: string;
}

export class AutoMeasureDto {
  @ApiProperty({ description: 'ID do resultado do exame' })
  @IsUUID()
  examResultId!: string;

  @ApiProperty({ description: 'Tipo de medicao', enum: MeasurementType })
  @IsEnum(MeasurementType)
  measurementType!: MeasurementType;

  @ApiPropertyOptional({ description: 'Regiao de interesse para medicao' })
  @IsString()
  @IsOptional()
  regionOfInterest?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class BoundingBoxDto {
  @ApiProperty() x!: number;
  @ApiProperty() y!: number;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
}

export class ChestXrayFindingDto {
  @ApiProperty({ enum: ChestXrayFindingType }) type!: ChestXrayFindingType;
  @ApiProperty() description!: string;
  @ApiProperty() location!: string;
  @ApiProperty({ enum: UrgencyLevel }) severity!: UrgencyLevel;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence!: number;
  @ApiPropertyOptional({ type: BoundingBoxDto }) boundingBox?: BoundingBoxDto;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiPropertyOptional() icdCode?: string;
}

export class ChestXrayResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty({ type: [ChestXrayFindingDto] }) findings!: ChestXrayFindingDto[];
  @ApiProperty() impression!: string;
  @ApiProperty() recommendation!: string;
  @ApiPropertyOptional() cardiothoracicIndex?: number;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
  @ApiProperty() analyzedAt!: Date;
}

export class CtBrainFindingDto {
  @ApiProperty() description!: string;
  @ApiProperty() location!: string;
  @ApiProperty({ enum: UrgencyLevel }) severity!: UrgencyLevel;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence!: number;
  @ApiPropertyOptional({ type: BoundingBoxDto }) boundingBox?: BoundingBoxDto;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiPropertyOptional() icdCode?: string;
}

export class CtBrainResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty({ enum: StrokeType }) strokeType!: StrokeType;
  @ApiProperty() affectedTerritory!: string;
  @ApiProperty({ minimum: 0, maximum: 10 }) aspectsScore!: number;
  @ApiPropertyOptional() midlineShiftMm?: number;
  @ApiProperty({ enum: UrgencyLevel }) urgencyLevel!: UrgencyLevel;
  @ApiProperty({ type: [CtBrainFindingDto] }) findings!: CtBrainFindingDto[];
  @ApiProperty() impression!: string;
  @ApiProperty() recommendation!: string;
  @ApiPropertyOptional() timeFromOnsetMinutes?: number;
  @ApiPropertyOptional() eligibleForThrombolysis?: boolean;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
  @ApiProperty() analyzedAt!: Date;
}

export class MammographyFindingDto {
  @ApiProperty() description!: string;
  @ApiProperty() location!: string;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence!: number;
  @ApiPropertyOptional() morphology?: string;
  @ApiPropertyOptional() distribution?: string;
  @ApiPropertyOptional() sizeMm?: number;
  @ApiPropertyOptional({ type: BoundingBoxDto }) boundingBox?: BoundingBoxDto;
  @ApiPropertyOptional() suggestedAction?: string;
}

export class MammographyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty({ enum: BiRadsCategory }) biradsCategory!: BiRadsCategory;
  @ApiProperty() biradsDescription!: string;
  @ApiProperty({ type: [MammographyFindingDto] }) findings!: MammographyFindingDto[];
  @ApiPropertyOptional() microcalcifications?: {
    present: boolean;
    morphology: string;
    distribution: string;
    location: string;
  };
  @ApiPropertyOptional() masses?: Array<{
    shape: string;
    margin: string;
    density: string;
    sizeMm: number;
    location: string;
  }>;
  @ApiProperty() impression!: string;
  @ApiProperty() recommendation!: string;
  @ApiProperty() breastDensity!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
  @ApiProperty() analyzedAt!: Date;
}

export class FractureFindingDto {
  @ApiProperty() bone!: string;
  @ApiProperty() location!: string;
  @ApiProperty({ enum: FractureType }) fractureType!: FractureType;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence!: number;
  @ApiPropertyOptional() displacementMm?: number;
  @ApiPropertyOptional() angulation?: number;
  @ApiPropertyOptional({ type: BoundingBoxDto }) boundingBox?: BoundingBoxDto;
  @ApiPropertyOptional() associatedFindings?: string;
  @ApiPropertyOptional() suggestedAction?: string;
  @ApiPropertyOptional() icdCode?: string;
}

export class FractureDetectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() examResultId!: string;
  @ApiProperty() fracturesDetected!: number;
  @ApiProperty({ type: [FractureFindingDto] }) fractures!: FractureFindingDto[];
  @ApiProperty() impression!: string;
  @ApiProperty() recommendation!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() processingTimeMs!: number;
  @ApiProperty() analyzedAt!: Date;
}

export class WorklistItemResponseDto {
  @ApiProperty() examResultId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() patientMrn!: string;
  @ApiProperty() modality!: string;
  @ApiProperty() bodyPart!: string;
  @ApiProperty({ enum: UrgencyLevel }) aiUrgency!: UrgencyLevel;
  @ApiProperty() priorityScore!: number;
  @ApiProperty() expectedFindings!: string;
  @ApiProperty() orderedAt!: Date;
  @ApiProperty() timeSinceOrderedMinutes!: number;
  @ApiPropertyOptional() requestingPhysician?: string;
  @ApiPropertyOptional() clinicalIndication?: string;
}

export class WorklistResponseDto {
  @ApiProperty({ type: [WorklistItemResponseDto] }) items!: WorklistItemResponseDto[];
  @ApiProperty() totalItems!: number;
  @ApiProperty() generatedAt!: Date;
}

export class ExamFindingResponseDto {
  @ApiProperty() examResultId!: string;
  @ApiProperty() modality!: string;
  @ApiProperty() analysisType!: string;
  @ApiProperty() findings!: Array<{
    description: string;
    location: string;
    severity: string;
    confidence: number;
    icdCode?: string;
  }>;
  @ApiProperty() impression!: string;
  @ApiProperty() recommendation!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() analyzedAt!: Date;
}

export class CompareImagingResponseDto {
  @ApiProperty() currentExamId!: string;
  @ApiProperty() priorExamId!: string;
  @ApiProperty() intervalDays!: number;
  @ApiProperty() changes!: Array<{
    finding: string;
    location: string;
    changeType: 'NEW' | 'IMPROVED' | 'STABLE' | 'WORSENED' | 'RESOLVED';
    currentDescription: string;
    priorDescription: string;
    clinicalSignificance: string;
  }>;
  @ApiProperty() overallAssessment!: string;
  @ApiProperty() recommendation!: string;
  @ApiProperty() aiModel!: string;
  @ApiProperty() analyzedAt!: Date;
}

export class AutoMeasureResponseDto {
  @ApiProperty() examResultId!: string;
  @ApiProperty({ enum: MeasurementType }) measurementType!: MeasurementType;
  @ApiProperty() value!: number;
  @ApiProperty() unit!: string;
  @ApiProperty() interpretation!: string;
  @ApiPropertyOptional() referenceRange?: { min: number; max: number; unit: string };
  @ApiPropertyOptional() additionalMeasurements?: Record<string, number>;
  @ApiProperty() aiModel!: string;
  @ApiProperty() analyzedAt!: Date;
}

export class ModalityAccuracyDto {
  @ApiProperty() modality!: string;
  @ApiProperty() sensitivity!: number;
  @ApiProperty() specificity!: number;
  @ApiProperty() ppv!: number;
  @ApiProperty() npv!: number;
  @ApiProperty() totalCases!: number;
  @ApiProperty() truePositives!: number;
  @ApiProperty() trueNegatives!: number;
  @ApiProperty() falsePositives!: number;
  @ApiProperty() falseNegatives!: number;
}

export class AccuracyMetricsResponseDto {
  @ApiProperty({ type: [ModalityAccuracyDto] }) byModality!: ModalityAccuracyDto[];
  @ApiProperty() overallSensitivity!: number;
  @ApiProperty() overallSpecificity!: number;
  @ApiProperty() overallPpv!: number;
  @ApiProperty() overallNpv!: number;
  @ApiProperty() totalAnalyzed!: number;
  @ApiProperty() temporalTrends!: Array<{
    month: string;
    sensitivity: number;
    specificity: number;
    totalCases: number;
  }>;
  @ApiProperty() generatedAt!: Date;
}
