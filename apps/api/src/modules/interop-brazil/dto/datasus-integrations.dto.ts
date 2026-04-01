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
  IsPositive,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum SinanNewDiseaseCode {
  HEPATITE_A = 'A06',
  DENGUE = 'A90',
  CHIKUNGUNYA = 'A92.0',
  ZIKA = 'A92.8',
  TUBERCULOSE = 'A15',
  HANSENIASE = 'A30',
  SIFILIS = 'A53',
  HIV_AIDS = 'B20',
  MENINGITE = 'G00',
  LEPTOSPIROSE = 'A27',
  COVID19 = 'U07.1',
  FEBRE_AMARELA = 'A95',
  RAIVA = 'A82',
  SARAMPO = 'B05',
}

export enum EsusEncounterType {
  INDIVIDUAL = 'individual',
  DOMICILIAR = 'domiciliar',
  ATIVIDADE_COLETIVA = 'atividade_coletiva',
}

export enum EsusFichaType {
  INDIVIDUAL = 'individual',
  PROCEDIMENTO = 'procedimento',
  ATIVIDADE = 'atividade',
}

export enum DeathManner {
  NATURAL = 'natural',
  ACCIDENT = 'accidente',
  HOMICIDE = 'homicidio',
  SUICIDE = 'suicidio',
  UNDETERMINED = 'indeterminado',
}

export enum NotivisaType {
  MEDICATION = 'medication',
  DEVICE = 'device',
  COMPLAINT = 'complaint',
  BLOOD_PRODUCT = 'blood_product',
  COSMETIC = 'cosmetic',
}

export enum NotivisaSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  FATAL = 'fatal',
  UNKNOWN = 'unknown',
}

export enum WhatsappMessageType {
  REMINDER = 'reminder',
  RESULT = 'result',
  PRESCRIPTION = 'prescription',
  APPOINTMENT = 'appointment',
  DISCHARGE = 'discharge',
  CHATBOT = 'chatbot',
}

export enum WhatsappDeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum CnesValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

