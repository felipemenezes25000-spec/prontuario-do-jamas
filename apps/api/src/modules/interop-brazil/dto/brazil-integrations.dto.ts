import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// SINAN — Sistema de Informacao de Agravos de Notificacao
// ═══════════════════════════════════════════════════════════════════════════════

export enum SinanNotificationType {
  INDIVIDUAL = 'INDIVIDUAL',
  OUTBREAK = 'OUTBREAK',
}

export enum SinanFormType {
  DENGUE = 'DENGUE',
  COVID19 = 'COVID19',
  TUBERCULOSIS = 'TUBERCULOSIS',
  MEASLES = 'MEASLES',
  MENINGITIS = 'MENINGITIS',
  LEPTOSPIROSIS = 'LEPTOSPIROSIS',
  HANSENIASIS = 'HANSENIASIS',
  SYPHILIS = 'SYPHILIS',
  HIV_AIDS = 'HIV_AIDS',
  HEPATITIS = 'HEPATITIS',
  GENERIC = 'GENERIC',
}

export enum SinanOutcome {
  CURE = 'CURE',
  DEATH = 'DEATH',
  ABANDONMENT = 'ABANDONMENT',
  TRANSFER = 'TRANSFER',
  UNKNOWN = 'UNKNOWN',
}

export enum SinanStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  DISCARDED = 'DISCARDED',
}

export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  WEEKLY = 'WEEKLY',
}

export class NotifiableDisease {
  @ApiProperty({ description: 'CID-10 code' })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: NotificationFrequency })
  @IsEnum(NotificationFrequency)
  frequency!: NotificationFrequency;

  @ApiProperty()
  @IsBoolean()
  isCompulsory!: boolean;
}

export class SinanNotificationDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsUUID() encounterId!: string;

  @ApiProperty({ description: 'CID-10 disease code' })
  @IsString()
  @Matches(/^[A-Z]\d{2}(\.\d{1,2})?$/, { message: 'diseaseCode must be a valid CID-10 code (e.g. A90, B34.2)' })
  diseaseCode!: string;

  @ApiProperty({ enum: SinanNotificationType })
  @IsEnum(SinanNotificationType)
  notificationType!: SinanNotificationType;

  @ApiProperty({ description: 'IBGE municipality code' })
  @IsString()
  municipality!: string;

  @ApiProperty({ description: 'CNES code of the health unit' })
  @IsString()
  healthUnit!: string;

  @ApiProperty() @IsString() notifierName!: string;
  @ApiProperty() @IsString() notifierRole!: string;
}

export class PatientDemographicsDto {
  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty() @IsDateString() birthDate!: string;
  @ApiProperty() @IsString() gender!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() motherName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() race?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() municipality?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cns?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cpf?: string;
}

export class SinanFormDto {
  @ApiProperty({ enum: SinanFormType })
  @IsEnum(SinanFormType)
  formType!: SinanFormType;

  @ApiProperty({ type: PatientDemographicsDto })
  @ValidateNested()
  @Type(() => PatientDemographicsDto)
  patientDemographics!: PatientDemographicsDto;

  @ApiProperty({ description: 'Clinical data specific to the disease form' })
  @IsObject()
  clinicalData!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Laboratory results' })
  @IsObject()
  @IsOptional()
  labResults?: Record<string, unknown>;

  @ApiProperty({ enum: SinanOutcome })
  @IsEnum(SinanOutcome)
  outcome!: SinanOutcome;

  @ApiProperty({ enum: SinanStatus })
  @IsEnum(SinanStatus)
  status!: SinanStatus;
}

