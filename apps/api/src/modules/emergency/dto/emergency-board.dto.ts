import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PatientBoardStatus {
  WAITING = 'WAITING',
  IN_TRIAGE = 'IN_TRIAGE',
  IN_TREATMENT = 'IN_TREATMENT',
  OBSERVATION = 'OBSERVATION',
  AWAITING_EXAM = 'AWAITING_EXAM',
  AWAITING_SPECIALIST = 'AWAITING_SPECIALIST',
  BOARDING = 'BOARDING',            // Awaiting inpatient bed
  DISCHARGE_PENDING = 'DISCHARGE_PENDING',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum ManchesterLevel {
  RED = 'RED',       // Imediato — 0 min
  ORANGE = 'ORANGE', // Muito urgente — 10 min
  YELLOW = 'YELLOW', // Urgente — 60 min
  GREEN = 'GREEN',   // Pouco urgente — 120 min
  BLUE = 'BLUE',     // Não urgente — 240 min
}

export enum TraumaScore {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
}

export enum InitialRhythm {
  VF = 'VF',                    // Fibrilação ventricular
  PULSELESS_VT = 'PULSELESS_VT',
  PEA = 'PEA',                  // Atividade elétrica sem pulso
  ASYSTOLE = 'ASYSTOLE',
}

export enum AirwayManagement {
  BVM = 'BVM',
  OTI = 'OTI',                  // Orotraqueal
  VIDEO_LARYNGOSCOPY = 'VIDEO_LARYNGOSCOPY',
  LMA = 'LMA',
  SURGICAL_AIRWAY = 'SURGICAL_AIRWAY',
}

export enum ChestPainDisposition {
  ADMISSION_ACS = 'ADMISSION_ACS',
  CATHETERIZATION_LAB = 'CATHETERIZATION_LAB',
  OBSERVATION_UNIT = 'OBSERVATION_UNIT',
  DISCHARGE_LOW_RISK = 'DISCHARGE_LOW_RISK',
  OUTPATIENT_CARDIOLOGY = 'OUTPATIENT_CARDIOLOGY',
}

export enum OvercrowdingAlert {
  GREEN = 'GREEN',   // Normal
  YELLOW = 'YELLOW', // Atenção
  ORANGE = 'ORANGE', // Alerta
  RED = 'RED',       // Crítico
}

export enum HandoffType {
  PHYSICIAN_TO_PHYSICIAN = 'PHYSICIAN_TO_PHYSICIAN',
  NURSE_TO_NURSE = 'NURSE_TO_NURSE',
  ED_TO_ICU = 'ED_TO_ICU',
  ED_TO_WARD = 'ED_TO_WARD',
  ED_TO_OR = 'ED_TO_OR',
  ED_TO_TRANSFER = 'ED_TO_TRANSFER',
}

// ─── Tracking Board ──────────────────────────────────────────────────────────

export class BedStatusDto {
  @ApiProperty({ description: 'Leito (ex: PS-12)' })
  @IsString()
  @IsNotEmpty()
  bedId: string;

  @ApiProperty({ description: 'Paciente ocupando o leito, se houver' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({ description: 'Médico responsável' })
  @IsOptional()
  @IsUUID()
  responsibleDoctorId?: string;

  @ApiProperty({ description: 'Status do leito' })
  @IsString()
  status: string; // available / occupied / cleaning / blocked
}

export class TrackingBoardQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por setor (ex: PS-ADULTO, PS-PEDIATRICO)' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: PatientBoardStatus })
  @IsOptional()
  @IsEnum(PatientBoardStatus)
  status?: PatientBoardStatus;
}

// ─── Door-to-X Metrics ───────────────────────────────────────────────────────

export class DoorToMetricsDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Hora de chegada à porta (ISO date-time)' })
  @IsDateString()
  doorTime: string;

  @ApiPropertyOptional({ description: 'Hora da triagem (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  triageTime?: string;

  @ApiPropertyOptional({ description: 'Hora do primeiro atendimento médico (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  doctorTime?: string;

  @ApiPropertyOptional({ description: 'Hora agulha-tPA (AVC isquêmico) (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  needleTime?: string;

  @ApiPropertyOptional({ description: 'Hora balão-artéria (STEMI — cateterismo) (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  balloonTime?: string;

  @ApiPropertyOptional({ description: 'Hora antibiótico (sepse) (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  antibioticTime?: string;

  @ApiProperty({ description: 'Médico registrando os tempos' })
  @IsUUID()
  authorId: string;
}

// ─── Reclassification ────────────────────────────────────────────────────────

export class ReclassificationDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Classificação anterior', enum: ManchesterLevel })
  @IsEnum(ManchesterLevel)
  previousClassification: ManchesterLevel;

  @ApiProperty({ description: 'Nova classificação', enum: ManchesterLevel })
  @IsEnum(ManchesterLevel)
  newClassification: ManchesterLevel;

  @ApiProperty({ description: 'Justificativa clínica para reclassificação' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Profissional que reavaliou' })
  @IsUUID()
  assessedBy: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// ─── Fast Track ──────────────────────────────────────────────────────────────

export class FastTrackDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Critério de elegibilidade para fast track' })
  @IsString()
  @IsNotEmpty()
  eligibilityCriteria: string;

  @ApiProperty({ description: 'Médico responsável' })
  @IsUUID()
  authorId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// ─── Trauma Protocol (ATLS) ──────────────────────────────────────────────────

export class AbcdeAssessmentDto {
  @ApiProperty({ description: 'Via aérea (A — Airway)' })
  @IsString()
  @IsNotEmpty()
  airway: string;

  @ApiProperty({ description: 'Respiração (B — Breathing)' })
  @IsString()
  @IsNotEmpty()
  breathing: string;

  @ApiProperty({ description: 'Circulação (C — Circulation)' })
  @IsString()
  @IsNotEmpty()
  circulation: string;

  @ApiProperty({ description: 'Déficit neurológico (D — Disability)' })
  @IsString()
  @IsNotEmpty()
  disability: string;

  @ApiProperty({ description: 'Exposição / ambiente (E — Exposure)' })
  @IsString()
  @IsNotEmpty()
  exposure: string;
}

export class FastExamDto {
  @ApiProperty({ description: 'Pericárdio — hemopericárdio' })
  @IsBoolean()
  pericardial: boolean;

  @ApiProperty({ description: 'Hepatorrenal (Morison) — hemoperitoneo' })
  @IsBoolean()
  hepatorenal: boolean;

  @ApiProperty({ description: 'Esplenorrenal — hemoperitoneo' })
  @IsBoolean()
  splenorenal: boolean;

  @ApiProperty({ description: 'Pelve / Douglas — hemoperitoneo pélvico' })
  @IsBoolean()
  pelvis: boolean;

  @ApiPropertyOptional({ description: 'Comentários adicionais do FAST' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TraumaProtocolDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Avaliação ABCDE', type: AbcdeAssessmentDto })
  @ValidateNested()
  @Type(() => AbcdeAssessmentDto)
  abcde: AbcdeAssessmentDto;

  @ApiProperty({ description: 'FAST (Focused Abdominal Sonography for Trauma)', type: FastExamDto })
  @ValidateNested()
  @Type(() => FastExamDto)
  fastExam: FastExamDto;

  @ApiProperty({ description: 'Mecanismo do trauma (ex: colisão frontal, queda de altura)' })
  @IsString()
  @IsNotEmpty()
  mechanism: string;

  @ApiPropertyOptional({ description: 'Injury Severity Score (ISS) calculado', minimum: 0, maximum: 75 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(75)
  iss?: number;

  @ApiPropertyOptional({ description: 'Revised Trauma Score (RTS)' })
  @IsOptional()
  @IsNumber()
  rts?: number;

  @ApiPropertyOptional({ description: 'TRISS (Trauma and Injury Severity Score) — probabilidade de sobrevida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  triss?: number;

  @ApiProperty({ description: 'Hora de acionamento do código trauma (ISO date-time)' })
  @IsDateString()
  activationTime: string;

  @ApiProperty({ description: 'Médico líder do trauma' })
  @IsUUID()
  teamLeader: string;
}

// ─── Cardiac Arrest / Code Blue ──────────────────────────────────────────────

export class DrugAdministeredDto {
  @ApiProperty({ description: 'Medicamento (ex: Epinefrina, Amiodarona)' })
  @IsString()
  @IsNotEmpty()
  drug: string;

  @ApiProperty({ description: 'Dose (ex: 1mg)' })
  @IsString()
  @IsNotEmpty()
  dose: string;

  @ApiProperty({ description: 'Horário de administração (ISO date-time)' })
  @IsDateString()
  administeredAt: string;
}

export class DefibrillationDto {
  @ApiProperty({ description: 'Energia em joules' })
  @IsInt()
  @IsPositive()
  joules: number;

  @ApiProperty({ description: 'Horário (ISO date-time)' })
  @IsDateString()
  at: string;

  @ApiProperty({ description: 'Ritmo pré-choque' })
  @IsString()
  @IsNotEmpty()
  preShockRhythm: string;
}

export class CardiacArrestProtocolDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Ritmo inicial na desfibrilação', enum: InitialRhythm })
  @IsEnum(InitialRhythm)
  initialRhythm: InitialRhythm;

  @ApiProperty({ description: 'Hora do colapso / chamada (ISO date-time)' })
  @IsDateString()
  collapseTime: string;

  @ApiProperty({ description: 'Hora início do RCP (ISO date-time)' })
  @IsDateString()
  cprStartTime: string;

  @ApiPropertyOptional({ description: 'Número de ciclos de RCP realizados' })
  @IsOptional()
  @IsInt()
  @Min(1)
  cprCycles?: number;

  @ApiProperty({ description: 'Medicamentos administrados', type: [DrugAdministeredDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrugAdministeredDto)
  drugs: DrugAdministeredDto[];

  @ApiProperty({ description: 'Choques elétricos aplicados', type: [DefibrillationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefibrillationDto)
  defibrillations: DefibrillationDto[];

  @ApiProperty({ description: 'Manejo de via aérea', enum: AirwayManagement })
  @IsEnum(AirwayManagement)
  airway: AirwayManagement;

  @ApiPropertyOptional({ description: 'Hora de retorno da circulação espontânea — ROSC (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  roscTime?: string;

  @ApiPropertyOptional({ description: 'Hora do óbito, se aplicável (ISO date-time)' })
  @IsOptional()
  @IsDateString()
  timeOfDeath?: string;

  @ApiProperty({ description: 'Médico líder da reanimação' })
  @IsUUID()
  teamLeader: string;
}

// ─── Chest Pain Protocol ─────────────────────────────────────────────────────

export class SerialTroponinDto {
  @ApiProperty({ description: 'Valor da troponina (ng/mL ou ng/L)' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Unidade (ng/mL, ng/L)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Coleta (ISO date-time)' })
  @IsDateString()
  drawnAt: string;
}

export class ChestPainProtocolDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Hora do ECG realizado (ISO date-time)' })
  @IsDateString()
  ecgTime: string;

  @ApiPropertyOptional({ description: 'Achados do ECG' })
  @IsOptional()
  @IsString()
  ecgFindings?: string;

  @ApiPropertyOptional({ description: 'Há supradesnivelamento ST?' })
  @IsOptional()
  @IsBoolean()
  stElevation?: boolean;

  @ApiProperty({ description: 'Troponinas seriadas (0h, 3h, 6h)', type: [SerialTroponinDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SerialTroponinDto)
  troponinSerial: SerialTroponinDto[];

  @ApiPropertyOptional({ description: 'HEART Score (0–10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  heartScore?: number;

  @ApiPropertyOptional({ description: 'TIMI Score (0–7 para UAP/NSTEMI)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  timiScore?: number;

  @ApiProperty({ description: 'Disposição final', enum: ChestPainDisposition })
  @IsEnum(ChestPainDisposition)
  disposition: ChestPainDisposition;

  @ApiProperty({ description: 'Médico responsável' })
  @IsUUID()
  authorId: string;
}

// ─── Observation Unit ────────────────────────────────────────────────────────

export class ObservationUnitDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Hora de admissão na sala de observação (ISO date-time)' })
  @IsDateString()
  admissionTime: string;

  @ApiProperty({ description: 'Tempo máximo de permanência em horas (geralmente 24h)', default: 24 })
  @IsInt()
  @Min(1)
  @Max(72)
  maxStayHours: number;

  @ApiProperty({ description: 'Intervalo de reavaliação obrigatória em horas', default: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  reassessmentIntervalHours: number;

  @ApiPropertyOptional({ description: 'Critérios de permanência / monitorização' })
  @IsOptional()
  @IsString()
  criteria?: string;

  @ApiProperty({ description: 'Médico responsável' })
  @IsUUID()
  authorId: string;
}

export class ObservationDispositionDto {
  @ApiProperty({ description: 'UUID da admissão na observação' })
  @IsUUID()
  observationId: string;

  @ApiProperty({ description: 'Decisão (DISCHARGE | ADMIT | TRANSFER | CONTINUE)' })
  @IsString()
  @IsNotEmpty()
  decision: string;

  @ApiProperty({ description: 'Justificativa clínica' })
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiProperty({ description: 'Médico' })
  @IsUUID()
  authorId: string;
}

// ─── Handoff (SBAR) ──────────────────────────────────────────────────────────

export class HandoffDto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Tipo de transferência de responsabilidade', enum: HandoffType })
  @IsEnum(HandoffType)
  handoffType: HandoffType;

  @ApiProperty({ description: 'S — Situation: motivo do contato / problema principal' })
  @IsString()
  @IsNotEmpty()
  situation: string;

  @ApiProperty({ description: 'B — Background: histórico relevante, diagnóstico' })
  @IsString()
  @IsNotEmpty()
  background: string;

  @ApiProperty({ description: 'A — Assessment: avaliação atual do paciente' })
  @IsString()
  @IsNotEmpty()
  assessment: string;

  @ApiProperty({ description: 'R — Recommendation: ação necessária, plano de conduta' })
  @IsString()
  @IsNotEmpty()
  recommendation: string;

  @ApiPropertyOptional({ description: 'Tarefas pendentes para o receptor', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pendingTasks?: string[];

  @ApiProperty({ description: 'Médico/enfermeiro que passa o plantão (sending)' })
  @IsUUID()
  sendingClinician: string;

  @ApiProperty({ description: 'Médico/enfermeiro que recebe o plantão (receiving)' })
  @IsUUID()
  receivingClinician: string;
}

// ─── Overcrowding Dashboard ──────────────────────────────────────────────────

export class OvercrowdingDataDto {
  @ApiProperty({ description: 'Censo atual do PS (pacientes presentes)' })
  @IsInt()
  @Min(0)
  currentCensus: number;

  @ApiProperty({ description: 'Capacidade total do PS' })
  @IsInt()
  @Min(1)
  totalCapacity: number;

  @ApiPropertyOptional({ description: 'Número de pacientes em maca no corredor' })
  @IsOptional()
  @IsInt()
  @Min(0)
  hallwayPatients?: number;

  @ApiPropertyOptional({ description: 'Tempo médio de espera em minutos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgWaitMinutes?: number;

  @ApiPropertyOptional({ description: 'Número de altas esperadas nas próximas 2h' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedDischarges?: number;

  @ApiPropertyOptional({ description: 'Médico chefe de plantão' })
  @IsOptional()
  @IsUUID()
  attendingPhysicianId?: string;
}
