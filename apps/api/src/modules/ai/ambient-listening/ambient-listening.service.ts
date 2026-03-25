import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AmbientSessionStatus,
  AmbientSessionResponseDto,
  AmbientTranscriptResponseDto,
  AmbientClinicalNoteResponseDto,
} from './dto/ambient-listening.dto';

interface AmbientSession {
  id: string;
  encounterId: string;
  tenantId: string;
  userId: string;
  status: AmbientSessionStatus;
  language: string;
  context?: string;
  transcript?: string;
  clinicalNote?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    diagnosisCodes?: Array<{ code: string; description: string; confidence: number }>;
  };
  startedAt: Date;
  stoppedAt?: Date;
  approvedAt?: Date;
  approvedById?: string;
  editedNote?: string;
}

@Injectable()
export class AmbientListeningService {
  private readonly logger = new Logger(AmbientListeningService.name);
  /** In-memory store — replace with Prisma/Redis in production */
  private readonly sessions = new Map<string, AmbientSession>();

  async startSession(
    tenantId: string,
    userId: string,
    encounterId: string,
    language = 'pt-BR',
    context?: string,
  ): Promise<AmbientSessionResponseDto> {
    this.logger.log(`Starting ambient session for encounter ${encounterId}`);

    const session: AmbientSession = {
      id: randomUUID(),
      encounterId,
      tenantId,
      userId,
      status: AmbientSessionStatus.RECORDING,
      language,
      context,
      startedAt: new Date(),
    };

    this.sessions.set(session.id, session);

    return this.toResponse(session);
  }

  async stopSession(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    session.status = AmbientSessionStatus.PROCESSING;
    session.stoppedAt = new Date();

    // Simulate AI processing — in production this would call Whisper + GPT-4o
    session.transcript =
      'Paciente relata dor torácica há 2 dias, tipo opressiva, que piora ao esforço. ' +
      'Nega dispneia, náuseas ou sudorese. Antecedente de hipertensão arterial em tratamento. ' +
      'Ao exame: PA 140/90, FC 82, FR 16, SatO2 97%. Ausculta cardíaca com bulhas rítmicas sem sopros. ' +
      'Pulmões limpos. Abdome sem alterações.';

    session.clinicalNote = {
      subjective:
        'Paciente refere dor torácica há 2 dias, tipo opressiva, que piora ao esforço físico. ' +
        'Nega dispneia, náuseas ou sudorese. Antecedente pessoal: hipertensão arterial sistêmica em tratamento medicamentoso.',
      objective:
        'PA: 140/90 mmHg, FC: 82 bpm, FR: 16 irpm, SatO2: 97% em ar ambiente. ' +
        'ACV: Bulhas rítmicas, normofonéticas, em 2T, sem sopros. ' +
        'AP: Murmúrio vesicular presente bilateralmente, sem ruídos adventícios. ' +
        'Abdome: plano, flácido, indolor à palpação, RHA presentes.',
      assessment:
        'Dor torácica a esclarecer em paciente hipertenso. Necessário excluir síndrome coronariana aguda.',
      plan:
        'Solicitar ECG de 12 derivações, troponina sérica, hemograma e perfil lipídico. ' +
        'Manter anti-hipertensivo habitual. Retorno com resultados em 48h.',
      diagnosisCodes: [
        { code: 'R07.9', description: 'Dor torácica não especificada', confidence: 0.85 },
        { code: 'I10', description: 'Hipertensão essencial (primária)', confidence: 0.95 },
      ],
    };

    session.status = AmbientSessionStatus.COMPLETED;

    return this.toResponse(session);
  }

  async getTranscript(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientTranscriptResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    return {
      sessionId: session.id,
      rawTranscript: session.transcript ?? '',
      speakerDiarization: [
        { speaker: 'Médico', text: 'O que traz o senhor aqui hoje?', timestamp: 0 },
        {
          speaker: 'Paciente',
          text: 'Estou com uma dor no peito há 2 dias, tipo um aperto, piora quando faço esforço.',
          timestamp: 3.5,
        },
      ],
      language: session.language,
      durationSeconds: session.stoppedAt
        ? (session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000
        : 0,
    };
  }

  async getClinicalNote(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientClinicalNoteResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    return {
      sessionId: session.id,
      subjective: session.clinicalNote?.subjective,
      objective: session.clinicalNote?.objective,
      assessment: session.clinicalNote?.assessment,
      plan: session.clinicalNote?.plan,
      diagnosisCodes: session.clinicalNote?.diagnosisCodes,
      generatedAt: session.stoppedAt ?? new Date(),
      aiModel: 'gpt-4o',
    };
  }

  async approveNote(
    tenantId: string,
    userId: string,
    sessionId: string,
    editedNote?: string,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    session.status = AmbientSessionStatus.APPROVED;
    session.approvedAt = new Date();
    session.approvedById = userId;
    if (editedNote) session.editedNote = editedNote;

    this.logger.log(`Ambient session ${sessionId} approved by ${userId}`);

    return this.toResponse(session);
  }

  async listSessions(
    tenantId: string,
    encounterId?: string,
    status?: AmbientSessionStatus,
  ): Promise<AmbientSessionResponseDto[]> {
    let sessions = Array.from(this.sessions.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    if (encounterId) sessions = sessions.filter((s) => s.encounterId === encounterId);
    if (status) sessions = sessions.filter((s) => s.status === status);

    return sessions.map((s) => this.toResponse(s));
  }

  private getSessionOrThrow(tenantId: string, sessionId: string): AmbientSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException(`Ambient session ${sessionId} not found`);
    }
    return session;
  }

  private toResponse(session: AmbientSession): AmbientSessionResponseDto {
    return {
      id: session.id,
      encounterId: session.encounterId,
      status: session.status,
      transcript: session.transcript,
      clinicalNote: session.editedNote ?? session.clinicalNote?.subjective,
      startedAt: session.startedAt,
      stoppedAt: session.stoppedAt,
      approvedAt: session.approvedAt,
      approvedById: session.approvedById,
    };
  }
}
