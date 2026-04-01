import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  IsObject,
  Matches,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// e-SUS APS — Atenção Primária à Saúde
// ═══════════════════════════════════════════════════════════════════════════════

export enum ESusShiftCode {
  M = 'M',
  T = 'T',
  N = 'N',
}

export enum ESusAttendanceType {
  INDIVIDUAL = 'INDIVIDUAL',
  COLLECTIVE = 'COLLECTIVE',
}

export enum ESusConduitType {
  RETURN = 'RETURN',
  REFERRAL = 'REFERRAL',
  DISCHARGE = 'DISCHARGE',
}

export enum ESusFichaType {
  ATENDIMENTO_INDIVIDUAL = 'ATENDIMENTO_INDIVIDUAL',
  PROCEDIMENTOS = 'PROCEDIMENTOS',
  ATIVIDADE_COLETIVA = 'ATIVIDADE_COLETIVA',
  VISITA_DOMICILIAR = 'VISITA_DOMICILIAR',
}

export enum ESusExportFormat {
  THRIFT = 'THRIFT',
  JSON = 'JSON',
}

export enum ESusExportStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  EXPORTED = 'EXPORTED',
  SENT_TO_SISAB = 'SENT_TO_SISAB',
}

export class ESusDiagnosisDto {
  @ApiProperty({ description: 'CID-10 code' })
  @IsString()
  @Matches(/^[A-Z]\d{2}(\.\d{1,2})?$/, { message: 'Must be valid CID-10 code' })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ESusAttendanceDto {
  @ApiProperty({ description: 'Patient CNS (15 digits)' })
  @IsString()
  @Matches(/^\d{15}$/, { message: 'CNS must be 15 digits' })
  patientCNS!: string;

  @ApiProperty({ description: 'Professional CNS (15 digits)' })
  @IsString()
  @Matches(/^\d{15}$/, { message: 'CNS must be 15 digits' })
  professionalCNS!: string;

  @ApiProperty({ description: 'SIGTAP procedure code' })
  @IsString()
  procedureCode!: string;

  @ApiProperty({ description: 'CBO code (Classificação Brasileira de Ocupações)' })
  @IsString()
  cboCode!: string;

  @ApiProperty({ description: 'Attendance date' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: ESusShiftCode })
  @IsEnum(ESusShiftCode)
  shiftCode!: ESusShiftCode;

  @ApiProperty({ enum: ESusAttendanceType })
  @IsEnum(ESusAttendanceType)
  attendanceType!: ESusAttendanceType;

  @ApiProperty({ type: [ESusDiagnosisDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ESusDiagnosisDto)
  diagnoses!: ESusDiagnosisDto[];

  @ApiProperty({ enum: ESusConduitType })
  @IsEnum(ESusConduitType)
  conduitType!: ESusConduitType;

  @ApiProperty({ enum: ESusFichaType })
  @IsEnum(ESusFichaType)
  fichaType!: ESusFichaType;
}

export class ESusExportDto {
  @ApiProperty({ description: 'Competence period (YYYY-MM)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Must be YYYY-MM format' })
  competence!: string;

  @ApiProperty({ type: [String], description: 'Ficha IDs to export' })
  @IsArray()
  @IsString({ each: true })
  fichas!: string[];

  @ApiProperty({ enum: ESusExportFormat })
  @IsEnum(ESusExportFormat)
  format!: ESusExportFormat;

  @ApiProperty({ enum: ESusExportStatus })
  @IsEnum(ESusExportStatus)
  status!: ESusExportStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Business API
// ═══════════════════════════════════════════════════════════════════════════════

export enum WhatsAppTemplateName {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CONFIRMATION = 'APPOINTMENT_CONFIRMATION',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  VACCINATION_REMINDER = 'VACCINATION_REMINDER',
  FOLLOW_UP = 'FOLLOW_UP',
  PAYMENT_DUE = 'PAYMENT_DUE',
  CUSTOM = 'CUSTOM',
}

export enum WhatsAppMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum WhatsAppMessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum WhatsAppBotCommand {
  AGENDAR = 'AGENDAR',
  CANCELAR = 'CANCELAR',
  RESULTADOS = 'RESULTADOS',
  RECEITA = 'RECEITA',
  FALAR_ATENDENTE = 'FALAR_ATENDENTE',
}

export class WhatsAppMessageDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Phone with country code, e.g. +5511999990000' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Phone must include country code (e.g. +5511999990000)' })
  phoneNumber!: string;

  @ApiProperty({ enum: WhatsAppTemplateName })
  @IsEnum(WhatsAppTemplateName)
  templateName!: WhatsAppTemplateName;

  @ApiProperty({ description: 'Template parameter key-value pairs' })
  @IsObject()
  templateParams!: Record<string, string>;

  @ApiPropertyOptional({ description: 'Schedule message for later delivery' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class WhatsAppConversationMessageDto {
  @ApiProperty({ enum: WhatsAppMessageDirection })
  @IsEnum(WhatsAppMessageDirection)
  direction!: WhatsAppMessageDirection;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty()
  @IsDateString()
  timestamp!: string;

  @ApiProperty({ enum: WhatsAppMessageStatus })
  @IsEnum(WhatsAppMessageStatus)
  status!: WhatsAppMessageStatus;
}

export class WhatsAppConversationDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: [WhatsAppConversationMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppConversationMessageDto)
  messages!: WhatsAppConversationMessageDto[];

  @ApiProperty({ description: 'Whether automated bot responses are enabled' })
  @IsBoolean()
  botEnabled!: boolean;
}

export class WhatsAppBotCommandDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: WhatsAppBotCommand })
  @IsEnum(WhatsAppBotCommand)
  command!: WhatsAppBotCommand;

