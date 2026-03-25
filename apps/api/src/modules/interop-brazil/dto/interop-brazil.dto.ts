import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsArray, IsIn, IsDateString, Min, Max } from 'class-validator';

// SINAN
export class CreateSinanNotificationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Disease name' })
  @IsString()
  disease!: string;

  @ApiProperty({ description: 'CID-10 code' })
  @IsString()
  cidCode!: string;

  @ApiProperty({ description: 'Symptom onset date' })
  @IsDateString()
  symptomOnsetDate!: string;
}

// Death Certificate
export class CreateDeathCertificateDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Date of death' })
  @IsDateString()
  deathDate!: string;

  @ApiProperty({ description: 'Cause of death' })
  @IsString()
  causeOfDeath!: string;

  @ApiProperty({ description: 'CID-10 code' })
  @IsString()
  cidCode!: string;

  @ApiProperty({ description: 'Manner: NATURAL, ACCIDENT, HOMICIDE, SUICIDE, UNDETERMINED' })
  @IsIn(['NATURAL', 'ACCIDENT', 'HOMICIDE', 'SUICIDE', 'UNDETERMINED'])
  mannerOfDeath!: string;

  @ApiProperty({ description: 'Place of death' })
  @IsString()
  placeOfDeath!: string;
}

// Birth Certificate
export class CreateBirthCertificateDto {
  @ApiProperty({ description: 'Mother patient UUID' })
  @IsUUID()
  motherId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Birth date' })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ description: 'Birth time HH:mm' })
  @IsString()
  birthTime!: string;

  @ApiProperty({ description: 'Birth weight in grams' })
  @IsNumber()
  birthWeight!: number;

  @ApiProperty({ description: 'Gestational weeks' })
  @IsNumber()
  @Min(20)
  @Max(45)
  gestationalWeeks!: number;

  @ApiProperty({ description: 'Apgar 1 minute' })
  @IsNumber()
  @Min(0)
  @Max(10)
  apgar1!: number;

  @ApiProperty({ description: 'Apgar 5 minutes' })
  @IsNumber()
  @Min(0)
  @Max(10)
  apgar5!: number;

  @ApiProperty({ description: 'Delivery type: VAGINAL, CESAREAN' })
  @IsIn(['VAGINAL', 'CESAREAN'])
  deliveryType!: string;
}

// NOTIVISA
export class CreateNotivisaReportDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Report type: DRUG_AE, TECHNOVIGILANCE, QUALITY_COMPLAINT' })
  @IsIn(['DRUG_AE', 'TECHNOVIGILANCE', 'QUALITY_COMPLAINT'])
  reportType!: string;

  @ApiPropertyOptional({ description: 'Medication name (for DRUG_AE)' })
  @IsOptional()
  @IsString()
  medicationName?: string;

  @ApiPropertyOptional({ description: 'Device name (for TECHNOVIGILANCE)' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ description: 'Adverse event description' })
  @IsString()
  adverseEvent!: string;

  @ApiProperty({ description: 'Severity: MILD, MODERATE, SEVERE, FATAL' })
  @IsIn(['MILD', 'MODERATE', 'SEVERE', 'FATAL'])
  severity!: string;

  @ApiProperty({ description: 'Outcome: RECOVERED, RECOVERING, NOT_RECOVERED, FATAL, UNKNOWN' })
  @IsIn(['RECOVERED', 'RECOVERING', 'NOT_RECOVERED', 'FATAL', 'UNKNOWN'])
  outcome!: string;
}

// Digital Prescription
export class SendDigitalPrescriptionDto {
  @ApiPropertyOptional({ description: 'Pharmacy name or ID' })
  @IsOptional()
  @IsString()
  pharmacy?: string;

  @ApiProperty({ description: 'Channel: MEMED, NEXODATA, WHATSAPP, EMAIL' })
  @IsIn(['MEMED', 'NEXODATA', 'WHATSAPP', 'EMAIL'])
  channel!: string;
}

// WhatsApp
export class SendWhatsAppDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Template name (e.g. appointment_reminder, result_ready)' })
  @IsString()
  templateName!: string;

  @ApiProperty({ description: 'Template parameters', type: Object })
  templateParams!: Record<string, string>;
}

// Health App Sync
export class SyncHealthAppDto {
  @ApiProperty({ description: 'Platform: APPLE_HEALTH, GOOGLE_FIT' })
  @IsIn(['APPLE_HEALTH', 'GOOGLE_FIT'])
  platform!: string;

  @ApiProperty({ description: 'Health data points', type: [Object] })
  @IsArray()
  data!: Array<{
    metric: string;
    value: number;
    unit: string;
    recordedAt: string;
  }>;
}