export class AutoDetectNotifiableDto {
  @ApiProperty({ description: 'CID-10 code to check' })
  @IsString()
  @Matches(/^[A-Z]\d{2}(\.\d{1,2})?$/, { message: 'cidCode must be a valid CID-10 code' })
  cidCode!: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CADSUS / CNS — Cartao Nacional de Saude
// ═══════════════════════════════════════════════════════════════════════════════

export class CadsusLookupDto {
  @ApiPropertyOptional({ description: 'CPF (11 digits)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'cpf must be exactly 11 digits' })
  cpf?: string;

  @ApiPropertyOptional({ description: 'CNS number (15 digits)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{15}$/, { message: 'cns must be exactly 15 digits' })
  cns?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() fullName?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() birthDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() motherName?: string;
}

export class CadsusResultDto {
  @ApiProperty({ description: 'CNS number (15 digits)' })
  @IsString()
  cns!: string;

  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty() @IsDateString() birthDate!: string;
  @ApiProperty() @IsString() motherName!: string;
  @ApiProperty() @IsString() gender!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() race?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nationality?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() municipality?: string;
  @ApiProperty() @IsBoolean() isActive!: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() linkedCPF?: string;
}

export class CadsusRegistrationDto {
  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty() @IsDateString() birthDate!: string;
  @ApiProperty() @IsString() gender!: string;
  @ApiProperty() @IsString() motherName!: string;

  @ApiProperty({ description: 'CPF (11 digits)' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'cpf must be exactly 11 digits' })
  cpf!: string;

  @ApiProperty() @IsString() address!: string;
  @ApiProperty({ description: 'IBGE municipality code' }) @IsString() municipality!: string;
  @ApiProperty({ description: 'UF (2-letter state code)' }) @IsString() state!: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CNES — Cadastro Nacional de Estabelecimentos de Saude
// ═══════════════════════════════════════════════════════════════════════════════

export enum CnesEstablishmentType {
  HOSPITAL = 'HOSPITAL',
  UBS = 'UBS',
  UPA = 'UPA',
  CLINICA = 'CLINICA',
  LABORATORIO = 'LABORATORIO',
}

export class CnesLookupDto {
  @ApiPropertyOptional({ description: 'CNES code (7 digits)' })
  @IsString()
  @IsOptional()
  cnesCode?: string;

  @ApiPropertyOptional({ description: 'CRM number' })
  @IsString()
  @IsOptional()
  crmNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  professionalName?: string;
}

export class CnesBedInfo {
  @ApiProperty() @IsNumber() total!: number;
  @ApiProperty() @IsNumber() sus!: number;
  @ApiProperty() @IsNumber() nonSUS!: number;
}

export class CnesEstablishmentDto {
  @ApiProperty() @IsString() cnesCode!: string;
  @ApiProperty() @IsString() name!: string;

  @ApiProperty({ enum: CnesEstablishmentType })
  @IsEnum(CnesEstablishmentType)
  type!: CnesEstablishmentType;

  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() state!: string;

  @ApiProperty({ type: CnesBedInfo })
  @ValidateNested()
  @Type(() => CnesBedInfo)
  beds!: CnesBedInfo;

  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) services!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) equipment!: string[];
}

export class CnesActiveBinding {
  @ApiProperty() @IsString() establishment!: string;
  @ApiProperty() @IsNumber() workload!: number;
}

export class CnesProfessionalDto {
  @ApiProperty() @IsString() cns!: string;
  @ApiProperty() @IsString() crmNumber!: string;
  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) specialties!: string[];

  @ApiProperty({ description: 'Classificacao Brasileira de Ocupacoes code' })
  @IsString()
  cbo!: string;

  @ApiProperty({ type: [CnesActiveBinding] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CnesActiveBinding)
  activeBindings!: CnesActiveBinding[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUS Billing — BPA, APAC, AIH
// ═══════════════════════════════════════════════════════════════════════════════

export enum BPAType {
  BPA_I = 'BPA_I',
  BPA_C = 'BPA_C',
}

export class BPAProcedureDto {
  @ApiProperty({ description: 'SUS procedure code (SIGTAP)' })
  @IsString()
  code!: string;

  @ApiProperty() @IsNumber() @Min(1) quantity!: number;

  @ApiProperty({ description: 'Patient CNS' })
  @IsString()
  cnsPatient!: string;

  @ApiProperty({ description: 'Professional CNS' })
  @IsString()
  cnsProfessional!: string;

  @ApiProperty({ description: 'CBO code' })
  @IsString()
  cbo!: string;

  @ApiPropertyOptional({ description: 'CID-10' })
  @IsString()
  @IsOptional()
  cid?: string;
}

export class BPADto {
  @ApiProperty({ enum: BPAType })
  @IsEnum(BPAType)
  type!: BPAType;

  @ApiProperty({ description: 'Competence in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'competence must be in YYYY-MM format' })
  competence!: string;

  @ApiProperty({ description: 'Establishment CNES code' })
  @IsString()
  establishmentCNES!: string;

  @ApiProperty({ type: [BPAProcedureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BPAProcedureDto)
  procedures!: BPAProcedureDto[];
}

export enum APACType {
  INITIAL = 'INITIAL',
  CONTINUATION = 'CONTINUATION',
}

export class APACDto {
  @ApiProperty() @IsString() apacNumber!: string;

  @ApiProperty({ enum: APACType })
  @IsEnum(APACType)
  type!: APACType;

  @ApiProperty({ description: 'Patient CNS (15 digits)' })
  @IsString()
  patientCNS!: string;

  @ApiProperty({ description: 'Main SUS procedure code' })
  @IsString()
  mainProcedure!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryProcedures?: string[];

  @ApiProperty({ description: 'CID-10 diagnosis code' })
  @IsString()
  diagnosis!: string;

  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() authorization?: string;
}

export enum AIHType {
  NORMAL = 'NORMAL',
  LONG_STAY = 'LONG_STAY',
}

export enum AIHOutcome {
  DISCHARGE = 'DISCHARGE',
  TRANSFER = 'TRANSFER',
  DEATH = 'DEATH',
}

export class AIHDto {
  @ApiProperty() @IsString() aihNumber!: string;

  @ApiProperty({ enum: AIHType })
  @IsEnum(AIHType)
  type!: AIHType;

  @ApiProperty({ description: 'Patient CNS (15 digits)' })
  @IsString()
  patientCNS!: string;

  @ApiProperty() @IsDateString() admissionDate!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dischargeDate?: string;

  @ApiProperty({ description: 'Main CID-10 diagnosis' })
  @IsString()
  mainDiagnosis!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryDiagnoses?: string[];

  @ApiProperty({ type: [String], description: 'SUS procedure codes' })
  @IsArray()
  @IsString({ each: true })
  procedures!: string[];

  @ApiProperty({ description: 'Responsible professional CNS' })
  @IsString()
  professional!: string;

  @ApiProperty({ description: 'Requesting physician CRM' })
  @IsString()
  requestingPhysician!: string;

  @ApiProperty({ description: 'Authorizing physician CRM' })
  @IsString()
  authorizingPhysician!: string;

  @ApiProperty({ enum: AIHOutcome })
  @IsEnum(AIHOutcome)
  outcome!: AIHOutcome;

  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(0) icuDays?: number;
  @ApiProperty() @IsNumber() @Min(1) totalDays!: number;
}

export enum SUSBillingType {
  BPA = 'BPA',
  APAC = 'APAC',
  AIH = 'AIH',
}

export enum SUSBillingFormat {
  XML = 'XML',
  TXT = 'TXT',
}

export enum SUSBillingStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  EXPORTED = 'EXPORTED',
  SUBMITTED = 'SUBMITTED',
  PROCESSED = 'PROCESSED',
}

export class SUSBillingExportDto {
  @ApiProperty({ enum: SUSBillingType })
  @IsEnum(SUSBillingType)
  type!: SUSBillingType;

  @ApiProperty({ description: 'Competence in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'competence must be in YYYY-MM format' })
  competence!: string;

  @ApiProperty({ enum: SUSBillingFormat })
  @IsEnum(SUSBillingFormat)
  format!: SUSBillingFormat;

  @ApiProperty({ description: 'Array of billing record IDs' })
  @IsArray()
  @IsString({ each: true })
  records!: string[];

  @ApiProperty() @IsNumber() @Min(0) totalValue!: number;

  @ApiProperty({ enum: SUSBillingStatus })
  @IsEnum(SUSBillingStatus)
  status!: SUSBillingStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIVISA — Notificacao em Vigilancia Sanitaria
// ═══════════════════════════════════════════════════════════════════════════════

export enum NotivisaType {
  MEDICATION_AE = 'MEDICATION_AE',
  BLOOD_REACTION = 'BLOOD_REACTION',
  DEVICE_COMPLAINT = 'DEVICE_COMPLAINT',
  TECHNICAL_COMPLAINT = 'TECHNICAL_COMPLAINT',
}

export enum NotivisaSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  DEATH = 'DEATH',
}

export enum NotivisaCausality {
  DEFINITE = 'DEFINITE',
  PROBABLE = 'PROBABLE',
  POSSIBLE = 'POSSIBLE',
  UNLIKELY = 'UNLIKELY',
  UNRELATED = 'UNRELATED',
}

export enum NotivisaStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export class NotivisaProductDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() manufacturer!: string;
  @ApiProperty() @IsString() lot!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() expiry?: string;
}

export class NotivisaReporterDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() role!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() council?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() councilNumber?: string;
}

export class NotivisaDto {
  @ApiProperty({ enum: NotivisaType })
  @IsEnum(NotivisaType)
  type!: NotivisaType;

  @ApiProperty() @IsUUID() patientId!: string;

  @ApiProperty({ type: NotivisaProductDto })
  @ValidateNested()
  @Type(() => NotivisaProductDto)
  product!: NotivisaProductDto;

  @ApiProperty() @IsString() description!: string;

  @ApiProperty({ enum: NotivisaSeverity })
  @IsEnum(NotivisaSeverity)
  severity!: NotivisaSeverity;

  @ApiProperty({ enum: NotivisaCausality })
  @IsEnum(NotivisaCausality)
  causality!: NotivisaCausality;

  @ApiProperty({ type: NotivisaReporterDto })
  @ValidateNested()
  @Type(() => NotivisaReporterDto)
  reporter!: NotivisaReporterDto;

  @ApiProperty({ enum: NotivisaStatus })
  @IsEnum(NotivisaStatus)
  status!: NotivisaStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIM — Sistema de Informacao sobre Mortalidade
// ═══════════════════════════════════════════════════════════════════════════════

export enum PlaceOfDeath {
  HOSPITAL = 'HOSPITAL',
  HOME = 'HOME',
  PUBLIC_PLACE = 'PUBLIC_PLACE',
  OTHER = 'OTHER',
}

export enum MannerOfDeath {
  NATURAL = 'NATURAL',
  ACCIDENT = 'ACCIDENT',
  HOMICIDE = 'HOMICIDE',
  SUICIDE = 'SUICIDE',
  UNDETERMINED = 'UNDETERMINED',
}

export class DeathCertificatePhysicianDto {
  @ApiProperty() @IsString() crm!: string;
  @ApiProperty() @IsString() name!: string;
}

export class DeathCertificateDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty() @IsDateString() dateOfDeath!: string;

  @ApiProperty({ enum: PlaceOfDeath })
  @IsEnum(PlaceOfDeath)
  placeOfDeath!: PlaceOfDeath;

  @ApiProperty({ description: 'Immediate cause of death (CID-10)' })
  @IsString()
  immediateCause!: string;

  @ApiProperty({ description: 'CID-10 antecedent causes chain (Part I lines b, c, d)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  antecedentCauses!: string[];

  @ApiPropertyOptional({ description: 'Contributing conditions (Part II)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contributingConditions?: string[];

  @ApiProperty({ enum: MannerOfDeath })
  @IsEnum(MannerOfDeath)
  mannerOfDeath!: MannerOfDeath;

  @ApiProperty() @IsBoolean() autopsyPerformed!: boolean;

  @ApiProperty({ type: DeathCertificatePhysicianDto })
  @ValidateNested()
  @Type(() => DeathCertificatePhysicianDto)
  physician!: DeathCertificatePhysicianDto;

  @ApiProperty({ description: 'IBGE municipality code' })
  @IsString()
  municipality!: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINASC — Sistema de Informacoes sobre Nascidos Vivos
// ═══════════════════════════════════════════════════════════════════════════════

export enum DeliveryType {
  VAGINAL = 'VAGINAL',
  CESAREAN = 'CESAREAN',
}

export class BirthCertificateDto {
  @ApiProperty() @IsUUID() motherId!: string;
  @ApiProperty() @IsUUID() newbornId!: string;
  @ApiProperty() @IsDateString() birthDate!: string;

  @ApiProperty({ description: 'Birth time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'birthTime must be in HH:mm format' })
  birthTime!: string;

  @ApiProperty({ description: 'Gestational age in weeks' })
  @IsNumber()
  @Min(20)
  @Max(45)
  gestationalAge!: number;

  @ApiProperty({ description: 'Birth weight in grams' })
  @IsNumber()
  @Min(100)
  @Max(8000)
  birthWeight!: number;

  @ApiProperty({ description: 'Apgar score at 1 minute' })
  @IsNumber()
  @Min(0)
  @Max(10)
  apgar1!: number;

  @ApiProperty({ description: 'Apgar score at 5 minutes' })
  @IsNumber()
  @Min(0)
  @Max(10)
  apgar5!: number;

  @ApiProperty({ enum: DeliveryType })
  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @ApiPropertyOptional({ description: 'Fetal presentation' })
  @IsString()
  @IsOptional()
  presentation?: string;

  @ApiPropertyOptional({ description: 'Place of birth (CNES code or description)' })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({ description: 'CID-10 codes for congenital anomalies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  congenitalAnomalies?: string[];

  @ApiPropertyOptional({ description: 'Number of prenatal care visits' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  numberOfPrenatalVisits?: number;

  @ApiProperty({ description: 'CRM of attending physician' })
  @IsString()
  physicianCRM!: string;
}