// ═══════════════════════════════════════════════════════════════════════════════
// NESTED CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export class SymptomDto {
  @ApiProperty({ description: 'Symptom name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Onset date of this symptom (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  onsetDate?: string;
}

export class MedicationItemDto {
  @ApiProperty({ description: 'Memed medication ID or free text name' })
  @IsString()
  medicationId!: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Dosage instruction' })
  @IsString()
  dosage!: string;

  @ApiProperty({ description: 'Frequency instruction' })
  @IsString()
  frequency!: string;

  @ApiProperty({ description: 'Duration (e.g., "7 dias")' })
  @IsString()
  duration!: string;

  @ApiPropertyOptional({ description: 'ANVISA registration number (DCB/DCI)' })
  @IsOptional()
  @IsString()
  anvisaCode?: string;
}

export class SisabProcedureDto {
  @ApiProperty({ description: 'SIGTAP procedure code' })
  @IsString()
  sigtapCode!: string;

  @ApiProperty({ description: 'Procedure description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Quantity performed' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINAN NOTIFICATION (enhanced for new diseases)
// ═══════════════════════════════════════════════════════════════════════════════

export class SinanNotificationDto {
  @ApiProperty({ description: 'CID-10 disease code (will trigger auto-fill if recognized)' })
  @IsString()
  diseaseCode!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: [SymptomDto], description: 'Reported symptoms' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomDto)
  symptoms!: SymptomDto[];

  @ApiProperty({ description: 'Symptom onset date (ISO 8601)' })
  @IsDateString()
  onsetDate!: string;

  @ApiProperty({ description: 'Notification date (ISO 8601)' })
  @IsDateString()
  notificationDate!: string;

  @ApiPropertyOptional({
    description: 'Auto-fill notification fields from clinical diagnosis',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autofillFromDiagnosis?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CADSUS / CNS QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export class CadsusQueryDto {
  @ApiPropertyOptional({ description: 'Patient CPF (11 digits, numbers only)' })
  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'CPF must contain exactly 11 digits' })
  cpf?: string;

  @ApiPropertyOptional({ description: 'Cartão Nacional de Saúde (CNS) — 15 digits' })
  @IsOptional()
  @Matches(/^\d{15}$/, { message: 'CNS must contain exactly 15 digits' })
  cns?: string;

  @ApiPropertyOptional({ description: 'Patient full name (used as fallback search key)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Patient birth date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Resolved CNS returned after a CPF lookup' })
  @IsOptional()
  @Matches(/^\d{15}$/, { message: 'resolvedCns must contain exactly 15 digits' })
  resolvedCns?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CNES VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export class CnesValidationDto {
  @ApiProperty({ description: 'Internal professional UUID' })
  @IsUUID()
  professionalId!: string;

  @ApiProperty({ description: 'CRM registration number (e.g., "12345-SP")' })
  @IsString()
  crm!: string;

  @ApiPropertyOptional({ description: 'Medical specialty CBO code' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'CNES establishment code (7 digits)' })
  @IsOptional()
  @Matches(/^\d{7}$/, { message: 'CNES establishment code must be 7 digits' })
  establishment?: string;

  @ApiPropertyOptional({ description: 'Number of registered/licensed beds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  beds?: number;

  @ApiPropertyOptional({ enum: CnesValidationStatus, description: 'Validation result' })
  @IsOptional()
  @IsEnum(CnesValidationStatus)
  validationResult?: CnesValidationStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// e-SUS APS
// ═══════════════════════════════════════════════════════════════════════════════

export class EsusApsDto {
  @ApiProperty({ enum: EsusEncounterType, description: 'Type of encounter in APS' })
  @IsEnum(EsusEncounterType)
  encounterType!: EsusEncounterType;

  @ApiProperty({ enum: EsusFichaType, description: 'e-SUS form type for SISAB export' })
  @IsEnum(EsusFichaType)
  fichaType!: EsusFichaType;

  @ApiPropertyOptional({ type: [SisabProcedureDto], description: 'Procedures performed' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SisabProcedureDto)
  procedures?: SisabProcedureDto[];

  @ApiPropertyOptional({
    description: 'Whether to export this encounter to SISAB (e-SUS APS) after saving',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sisabExport?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIM — DEATH CERTIFICATE (Declaração de Óbito)
// ═══════════════════════════════════════════════════════════════════════════════

export class DeathCertificateDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Cause of death line I-a (immediate cause) — CID-10 code' })
  @IsString()
  cause1!: string;

  @ApiPropertyOptional({ description: 'Cause of death line I-b — CID-10 code' })
  @IsOptional()
  @IsString()
  cause2?: string;

  @ApiPropertyOptional({ description: 'Cause of death line I-c — CID-10 code' })
  @IsOptional()
  @IsString()
  cause3?: string;

  @ApiPropertyOptional({ description: 'Cause of death line II (contributing conditions) — CID-10 code' })
  @IsOptional()
  @IsString()
  cause4?: string;

  @ApiProperty({ description: 'Underlying (basic) cause of death — CID-10 code' })
  @IsString()
  underlyingCause!: string;

  @ApiProperty({ enum: DeathManner, description: 'Manner of death' })
  @IsEnum(DeathManner)
  manner!: DeathManner;

  @ApiPropertyOptional({ description: 'SIM XML export content (DO digital)' })
  @IsOptional()
  @IsString()
  simExportXml?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINASC — BIRTH CERTIFICATE (Declaração de Nascido Vivo)
// ═══════════════════════════════════════════════════════════════════════════════

export class BirthCertificateDto {
  @ApiProperty({ description: 'Newborn patient UUID' })
  @IsUUID()
  newbornId!: string;

  @ApiProperty({ description: 'Mother patient UUID' })
  @IsUUID()
  motherId!: string;

  @ApiPropertyOptional({ description: 'APGAR score at 1 minute (0–10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar1?: number;

  @ApiPropertyOptional({ description: 'APGAR score at 5 minutes (0–10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar5?: number;

  @ApiPropertyOptional({ description: 'Birth weight in grams' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  birthWeight?: number;

  @ApiPropertyOptional({ description: 'Gestational age in weeks' })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(45)
  gestationalAge?: number;

  @ApiPropertyOptional({ description: 'SINASC XML export content (DNV digital)' })
  @IsOptional()
  @IsString()
  sinascExportXml?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIVISA — ANVISA ADVERSE EVENT REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export class NotivisaReportDto {
  @ApiProperty({ enum: NotivisaType, description: 'Type of adverse event / vigilance report' })
  @IsEnum(NotivisaType)
  type!: NotivisaType;

  @ApiProperty({ description: 'Product name / ANVISA registration number' })
  @IsString()
  product!: string;

  @ApiProperty({ description: 'Description of the adverse event or technical complaint' })
  @IsString()
  event!: string;

  @ApiProperty({ enum: NotivisaSeverity, description: 'Event severity' })
  @IsEnum(NotivisaSeverity)
  severity!: NotivisaSeverity;

  @ApiPropertyOptional({ description: 'NOTIVISA XML export content (for ANVISA submission)' })
  @IsOptional()
  @IsString()
  anvisaExportXml?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMED / NEXODATA E-PRESCRIBING
// ═══════════════════════════════════════════════════════════════════════════════

export class MemedIntegrationDto {
  @ApiProperty({ description: 'Prescription UUID in VoxPEP' })
  @IsUUID()
  prescriptionId!: string;

  @ApiProperty({ description: "Patient's CPF (11 digits)" })
  @Matches(/^\d{11}$/, { message: 'patientCpf must be 11 digits' })
  patientCpf!: string;

  @ApiProperty({ type: [MedicationItemDto], description: 'Medications in the e-prescription' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications!: MedicationItemDto[];

  @ApiPropertyOptional({
    description: 'ICP-Brasil digital signature (base64-encoded CMS/PKCS#7)',
  })
  @IsOptional()
  @IsString()
  digitalSignature?: string;

  @ApiPropertyOptional({
    description: 'Pharmacy dispensing status returned by Memed/Nexodata',
  })
  @IsOptional()
  @IsString()
  pharmacyDeliveryStatus?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP BUSINESS API
// ═══════════════════════════════════════════════════════════════════════════════

export class WhatsappBusinessDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: WhatsappMessageType, description: 'Type of WhatsApp message' })
  @IsEnum(WhatsappMessageType)
  messageType!: WhatsappMessageType;

  @ApiProperty({
    description: 'Approved Meta template name (must match registered template)',
  })
  @IsString()
  template!: string;

  @ApiPropertyOptional({
    description: 'Scheduled send time (ISO 8601) — null means send immediately',
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional({ enum: WhatsappDeliveryStatus, description: 'Delivery status' })
  @IsOptional()
  @IsEnum(WhatsappDeliveryStatus)
  deliveryStatus?: WhatsappDeliveryStatus;
}
