import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface WaitingRoomEntry {
  id: string;
  encounterId: string;
  patientId: string;
  tenantId: string;
  patientName: string;
  roomName: string;
  position: number;
  status: 'WAITING' | 'ADMITTED' | 'LEFT';
  joinedAt: string;
  admittedAt?: string;
}

interface TeleconsultationRecording {
  id: string;
  encounterId: string;
  tenantId: string;
  roomName: string;
  recordingUrl?: string;
  consentDocId: string;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
}

interface AsyncConsultation {
  id: string;
  patientId: string;
  tenantId: string;
  specialty: string;
  description: string;
  photos: string[];
  doctorId?: string;
  response?: {
    by: string;
    at: string;
    diagnosis: string;
    recommendation: string;
    needsInPerson: boolean;
  };
  status: 'PENDING' | 'ASSIGNED' | 'RESPONDED' | 'CLOSED';
  createdAt: string;
}

interface RpmAlert {
  id: string;
  patientId: string;
  tenantId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  acknowledged: boolean;
  createdAt: string;
}

interface RpmConfig {
  patientId: string;
  tenantId: string;
  metrics: Array<{
    metric: string;
    enabled: boolean;
    lowerThreshold?: number;
    upperThreshold?: number;
    frequency: string;
  }>;
  devices: Array<{ type: string; deviceId: string; brand: string }>;
  createdAt: string;
}

@Injectable()
export class TelemedicineEnhancedService {
  private readonly logger = new Logger(TelemedicineEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Virtual Waiting Room
  // =========================================================================

  async joinWaitingRoom(
    tenantId: string,
    userEmail: string,
    dto: { encounterId: string; roomName: string },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new ForbiddenException('Paciente não encontrado.');

    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    // Count current queue
    const queueCount = await this.prisma.clinicalDocument.count({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: `[WAITING_ROOM:${dto.roomName}]` },
        status: 'DRAFT',
      },
    });

