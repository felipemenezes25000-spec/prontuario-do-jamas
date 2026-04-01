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
  Min,
  Max,
  IsUrl,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════════

export enum ReminderType {
  APPOINTMENT = 'appointment',
  VACCINE = 'vaccine',
  RETURN = 'return',
  EXAM = 'exam',
}

export enum ReminderChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
  EMAIL = 'email',
}

export enum DocumentType {
  EXTERNAL_EXAM = 'external-exam',
  REPORT = 'report',
  PHOTO = 'photo',
}

export enum DiaryEntryType {
  BP = 'BP',
  GLUCOSE = 'glucose',
  SYMPTOM = 'symptom',
  MOOD = 'mood',
  EXERCISE = 'exercise',
}

export enum WcagLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

export enum SupportedLanguage {
  PT_BR = 'pt-BR',
  EN = 'en',
  ES = 'es',
}

export enum TriageUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auto-Reminder
// ═══════════════════════════════════════════════════════════════════════════════

export class AutoReminderDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({ enum: ReminderChannel })
  @IsEnum(ReminderChannel)
  channel: ReminderChannel;

  @ApiProperty({ description: 'ISO datetime when reminder is scheduled to fire' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'ISO datetime when reminder was actually sent' })
  @IsOptional()
  @IsDateString()
  sentAt: string | null;
}

export class CreateAutoReminderDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({ enum: ReminderChannel })
  @IsEnum(ReminderChannel)
  channel: ReminderChannel;

  @ApiProperty({ description: 'ISO datetime to schedule reminder' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'UUID of related appointment/exam/vaccine' })
  @IsOptional()
  @IsUUID()
  relatedId: string | null;
}

export class MarkReminderSentDto {
  @ApiProperty()
  @IsUUID()
  reminderId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Document Upload (by patient)
// ═══════════════════════════════════════════════════════════════════════════════

export class DocumentUploadDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'S3/CDN URL of uploaded file' })
  @IsUrl()
  file: string;

  @ApiProperty({ description: 'ISO datetime patient uploaded the document' })
  @IsDateString()
  uploadedAt: string;

  @ApiPropertyOptional({ description: 'Doctor UUID who reviewed the document' })
  @IsOptional()
  @IsUUID()
  reviewedBy: string | null;

  @ApiProperty({ description: 'Document was incorporated into the official medical record' })
  @IsBoolean()
  incorporatedIntoRecord: boolean;
}

export class UploadDocumentDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'S3 pre-signed URL or direct URL of the file' })
  @IsUrl()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'Patient notes about the document' })
  @IsOptional()
  @IsString()
  notes: string | null;
}

export class ReviewDocumentDto {
  @ApiProperty()
  @IsUUID()
  documentId: string;

  @ApiProperty()
  @IsUUID()
  reviewedBy: string;

  @ApiProperty()
  @IsBoolean()
  incorporateIntoRecord: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorComment: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Health Diary
// ═══════════════════════════════════════════════════════════════════════════════

export class HealthDiaryDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: DiaryEntryType })
  @IsEnum(DiaryEntryType)
  entryType: DiaryEntryType;

  @ApiProperty({ description: 'Numeric value (e.g. 120 for systolic BP) or descriptive string' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'ISO date of the entry' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Whether the entry is visible to the doctor in the chart' })
  @IsBoolean()
  doctorVisible: boolean;
}

export class CreateDiaryEntryDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: DiaryEntryType })
  @IsEnum(DiaryEntryType)
  entryType: DiaryEntryType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'ISO date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  date: string | null;

  @ApiProperty()
  @IsBoolean()
  doctorVisible: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility (WCAG 2.1 AA)
// ═══════════════════════════════════════════════════════════════════════════════

export class AccessibilityDto {
  @ApiProperty({ enum: WcagLevel, description: 'WCAG 2.1 conformance level' })
  @IsEnum(WcagLevel)
  wcagLevel: WcagLevel;

  @ApiProperty({ description: 'Screen reader optimisation enabled' })
  @IsBoolean()
  screenReader: boolean;

  @ApiProperty({ description: 'High contrast mode enabled' })
  @IsBoolean()
  highContrast: boolean;

  @ApiProperty({ description: 'Full keyboard navigation enabled' })
  @IsBoolean()
  keyboardNav: boolean;

  @ApiProperty({ description: 'Font size multiplier (e.g. 1.0 = default, 1.5 = larger)' })
  @IsNumber()
  @Min(0.8)
  @Max(2.5)
  fontSize: number;
}

export class SetAccessibilityDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ enum: WcagLevel })
  @IsOptional()
  @IsEnum(WcagLevel)
  wcagLevel: WcagLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  screenReader: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highContrast: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  keyboardNav: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.8)
  @Max(2.5)
  fontSize: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multilingual Portal
// ═══════════════════════════════════════════════════════════════════════════════

export class MultilingualDto {
  @ApiProperty({ description: 'Key identifier for the content item' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: SupportedLanguage, isArray: true })
  @IsArray()
  @IsEnum(SupportedLanguage, { each: true })
  languages: SupportedLanguage[];

  @ApiProperty({ description: 'Map of language code → translated text' })
  translatedContent: Record<SupportedLanguage, string>;
}

export class TranslateContentDto {
  @ApiProperty({ description: 'Source content key or free text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: SupportedLanguage, description: 'Target language' })
  @IsEnum(SupportedLanguage)
  targetLanguage: SupportedLanguage;
}

export class SetPatientLanguageDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: SupportedLanguage })
  @IsEnum(SupportedLanguage)
  language: SupportedLanguage;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI Triage Chatbot
// ═══════════════════════════════════════════════════════════════════════════════

export class ChatbotMessageDto {
  @ApiProperty({ description: 'User or bot role' })
  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsDateString()
  timestamp: string;
}

export class TriageChatbotDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'List of reported symptoms in free text' })
  @IsArray()
  @IsString({ each: true })
  symptoms: string[];

  @ApiProperty({ enum: TriageUrgency })
  @IsEnum(TriageUrgency)
  urgencyLevel: TriageUrgency;

  @ApiProperty({ description: 'Pre-filled anamnesis generated from chatbot conversation' })
  @IsString()
  @IsNotEmpty()
  preliminaryAnamnesis: string;

  @ApiPropertyOptional({ description: 'Specialty referral suggestion (e.g. Clínica Geral, Cardiologia)' })
  @IsOptional()
  @IsString()
  referralSuggestion: string | null;
}

export class StartTriageChatDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;
}

export class SendTriageMessageDto {
  @ApiProperty({ description: 'Chatbot session UUID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class CompleteTriageDto {
  @ApiProperty({ description: 'Chatbot session UUID' })
  @IsUUID()
  sessionId: string;
}
