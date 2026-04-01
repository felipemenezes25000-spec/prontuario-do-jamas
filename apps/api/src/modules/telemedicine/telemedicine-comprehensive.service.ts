import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTeleconsultationDto,
  SessionStatusDto,
  SessionStatus,
  WaitingRoomDto,
  WaitingRoomStatus,
  ScreenShareDto,
  SessionChatMessageDto,
  RecordingConsentDto,
  RecordingDto,
  StoreForwardCaseDto,
  StoreForwardResponseDto,
  StoreForwardStatus,
  RPMEnrollmentDto,
  RPMReadingDto,
  RPMAlertSeverity,
  TeleconsultoriaDto,
  TeleconsultoriaResponseDto,
  AddParticipantDto,
} from './dto/telemedicine-comprehensive.dto';

// ── Internal helper types ───────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date;
}

export interface ParsedSession {
  id: string;
  sessionStatus: string;
  [key: string]: unknown;
}

export interface WaitingRoomEntry {
  patientId: string;
  joinedAt: string;
  status: string;
  appointmentType: string;
  waitMinutes: number;
}

export interface RPMReadingEntry {
  deviceType: string;
  values: Record<string, number>;
  readingTimestamp: string;
  source: string;
}

export interface RPMAlertEntry {
  enrollmentId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
}

@Injectable()
export class TelemedicineComprehensiveService {
  private readonly logger = new Logger(TelemedicineComprehensiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private buildDocData(
    tenantId: string,
    patientId: string,
    authorId: string,
    subType: string,
    title: string,
    content: Record<string, unknown>,
    encounterId?: string,
  ) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[TELEMEDICINE:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  private parseContent(doc: SessionRecord): Record<string, unknown> {
    try {
      return JSON.parse(doc.content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  // ========================================================================
  // Video Session Management
  // ========================================================================

  async createSession(tenantId: string, dto: CreateTeleconsultationDto) {
    const content = {
      sessionStatus: SessionStatus.SCHEDULED,
      type: dto.type,
      scheduledAt: dto.scheduledAt,
      duration: dto.duration,
      participants: dto.participants,
      providerId: dto.providerId,
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.providerId,
        'SESSION',
        `Teleconsulta ${dto.type}`,
        content,
        dto.encounterId,
      ),
    });

    this.logger.log(`Session created: ${doc.id} for patient ${dto.patientId}`);
    return { id: doc.id, ...content };
  }

  async updateSessionStatus(tenantId: string, sessionId: string, dto: SessionStatusDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const updated = {
      ...existing,
      sessionStatus: dto.status,
      startedAt: dto.startedAt ?? existing['startedAt'],
      endedAt: dto.endedAt ?? existing['endedAt'],
      actualDuration: dto.actualDuration ?? existing['actualDuration'],
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify(updated) },
    });

    this.logger.log(`Session ${sessionId} status updated to ${dto.status}`);
    return { id: sessionId, ...updated };
  }

  async completeSession(tenantId: string, sessionId: string) {
    const now = new Date().toISOString();
    return this.updateSessionStatus(tenantId, sessionId, {
      sessionId,
      status: SessionStatus.COMPLETED,
      endedAt: now,
    });
  }

  // ========================================================================
  // Virtual Waiting Room
  // ========================================================================

  async joinWaitingRoom(tenantId: string, dto: WaitingRoomDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const waitingRoom = (existing['waitingRoom'] as WaitingRoomEntry[] | undefined) ?? [];
    const position = waitingRoom.filter(
      (w: WaitingRoomEntry) => w.status === WaitingRoomStatus.WAITING,
    ).length + 1;

    const entry: WaitingRoomEntry = {
      patientId: dto.patientId,
      joinedAt: dto.joinedAt ?? new Date().toISOString(),
      status: WaitingRoomStatus.WAITING,
      appointmentType: (existing['type'] as string) ?? 'SYNCHRONOUS',
      waitMinutes: 0,
    };

    waitingRoom.push(entry);
    const updated = {
      ...existing,
      waitingRoom,
      sessionStatus: SessionStatus.WAITING_ROOM,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: dto.sessionId },
      data: { content: JSON.stringify(updated) },
    });

