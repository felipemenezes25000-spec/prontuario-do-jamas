import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ScreenShareDto,
  StartScreenShareDto,
  StopScreenShareDto,
  TextChatDto,
  SendChatMessageDto,
  WaitingRoomDto,
  WaitingRoomAdmitStatus,
  JoinWaitingRoomDto,
  AdmitFromWaitingRoomDto,
  RecordingDto,
  RecordingAccessEntry,
  StartRecordingDto,
  LogRecordingAccessDto,
  StoreForwardDto,
  CreateStoreForwardDto,
  RespondStoreForwardDto,
  RemoteMonitoringDto,
  RPMReadingDto,
  RPMAlertDto,
  RPMAlertSeverity,
  EnrollRPMDto,
  SubmitRPMReadingDto,
  TeleconsultancyDto,
  CreateTeleconsultancyDto,
  RespondTeleconsultancyDto,
  MultiParticipantDto,
  AddParticipantDto,
  RemoveParticipantDto,
  ParticipantDto,
} from './dto/telemedicine-advanced.dto';

// ── Internal store types ─────────────────────────────────────────────────────

export interface StoredScreenShare extends ScreenShareDto {
  id: string;
  tenantId: string;
}

export interface StoredChatMessage extends TextChatDto {
  id: string;
  tenantId: string;
}

export interface StoredWaitingRoom extends WaitingRoomDto {
  tenantId: string;
}

export interface StoredRecording extends RecordingDto {
  tenantId: string;
  startedAt: string | null;
  stoppedAt: string | null;
}

export interface StoredStoreForward extends StoreForwardDto {
  id: string;
  tenantId: string;
  createdAt: string;
  respondedAt: string | null;
}

export interface StoredRPMEnrollment extends RemoteMonitoringDto {
  tenantId: string;
  enrolledAt: string;
}

export interface StoredTeleconsultancy extends TeleconsultancyDto {
  id: string;
  tenantId: string;
  createdAt: string;
  respondedAt: string | null;
}

export interface StoredParticipants extends MultiParticipantDto {
  tenantId: string;
}

@Injectable()
export class TelemedicineAdvancedService {
  private readonly logger = new Logger(TelemedicineAdvancedService.name);

