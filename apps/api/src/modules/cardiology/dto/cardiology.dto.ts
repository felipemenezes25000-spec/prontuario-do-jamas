import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

export enum EcgRhythm {
  SINUS = 'SINUS',
  ATRIAL_FIBRILLATION = 'ATRIAL_FIBRILLATION',
  ATRIAL_FLUTTER = 'ATRIAL_FLUTTER',
  SVT = 'SVT',
  VENTRICULAR_TACHYCARDIA = 'VENTRICULAR_TACHYCARDIA',
  VENTRICULAR_FIBRILLATION = 'VENTRICULAR_FIBRILLATION',
  AV_BLOCK_1 = 'AV_BLOCK_1',
  AV_BLOCK_2_MOBITZ_1 = 'AV_BLOCK_2_MOBITZ_1',
  AV_BLOCK_2_MOBITZ_2 = 'AV_BLOCK_2_MOBITZ_2',
  AV_BLOCK_3 = 'AV_BLOCK_3',
  PACED = 'PACED',
  JUNCTIONAL = 'JUNCTIONAL',
  OTHER = 'OTHER',
}

export enum EcgAxis {
  NORMAL = 'NORMAL',
  LEFT_DEVIATION = 'LEFT_DEVIATION',
  RIGHT_DEVIATION = 'RIGHT_DEVIATION',
  EXTREME = 'EXTREME',
  INDETERMINATE = 'INDETERMINATE',
}

export enum StressTestResult {
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NON_DIAGNOSTIC = 'NON_DIAGNOSTIC',
}

export enum StressTestProtocol {
  BRUCE = 'BRUCE',
  MODIFIED_BRUCE = 'MODIFIED_BRUCE',
  NAUGHTON = 'NAUGHTON',
  BALKE = 'BALKE',
  RAMP = 'RAMP',
}