    const entry: WaitingRoomEntry = {
      id: crypto.randomUUID(),
      encounterId: dto.encounterId,
      patientId: patient.id,
      tenantId,
      patientName: patient.fullName,
      roomName: dto.roomName,
      position: queueCount + 1,
      status: 'WAITING',
      joinedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: patient.id,
        authorId: userId,
        type: 'CUSTOM',
        title: `[WAITING_ROOM:${dto.roomName}] ${patient.fullName}`,
        content: JSON.stringify(entry),
        status: 'DRAFT',
      },
    });

    return { waitingId: doc.id, position: entry.position, roomName: dto.roomName };
  }

  async getWaitingRoom(tenantId: string, roomName: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: `[WAITING_ROOM:${roomName}]` },
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((d, index) => {
      const entry = JSON.parse(d.content ?? '{}') as WaitingRoomEntry;
      return {
        waitingId: d.id,
        patientName: entry.patientName,
        position: index + 1,
        waitTime: Math.round((Date.now() - new Date(entry.joinedAt).getTime()) / 60000),
        joinedAt: entry.joinedAt,
      };
    });
  }

  async admitPatient(tenantId: string, waitingId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: waitingId, tenantId, type: 'CUSTOM', title: { startsWith: '[WAITING_ROOM:' } },
    });
    if (!doc) throw new NotFoundException('Paciente não encontrado na sala de espera.');

    const entry = JSON.parse(doc.content ?? '{}') as WaitingRoomEntry;
    entry.status = 'ADMITTED';
    entry.admittedAt = new Date().toISOString();

    await this.prisma.clinicalDocument.update({
      where: { id: waitingId },
      data: { content: JSON.stringify(entry), status: 'SIGNED' },
    });

    return { waitingId, status: 'ADMITTED', patientName: entry.patientName };
  }

  // =========================================================================
  // Teleconsultation Recording
  // =========================================================================

  async startRecording(
    tenantId: string,
    userEmail: string,
    dto: { encounterId: string; roomName: string; consentDocId: string },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const recording: TeleconsultationRecording = {
      id: crypto.randomUUID(),
      encounterId: dto.encounterId,
      tenantId,
      roomName: dto.roomName,
      consentDocId: dto.consentDocId,
      startedAt: new Date().toISOString(),
    };

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      select: { patientId: true },
    });

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: encounter?.patientId ?? userId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[TELECONSULT_RECORDING] ${dto.roomName}`,
        content: JSON.stringify(recording),
        status: 'DRAFT',
        encounterId: dto.encounterId,
      },
    });

    return { recordingId: doc.id, status: 'RECORDING' };
  }

  async stopRecording(tenantId: string, recordingId: string, recordingUrl?: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: recordingId, tenantId, type: 'CUSTOM', title: { startsWith: '[TELECONSULT_RECORDING]' } },
    });
    if (!doc) throw new NotFoundException('Gravação não encontrada.');

    const recording = JSON.parse(doc.content ?? '{}') as TeleconsultationRecording;
    recording.stoppedAt = new Date().toISOString();
    recording.recordingUrl = recordingUrl;
    recording.duration = Math.round(
      (new Date(recording.stoppedAt).getTime() - new Date(recording.startedAt).getTime()) / 1000,
    );

    await this.prisma.clinicalDocument.update({
      where: { id: recordingId },
      data: { content: JSON.stringify(recording), status: 'SIGNED' },
    });

    return { recordingId, duration: recording.duration, status: 'COMPLETED' };
  }

  // =========================================================================
  // Asynchronous Teleconsultation (Store-and-Forward)
  // =========================================================================

  async createAsyncConsultation(
    tenantId: string,
    userEmail: string,
    dto: { specialty: string; description: string; photos?: string[] },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) throw new ForbiddenException('Paciente não encontrado.');

    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const consultation: AsyncConsultation = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      tenantId,
      specialty: dto.specialty,
      description: dto.description,
      photos: dto.photos ?? [],
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: patient.id,
        authorId: userId,
        type: 'CUSTOM',
        title: `[ASYNC_CONSULT:${dto.specialty}] ${new Date().toLocaleDateString('pt-BR')}`,
        content: JSON.stringify(consultation),
        status: 'DRAFT',
      },
    });

    return { consultationId: doc.id, status: 'PENDING' };
  }

  async respondToAsyncConsultation(
    tenantId: string,
    userEmail: string,
    consultationId: string,
    dto: { diagnosis: string; recommendation: string; needsInPerson: boolean },
  ) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: consultationId, tenantId, type: 'CUSTOM', title: { startsWith: '[ASYNC_CONSULT:' } },
    });
    if (!doc) throw new NotFoundException('Teleconsulta assíncrona não encontrada.');

    const consultation = JSON.parse(doc.content ?? '{}') as AsyncConsultation;
    consultation.response = {
      by: userEmail,
      at: new Date().toISOString(),
      ...dto,
    };
    consultation.status = 'RESPONDED';

    await this.prisma.clinicalDocument.update({
      where: { id: consultationId },
      data: { content: JSON.stringify(consultation), status: 'SIGNED' },
    });

    return { consultationId, status: 'RESPONDED' };
  }

  async listAsyncConsultations(
    tenantId: string,
    options: { status?: string; specialty?: string; page?: number; pageSize?: number },
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const titleFilter = options.specialty
      ? { startsWith: `[ASYNC_CONSULT:${options.specialty}]` }
      : { startsWith: '[ASYNC_CONSULT:' };

    const statusFilter = options.status === 'PENDING' ? 'DRAFT' : options.status === 'RESPONDED' ? 'SIGNED' : undefined;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: titleFilter,
    };
    if (statusFilter) where.status = statusFilter;

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const c = JSON.parse(d.content ?? '{}') as AsyncConsultation;
      return {
        consultationId: d.id,
        specialty: c.specialty,
        description: c.description.substring(0, 200),
        patientName: d.patient?.fullName,
        status: c.status,
        hasResponse: !!c.response,
        createdAt: c.createdAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // =========================================================================
  // Remote Patient Monitoring (RPM)
  // =========================================================================

  async configureRpm(
    tenantId: string,
    patientId: string,
    dto: {
      metrics: Array<{
        metric: string;
        enabled: boolean;
        lowerThreshold?: number;
        upperThreshold?: number;
        frequency: string;
      }>;
      devices?: Array<{ type: string; deviceId: string; brand: string }>;
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId, isActive: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'DOCTOR' },
      select: { id: true },
    });

    const config: RpmConfig = {
      patientId,
      tenantId,
      metrics: dto.metrics,
      devices: dto.devices ?? [],
      createdAt: new Date().toISOString(),
    };

    const existingDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: '[RPM:CONFIG]',
        status: 'SIGNED',
      },
    });

    if (existingDoc) {
      await this.prisma.clinicalDocument.update({
        where: { id: existingDoc.id },
        data: { content: JSON.stringify(config) },
      });
      return { configId: existingDoc.id, status: 'UPDATED' };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: firstUser?.id ?? patientId,
        type: 'CUSTOM',
        title: '[RPM:CONFIG]',
        content: JSON.stringify(config),
        status: 'SIGNED',
      },
    });

    return { configId: doc.id, status: 'CREATED' };
  }

  async submitRpmReading(
    tenantId: string,
    userEmail: string,
    dto: { metric: string; value: number; deviceId?: string },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) throw new ForbiddenException('Paciente não encontrado.');

    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    // Check thresholds
    const configDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId: patient.id,
        type: 'CUSTOM',
        title: '[RPM:CONFIG]',
        status: 'SIGNED',
      },
    });

    let alert: RpmAlert | null = null;

    if (configDoc) {
      const config = JSON.parse(configDoc.content ?? '{}') as RpmConfig;
      const metricConfig = config.metrics.find((m) => m.metric === dto.metric && m.enabled);

      if (metricConfig) {
        const isAbove = metricConfig.upperThreshold !== undefined && dto.value > metricConfig.upperThreshold;
        const isBelow = metricConfig.lowerThreshold !== undefined && dto.value < metricConfig.lowerThreshold;

        if (isAbove || isBelow) {
          const threshold = isAbove ? metricConfig.upperThreshold! : metricConfig.lowerThreshold!;
          const deviation = Math.abs(dto.value - threshold) / threshold;

          alert = {
            id: crypto.randomUUID(),
            patientId: patient.id,
            tenantId,
            metric: dto.metric,
            value: dto.value,
            threshold,
            severity: deviation > 0.3 ? 'CRITICAL' : deviation > 0.15 ? 'HIGH' : 'MEDIUM',
            acknowledged: false,
            createdAt: new Date().toISOString(),
          };

          await this.prisma.clinicalDocument.create({
            data: {
              tenantId,
              patientId: patient.id,
              authorId: userId,
              type: 'CUSTOM',
              title: `[RPM:ALERT:${alert.severity}] ${dto.metric} = ${dto.value}`,
              content: JSON.stringify(alert),
              status: 'DRAFT',
            },
          });
        }
      }
    }

    // Save reading
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: patient.id,
        authorId: userId,
        type: 'CUSTOM',
        title: `[RPM:READING] ${dto.metric} = ${dto.value}`,
        content: JSON.stringify({
          metric: dto.metric,
          value: dto.value,
          deviceId: dto.deviceId,
          recordedAt: new Date().toISOString(),
        }),
        status: 'SIGNED',
      },
    });

    return {
      recorded: true,
      metric: dto.metric,
      value: dto.value,
      alert: alert ? { severity: alert.severity, message: `Valor fora do esperado: ${dto.metric} = ${dto.value}` } : null,
    };
  }

  async getRpmAlerts(tenantId: string, options: { patientId?: string; acknowledged?: boolean; page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: '[RPM:ALERT:' },
    };
    if (options.patientId) where.patientId = options.patientId;
    if (options.acknowledged === false) where.status = 'DRAFT';
    if (options.acknowledged === true) where.status = 'SIGNED';

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const a = JSON.parse(d.content ?? '{}') as RpmAlert;
      return {
        alertId: d.id,
        patientName: d.patient?.fullName,
        patientId: d.patient?.id,
        metric: a.metric,
        value: a.value,
        severity: a.severity,
        acknowledged: a.acknowledged,
        createdAt: a.createdAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // =========================================================================
  // Doctor-to-Doctor Teleconsultation
  // =========================================================================

  async requestDoctorConsult(
    tenantId: string,
    userEmail: string,
    dto: {
      encounterId: string;
      targetSpecialty: string;
      targetDoctorId?: string;
      consultType: string;
      urgency: string;
      clinicalQuestion: string;
      attachments?: string[];
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
      select: { patientId: true },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: encounter.patientId,
        authorId: userId,
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `[D2D_CONSULT:${dto.consultType}] ${dto.targetSpecialty}`,
        content: JSON.stringify({
          requesterId: userId,
          targetSpecialty: dto.targetSpecialty,
          targetDoctorId: dto.targetDoctorId,
          consultType: dto.consultType,
          urgency: dto.urgency,
          clinicalQuestion: dto.clinicalQuestion,
          attachments: dto.attachments ?? [],
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        }),
        status: 'DRAFT',
      },
    });

    return { consultId: doc.id, status: 'PENDING' };
  }

  // =========================================================================
  // Multi-participant sessions
  // =========================================================================

  async addParticipant(
    tenantId: string,
    roomName: string,
    dto: { participantName: string; role: string; email?: string },
  ) {
    const _doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { contains: roomName },
        status: { in: ['DRAFT', 'SIGNED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Adding participant ${dto.participantName} (${dto.role}) to room ${roomName}`);

    return {
      roomName,
      participant: dto.participantName,
      role: dto.role,
      token: `participant-token-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async listParticipants(tenantId: string, roomName: string) {
    // In production: query from a dedicated participants table or LiveKit/Twilio API
    // Here we return from any stored participant records
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: '[TELE_PARTICIPANT]' },
        content: { contains: roomName },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((d) => {
      const parsed = JSON.parse(d.content ?? '{}') as Record<string, unknown>;
      return {
        id: d.id,
        participantName: parsed.participant ?? 'N/A',
        role: parsed.role ?? 'OBSERVER',
        joinedAt: d.createdAt.toISOString(),
      };
    });
  }

  // =========================================================================
  // IA: Urgency Detection in Teleconsultation
  // =========================================================================

  async detectUrgencyInTeleconsult(tenantId: string, sessionId: string) {
    // In production: calls a computer vision model (e.g. GPT-4V, AWS Rekognition)
    // that analyses facial features, skin color, breathing patterns from the video feed.
    // Here we return a realistic stub response.

    const session = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: sessionId,
        tenantId,
        type: 'CUSTOM',
      },
      include: { patient: { select: { fullName: true } } },
    });

    if (!session) throw new NotFoundException('Sessão de teleconsulta não encontrada.');

    // Stub: randomly generate urgency signals for demo
    const urgencyScore = Math.random();
    const urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      urgencyScore > 0.85 ? 'CRITICAL' :
      urgencyScore > 0.65 ? 'HIGH' :
      urgencyScore > 0.40 ? 'MEDIUM' : 'LOW';

    const signals: string[] = [];
    if (urgencyScore > 0.7) signals.push('Palidez facial detectada');
    if (urgencyScore > 0.8) signals.push('Dificuldade respiratória aparente');
    if (urgencyScore > 0.6) signals.push('Expressão de dor identificada');
    if (urgencyScore > 0.9) signals.push('Cianose perioral possível');

    const recommendations: Record<string, string> = {
      LOW: 'Continue o atendimento normalmente.',
      MEDIUM: 'Monitore o paciente. Considere perguntas de triagem complementares.',
      HIGH: 'Encaminhe para avaliação presencial urgente.',
      CRITICAL: 'ACIONE SAMU / RESGATE IMEDIATAMENTE. Sinais críticos detectados.',
    };

    this.logger.warn(`[URGENCY DETECTION] Session ${sessionId}: ${urgencyLevel} (score: ${urgencyScore.toFixed(2)})`);

    return {
      sessionId,
      patientName: session.patient?.fullName ?? 'N/A',
      analysedAt: new Date().toISOString(),
      urgencyLevel,
      urgencyScore: parseFloat(urgencyScore.toFixed(3)),
      detectedSignals: signals,
      recommendation: recommendations[urgencyLevel],
      disclaimer: 'Análise por IA — não substitui avaliação clínica profissional.',
    };
  }
}
