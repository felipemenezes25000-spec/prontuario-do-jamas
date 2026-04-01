import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutoReminderDto,
  CreateAutoReminderDto,
  MarkReminderSentDto,
  ReminderType,
  DocumentUploadDto,
  UploadDocumentDto,
  ReviewDocumentDto,
  HealthDiaryDto,
  CreateDiaryEntryDto,
  DiaryEntryType,
  AccessibilityDto,
  SetAccessibilityDto,
  WcagLevel,
  MultilingualDto,
  TranslateContentDto,
  SetPatientLanguageDto,
  SupportedLanguage,
  TriageChatbotDto,
  StartTriageChatDto,
  SendTriageMessageDto,
  CompleteTriageDto,
  TriageUrgency,
  ChatbotMessageDto,
} from './dto/portal-advanced.dto';

// ── Internal store types ─────────────────────────────────────────────────────

export interface StoredReminder extends AutoReminderDto {
  id: string;
  tenantId: string;
  relatedId: string | null;
}

export interface StoredDocument extends DocumentUploadDto {
  id: string;
  tenantId: string;
  doctorComment: string | null;
}

export interface StoredDiaryEntry extends HealthDiaryDto {
  id: string;
  tenantId: string;
}

export interface StoredAccessibility extends AccessibilityDto {
  tenantId: string;
  patientId: string;
}

export interface PatientLanguage {
  tenantId: string;
  patientId: string;
  language: SupportedLanguage;
}

export interface ChatbotSession {
  id: string;
  tenantId: string;
  patientId: string;
  messages: ChatbotMessageDto[];
  symptoms: string[];
  urgencyLevel: TriageUrgency | null;
  preliminaryAnamnesis: string | null;
  referralSuggestion: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Urgency keyword rules (lightweight stub — production uses GPT-4o) ────────

const EMERGENCY_KEYWORDS = ['chest pain', 'dor no peito', 'shortness of breath', 'falta de ar', 'stroke', 'avc', 'unconscious', 'inconsciente'];
const HIGH_KEYWORDS = ['severe pain', 'dor severa', 'high fever', 'febre alta', 'vomiting blood', 'vomitando sangue'];
const MEDIUM_KEYWORDS = ['fever', 'febre', 'pain', 'dor', 'dizziness', 'tontura', 'cough', 'tosse'];

@Injectable()
export class PortalAdvancedService {
  private readonly logger = new Logger(PortalAdvancedService.name);

  private reminders: StoredReminder[] = [];
  private documents: StoredDocument[] = [];
  private diaryEntries: StoredDiaryEntry[] = [];
  private accessibilitySettings: StoredAccessibility[] = [];
  private patientLanguages: PatientLanguage[] = [];
  private chatbotSessions: ChatbotSession[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-Reminders (appointment 24h before, vaccine, return, exam)
  // ═══════════════════════════════════════════════════════════════════════════

  async createReminder(tenantId: string, dto: CreateAutoReminderDto): Promise<StoredReminder> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const reminder: StoredReminder = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      type: dto.type,
      channel: dto.channel,
      scheduledAt: dto.scheduledAt,
      sentAt: null,
      relatedId: dto.relatedId ?? null,
    };

    this.reminders.push(reminder);
    this.logger.log(`[Tenant ${tenantId}] Reminder scheduled: ${dto.type} via ${dto.channel} at ${dto.scheduledAt}`);
    return reminder;
  }

  async markReminderSent(tenantId: string, dto: MarkReminderSentDto): Promise<StoredReminder> {
    const reminder = this.reminders.find(
      (r) => r.tenantId === tenantId && r.id === dto.reminderId,
    );
    if (!reminder) throw new NotFoundException(`Reminder "${dto.reminderId}" not found`);

    reminder.sentAt = new Date().toISOString();
    return reminder;
  }

  async listReminders(tenantId: string, patientId?: string, type?: ReminderType): Promise<StoredReminder[]> {
    return this.reminders.filter(
      (r) =>
        r.tenantId === tenantId &&
        (!patientId || r.patientId === patientId) &&
        (!type || r.type === type),
    );
  }