  private screenShares: StoredScreenShare[] = [];
  private chatMessages: StoredChatMessage[] = [];
  private waitingRooms: StoredWaitingRoom[] = [];
  private recordings: StoredRecording[] = [];
  private storeForwardCases: StoredStoreForward[] = [];
  private rpmEnrollments: StoredRPMEnrollment[] = [];
  private teleconsultancies: StoredTeleconsultancy[] = [];
  private sessionParticipants: StoredParticipants[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Screen Sharing
  // ═══════════════════════════════════════════════════════════════════════════

  async startScreenShare(tenantId: string, dto: StartScreenShareDto): Promise<StoredScreenShare> {
    const active = this.screenShares.find(
      (s) => s.tenantId === tenantId && s.sessionId === dto.sessionId && s.endedAt === null,
    );
    if (active) {
      throw new BadRequestException(`Screen share already active in session "${dto.sessionId}"`);
    }

    const share: StoredScreenShare = {
      id: crypto.randomUUID(),
      tenantId,
      sessionId: dto.sessionId,
      sharedBy: dto.sharedBy,
      contentType: dto.contentType,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };

    this.screenShares.push(share);
    this.logger.log(`[Tenant ${tenantId}] Screen share started — session ${dto.sessionId}`);
    return share;
  }

  async stopScreenShare(tenantId: string, dto: StopScreenShareDto): Promise<StoredScreenShare> {
    const share = this.screenShares.find(
      (s) =>
        s.tenantId === tenantId &&
        s.sessionId === dto.sessionId &&
        s.sharedBy === dto.sharedBy &&
        s.endedAt === null,
    );
    if (!share) {
      throw new NotFoundException(`Active screen share not found for session "${dto.sessionId}"`);
    }

    share.endedAt = new Date().toISOString();
    return share;
  }

  async getScreenShares(tenantId: string, sessionId: string): Promise<StoredScreenShare[]> {
    return this.screenShares.filter(
      (s) => s.tenantId === tenantId && s.sessionId === sessionId,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Text Chat during Video Call
  // ═══════════════════════════════════════════════════════════════════════════

  async sendChatMessage(tenantId: string, dto: SendChatMessageDto): Promise<StoredChatMessage> {
    const message: StoredChatMessage = {
      id: crypto.randomUUID(),
      tenantId,
      sessionId: dto.sessionId,
      senderId: dto.senderId,
      message: dto.message,
      attachments: dto.attachments ?? [],
      timestamp: new Date().toISOString(),
    };

    this.chatMessages.push(message);
    return message;
  }

  async getChatMessages(tenantId: string, sessionId: string): Promise<StoredChatMessage[]> {
    return this.chatMessages
      .filter((m) => m.tenantId === tenantId && m.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Virtual Waiting Room
  // ═══════════════════════════════════════════════════════════════════════════

  async joinWaitingRoom(tenantId: string, dto: JoinWaitingRoomDto): Promise<StoredWaitingRoom> {
    const existing = this.waitingRooms.find(
      (w) =>
        w.tenantId === tenantId &&
        w.sessionId === dto.sessionId &&
        w.patientId === dto.patientId &&
        w.status === WaitingRoomAdmitStatus.WAITING,
    );
    if (existing) return existing;

    const position =
      this.waitingRooms.filter(
        (w) =>
          w.tenantId === tenantId &&
          w.sessionId === dto.sessionId &&
          w.status === WaitingRoomAdmitStatus.WAITING,
      ).length + 1;

    const entry: StoredWaitingRoom = {
      tenantId,
      sessionId: dto.sessionId,
      patientId: dto.patientId,
      joinedAt: new Date().toISOString(),
      position,
      admittedAt: null,
      admittedBy: null,
      status: WaitingRoomAdmitStatus.WAITING,
    };

    this.waitingRooms.push(entry);
    return entry;
  }

  async admitFromWaitingRoom(tenantId: string, dto: AdmitFromWaitingRoomDto): Promise<StoredWaitingRoom> {
    const entry = this.waitingRooms.find(
      (w) =>
        w.tenantId === tenantId &&
        w.sessionId === dto.sessionId &&
        w.patientId === dto.patientId &&
        w.status === WaitingRoomAdmitStatus.WAITING,
    );
    if (!entry) {
      throw new NotFoundException(`Patient "${dto.patientId}" not in waiting room for session "${dto.sessionId}"`);
    }

    entry.status = WaitingRoomAdmitStatus.ADMITTED;
    entry.admittedAt = new Date().toISOString();
    entry.admittedBy = dto.admittedBy;

    this.logger.log(`[Tenant ${tenantId}] Patient ${dto.patientId} admitted by ${dto.admittedBy}`);
    return entry;
  }

  async getWaitingRoom(tenantId: string, sessionId: string): Promise<StoredWaitingRoom[]> {
    return this.waitingRooms
      .filter((w) => w.tenantId === tenantId && w.sessionId === sessionId)
      .sort((a, b) => a.position - b.position);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Recording (CFM compliant — consent required)
  // ═══════════════════════════════════════════════════════════════════════════

  async startRecording(tenantId: string, dto: StartRecordingDto): Promise<StoredRecording> {
    if (!dto.consentGiven) {
      throw new BadRequestException('Recording requires explicit patient consent (CFM regulation)');
    }

    const existing = this.recordings.find(
      (r) => r.tenantId === tenantId && r.sessionId === dto.sessionId && r.stoppedAt === null,
    );
    if (existing) {
      throw new BadRequestException(`Recording already in progress for session "${dto.sessionId}"`);
    }

    const recording: StoredRecording = {
      tenantId,
      sessionId: dto.sessionId,
      consentGiven: dto.consentGiven,
      recordingUrl: null,
      duration: 0,
      accessLog: [],
      startedAt: new Date().toISOString(),
      stoppedAt: null,
    };

    this.recordings.push(recording);
    this.logger.log(`[Tenant ${tenantId}] Recording started for session ${dto.sessionId}`);
    return recording;
  }

  async stopRecording(tenantId: string, sessionId: string): Promise<StoredRecording> {
    const recording = this.recordings.find(
      (r) => r.tenantId === tenantId && r.sessionId === sessionId && r.stoppedAt === null,
    );
    if (!recording) {
      throw new NotFoundException(`Active recording not found for session "${sessionId}"`);
    }

    recording.stoppedAt = new Date().toISOString();
    recording.duration = Math.floor(
      (new Date(recording.stoppedAt).getTime() - new Date(recording.startedAt!).getTime()) / 1000,
    );
    // Production: trigger S3 upload, set recording.recordingUrl
    recording.recordingUrl = `https://s3.example.com/recordings/${sessionId}.mp4`;
    return recording;
  }

  async logRecordingAccess(tenantId: string, dto: LogRecordingAccessDto): Promise<StoredRecording> {
    const recording = this.recordings.find(
      (r) => r.tenantId === tenantId && r.sessionId === dto.sessionId,
    );
    if (!recording) {
      throw new NotFoundException(`Recording for session "${dto.sessionId}" not found`);
    }

    const entry: RecordingAccessEntry = {
      accessedBy: dto.accessedBy,
      accessedAt: new Date().toISOString(),
      reason: dto.reason,
    };
    recording.accessLog.push(entry);
    return recording;
  }

  async getRecording(tenantId: string, sessionId: string): Promise<StoredRecording> {
    const recording = this.recordings.find(
      (r) => r.tenantId === tenantId && r.sessionId === sessionId,
    );
    if (!recording) throw new NotFoundException(`Recording for session "${sessionId}" not found`);
    return recording;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Store-and-Forward (Async Teleconsultation)
  // ═══════════════════════════════════════════════════════════════════════════

  async createStoreForwardCase(tenantId: string, dto: CreateStoreForwardDto): Promise<StoredStoreForward> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const caseRecord: StoredStoreForward = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      specialty: dto.specialty,
      images: dto.images,
      description: dto.description,
      doctorResponse: null,
      responseTime: null,
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };

    this.storeForwardCases.push(caseRecord);
    this.logger.log(`[Tenant ${tenantId}] Store-and-forward case created for ${dto.specialty}`);
    return caseRecord;
  }

  async respondToStoreForward(tenantId: string, dto: RespondStoreForwardDto): Promise<StoredStoreForward> {
    const caseRecord = this.storeForwardCases.find(
      (c) => c.tenantId === tenantId && c.id === dto.caseId,
    );
    if (!caseRecord) throw new NotFoundException(`Case "${dto.caseId}" not found`);

    const now = new Date();
    caseRecord.doctorResponse = dto.doctorResponse;
    caseRecord.respondedAt = now.toISOString();
    caseRecord.responseTime =
      (now.getTime() - new Date(caseRecord.createdAt).getTime()) / (1000 * 60 * 60);

    return caseRecord;
  }

  async listStoreForwardCases(tenantId: string, specialty?: string): Promise<StoredStoreForward[]> {
    return this.storeForwardCases.filter(
      (c) => c.tenantId === tenantId && (!specialty || c.specialty === specialty),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Remote Patient Monitoring (RPM)
  // ═══════════════════════════════════════════════════════════════════════════

  async enrollRPM(tenantId: string, dto: EnrollRPMDto): Promise<StoredRPMEnrollment> {
    const existing = this.rpmEnrollments.find(
      (e) => e.tenantId === tenantId && e.patientId === dto.patientId,
    );
    if (existing) {
      // Update devices / thresholds
      existing.devices = dto.devices;
      existing.alertThresholds = dto.alertThresholds;
      return existing;
    }

    const enrollment: StoredRPMEnrollment = {
      tenantId,
      patientId: dto.patientId,
      devices: dto.devices,
      readings: [],
      alertThresholds: dto.alertThresholds,
      alerts: [],
      enrolledAt: new Date().toISOString(),
    };

    this.rpmEnrollments.push(enrollment);
    return enrollment;
  }

  async submitRPMReading(tenantId: string, dto: SubmitRPMReadingDto): Promise<{ reading: RPMReadingDto; alerts: RPMAlertDto[] }> {
    const enrollment = this.rpmEnrollments.find(
      (e) => e.tenantId === tenantId && e.patientId === dto.patientId,
    );
    if (!enrollment) {
      throw new NotFoundException(`Patient "${dto.patientId}" is not enrolled in RPM`);
    }

    const reading: RPMReadingDto = {
      device: dto.device,
      value: dto.value,
      recordedAt: new Date().toISOString(),
    };
    enrollment.readings.push(reading);

    const threshold = enrollment.alertThresholds.find((t) => t.device === dto.device);
    const newAlerts: RPMAlertDto[] = [];

    if (threshold) {
      if (dto.value < threshold.min || dto.value > threshold.max) {
        const severity: RPMAlertSeverity =
          dto.value < threshold.min * 0.8 || dto.value > threshold.max * 1.2
            ? RPMAlertSeverity.CRITICAL
            : RPMAlertSeverity.WARNING;

        const alert: RPMAlertDto = {
          device: dto.device,
          value: dto.value,
          severity,
          message: `${dto.device} fora do intervalo normal: ${dto.value} (normal: ${threshold.min}–${threshold.max})`,
          triggeredAt: reading.recordedAt,
        };

        enrollment.alerts.push(alert);
        newAlerts.push(alert);
        this.logger.warn(`[Tenant ${tenantId}] RPM alert [${severity}] for patient ${dto.patientId}: ${alert.message}`);
      }
    }

    return { reading, alerts: newAlerts };
  }

  async getRPMEnrollment(tenantId: string, patientId: string): Promise<StoredRPMEnrollment> {
    const enrollment = this.rpmEnrollments.find(
      (e) => e.tenantId === tenantId && e.patientId === patientId,
    );
    if (!enrollment) throw new NotFoundException(`RPM enrollment for patient "${patientId}" not found`);
    return enrollment;
  }

  async listRPMAlerts(tenantId: string, patientId?: string): Promise<(RPMAlertDto & { patientId: string })[]> {
    const enrollments = this.rpmEnrollments.filter(
      (e) => e.tenantId === tenantId && (!patientId || e.patientId === patientId),
    );
    return enrollments.flatMap((e) =>
      e.alerts.map((a) => ({ ...a, patientId: e.patientId })),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Doctor-to-Doctor Teleconsultancy
  // ═══════════════════════════════════════════════════════════════════════════

  async createTeleconsultancy(tenantId: string, dto: CreateTeleconsultancyDto): Promise<StoredTeleconsultancy> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const record: StoredTeleconsultancy = {
      id: crypto.randomUUID(),
      tenantId,
      requestingDoctor: dto.requestingDoctor,
      specialist: dto.specialist,
      specialty: dto.specialty,
      patientId: dto.patientId,
      question: dto.question,
      response: null,
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };

    this.teleconsultancies.push(record);
    this.logger.log(`[Tenant ${tenantId}] Teleconsultancy created → specialist ${dto.specialist}`);
    return record;
  }

  async respondTeleconsultancy(tenantId: string, dto: RespondTeleconsultancyDto): Promise<StoredTeleconsultancy> {
    const record = this.teleconsultancies.find(
      (t) => t.tenantId === tenantId && t.id === dto.consultancyId,
    );
    if (!record) throw new NotFoundException(`Teleconsultancy "${dto.consultancyId}" not found`);

    record.response = dto.response;
    record.respondedAt = new Date().toISOString();
    return record;
  }

  async listTeleconsultancies(tenantId: string, specialty?: string): Promise<StoredTeleconsultancy[]> {
    return this.teleconsultancies.filter(
      (t) => t.tenantId === tenantId && (!specialty || t.specialty === specialty),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Multi-Participant Calls
  // ═══════════════════════════════════════════════════════════════════════════

  async addParticipant(tenantId: string, dto: AddParticipantDto): Promise<StoredParticipants> {
    let session = this.sessionParticipants.find(
      (s) => s.tenantId === tenantId && s.sessionId === dto.sessionId,
    );

    if (!session) {
      session = { tenantId, sessionId: dto.sessionId, participants: [] };
      this.sessionParticipants.push(session);
    }

    const duplicate = session.participants.find(
      (p) => p.name === dto.name && p.role === dto.role,
    );
    if (duplicate) {
      throw new BadRequestException(`Participant "${dto.name}" (${dto.role}) already in session`);
    }

    const participant: ParticipantDto = {
      role: dto.role,
      name: dto.name,
      joinedAt: new Date().toISOString(),
    };

    session.participants.push(participant);
    return session;
  }

  async removeParticipant(tenantId: string, dto: RemoveParticipantDto): Promise<StoredParticipants> {
    const session = this.sessionParticipants.find(
      (s) => s.tenantId === tenantId && s.sessionId === dto.sessionId,
    );
    if (!session) throw new NotFoundException(`Session "${dto.sessionId}" not found`);

    const idx = session.participants.findIndex((p) => p.name === dto.name);
    if (idx === -1) throw new NotFoundException(`Participant "${dto.name}" not found in session`);

    session.participants.splice(idx, 1);
    return session;
  }

  async getSessionParticipants(tenantId: string, sessionId: string): Promise<StoredParticipants> {
    const session = this.sessionParticipants.find(
      (s) => s.tenantId === tenantId && s.sessionId === sessionId,
    );
    if (!session) return { tenantId, sessionId, participants: [] };
    return session;
  }
}
