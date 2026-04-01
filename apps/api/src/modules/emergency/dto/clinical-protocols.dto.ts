import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════════════════════
// SEPSIS PROTOCOL — Based on Sepsis-3 (JAMA 2016) & SSC 2021 Guidelines
// ═══════════════════════════════════════════════════════════════════════════════

export interface QSofaResult {
  score: number;
  alteredMentation: boolean;
  highRespiratoryRate: boolean;
  lowSystolicBP: boolean;
  sepsisScreenPositive: boolean;
  recommendation: string;
  reference: string;
}

export interface SofaOrganScore {
  organ: string;
  score: number;
  value: number | string;
  normal: string;
}

export interface SofaResult {
  totalScore: number;
  components: SofaOrganScore[];
  sepsisPresent: boolean;
  septicShock: boolean;
  estimatedMortality: string;
  recommendation: string;
  reference: string;
}

export enum SepsisBundleItem {
  MEASURE_LACTATE = 'MEASURE_LACTATE',
  BLOOD_CULTURES = 'BLOOD_CULTURES',
  BROAD_SPECTRUM_ANTIBIOTICS = 'BROAD_SPECTRUM_ANTIBIOTICS',
  FLUID_BOLUS = 'FLUID_BOLUS',
  VASOPRESSORS = 'VASOPRESSORS',
  REASSESS_LACTATE = 'REASSESS_LACTATE',
}

export interface SepsisBundleStatus {
  item: SepsisBundleItem;
  label: string;
  completed: boolean;
  completedAt: string | null;
  targetMinutes: number;
  withinTarget: boolean | null;
  elapsedMinutes: number | null;
}

export interface SepsisBundleResult {
  patientId: string;
  sepsisOnsetTime: string;
  bundleItems: SepsisBundleStatus[];
  overallCompliance: number;
  hour1Compliant: boolean;
  hour3Compliant: boolean;
  recommendation: string;
  reference: string;
}

export class CalculateQSofaDto {
  @ApiProperty({ description: 'Escala de Glasgow (GCS) — 3 a 15' })
  @IsNumber()
  @Min(3)
  @Max(15)
  gcs!: number;

  @ApiProperty({ description: 'Frequência respiratória (irpm)' })
  @IsNumber()
  @Min(0)
  @Max(80)
  respiratoryRate!: number;

  @ApiProperty({ description: 'Pressão arterial sistólica (mmHg)' })
  @IsNumber()
  @Min(0)
  @Max(300)
  systolicBP!: number;
}