  async getPendingReminders(tenantId: string): Promise<StoredReminder[]> {
    const now = new Date();
    return this.reminders.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.sentAt === null &&
        new Date(r.scheduledAt) <= now,
    );
  }

  async cancelReminder(tenantId: string, reminderId: string): Promise<{ cancelled: boolean }> {
    const idx = this.reminders.findIndex(
      (r) => r.tenantId === tenantId && r.id === reminderId,
    );
    if (idx === -1) throw new NotFoundException(`Reminder "${reminderId}" not found`);
    this.reminders.splice(idx, 1);
    return { cancelled: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // External Document Upload (patient → doctor review → incorporate)
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadDocument(tenantId: string, dto: UploadDocumentDto): Promise<StoredDocument> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const document: StoredDocument = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      documentType: dto.documentType,
      file: dto.fileUrl,
      uploadedAt: new Date().toISOString(),
      reviewedBy: null,
      incorporatedIntoRecord: false,
      doctorComment: null,
    };

    this.documents.push(document);
    this.logger.log(`[Tenant ${tenantId}] Document uploaded: ${dto.documentType} for patient ${dto.patientId}`);
    return document;
  }

  async reviewDocument(tenantId: string, dto: ReviewDocumentDto): Promise<StoredDocument> {
    const document = this.documents.find(
      (d) => d.tenantId === tenantId && d.id === dto.documentId,
    );
    if (!document) throw new NotFoundException(`Document "${dto.documentId}" not found`);

    document.reviewedBy = dto.reviewedBy;
    document.incorporatedIntoRecord = dto.incorporateIntoRecord;
    document.doctorComment = dto.doctorComment ?? null;

    this.logger.log(
      `[Tenant ${tenantId}] Document ${dto.documentId} reviewed by ${dto.reviewedBy} — incorporated: ${dto.incorporateIntoRecord}`,
    );
    return document;
  }

  async listDocuments(tenantId: string, patientId?: string, pendingReview?: boolean): Promise<StoredDocument[]> {
    return this.documents.filter(
      (d) =>
        d.tenantId === tenantId &&
        (!patientId || d.patientId === patientId) &&
        (pendingReview === undefined || (pendingReview ? d.reviewedBy === null : d.reviewedBy !== null)),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Health Diary (BP, glucose, symptoms, mood, exercise)
  // ═══════════════════════════════════════════════════════════════════════════

  async addDiaryEntry(tenantId: string, dto: CreateDiaryEntryDto): Promise<StoredDiaryEntry> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const entry: StoredDiaryEntry = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      entryType: dto.entryType,
      value: dto.value,
      date: dto.date ?? new Date().toISOString().substring(0, 10),
      doctorVisible: dto.doctorVisible,
    };

    this.diaryEntries.push(entry);
    return entry;
  }

  async getDiaryEntries(
    tenantId: string,
    patientId: string,
    entryType?: DiaryEntryType,
    doctorView?: boolean,
  ): Promise<StoredDiaryEntry[]> {
    return this.diaryEntries
      .filter(
        (e) =>
          e.tenantId === tenantId &&
          e.patientId === patientId &&
          (!entryType || e.entryType === entryType) &&
          (doctorView === undefined || !doctorView || e.doctorVisible),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async deleteDiaryEntry(tenantId: string, entryId: string, patientId: string): Promise<{ deleted: boolean }> {
    const idx = this.diaryEntries.findIndex(
      (e) => e.tenantId === tenantId && e.id === entryId && e.patientId === patientId,
    );
    if (idx === -1) throw new NotFoundException(`Diary entry "${entryId}" not found`);
    this.diaryEntries.splice(idx, 1);
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility (WCAG 2.1 AA)
  // ═══════════════════════════════════════════════════════════════════════════

  async setAccessibility(tenantId: string, dto: SetAccessibilityDto): Promise<StoredAccessibility> {
    const existing = this.accessibilitySettings.find(
      (a) => a.tenantId === tenantId && a.patientId === dto.patientId,
    );

    if (existing) {
      if (dto.wcagLevel !== undefined) existing.wcagLevel = dto.wcagLevel;
      if (dto.screenReader !== null && dto.screenReader !== undefined) existing.screenReader = dto.screenReader;
      if (dto.highContrast !== null && dto.highContrast !== undefined) existing.highContrast = dto.highContrast;
      if (dto.keyboardNav !== null && dto.keyboardNav !== undefined) existing.keyboardNav = dto.keyboardNav;
      if (dto.fontSize !== null && dto.fontSize !== undefined) existing.fontSize = dto.fontSize;
      return existing;
    }

    const settings: StoredAccessibility = {
      tenantId,
      patientId: dto.patientId,
      wcagLevel: dto.wcagLevel ?? WcagLevel.AA,
      screenReader: dto.screenReader ?? false,
      highContrast: dto.highContrast ?? false,
      keyboardNav: dto.keyboardNav ?? true,
      fontSize: dto.fontSize ?? 1.0,
    };

    this.accessibilitySettings.push(settings);
    return settings;
  }

  async getAccessibility(tenantId: string, patientId: string): Promise<StoredAccessibility> {
    const settings = this.accessibilitySettings.find(
      (a) => a.tenantId === tenantId && a.patientId === patientId,
    );
    // Return sane defaults if not yet configured
    return settings ?? {
      tenantId,
      patientId,
      wcagLevel: WcagLevel.AA,
      screenReader: false,
      highContrast: false,
      keyboardNav: true,
      fontSize: 1.0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Multilingual Portal (pt-BR, en, es)
  // ═══════════════════════════════════════════════════════════════════════════

  async setPatientLanguage(tenantId: string, dto: SetPatientLanguageDto): Promise<PatientLanguage> {
    const existing = this.patientLanguages.find(
      (l) => l.tenantId === tenantId && l.patientId === dto.patientId,
    );
    if (existing) {
      existing.language = dto.language;
      return existing;
    }
    const entry: PatientLanguage = { tenantId, patientId: dto.patientId, language: dto.language };
    this.patientLanguages.push(entry);
    return entry;
  }

  async getPatientLanguage(tenantId: string, patientId: string): Promise<{ language: SupportedLanguage }> {
    const entry = this.patientLanguages.find(
      (l) => l.tenantId === tenantId && l.patientId === patientId,
    );
    return { language: entry?.language ?? SupportedLanguage.PT_BR };
  }

  async translateContent(tenantId: string, dto: TranslateContentDto): Promise<MultilingualDto> {
    // Production: call GPT-4o or DeepL for real translation
    const translations: Record<SupportedLanguage, string> = {
      [SupportedLanguage.PT_BR]: dto.content,
      [SupportedLanguage.EN]: `[EN] ${dto.content}`,
      [SupportedLanguage.ES]: `[ES] ${dto.content}`,
    };

    return {
      content: dto.content,
      languages: [SupportedLanguage.PT_BR, SupportedLanguage.EN, SupportedLanguage.ES],
      translatedContent: translations,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI Triage Chatbot
  // ═══════════════════════════════════════════════════════════════════════════

  async startTriageSession(tenantId: string, dto: StartTriageChatDto): Promise<ChatbotSession> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const session: ChatbotSession = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      messages: [
        {
          role: 'assistant',
          content: 'Olá! Sou o assistente de triagem. Por favor, descreva seu(s) sintoma(s) principal(is).',
          timestamp: new Date().toISOString(),
        },
      ],
      symptoms: [],
      urgencyLevel: null,
      preliminaryAnamnesis: null,
      referralSuggestion: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    this.chatbotSessions.push(session);
    return session;
  }

  async sendTriageMessage(tenantId: string, dto: SendTriageMessageDto): Promise<ChatbotSession> {
    const session = this.chatbotSessions.find(
      (s) => s.tenantId === tenantId && s.id === dto.sessionId && s.completedAt === null,
    );
    if (!session) throw new NotFoundException(`Triage session "${dto.sessionId}" not found or already completed`);

    const userMessage: ChatbotMessageDto = {
      role: 'user',
      content: dto.message,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);

    // Extract symptoms from user message (stub — production: GPT-4o NER)
    const normalised = dto.message.toLowerCase();
    const detected = [...EMERGENCY_KEYWORDS, ...HIGH_KEYWORDS, ...MEDIUM_KEYWORDS].filter(
      (kw) => normalised.includes(kw),
    );
    session.symptoms.push(...detected.filter((kw) => !session.symptoms.includes(kw)));

    // Generate bot reply
    const botReply = this.generateBotReply(session.symptoms, session.messages.length);
    session.messages.push({
      role: 'assistant',
      content: botReply,
      timestamp: new Date().toISOString(),
    });

    return session;
  }

  async completeTriage(tenantId: string, dto: CompleteTriageDto): Promise<TriageChatbotDto> {
    const session = this.chatbotSessions.find(
      (s) => s.tenantId === tenantId && s.id === dto.sessionId && s.completedAt === null,
    );
    if (!session) throw new NotFoundException(`Triage session "${dto.sessionId}" not found or already completed`);

    session.urgencyLevel = this.classifyUrgency(session.symptoms);
    session.referralSuggestion = this.suggestReferral(session.symptoms, session.urgencyLevel);
    session.preliminaryAnamnesis = this.buildAnamnesis(session.symptoms, session.messages);
    session.completedAt = new Date().toISOString();

    this.logger.log(
      `[Tenant ${tenantId}] Triage completed for patient ${session.patientId}: ${session.urgencyLevel}`,
    );

    return {
      patientId: session.patientId,
      symptoms: session.symptoms,
      urgencyLevel: session.urgencyLevel,
      preliminaryAnamnesis: session.preliminaryAnamnesis,
      referralSuggestion: session.referralSuggestion,
    };
  }

  async getTriageSession(tenantId: string, sessionId: string): Promise<ChatbotSession> {
    const session = this.chatbotSessions.find(
      (s) => s.tenantId === tenantId && s.id === sessionId,
    );
    if (!session) throw new NotFoundException(`Triage session "${sessionId}" not found`);
    return session;
  }

  async listTriageSessions(tenantId: string, patientId?: string): Promise<ChatbotSession[]> {
    return this.chatbotSessions.filter(
      (s) => s.tenantId === tenantId && (!patientId || s.patientId === patientId),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private classifyUrgency(symptoms: string[]): TriageUrgency {
    const sym = symptoms.join(' ').toLowerCase();
    if (EMERGENCY_KEYWORDS.some((kw) => sym.includes(kw))) return TriageUrgency.EMERGENCY;
    if (HIGH_KEYWORDS.some((kw) => sym.includes(kw))) return TriageUrgency.HIGH;
    if (MEDIUM_KEYWORDS.some((kw) => sym.includes(kw))) return TriageUrgency.MEDIUM;
    return TriageUrgency.LOW;
  }

  private suggestReferral(symptoms: string[], urgency: TriageUrgency): string {
    if (urgency === TriageUrgency.EMERGENCY) return 'Pronto-Socorro';
    const sym = symptoms.join(' ').toLowerCase();
    if (sym.includes('chest') || sym.includes('peito') || sym.includes('cardio')) return 'Cardiologia';
    if (sym.includes('skin') || sym.includes('pele') || sym.includes('rash')) return 'Dermatologia';
    if (sym.includes('eye') || sym.includes('olho') || sym.includes('visão')) return 'Oftalmologia';
    return 'Clínica Geral';
  }

  private buildAnamnesis(symptoms: string[], messages: ChatbotMessageDto[]): string {
    const patientMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('; ');
    return `Queixa principal: ${symptoms.join(', ') || 'não informado'}. Relato: ${patientMessages}`;
  }

  private generateBotReply(symptoms: string[], messageCount: number): string {
    if (messageCount <= 2) {
      return 'Entendi. Há quanto tempo você está sentindo isso? Os sintomas pioram com alguma atividade?';
    }
    if (messageCount <= 4) {
      return 'Você tem alguma doença crônica (diabetes, hipertensão, etc.) ou usa medicamentos regularmente?';
    }
    return 'Obrigado pelas informações. Com base no que você descreveu, vou gerar um resumo para o médico. Deseja finalizar a triagem?';
  }
}
