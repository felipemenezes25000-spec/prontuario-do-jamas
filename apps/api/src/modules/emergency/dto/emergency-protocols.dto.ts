import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum EmergencyColumn {
  WAITING = 'WAITING',
  TRIAGE = 'TRIAGE',
  TREATMENT = 'TREATMENT',
  OBSERVATION = 'OBSERVATION',
  DISCHARGE = 'DISCHARGE',
}

export enum QueueAction {
  GENERATE_TICKET = 'GENERATE_TICKET',
  CALL_NEXT = 'CALL_NEXT',
  RECALL = 'RECALL',
  SKIP = 'SKIP',
  TRANSFER = 'TRANSFER',
}

// ─── Date Range ─────────────────────────────────────────────────────────────

export class DateRangeDto {
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
}

// ─── Queue Management ───────────────────────────────────────────────────────

export class ManageQueueDto {
  @ApiProperty({ enum: QueueAction }) @IsEnum(QueueAction) action!: QueueAction;
  @ApiPropertyOptional() @IsUUID() @IsOptional() patientId?: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() priority?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sector?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Fast Track ─────────────────────────────────────────────────────────────

export class CreateFastTrackDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty() @IsString() chiefComplaint!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Code Stroke (AVC) ─────────────────────────────────────────────────────

export class NIHSSItemDto {
  @ApiProperty() @IsString() item!: string;
  @ApiProperty() @IsNumber() score!: number;
}

export class ActivateCodeStrokeDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  @ApiProperty({ description: 'NIHSS items scores' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NIHSSItemDto)
  nihssItems!: NIHSSItemDto[];

  @ApiProperty({ description: 'Last known normal datetime' })
  @IsDateString()
  lastKnownNormal!: string;

  @ApiPropertyOptional({ description: 'Symptom onset datetime' })
  @IsDateString() @IsOptional()
  symptomOnset?: string;

  @ApiProperty({ description: 'CT scan completed' })
  @IsBoolean()
  ctCompleted!: boolean;

  @ApiPropertyOptional({ description: 'CT result: ISCHEMIC, HEMORRHAGIC, NORMAL' })
  @IsString() @IsOptional()
  ctResult?: string;

  // rt-PA criteria
  @ApiPropertyOptional() @IsBoolean() @IsOptional() withinRtpaWindow?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() rtpaContraindicated?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() rtpaAdministered?: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() rtpaTime?: string;

  // Thrombectomy
  @ApiPropertyOptional() @IsBoolean() @IsOptional() thrombectomyCandidate?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() largeVesselOcclusion?: boolean;
  @ApiPropertyOptional({ description: 'Thrombectomy checklist items' })
  @IsObject() @IsOptional()
  thrombectomyChecklist?: Record<string, boolean>;

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Code STEMI ─────────────────────────────────────────────────────────────

export class ActivateCodeSTEMIDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  @ApiProperty({ description: 'ECG performed within 10 min of arrival' })
  @IsBoolean()
  ecgWithin10Min!: boolean;

  @ApiPropertyOptional() @IsDateString() @IsOptional() ecgTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ecgFindings?: string;

  @ApiProperty({ description: 'Cath lab activated' })
  @IsBoolean()
  cathLabActivated!: boolean;

  @ApiPropertyOptional() @IsDateString() @IsOptional() cathLabActivationTime?: string;

  @ApiPropertyOptional({ description: 'Door-to-balloon time in minutes' })
  @IsNumber() @IsOptional()
  doorToBalloonMinutes?: number;

  @ApiProperty({ description: 'KILLIP classification I-IV' })
  @IsNumber() @Min(1) @Max(4)
  killipClass!: number;

  @ApiPropertyOptional({ description: 'TIMI risk score 0-14' })
  @IsNumber() @Min(0) @Max(14) @IsOptional()
  timiScore?: number;

  // TIMI variables
  @ApiPropertyOptional() @IsBoolean() @IsOptional() age65orOlder?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() threePlusCardiacRiskFactors?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() knownCAD50Percent?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() aspirinUseLast7Days?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() severAnginaTwoPlusEpisodesIn24h?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() stDeviationHalfMmOrMore?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() elevatedCardiacMarkers?: boolean;

  @ApiPropertyOptional() @IsNumber() @IsOptional() troponinValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ckMbValue?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Code Sepsis ────────────────────────────────────────────────────────────

export class ActivateCodeSepsisDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  // qSOFA criteria
  @ApiPropertyOptional() @IsNumber() @IsOptional() respiratoryRate?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() systolicBp?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() gcs?: number;

  // SOFA components
  @ApiPropertyOptional() @IsNumber() @IsOptional() pao2fio2?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() platelets?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() bilirubin?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() creatinine?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() urineOutputMl24h?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cardiovascularMap?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() vasopressorDose?: number;

  // 1-hour bundle
  @ApiPropertyOptional() @IsBoolean() @IsOptional() lactateMeasured?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() lactateValue?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() bloodCulturesCollected?: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() bloodCulturesTime?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() antibioticsAdministered?: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() antibioticsTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() antibioticsUsed?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() crystalloidBolus?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() crystalloidVolumeMl?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() vasopressorStarted?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() vasopressorType?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() suspectedSource?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Code Trauma ────────────────────────────────────────────────────────────

export class ActivateCodeTraumaDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  @ApiProperty({ description: 'Mechanism of injury' }) @IsString() mechanism!: string;

  // ABCDE assessment
  @ApiProperty() @IsObject() abcde!: {
    airway: { patent: boolean; intervention?: string; cSpineProtected: boolean };
    breathing: { respiratoryRate: number; spo2: number; lungSoundsSymmetric: boolean; chestDecompression?: boolean };
    circulation: { heartRate: number; systolicBp: number; capillaryRefill: string; hemorrhageControl?: string; ivAccess: boolean; fluidBolus?: number };
    disability: { gcs: number; gcsEye: number; gcsVerbal: number; gcsMotor: number; pupils: string; lateralization: boolean };
    exposure: { temperature: number; injuriesFound: string[]; logRoll: boolean };
  };

  // FAST exam
  @ApiPropertyOptional() @IsBoolean() @IsOptional() fastPerformed?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() fastPositive?: boolean;
  @ApiPropertyOptional() @IsObject() @IsOptional()
  fastDetails?: { ruo: boolean; luo: boolean; suprapubic: boolean; subxiphoid: boolean };

  // Injury scores
  @ApiPropertyOptional({ description: 'Injury Severity Score 0-75' })
  @IsNumber() @IsOptional()
  iss?: number;

  @ApiPropertyOptional({ description: 'Revised Trauma Score components' })
  @IsObject() @IsOptional()
  rtsComponents?: { gcs: number; systolicBp: number; respiratoryRate: number };

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Code Blue (Cardiac Arrest) ─────────────────────────────────────────────

export class ActivateCodeBlueDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  @ApiProperty({ description: 'Initial rhythm: VF, VT, PEA, ASYSTOLE' })
  @IsString()
  initialRhythm!: string;

  @ApiPropertyOptional() @IsBoolean() @IsOptional() witnessed?: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() arrestTime?: string;

  @ApiPropertyOptional({ description: 'CPR cycles performed' })
  @IsArray() @IsOptional()
  cprCycles?: Array<{
    startTime: string;
    endTime?: string;
    compressor: string;
    quality?: string;
  }>;

  @ApiPropertyOptional({ description: 'Drugs administered' })
  @IsArray() @IsOptional()
  drugs?: Array<{
    drug: string;
    dose: string;
    route: string;
    time: string;
  }>;

  @ApiPropertyOptional({ description: 'Defibrillation attempts' })
  @IsArray() @IsOptional()
  defibrillations?: Array<{
    joules: number;
    time: string;
    rhythmAfter?: string;
  }>;

  @ApiPropertyOptional({ description: 'Airway management' })
  @IsObject() @IsOptional()
  airway?: {
    type: string;
    attempt: number;
    success: boolean;
    confirmedBy: string;
  };

  @ApiPropertyOptional({ description: 'ROSC time' })
  @IsDateString() @IsOptional()
  roscTime?: string;

  @ApiPropertyOptional({ description: 'Outcome: ROSC, DEATH, ONGOING' })
  @IsString() @IsOptional()
  outcome?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Chest Pain Protocol ────────────────────────────────────────────────────

export class CreateChestPainProtocolDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;

  @ApiPropertyOptional() @IsDateString() @IsOptional() ecgTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ecgFindings?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() stElevation?: boolean;

  // Serial troponin
  @ApiPropertyOptional()
  @IsArray() @IsOptional()
  troponinSeries?: Array<{
    time: string;
    value: number;
    reference: number;
  }>;

  // HEART Score
  @ApiPropertyOptional({ description: 'History: 0=slightly suspicious, 1=moderately, 2=highly' })
  @IsNumber() @Min(0) @Max(2) @IsOptional()
  heartHistory?: number;

  @ApiPropertyOptional({ description: 'ECG: 0=normal, 1=nonspecific, 2=significant ST deviation' })
  @IsNumber() @Min(0) @Max(2) @IsOptional()
  heartEcg?: number;

  @ApiPropertyOptional({ description: 'Age: 0=<45, 1=45-64, 2=>=65' })
  @IsNumber() @Min(0) @Max(2) @IsOptional()
  heartAge?: number;

  @ApiPropertyOptional({ description: 'Risk factors: 0=none, 1=1-2, 2=>=3 or known CAD' })
  @IsNumber() @Min(0) @Max(2) @IsOptional()
  heartRisk?: number;

  @ApiPropertyOptional({ description: 'Troponin: 0=normal, 1=1-3x, 2=>3x' })
  @IsNumber() @Min(0) @Max(2) @IsOptional()
  heartTroponin?: number;

  // TIMI risk score components
  @ApiPropertyOptional() @IsNumber() @Min(0) @Max(7) @IsOptional() timiScore?: number;

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── Observation Unit (CDU) ─────────────────────────────────────────────────

export class CreateObservationUnitDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() encounterId?: string;
  @ApiProperty({ description: 'Reason for CDU admission' }) @IsString() reason!: string;
  @ApiProperty({ description: 'Maximum stay in hours (default 24)' })
  @IsNumber() @Min(1) @Max(48)
  maxStayHours!: number;

  @ApiPropertyOptional({ description: 'Reassessment intervals in hours' })
  @IsArray() @IsOptional()
  reassessmentIntervals?: number[];

  @ApiPropertyOptional() @IsObject() @IsOptional()
  monitoringPlan?: Record<string, unknown>;

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

// ─── SBAR/I-PASS Handoff ────────────────────────────────────────────────────

export class CreateEmergencyHandoffDto {
  @ApiProperty() @IsUUID() authorId!: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() receiverId?: string;
  @ApiProperty({ description: 'Handoff format: SBAR or IPASS' })
  @IsString()
  format!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() sector?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() shift?: string;

  @ApiProperty({ description: 'Patient handoff entries' })
  @IsArray()
  patients!: Array<{
    patientId: string;
    situation?: string;
    background?: string;
    assessment?: string;
    recommendation?: string;
    illness?: string;
    patientSummary?: string;
    actionList?: string;
    synthesize?: string;
    contingency?: string;
  }>;

  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}