export class RecordEcgDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Heart rate (bpm)' })
  @IsNumber()
  heartRate: number;

  @ApiProperty({ description: 'Rhythm', enum: EcgRhythm })
  @IsEnum(EcgRhythm)
  rhythm: EcgRhythm;

  @ApiPropertyOptional({ description: 'Axis', enum: EcgAxis })
  @IsOptional()
  @IsEnum(EcgAxis)
  axis?: EcgAxis;

  @ApiPropertyOptional({ description: 'PR interval (ms)' })
  @IsOptional()
  @IsNumber()
  prInterval?: number;

  @ApiPropertyOptional({ description: 'QRS duration (ms)' })
  @IsOptional()
  @IsNumber()
  qrsDuration?: number;

  @ApiPropertyOptional({ description: 'QTc interval (ms)' })
  @IsOptional()
  @IsNumber()
  qtcInterval?: number;

  @ApiPropertyOptional({ description: 'ST segment changes' })
  @IsOptional()
  @IsString()
  stChanges?: string;

  @ApiPropertyOptional({ description: 'Findings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  findings?: string[];

  @ApiProperty({ description: 'Overall interpretation' })
  @IsString()
  @IsNotEmpty()
  interpretation: string;

  @ApiPropertyOptional({ description: 'Is normal?' })
  @IsOptional()
  @IsBoolean()
  isNormal?: boolean;

  @ApiPropertyOptional({ description: 'ECG file/image URL' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class EchocardiogramDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'LV Ejection Fraction (%)' })
  @IsOptional()
  @IsNumber()
  lvef?: number;

  @ApiPropertyOptional({ description: 'LV End-diastolic diameter (mm)' })
  @IsOptional()
  @IsNumber()
  lvedd?: number;

  @ApiPropertyOptional({ description: 'LV End-systolic diameter (mm)' })
  @IsOptional()
  @IsNumber()
  lvesd?: number;

  @ApiPropertyOptional({ description: 'Left atrium (mm)' })
  @IsOptional()
  @IsNumber()
  leftAtrium?: number;

  @ApiPropertyOptional({ description: 'Aortic root (mm)' })
  @IsOptional()
  @IsNumber()
  aorticRoot?: number;

  @ApiPropertyOptional({ description: 'RV function' })
  @IsOptional()
  @IsString()
  rvFunction?: string;

  @ApiPropertyOptional({ description: 'Valvular findings' })
  @IsOptional()
  @IsString()
  valvularFindings?: string;

  @ApiPropertyOptional({ description: 'Pericardial effusion' })
  @IsOptional()
  @IsBoolean()
  pericardialEffusion?: boolean;

  @ApiPropertyOptional({ description: 'Wall motion abnormalities' })
  @IsOptional()
  @IsString()
  wallMotion?: string;

  @ApiPropertyOptional({ description: 'Diastolic function assessment' })
  @IsOptional()
  @IsString()
  diastolicFunction?: string;

  @ApiProperty({ description: 'Overall impression' })
  @IsString()
  @IsNotEmpty()
  impression: string;
}

export class CatheterizationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Access site' })
  @IsString()
  @IsNotEmpty()
  accessSite: string;

  @ApiPropertyOptional({ description: 'Coronary findings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coronaryFindings?: string[];

  @ApiPropertyOptional({ description: 'LV function / LVEF (%)' })
  @IsOptional()
  @IsNumber()
  lvef?: number;

  @ApiPropertyOptional({ description: 'Interventions performed' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interventions?: string[];

  @ApiPropertyOptional({ description: 'Stents placed' })
  @IsOptional()
  @IsArray()
  stentsPlaced?: Array<{ vessel: string; type: string; diameter: number; length: number }>;

  @ApiPropertyOptional({ description: 'Hemodynamic data' })
  @IsOptional()
  hemodynamicData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Contrast volume (mL)' })
  @IsOptional()
  @IsNumber()
  contrastVolumeMl?: number;

  @ApiPropertyOptional({ description: 'Fluoroscopy time (min)' })
  @IsOptional()
  @IsNumber()
  fluoroscopyTimeMin?: number;

  @ApiProperty({ description: 'Impression' })
  @IsString()
  @IsNotEmpty()
  impression: string;

  @ApiPropertyOptional({ description: 'Complications' })
  @IsOptional()
  @IsString()
  complications?: string;
}

export class HolterDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Duration in hours' })
  @IsNumber()
  durationHours: number;

  @ApiProperty({ description: 'Total heart beats' })
  @IsNumber()
  totalBeats: number;

  @ApiPropertyOptional({ description: 'Min heart rate (bpm)' })
  @IsOptional()
  @IsNumber()
  minHr?: number;

  @ApiPropertyOptional({ description: 'Max heart rate (bpm)' })
  @IsOptional()
  @IsNumber()
  maxHr?: number;

  @ApiPropertyOptional({ description: 'Mean heart rate (bpm)' })
  @IsOptional()
  @IsNumber()
  meanHr?: number;

  @ApiPropertyOptional({ description: 'Supraventricular ectopic count' })
  @IsOptional()
  @IsNumber()
  sveCount?: number;

  @ApiPropertyOptional({ description: 'Ventricular ectopic count' })
  @IsOptional()
  @IsNumber()
  veCount?: number;

  @ApiPropertyOptional({ description: 'Pauses > 2s' })
  @IsOptional()
  @IsNumber()
  pauseCount?: number;

  @ApiPropertyOptional({ description: 'AF episodes' })
  @IsOptional()
  @IsNumber()
  afEpisodes?: number;

  @ApiPropertyOptional({ description: 'ST segment events' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stEvents?: string[];

  @ApiProperty({ description: 'Interpretation' })
  @IsString()
  @IsNotEmpty()
  interpretation: string;
}

export class StressTestDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Protocol', enum: StressTestProtocol })
  @IsOptional()
  @IsEnum(StressTestProtocol)
  protocol?: StressTestProtocol;

  @ApiPropertyOptional({ description: 'Duration (minutes)' })
  @IsOptional()
  @IsNumber()
  durationMin?: number;

  @ApiPropertyOptional({ description: 'Resting HR (bpm)' })
  @IsOptional()
  @IsNumber()
  restingHr?: number;

  @ApiPropertyOptional({ description: 'Peak HR (bpm)' })
  @IsOptional()
  @IsNumber()
  peakHr?: number;

  @ApiPropertyOptional({ description: 'Target HR (bpm)' })
  @IsOptional()
  @IsNumber()
  targetHr?: number;

  @ApiPropertyOptional({ description: 'Max HR percentage achieved' })
  @IsOptional()
  @IsNumber()
  percentTargetHr?: number;

  @ApiPropertyOptional({ description: 'METs achieved' })
  @IsOptional()
  @IsNumber()
  metsAchieved?: number;

  @ApiPropertyOptional({ description: 'Resting BP' })
  @IsOptional()
  @IsString()
  restingBp?: string;

  @ApiPropertyOptional({ description: 'Peak BP' })
  @IsOptional()
  @IsString()
  peakBp?: string;

  @ApiPropertyOptional({ description: 'ST changes during exercise' })
  @IsOptional()
  @IsString()
  stChanges?: string;

  @ApiPropertyOptional({ description: 'Symptoms during test' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @ApiPropertyOptional({ description: 'Reason for stopping' })
  @IsOptional()
  @IsString()
  stopReason?: string;

  @ApiProperty({ description: 'Result', enum: StressTestResult })
  @IsEnum(StressTestResult)
  result: StressTestResult;

  @ApiProperty({ description: 'Interpretation' })
  @IsString()
  @IsNotEmpty()
  interpretation: string;
}