export class CalculateSepsisSOFADto {
  @ApiProperty({ description: 'UUID do paciente' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty({ description: 'PaO2/FiO2 ratio' })
  @IsNumber()
  pao2fio2!: number;

  @ApiProperty({ description: 'Ventilação mecânica' })
  @IsBoolean()
  mechanicalVentilation!: boolean;

  @ApiProperty({ description: 'Plaquetas (×10³/µL)' })
  @IsNumber()
  platelets!: number;

  @ApiProperty({ description: 'Bilirrubina total (mg/dL)' })
  @IsNumber()
  bilirubin!: number;

  @ApiProperty({ description: 'Glasgow (GCS)' })
  @IsNumber()
  @Min(3)
  @Max(15)
  gcs!: number;

  @ApiProperty({ description: 'PAM (mmHg)' })
  @IsNumber()
  map!: number;

  @ApiProperty({ description: 'Dose norepinefrina (mcg/kg/min)' })
  @IsOptional()
  @IsNumber()
  norepinephrineDose?: number;

  @ApiProperty({ description: 'Dose epinefrina (mcg/kg/min)' })
  @IsOptional()
  @IsNumber()
  epinephrineDose?: number;

  @ApiProperty({ description: 'Dose dopamina (mcg/kg/min)' })
  @IsOptional()
  @IsNumber()
  dopamineDose?: number;

  @ApiProperty({ description: 'Uso de dobutamina' })
  @IsOptional()
  @IsBoolean()
  dobutamineUse?: boolean;

  @ApiProperty({ description: 'Creatinina sérica (mg/dL)' })
  @IsNumber()
  creatinine!: number;

  @ApiProperty({ description: 'Débito urinário em 24h (mL)' })
  @IsOptional()
  @IsNumber()
  urineOutput24h?: number;

  @ApiProperty({ description: 'Lactato sérico (mmol/L)' })
  @IsOptional()
  @IsNumber()
  lactate?: number;

  @ApiProperty({ description: 'Necessidade de vasopressores para PAM ≥ 65' })
  @IsOptional()
  @IsBoolean()
  vasopressorRequired?: boolean;
}

export class TrackSepsisBundleDto {
  @ApiProperty()
  @IsString()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty({ description: 'Data/hora do início da sepse (ISO)' })
  @IsString()
  sepsisOnsetTime!: string;

  @ApiPropertyOptional({ description: 'Data/hora da coleta de lactato' })
  @IsOptional()
  @IsString()
  lactateCollectedAt?: string;

  @ApiPropertyOptional({ description: 'Data/hora da coleta de hemoculturas' })
  @IsOptional()
  @IsString()
  bloodCulturesCollectedAt?: string;

  @ApiPropertyOptional({ description: 'Data/hora do início de antibióticos' })
  @IsOptional()
  @IsString()
  antibioticsStartedAt?: string;

  @ApiPropertyOptional({ description: 'Data/hora do início de volume' })
  @IsOptional()
  @IsString()
  fluidBolusStartedAt?: string;

  @ApiPropertyOptional({ description: 'Data/hora do início de vasopressores' })
  @IsOptional()
  @IsString()
  vasopressorsStartedAt?: string;

  @ApiPropertyOptional({ description: 'Data/hora da reavaliação de lactato' })
  @IsOptional()
  @IsString()
  lactateReassessedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STROKE PROTOCOL — AHA/ASA 2019 + ESO 2021
// ═══════════════════════════════════════════════════════════════════════════════

export interface NIHSSItem {
  item: string;
  description: string;
  score: number;
  maxScore: number;
}

export interface NIHSSResult {
  totalScore: number;
  items: NIHSSItem[];
  severity: string;
  recommendation: string;
  reference: string;
}

export interface CincinnatiResult {
  facialDroop: boolean;
  armDrift: boolean;
  speechAbnormality: boolean;
  strokeLikely: boolean;
  positiveFindings: number;
  recommendation: string;
  reference: string;
}

export interface StrokeTimelineResult {
  patientId: string;
  symptomOnsetTime: string;
  doorTime: string;
  ctCompletedTime: string | null;
  doorToCTMinutes: number | null;
  ctTarget: number;
  ctWithinTarget: boolean | null;
  needleTime: string | null;
  doorToNeedleMinutes: number | null;
  needleTarget: number;
  needleWithinTarget: boolean | null;
  symptomToNeedleMinutes: number | null;
  withinThrombolysisWindow: boolean;
  windowRemainingMinutes: number | null;
  recommendation: string;
  reference: string;
}

export interface ThrombolysisContraindication {
  category: string;
  description: string;
  present: boolean;
  absolute: boolean;
}

export interface ThrombolysisCheckResult {
  eligible: boolean;
  absoluteContraindications: ThrombolysisContraindication[];
  relativeContraindications: ThrombolysisContraindication[];
  withinTimeWindow: boolean;
  recommendation: string;
  alteplaseDose: { totalDose: number; bolusDose: number; infusionDose: number; weight: number } | null;
  reference: string;
}

export class CalculateNIHSSDto {
  @ApiProperty({ description: '1a: Nível de consciência (0-3)' })
  @IsNumber() @Min(0) @Max(3) consciousness!: number;

  @ApiProperty({ description: '1b: Perguntas de orientação (0-2)' })
  @IsNumber() @Min(0) @Max(2) orientationQuestions!: number;

  @ApiProperty({ description: '1c: Comandos (0-2)' })
  @IsNumber() @Min(0) @Max(2) commands!: number;

  @ApiProperty({ description: '2: Melhor olhar (0-2)' })
  @IsNumber() @Min(0) @Max(2) bestGaze!: number;

  @ApiProperty({ description: '3: Campos visuais (0-3)' })
  @IsNumber() @Min(0) @Max(3) visualFields!: number;

  @ApiProperty({ description: '4: Paralisia facial (0-3)' })
  @IsNumber() @Min(0) @Max(3) facialPalsy!: number;

  @ApiProperty({ description: '5a: Motricidade MSD (0-4)' })
  @IsNumber() @Min(0) @Max(4) motorArmLeft!: number;

  @ApiProperty({ description: '5b: Motricidade MSE (0-4)' })
  @IsNumber() @Min(0) @Max(4) motorArmRight!: number;

  @ApiProperty({ description: '6a: Motricidade MID (0-4)' })
  @IsNumber() @Min(0) @Max(4) motorLegLeft!: number;

  @ApiProperty({ description: '6b: Motricidade MIE (0-4)' })
  @IsNumber() @Min(0) @Max(4) motorLegRight!: number;

  @ApiProperty({ description: '7: Ataxia de membros (0-2)' })
  @IsNumber() @Min(0) @Max(2) limbAtaxia!: number;

  @ApiProperty({ description: '8: Sensibilidade (0-2)' })
  @IsNumber() @Min(0) @Max(2) sensory!: number;

  @ApiProperty({ description: '9: Melhor linguagem (0-3)' })
  @IsNumber() @Min(0) @Max(3) bestLanguage!: number;

  @ApiProperty({ description: '10: Disartria (0-2)' })
  @IsNumber() @Min(0) @Max(2) dysarthria!: number;

  @ApiProperty({ description: '11: Extinção/inatenção (0-2)' })
  @IsNumber() @Min(0) @Max(2) extinctionInattention!: number;
}

export class CincinnatiScaleDto {
  @ApiProperty({ description: 'Queda facial assimétrica' })
  @IsBoolean() facialDroop!: boolean;

  @ApiProperty({ description: 'Desvio de braço estendido' })
  @IsBoolean() armDrift!: boolean;

  @ApiProperty({ description: 'Fala anormal/arrastada' })
  @IsBoolean() speechAbnormality!: boolean;
}

export class StrokeTimelineDto {
  @ApiProperty()
  @IsString() patientId!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() encounterId?: string;

  @ApiProperty({ description: 'Hora do início dos sintomas (ISO)' })
  @IsString() symptomOnsetTime!: string;

  @ApiProperty({ description: 'Hora de entrada no PS (ISO)' })
  @IsString() doorTime!: string;

  @ApiPropertyOptional({ description: 'Hora de conclusão da TC de crânio (ISO)' })
  @IsOptional() @IsString() ctCompletedTime?: string;

  @ApiPropertyOptional({ description: 'Hora da administração de rt-PA (ISO)' })
  @IsOptional() @IsString() needleTime?: string;
}

export class ThrombolysisCheckDto {
  @ApiProperty({ description: 'Peso do paciente (kg)' })
  @IsNumber() weight!: number;

  @ApiProperty({ description: 'Minutos desde o início dos sintomas' })
  @IsNumber() minutesSinceOnset!: number;

  @ApiProperty({ description: 'Idade do paciente' })
  @IsNumber() age!: number;

  @ApiProperty({ description: 'PA sistólica atual (mmHg)' })
  @IsNumber() systolicBP!: number;

  @ApiProperty({ description: 'PA diastólica atual (mmHg)' })
  @IsNumber() diastolicBP!: number;

  @ApiProperty({ description: 'Glicemia (mg/dL)' })
  @IsNumber() glucose!: number;

  @ApiProperty({ description: 'Plaquetas (×10³/µL)' })
  @IsNumber() platelets!: number;

  @ApiProperty({ description: 'INR' })
  @IsNumber() inr!: number;

  @ApiProperty({ description: 'AVC ou TCE nos últimos 3 meses' })
  @IsBoolean() recentStrokeOrHeadTrauma!: boolean;

  @ApiProperty({ description: 'Cirurgia de grande porte nos últimos 14 dias' })
  @IsBoolean() recentMajorSurgery!: boolean;

  @ApiProperty({ description: 'Sangramento GI ou urinário nos últimos 21 dias' })
  @IsBoolean() recentGIBleed!: boolean;

  @ApiProperty({ description: 'Punção arterial em local não compressível nos últimos 7 dias' })
  @IsBoolean() recentArterialPuncture!: boolean;

  @ApiProperty({ description: 'Hemorragia intracraniana prévia' })
  @IsBoolean() historyICH!: boolean;

  @ApiProperty({ description: 'Neoplasia intracraniana, MAV ou aneurisma' })
  @IsBoolean() intracranialNeoplasm!: boolean;

  @ApiProperty({ description: 'Sangramento ativo ou suspeita de dissecção aórtica' })
  @IsBoolean() activeBleedingOrDissection!: boolean;

  @ApiPropertyOptional({ description: 'Uso de anticoagulantes' })
  @IsOptional() @IsBoolean() onAnticoagulants?: boolean;

  @ApiPropertyOptional({ description: 'Convulsão no início dos sintomas' })
  @IsOptional() @IsBoolean() seizureAtOnset?: boolean;

  @ApiPropertyOptional({ description: 'IAM nos últimos 3 meses' })
  @IsOptional() @IsBoolean() recentMI?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHEST PAIN PROTOCOL — HEART Score (2008), TIMI (2000), Killip (1967)
// ═══════════════════════════════════════════════════════════════════════════════

export interface HEARTScoreResult {
  totalScore: number;
  components: { name: string; score: number; maxScore: number }[];
  riskCategory: string;
  maceRisk6Weeks: string;
  recommendation: string;
  reference: string;
}

export interface TIMIRiskResult {
  totalScore: number;
  components: { name: string; present: boolean; points: number }[];
  riskCategory: string;
  eventRisk14Days: string;
  recommendation: string;
  reference: string;
}

export interface KillipResult {
  class: number;
  description: string;
  inHospitalMortality: string;
  findings: string[];
  recommendation: string;
  reference: string;
}

export enum HEARTHistoryScore {
  SLIGHTLY_SUSPICIOUS = 0,
  MODERATELY_SUSPICIOUS = 1,
  HIGHLY_SUSPICIOUS = 2,
}

export enum HEARTECGScore {
  NORMAL = 0,
  NON_SPECIFIC_REPOLARIZATION = 1,
  SIGNIFICANT_ST_DEVIATION = 2,
}

export enum HEARTTroponinScore {
  NORMAL = 0,
  ONE_TO_THREE_TIMES_NORMAL = 1,
  MORE_THAN_THREE_TIMES_NORMAL = 2,
}

export class CalculateHEARTScoreDto {
  @ApiProperty({ enum: HEARTHistoryScore, description: 'Pontuação da história (0-2)' })
  @IsNumber() @Min(0) @Max(2) history!: number;

  @ApiProperty({ enum: HEARTECGScore, description: 'Achados do ECG (0-2)' })
  @IsNumber() @Min(0) @Max(2) ecg!: number;

  @ApiProperty({ description: 'Idade do paciente (anos)' })
  @IsNumber() @Min(0) age!: number;

  @ApiProperty({ description: 'Número de fatores de risco (HAS, DM, DLP, tabagismo, obesidade, HF+)' })
  @IsNumber() @Min(0) @Max(6) riskFactorCount!: number;

  @ApiProperty({ enum: HEARTTroponinScore, description: 'Nível de troponina (0-2)' })
  @IsNumber() @Min(0) @Max(2) troponin!: number;
}

export class CalculateTIMIDto {
  @ApiProperty({ description: 'Idade ≥ 65 anos' })
  @IsBoolean() age65OrOlder!: boolean;

  @ApiProperty({ description: '≥ 3 fatores de risco para DAC' })
  @IsBoolean() threeOrMoreRiskFactors!: boolean;

  @ApiProperty({ description: 'Estenose coronariana ≥ 50% conhecida' })
  @IsBoolean() knownCoronaryStenosis!: boolean;

  @ApiProperty({ description: 'Uso de AAS nos últimos 7 dias' })
  @IsBoolean() aspirinUseLast7Days!: boolean;

  @ApiProperty({ description: '≥ 2 episódios de angina nas últimas 24h' })
  @IsBoolean() twoOrMoreAnginaEpisodes!: boolean;

  @ApiProperty({ description: 'Desvio ST ≥ 0,5mm no ECG' })
  @IsBoolean() stDeviationHalfMm!: boolean;

  @ApiProperty({ description: 'Elevação de marcadores cardíacos' })
  @IsBoolean() elevatedCardiacMarkers!: boolean;
}

export class CalculateKillipDto {
  @ApiProperty({ description: 'Estertores pulmonares' })
  @IsBoolean() rales!: boolean;

  @ApiProperty({ description: 'B3 (terceira bulha)' })
  @IsBoolean() s3Gallop!: boolean;

  @ApiProperty({ description: 'Estase jugular' })
  @IsBoolean() jugularVenousDistension!: boolean;

  @ApiProperty({ description: 'Edema pulmonar franco' })
  @IsBoolean() pulmonaryEdema!: boolean;

  @ApiProperty({ description: 'Choque cardiogênico (hipotensão + hipoperfusão)' })
  @IsBoolean() cardiogenicShock!: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS2 — Royal College of Physicians 2017
// ═══════════════════════════════════════════════════════════════════════════════

export enum NEWS2SpO2Scale {
  SCALE_1 = 'SCALE_1',
  SCALE_2 = 'SCALE_2',
}

export enum NEWS2Consciousness {
  ALERT = 'ALERT',
  CONFUSION = 'CONFUSION',
  VOICE = 'VOICE',
  PAIN = 'PAIN',
  UNRESPONSIVE = 'UNRESPONSIVE',
}

export interface NEWS2ParameterResult {
  parameter: string;
  value: number | string;
  score: number;
  range: string;
}

export interface NEWS2Result {
  totalScore: number;
  parameters: NEWS2ParameterResult[];
  clinicalRisk: string;
  clinicalResponse: string;
  monitoringFrequency: string;
  escalation: string;
  hasExtremeScore: boolean;
  reference: string;
}

export class CalculateNEWS2Dto {
  @ApiProperty({ description: 'Frequência respiratória (irpm)' })
  @IsNumber() @Min(0) @Max(80) respiratoryRate!: number;

  @ApiProperty({ description: 'SpO2 (%)' })
  @IsNumber() @Min(0) @Max(100) spO2!: number;

  @ApiProperty({ enum: NEWS2SpO2Scale, description: 'Escala SpO2: Scale 1 (padrão) ou Scale 2 (DPOC/hipercapnia)' })
  @IsEnum(NEWS2SpO2Scale) spO2Scale!: NEWS2SpO2Scale;

  @ApiPropertyOptional({ description: 'FiO2 — necessário para Scale 2' })
  @IsOptional() @IsNumber() fiO2?: number;

  @ApiProperty({ description: 'Suplementação de O2' })
  @IsBoolean() supplementalOxygen!: boolean;

  @ApiProperty({ description: 'PA sistólica (mmHg)' })
  @IsNumber() @Min(0) @Max(300) systolicBP!: number;

  @ApiProperty({ description: 'Frequência cardíaca (bpm)' })
  @IsNumber() @Min(0) @Max(250) heartRate!: number;

  @ApiProperty({ enum: NEWS2Consciousness })
  @IsEnum(NEWS2Consciousness) consciousness!: NEWS2Consciousness;

  @ApiProperty({ description: 'Temperatura axilar (°C)' })
  @IsNumber() @Min(25) @Max(45) temperature!: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICU SCORES — Glasgow, RASS, CAM-ICU, Braden
// ═══════════════════════════════════════════════════════════════════════════════

export interface GlasgowResult {
  eye: number;
  verbal: number;
  motor: number;
  total: number;
  severity: string;
  intubated: boolean;
  recommendation: string;
  reference: string;
}

export interface RASSResult {
  score: number;
  description: string;
  targetRange: string;
  atTarget: boolean;
  category: string;
  recommendation: string;
  reference: string;
}

export interface CAMICUResult {
  deliriumPresent: boolean;
  feature1_acuteOnset: boolean;
  feature2_inattention: boolean;
  feature3_alteredConsciousness: boolean;
  feature4_disorganizedThinking: boolean;
  algorithm: string;
  recommendation: string;
  reference: string;
}

export interface BradenResult {
  totalScore: number;
  components: { name: string; score: number; maxScore: number }[];
  riskLevel: string;
  recommendation: string;
  interventions: string[];
  reference: string;
}

export class CalculateGlasgowDto {
  @ApiProperty({ description: 'Abertura ocular (1-4)' })
  @IsNumber() @Min(1) @Max(4) eye!: number;

  @ApiProperty({ description: 'Resposta verbal (1-5)' })
  @IsNumber() @Min(1) @Max(5) verbal!: number;

  @ApiProperty({ description: 'Resposta motora (1-6)' })
  @IsNumber() @Min(1) @Max(6) motor!: number;

  @ApiPropertyOptional({ description: 'Paciente intubado (verbal = 1T)' })
  @IsOptional() @IsBoolean() intubated?: boolean;
}

export class CalculateRASSDto {
  @ApiProperty({ description: 'Score RASS (-5 a +4)' })
  @IsNumber() @Min(-5) @Max(4) score!: number;

  @ApiPropertyOptional({ description: 'RASS alvo' })
  @IsOptional() @IsNumber() @Min(-5) @Max(4) targetRass?: number;
}

export class CalculateCAMICUDto {
  @ApiProperty({ description: 'Feature 1: Início agudo ou curso flutuante' })
  @IsBoolean() acuteOnsetOrFluctuating!: boolean;

  @ApiProperty({ description: 'Feature 2: Inatenção (erro em ≥ 2 letras no teste ASE)' })
  @IsBoolean() inattention!: boolean;

  @ApiProperty({ description: 'Feature 3: Nível de consciência alterado (RASS ≠ 0)' })
  @IsBoolean() alteredConsciousness!: boolean;

  @ApiProperty({ description: 'Feature 4: Pensamento desorganizado (≥ 2 erros em perguntas + comando)' })
  @IsBoolean() disorganizedThinking!: boolean;

  @ApiProperty({ description: 'Score RASS atual' })
  @IsNumber() @Min(-5) @Max(4) currentRass!: number;
}

export class CalculateBradenDto {
  @ApiProperty({ description: 'Percepção sensorial (1-4)' })
  @IsNumber() @Min(1) @Max(4) sensoryPerception!: number;

  @ApiProperty({ description: 'Umidade (1-4)' })
  @IsNumber() @Min(1) @Max(4) moisture!: number;

  @ApiProperty({ description: 'Atividade (1-4)' })
  @IsNumber() @Min(1) @Max(4) activity!: number;

  @ApiProperty({ description: 'Mobilidade (1-4)' })
  @IsNumber() @Min(1) @Max(4) mobility!: number;

  @ApiProperty({ description: 'Nutrição (1-4)' })
  @IsNumber() @Min(1) @Max(4) nutrition!: number;

  @ApiProperty({ description: 'Fricção e cisalhamento (1-3)' })
  @IsNumber() @Min(1) @Max(3) frictionShear!: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NURSING SCALES — Morse Fall Scale, Waterlow
// ═══════════════════════════════════════════════════════════════════════════════

export interface MorseFallResult {
  totalScore: number;
  components: { name: string; value: string; score: number }[];
  riskLevel: string;
  recommendation: string;
  interventions: string[];
  reference: string;
}

export interface WaterlowResult {
  totalScore: number;
  components: { category: string; value: string; score: number }[];
  riskLevel: string;
  recommendation: string;
  interventions: string[];
  reference: string;
}

export class CalculateMorseFallDto {
  @ApiProperty({ description: 'História de queda (últimos 3 meses)' })
  @IsBoolean() historyOfFalling!: boolean;

  @ApiProperty({ description: 'Diagnóstico secundário' })
  @IsBoolean() secondaryDiagnosis!: boolean;

  @ApiProperty({ description: 'Auxílio para deambulação: 0=nenhum/acamado, 15=muleta/bengala, 30=apoio em móveis' })
  @IsNumber() @Min(0) @Max(30) ambulatoryAid!: number;

  @ApiProperty({ description: 'Terapia IV / dispositivo heparinizado' })
  @IsBoolean() ivTherapy!: boolean;

  @ApiProperty({ description: 'Marcha: 0=normal, 10=fraca, 20=comprometida' })
  @IsNumber() @Min(0) @Max(20) gait!: number;

  @ApiProperty({ description: 'Estado mental: 0=orientado, 15=superestima capacidade' })
  @IsNumber() @Min(0) @Max(15) mentalStatus!: number;
}

export class CalculateWaterlowDto {
  @ApiProperty({ description: 'IMC / Build: 0=média, 1=acima média, 2=obeso, 3=abaixo média' })
  @IsNumber() @Min(0) @Max(3) buildBMI!: number;

  @ApiProperty({ description: 'Tipo de pele em áreas de risco: 0=saudável, 1=papel, 2=seca, 3=edemaciada/úmida/descorada/quebrada' })
  @IsNumber() @Min(0) @Max(3) skinType!: number;

  @ApiProperty({ description: 'Sexo/Idade: 1=masculino, 2=feminino, add 1(14-49), 2(50-64), 3(65-74), 4(75-80), 5(81+)' })
  @IsNumber() @Min(1) @Max(7) sexAge!: number;

  @ApiProperty({ description: 'Continência: 0=completa, 1=cateterizado, 2=ocasional incontinência, 3=dupla incontinência' })
  @IsNumber() @Min(0) @Max(3) continence!: number;

  @ApiProperty({ description: 'Mobilidade: 0=total, 1=inquieto, 2=apático, 3=restrito, 4=inerte/tração, 5=cadeira de rodas' })
  @IsNumber() @Min(0) @Max(5) mobility!: number;

  @ApiProperty({ description: 'Apetite/nutrição: 0=média, 1=pobre, 2=sonda NG, 3=NPO/fluidos apenas' })
  @IsNumber() @Min(0) @Max(3) appetite!: number;

  @ApiPropertyOptional({ description: 'Déficit neurológico (4 pontos)' })
  @IsOptional() @IsBoolean() neurologicalDeficit?: boolean;

  @ApiPropertyOptional({ description: 'Cirurgia de grande porte/trauma (5 pontos)' })
  @IsOptional() @IsBoolean() majorSurgeryTrauma?: boolean;

  @ApiPropertyOptional({ description: 'Medicação: esteroides, citotóxicos, anti-inflamatórios (4 pontos)' })
  @IsOptional() @IsBoolean() medicationRisk?: boolean;
}