  @ApiPropertyOptional({ description: 'Additional command payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memed / Nexodata e-Prescribing
// ═══════════════════════════════════════════════════════════════════════════════

export enum EprescribingProvider {
  MEMED = 'MEMED',
  NEXODATA = 'NEXODATA',
}

export enum EprescribingStatus {
  CREATED = 'CREATED',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  DISPENSED = 'DISPENSED',
  EXPIRED = 'EXPIRED',
}

export class EprescribingMedicationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  dose!: string;

  @ApiProperty()
  @IsString()
  frequency!: string;

  @ApiProperty()
  @IsString()
  duration!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class EprescribingDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsUUID()
  prescriptionId!: string;

  @ApiProperty({ enum: EprescribingProvider })
  @IsEnum(EprescribingProvider)
  provider!: EprescribingProvider;

  @ApiProperty({ type: [EprescribingMedicationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EprescribingMedicationDto)
  medications!: EprescribingMedicationDto[];

  @ApiProperty({ description: 'Prescriber CRM number' })
  @IsString()
  prescriberId!: string;

  @ApiPropertyOptional({ description: 'ICP-Brasil digital signature' })
  @IsOptional()
  @IsString()
  digitalSignature?: string;
}

export interface EprescribingResultDto {
  externalId: string;
  prescriptionUrl: string;
  qrCode: string;
  validUntil: string;
  status: EprescribingStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Apple Health / Google Fit / Wearable Integration
// ═══════════════════════════════════════════════════════════════════════════════

export enum HealthDataSource {
  APPLE_HEALTH = 'APPLE_HEALTH',
  GOOGLE_FIT = 'GOOGLE_FIT',
  SAMSUNG_HEALTH = 'SAMSUNG_HEALTH',
  FITBIT = 'FITBIT',
  GARMIN = 'GARMIN',
}

export enum HealthDataType {
  HEART_RATE = 'HEART_RATE',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
  STEPS = 'STEPS',
  SLEEP = 'SLEEP',
  WEIGHT = 'WEIGHT',
  SPO2 = 'SPO2',
  ECG = 'ECG',
  TEMPERATURE = 'TEMPERATURE',
  EXERCISE = 'EXERCISE',
}

export class HealthKitSyncDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: HealthDataSource })
  @IsEnum(HealthDataSource)
  source!: HealthDataSource;

  @ApiProperty({ enum: HealthDataType, isArray: true })
  @IsArray()
  @IsEnum(HealthDataType, { each: true })
  dataTypes!: HealthDataType[];
}

export class HealthKitReadingDto {
  @ApiProperty({ enum: HealthDataType })
  @IsEnum(HealthDataType)
  type!: HealthDataType;

  @ApiProperty({ description: 'Numeric or structured value' })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: 'Unit of measurement (bpm, mmHg, mg/dL, etc.)' })
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsDateString()
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Source-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class HealthKitDataDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: HealthDataSource })
  @IsEnum(HealthDataSource)
  source!: HealthDataSource;

  @ApiProperty({ type: [HealthKitReadingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthKitReadingDto)
  readings!: HealthKitReadingDto[];

  @ApiProperty()
  @IsDateString()
  syncTimestamp!: string;
}
