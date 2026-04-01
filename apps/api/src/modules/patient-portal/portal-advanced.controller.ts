import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PortalAdvancedService } from './portal-advanced.service';
import {
  CreateAutoReminderDto,
  ReminderType,
  UploadDocumentDto,
  ReviewDocumentDto,
  CreateDiaryEntryDto,
  DiaryEntryType,
  SetAccessibilityDto,
  TranslateContentDto,
  SetPatientLanguageDto,
  StartTriageChatDto,
  SendTriageMessageDto,
  CompleteTriageDto,
} from './dto/portal-advanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Patient Portal — Advanced')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PortalAdvancedController {
  constructor(private readonly service: PortalAdvancedService) {}

  // ─── Auto-Reminders ───────────────────────────────────────────────────────

  @Post('reminders/advanced')
  @ApiOperation({ summary: 'Schedule reminder (appointment 24h, vaccine, return, exam) via SMS/WhatsApp/push/email' })
  @ApiResponse({ status: 201, description: 'Reminder scheduled' })
  async createReminder(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAutoReminderDto,
  ) {
    return this.service.createReminder(tenantId, dto);
  }

  @Post('reminders/advanced/:id/sent')
  @ApiOperation({ summary: 'Mark a reminder as sent (called by background job after dispatch)' })
  @ApiParam({ name: 'id', description: 'Reminder UUID' })
  async markSent(
    @CurrentTenant() tenantId: string,
    @Param('id') reminderId: string,
  ) {
    return this.service.markReminderSent(tenantId, { reminderId });
  }

  @Get('reminders/advanced')
  @ApiOperation({ summary: 'List reminders for a patient' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ReminderType })
  async listReminders(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('type') type?: ReminderType,
  ) {
    return this.service.listReminders(tenantId, patientId, type);
  }

  @Get('reminders/advanced/pending')
  @ApiOperation({ summary: 'List reminders due to be sent now (for background job processing)' })
  async getPendingReminders(@CurrentTenant() tenantId: string) {
    return this.service.getPendingReminders(tenantId);
  }

  @Delete('reminders/advanced/:id')
  @ApiOperation({ summary: 'Cancel a scheduled reminder' })
  @ApiParam({ name: 'id', description: 'Reminder UUID' })
  async cancelReminder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancelReminder(tenantId, id);
  }

  // ─── Document Upload ──────────────────────────────────────────────────────

  @Post('documents/upload')
  @ApiOperation({ summary: 'Patient uploads external exam, report, or photo' })
  @ApiResponse({ status: 201, description: 'Document uploaded; pending doctor review' })
  async uploadDocument(
    @CurrentTenant() tenantId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.uploadDocument(tenantId, dto);
  }

  @Post('documents/review')
  @ApiOperation({ summary: 'Doctor reviews and optionally incorporates document into medical record' })
  @ApiResponse({ status: 201, description: 'Document reviewed' })
  async reviewDocument(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.service.reviewDocument(tenantId, dto);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List patient-uploaded documents' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'pendingReview', required: false, type: Boolean })
  async listDocuments(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('pendingReview') pendingReview?: string,
  ) {
    const pending = pendingReview === undefined ? undefined : pendingReview === 'true';
    return this.service.listDocuments(tenantId, patientId, pending);
  }

  // ─── Health Diary ─────────────────────────────────────────────────────────

  @Post('diary')
  @ApiOperation({ summary: 'Patient adds a health diary entry (BP, glucose, symptom, mood, exercise)' })
  @ApiResponse({ status: 201, description: 'Diary entry saved' })
  async addDiaryEntry(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDiaryEntryDto,
  ) {
    return this.service.addDiaryEntry(tenantId, dto);
  }

  @Get('diary/:patientId')
  @ApiOperation({ summary: 'Get diary entries for a patient (doctor view: only doctorVisible=true)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'type', required: false, enum: DiaryEntryType })
  @ApiQuery({ name: 'doctorView', required: false, type: Boolean })
  async getDiaryEntries(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
    @Query('type') entryType?: DiaryEntryType,
    @Query('doctorView') doctorView?: string,
  ) {
    const isDoctorView = doctorView === 'true';
    return this.service.getDiaryEntries(tenantId, patientId, entryType, isDoctorView);
  }

  @Delete('diary/:patientId/:entryId')
  @ApiOperation({ summary: 'Delete a diary entry (patient can only delete their own)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiParam({ name: 'entryId', description: 'Entry UUID' })
  async deleteDiaryEntry(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.service.deleteDiaryEntry(tenantId, entryId, patientId);
  }

  // ─── Accessibility ────────────────────────────────────────────────────────

  @Post('accessibility')
  @ApiOperation({ summary: 'Set patient accessibility preferences (WCAG 2.1 AA)' })
  @ApiResponse({ status: 201, description: 'Preferences saved' })
  async setAccessibility(
    @CurrentTenant() tenantId: string,
    @Body() dto: SetAccessibilityDto,
  ) {
    return this.service.setAccessibility(tenantId, dto);
  }

  @Get('accessibility/:patientId')
  @ApiOperation({ summary: 'Get patient accessibility preferences' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getAccessibility(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getAccessibility(tenantId, patientId);
  }

  // ─── Multilingual ─────────────────────────────────────────────────────────

  @Post('language')
  @ApiOperation({ summary: 'Set preferred portal language for patient (pt-BR, en, es)' })
  @ApiResponse({ status: 201, description: 'Language preference saved' })
  async setLanguage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SetPatientLanguageDto,
  ) {
    return this.service.setPatientLanguage(tenantId, dto);
  }

  @Get('language/:patientId')
  @ApiOperation({ summary: 'Get preferred language for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getLanguage(
    @CurrentTenant() tenantId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getPatientLanguage(tenantId, patientId);
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate portal content to the specified language' })
  @ApiResponse({ status: 201, description: 'Translations returned for all supported languages' })
  async translateContent(
    @CurrentTenant() tenantId: string,
    @Body() dto: TranslateContentDto,
  ) {
    return this.service.translateContent(tenantId, dto);
  }

  // ─── AI Triage Chatbot ────────────────────────────────────────────────────

  @Post('triage/start')
  @ApiOperation({ summary: 'Start AI triage chatbot session (symptom collection)' })
  @ApiResponse({ status: 201, description: 'Triage session started' })
  async startTriage(
    @CurrentTenant() tenantId: string,
    @Body() dto: StartTriageChatDto,
  ) {
    return this.service.startTriageSession(tenantId, dto);
  }

  @Post('triage/message')
  @ApiOperation({ summary: 'Send message in triage session (chatbot responds automatically)' })
  @ApiResponse({ status: 201, description: 'Bot response appended to session' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendTriageMessageDto,
  ) {
    return this.service.sendTriageMessage(tenantId, dto);
  }

  @Post('triage/complete')
  @ApiOperation({ summary: 'Complete triage: classify urgency, generate anamnesis, suggest referral' })
  @ApiResponse({ status: 201, description: 'Triage result with urgency level and pre-filled anamnesis' })
  async completeTriage(
    @CurrentTenant() tenantId: string,
    @Body() dto: CompleteTriageDto,
  ) {
    return this.service.completeTriage(tenantId, dto);
  }

  @Get('triage/:sessionId')
  @ApiOperation({ summary: 'Get a specific triage session' })
  @ApiParam({ name: 'sessionId', description: 'Triage session UUID' })
  async getTriageSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getTriageSession(tenantId, sessionId);
  }

  @Get('triage')
  @ApiOperation({ summary: 'List triage sessions' })
  @ApiQuery({ name: 'patientId', required: false })
  async listTriageSessions(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listTriageSessions(tenantId, patientId);
  }
}