    this.logger.log(`Patient ${dto.patientId} joined waiting room for session ${dto.sessionId}, position ${position}`);
    return { ...entry, position, estimatedWaitMinutes: position * 15 };
  }

  async getWaitingRoomStatus(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const content = this.parseContent(doc as unknown as SessionRecord);
    return content['waitingRoom'] ?? [];
  }

  async admitPatient(tenantId: string, sessionId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const waitingRoom = (existing['waitingRoom'] as WaitingRoomEntry[] | undefined) ?? [];
    const entryIndex = waitingRoom.findIndex(
      (w: WaitingRoomEntry) => w.patientId === patientId && w.status === WaitingRoomStatus.WAITING,
    );

    if (entryIndex === -1) {
      throw new NotFoundException(`Patient ${patientId} not found in waiting room`);
    }

    waitingRoom[entryIndex].status = WaitingRoomStatus.ADMITTED;

    const updated = {
      ...existing,
      waitingRoom,
      sessionStatus: SessionStatus.IN_PROGRESS,
      startedAt: new Date().toISOString(),
    };

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify(updated) },
    });

    this.logger.log(`Patient ${patientId} admitted in session ${sessionId}`);
    return { sessionId, patientId, status: WaitingRoomStatus.ADMITTED };
  }

  async getWaitingRoomDashboard(tenantId: string) {
    const sessions = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const allWaiting: WaitingRoomEntry[] = [];
    const now = Date.now();

    for (const doc of sessions) {
      const content = this.parseContent(doc as unknown as SessionRecord);
      const waitingRoom = (content['waitingRoom'] as WaitingRoomEntry[] | undefined) ?? [];
      for (const entry of waitingRoom) {
        if (entry.status === WaitingRoomStatus.WAITING) {
          const joinedMs = new Date(entry.joinedAt).getTime();
          entry.waitMinutes = Math.round((now - joinedMs) / 60000);
          allWaiting.push(entry);
        }
      }
    }

    const averageWaitMinutes =
      allWaiting.length > 0
        ? Math.round(allWaiting.reduce((sum, w) => sum + w.waitMinutes, 0) / allWaiting.length)
        : 0;

    return {
      totalWaiting: allWaiting.length,
      averageWaitMinutes,
      patients: allWaiting.map((w) => ({
        patientId: w.patientId,
        waitMinutes: w.waitMinutes,
        appointmentType: w.appointmentType,
        status: w.status,
      })),
    };
  }

  // ========================================================================
  // Screen Sharing
  // ========================================================================

  async startScreenShare(tenantId: string, dto: ScreenShareDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const screenShares = (existing['screenShares'] as Record<string, unknown>[] | undefined) ?? [];
    const share = {
      id: crypto.randomUUID(),
      sharedBy: dto.sharedBy,
      contentType: dto.contentType,
      contentId: dto.contentId ?? null,
      startedAt: dto.startedAt ?? new Date().toISOString(),
      endedAt: null,
      active: true,
    };

    screenShares.push(share);
    await this.prisma.clinicalDocument.update({
      where: { id: dto.sessionId },
      data: { content: JSON.stringify({ ...existing, screenShares }) },
    });

    this.logger.log(`Screen share started in session ${dto.sessionId} by ${dto.sharedBy}`);
    return share;
  }

  async endScreenShare(tenantId: string, sessionId: string, shareId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const screenShares = (existing['screenShares'] as Array<Record<string, unknown>>) ?? [];
    const shareIndex = screenShares.findIndex((s) => s['id'] === shareId);

    if (shareIndex === -1) {
      throw new NotFoundException(`Screen share ${shareId} not found`);
    }

    screenShares[shareIndex]['endedAt'] = new Date().toISOString();
    screenShares[shareIndex]['active'] = false;

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify({ ...existing, screenShares }) },
    });

    return screenShares[shareIndex];
  }

  async getActiveShares(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const content = this.parseContent(doc as unknown as SessionRecord);
    const screenShares = (content['screenShares'] as Array<Record<string, unknown>>) ?? [];
    return screenShares.filter((s) => s['active'] === true);
  }

  // ========================================================================
  // In-session Chat
  // ========================================================================

  async sendChatMessage(tenantId: string, dto: SessionChatMessageDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const chatMessages = (existing['chatMessages'] as Record<string, unknown>[] | undefined) ?? [];
    const message = {
      id: crypto.randomUUID(),
      senderId: dto.senderId,
      senderRole: dto.senderRole,
      message: dto.message,
      timestamp: dto.timestamp ?? new Date().toISOString(),
      attachments: dto.attachments ?? [],
      isSystemMessage: dto.isSystemMessage ?? false,
    };

    chatMessages.push(message);
    await this.prisma.clinicalDocument.update({
      where: { id: dto.sessionId },
      data: { content: JSON.stringify({ ...existing, chatMessages }) },
    });

    this.logger.log(`Chat message sent in session ${dto.sessionId} by ${dto.senderId}`);
    return message;
  }

  async getSessionChat(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const content = this.parseContent(doc as unknown as SessionRecord);
    return (content['chatMessages'] as Record<string, unknown>[]) ?? [];
  }

  // ========================================================================
  // Recording with Consent
  // ========================================================================

  async recordConsent(tenantId: string, dto: RecordingConsentDto) {
    if (!dto.consentGiven) {
      this.logger.warn(`Patient ${dto.patientId} denied recording consent for session ${dto.sessionId}`);
    }

    const consentRecord = {
      id: crypto.randomUUID(),
      sessionId: dto.sessionId,
      patientId: dto.patientId,
      consentGiven: dto.consentGiven,
      consentMethod: dto.consentMethod,
      consentTimestamp: dto.consentTimestamp ?? new Date().toISOString(),
      witnessId: dto.witnessId ?? null,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.witnessId ?? dto.patientId,
        'RECORDING_CONSENT',
        `Consent ${dto.consentGiven ? 'Granted' : 'Denied'} - Session ${dto.sessionId}`,
        consentRecord,
      ),
    });

    this.logger.log(`Recording consent ${dto.consentGiven ? 'granted' : 'denied'} for session ${dto.sessionId}`);
    return { ...consentRecord, id: doc.id };
  }

  async startRecording(tenantId: string, dto: RecordingDto) {
    // Verify consent exists
    const consent = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { contains: `Consent Granted - Session ${dto.sessionId}` },
      },
    });

    if (!consent) {
      throw new BadRequestException(`No recording consent found for session ${dto.sessionId}. Consent is required before recording.`);
    }

    const sessionDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!sessionDoc) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const existing = this.parseContent(sessionDoc as unknown as SessionRecord);
    const recording = {
      id: crypto.randomUUID(),
      startedAt: dto.startedAt ?? new Date().toISOString(),
      endedAt: null,
      duration: null,
      storageKey: dto.storageKey ?? null,
      fileSize: null,
      retentionPolicy: dto.retentionPolicy ?? 'EXTENDED_20Y',
      consentId: consent.id,
      active: true,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: dto.sessionId },
      data: { content: JSON.stringify({ ...existing, recording }) },
    });

    this.logger.log(`Recording started for session ${dto.sessionId}`);
    return recording;
  }

  async stopRecording(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const recording = existing['recording'] as Record<string, unknown> | undefined;

    if (!recording || recording['active'] !== true) {
      throw new BadRequestException(`No active recording for session ${sessionId}`);
    }

    const startedAt = new Date(recording['startedAt'] as string);
    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

    recording['endedAt'] = endedAt.toISOString();
    recording['duration'] = durationSeconds;
    recording['active'] = false;
    recording['storageKey'] = `recordings/${tenantId}/${sessionId}/${recording['id'] as string}.webm`;

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify({ ...existing, recording }) },
    });

    this.logger.log(`Recording stopped for session ${sessionId}, duration: ${durationSeconds}s`);
    return recording;
  }

  async getRecording(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const content = this.parseContent(doc as unknown as SessionRecord);
    return content['recording'] ?? null;
  }

  // ========================================================================
  // Store-and-Forward (Asynchronous)
  // ========================================================================

  async createStoreForwardCase(tenantId: string, dto: StoreForwardCaseDto) {
    const caseData = {
      caseStatus: dto.status ?? StoreForwardStatus.SUBMITTED,
      targetSpecialty: dto.targetSpecialty,
      clinicalQuestion: dto.clinicalQuestion,
      attachments: dto.attachments ?? [],
      urgency: dto.urgency ?? 'ROUTINE',
      requestingProviderId: dto.requestingProviderId,
      submittedAt: new Date().toISOString(),
      responses: [],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.requestingProviderId,
        'STORE_FORWARD',
        `Store-Forward: ${dto.targetSpecialty} - ${dto.urgency ?? 'ROUTINE'}`,
        caseData,
      ),
    });

    this.logger.log(`Store-forward case created: ${doc.id} for specialty ${dto.targetSpecialty}`);
    return { id: doc.id, ...caseData };
  }

  async respondToCase(tenantId: string, caseId: string, dto: StoreForwardResponseDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: caseId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:STORE_FORWARD]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Store-forward case ${caseId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const responses = (existing['responses'] as Record<string, unknown>[]) ?? [];
    const responseEntry = {
      id: crypto.randomUUID(),
      respondingProviderId: dto.respondingProviderId,
      response: dto.response,
      recommendations: dto.recommendations ?? null,
      followUpNeeded: dto.followUpNeeded,
      respondedAt: dto.respondedAt ?? new Date().toISOString(),
    };

    responses.push(responseEntry);
    const updated = {
      ...existing,
      responses,
      caseStatus: StoreForwardStatus.ANSWERED,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: caseId },
      data: { content: JSON.stringify(updated) },
    });

    this.logger.log(`Store-forward case ${caseId} answered by ${dto.respondingProviderId}`);
    return { ...responseEntry, caseId };
  }

  async getOpenCases(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[TELEMEDICINE:STORE_FORWARD]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs
      .map((doc) => {
        const content = this.parseContent(doc as unknown as SessionRecord);
        return Object.assign(content, { id: doc.id });
      })
      .filter(
        (c) =>
          c['caseStatus'] === StoreForwardStatus.SUBMITTED ||
          c['caseStatus'] === StoreForwardStatus.IN_REVIEW,
      );
  }

  // ========================================================================
  // Remote Patient Monitoring (RPM)
  // ========================================================================

  async enrollRPM(tenantId: string, dto: RPMEnrollmentDto) {
    const enrollmentData = {
      condition: dto.condition,
      devices: dto.devices,
      monitoringPlan: dto.monitoringPlan,
      providerId: dto.providerId,
      enrolledAt: new Date().toISOString(),
      active: true,
      readings: [],
      alerts: [],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.providerId,
        'RPM_ENROLLMENT',
        `RPM: ${dto.condition}`,
        enrollmentData,
      ),
    });

    this.logger.log(`RPM enrollment created: ${doc.id} for condition ${dto.condition}`);
    return { id: doc.id, ...enrollmentData };
  }

  async recordRPMReading(tenantId: string, dto: RPMReadingDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.enrollmentId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:RPM_ENROLLMENT]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`RPM enrollment ${dto.enrollmentId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const readings = (existing['readings'] as RPMReadingEntry[]) ?? [];
    const reading: RPMReadingEntry = {
      deviceType: dto.deviceType,
      values: dto.values,
      readingTimestamp: dto.readingTimestamp,
      source: dto.source,
    };
    readings.push(reading);

    // Check alert thresholds
    const newAlerts: RPMAlertEntry[] = [];
    const monitoringPlan = existing['monitoringPlan'] as
      | { alertThresholds?: Array<{ metric: string; min: number; max: number; severity: string }> }
      | undefined;

    if (monitoringPlan?.alertThresholds) {
      for (const threshold of monitoringPlan.alertThresholds) {
        const value = dto.values[threshold.metric];
        if (value !== undefined && (value < threshold.min || value > threshold.max)) {
          const alert: RPMAlertEntry = {
            enrollmentId: dto.enrollmentId,
            metric: threshold.metric,
            value,
            threshold: value < threshold.min ? threshold.min : threshold.max,
            severity: threshold.severity,
            acknowledged: false,
            createdAt: new Date().toISOString(),
          };
          newAlerts.push(alert);
          this.logger.warn(
            `RPM Alert [${threshold.severity}]: ${threshold.metric}=${value} out of range [${threshold.min}-${threshold.max}] for enrollment ${dto.enrollmentId}`,
          );
        }
      }
    }

    const alerts = [...((existing['alerts'] as RPMAlertEntry[]) ?? []), ...newAlerts];

    await this.prisma.clinicalDocument.update({
      where: { id: dto.enrollmentId },
      data: { content: JSON.stringify({ ...existing, readings, alerts }) },
    });

    return { reading, alerts: newAlerts };
  }

  async checkRPMAlerts(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[TELEMEDICINE:RPM_ENROLLMENT]' },
      },
    });

    const unacknowledgedAlerts: RPMAlertEntry[] = [];
    for (const doc of docs) {
      const content = this.parseContent(doc as unknown as SessionRecord);
      const alerts = (content['alerts'] as RPMAlertEntry[]) ?? [];
      unacknowledgedAlerts.push(...alerts.filter((a) => !a.acknowledged));
    }

    return unacknowledgedAlerts.sort((a, b) => {
      const severityOrder: Record<string, number> = {
        [RPMAlertSeverity.CRITICAL]: 0,
        [RPMAlertSeverity.WARNING]: 1,
        [RPMAlertSeverity.INFO]: 2,
      };
      return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    });
  }

  async getRPMDashboard(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[TELEMEDICINE:RPM_ENROLLMENT]' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (docs.length === 0) {
      throw new NotFoundException(`No RPM enrollments found for patient ${patientId}`);
    }

    const enrollments = docs.map((doc) => {
      const content = this.parseContent(doc as unknown as SessionRecord);
      const readings = (content['readings'] as RPMReadingEntry[]) ?? [];
      const alerts = (content['alerts'] as RPMAlertEntry[]) ?? [];

      // Build trends: last 10 readings per metric
      const metricTrends: Record<string, Array<{ value: number; timestamp: string }>> = {};
      for (const reading of readings) {
        for (const [metric, value] of Object.entries(reading.values)) {
          if (!metricTrends[metric]) {
            metricTrends[metric] = [];
          }
          metricTrends[metric].push({
            value,
            timestamp: reading.readingTimestamp,
          });
        }
      }

      // Keep last 10 entries per metric
      for (const metric of Object.keys(metricTrends)) {
        metricTrends[metric] = metricTrends[metric].slice(-10);
      }

      return {
        enrollmentId: doc.id,
        condition: content['condition'],
        devices: content['devices'],
        enrolledAt: content['enrolledAt'],
        active: content['active'],
        totalReadings: readings.length,
        lastReading: readings.length > 0 ? readings[readings.length - 1] : null,
        unacknowledgedAlerts: alerts.filter((a) => !a.acknowledged).length,
        criticalAlerts: alerts.filter(
          (a) => a.severity === RPMAlertSeverity.CRITICAL && !a.acknowledged,
        ).length,
        metricTrends,
      };
    });

    return {
      patientId,
      enrollments,
      totalEnrollments: enrollments.length,
      totalUnacknowledgedAlerts: enrollments.reduce((sum, e) => sum + e.unacknowledgedAlerts, 0),
    };
  }

  // ========================================================================
  // Teleconsultoria (Provider-to-Provider)
  // ========================================================================

  async createTeleconsultoria(tenantId: string, dto: TeleconsultoriaDto) {
    const consultoriaData = {
      requestingProviderId: dto.requestingProviderId,
      requestingSpecialty: dto.requestingSpecialty,
      consultantSpecialty: dto.consultantSpecialty,
      clinicalQuestion: dto.clinicalQuestion,
      urgency: dto.urgency ?? 'ROUTINE',
      preferredMethod: dto.preferredMethod ?? 'ASYNC',
      attachments: dto.attachments ?? [],
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      responses: [],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.requestingProviderId,
        'TELECONSULTORIA',
        `Teleconsultoria: ${dto.requestingSpecialty} -> ${dto.consultantSpecialty}`,
        consultoriaData,
      ),
    });

    this.logger.log(`Teleconsultoria created: ${doc.id}`);
    return { id: doc.id, ...consultoriaData };
  }

  async respondTeleconsultoria(tenantId: string, requestId: string, dto: TeleconsultoriaResponseDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: requestId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:TELECONSULTORIA]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Teleconsultoria ${requestId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const responses = (existing['responses'] as Record<string, unknown>[]) ?? [];
    const responseEntry = {
      id: crypto.randomUUID(),
      consultantId: dto.consultantId,
      response: dto.response,
      recommendations: dto.recommendations ?? null,
      referralNeeded: dto.referralNeeded,
      respondedAt: new Date().toISOString(),
    };

    responses.push(responseEntry);
    const updated = {
      ...existing,
      responses,
      status: 'ANSWERED',
    };

    await this.prisma.clinicalDocument.update({
      where: { id: requestId },
      data: { content: JSON.stringify(updated) },
    });

    this.logger.log(`Teleconsultoria ${requestId} answered by ${dto.consultantId}`);
    return { ...responseEntry, requestId };
  }

  // ========================================================================
  // Multi-participant Session
  // ========================================================================

  async addParticipant(tenantId: string, dto: AddParticipantDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: dto.sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const participants = (existing['participants'] as Array<Record<string, unknown>>) ?? [];

    const alreadyExists = participants.some(
      (p) => p['id'] === dto.participantId,
    );
    if (alreadyExists) {
      throw new BadRequestException(`Participant ${dto.participantId} already in session`);
    }

    const participant = {
      id: dto.participantId,
      role: dto.role,
      joinedAt: dto.joinedAt ?? new Date().toISOString(),
      active: true,
    };

    participants.push(participant);
    await this.prisma.clinicalDocument.update({
      where: { id: dto.sessionId },
      data: { content: JSON.stringify({ ...existing, participants }) },
    });

    this.logger.log(`Participant ${dto.participantId} (${dto.role}) added to session ${dto.sessionId}`);
    return participant;
  }

  async removeParticipant(tenantId: string, sessionId: string, participantId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const existing = this.parseContent(doc as unknown as SessionRecord);
    const participants = (existing['participants'] as Array<Record<string, unknown>>) ?? [];
    const index = participants.findIndex((p) => p['id'] === participantId);

    if (index === -1) {
      throw new NotFoundException(`Participant ${participantId} not found in session`);
    }

    participants[index]['active'] = false;
    participants[index]['leftAt'] = new Date().toISOString();

    await this.prisma.clinicalDocument.update({
      where: { id: sessionId },
      data: { content: JSON.stringify({ ...existing, participants }) },
    });

    this.logger.log(`Participant ${participantId} removed from session ${sessionId}`);
    return { sessionId, participantId, removed: true };
  }

  async getSessionParticipants(tenantId: string, sessionId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        title: { startsWith: '[TELEMEDICINE:SESSION]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const content = this.parseContent(doc as unknown as SessionRecord);
    return (content['participants'] as Array<Record<string, unknown>>) ?? [];
  }
}
