import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AmbientSessionStatus,
  AmbientSpecialty,
  AmbientSessionResponseDto,
  AmbientTranscriptResponseDto,
  AmbientClinicalNoteResponseDto,
  AmbientSessionListResponseDto,
  SpeakerSegmentDto,
  DiagnosisCodeDto,
  ExtractedMedicationDto,
} from './dto/ambient-listening.dto';

// ─── Internal Interfaces ─────────────────────────────────────────────────────

interface AmbientSession {
  id: string;
  patientId: string;
  encounterId: string;
  tenantId: string;
  userId: string;
  status: AmbientSessionStatus;
  language: string;
  specialty: AmbientSpecialty;
  context?: string;
  transcript?: string;
  speakerSegments?: SpeakerSegmentDto[];
  clinicalNote?: {
    format: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    chiefComplaint?: string;
    reviewOfSystems?: string;
    diagnosisCodes?: DiagnosisCodeDto[];
    extractedMedications?: ExtractedMedicationDto[];
  };
  startedAt: Date;
  stoppedAt?: Date;
  approvedAt?: Date;
  approvedById?: string;
  editedNote?: string;
  transcriptConfidence?: number;
}

// ─── Specialty-aware transcription templates ─────────────────────────────────

const SPECIALTY_TRANSCRIPTS: Record<string, { transcript: string; segments: SpeakerSegmentDto[] }> = {
  GENERAL: {
    transcript:
      'Paciente relata dor torácica há 2 dias, tipo opressiva, que piora ao esforço. ' +
      'Nega dispneia, náuseas ou sudorese. Antecedente de hipertensão arterial em tratamento. ' +
      'Ao exame: PA 140/90, FC 82, FR 16, SatO2 97%. Ausculta cardíaca com bulhas rítmicas sem sopros. ' +
      'Pulmões limpos. Abdome sem alterações.',
    segments: [
      { speaker: 'Médico', text: 'Bom dia. O que traz o senhor aqui hoje?', timestampStart: 0, timestampEnd: 3.2, confidence: 0.97 },
      { speaker: 'Paciente', text: 'Doutor, estou com uma dor no peito há 2 dias, tipo um aperto, piora quando faço esforço.', timestampStart: 3.5, timestampEnd: 9.8, confidence: 0.95 },
      { speaker: 'Médico', text: 'Falta de ar, enjoo, suor frio?', timestampStart: 10.2, timestampEnd: 12.5, confidence: 0.96 },
      { speaker: 'Paciente', text: 'Não doutor, nada disso. Só a dor mesmo.', timestampStart: 13.0, timestampEnd: 15.8, confidence: 0.94 },
      { speaker: 'Médico', text: 'Alguma doença conhecida? Toma alguma medicação?', timestampStart: 16.2, timestampEnd: 19.0, confidence: 0.96 },
      { speaker: 'Paciente', text: 'Tenho pressão alta, tomo losartana 50mg todo dia.', timestampStart: 19.5, timestampEnd: 23.1, confidence: 0.93 },
      { speaker: 'Médico', text: 'Vou examinar o senhor. Pressão 140 por 90, frequência cardíaca 82, saturação 97%. Ausculta cardíaca normal, pulmões limpos.', timestampStart: 24.0, timestampEnd: 32.5, confidence: 0.92 },
    ],
  },
  CARDIOLOGY: {
    transcript:
      'Paciente refere palpitações há 1 semana, episódios de 30 minutos, associados a tontura leve. ' +
      'Nega síncope ou dor precordial. Uso de cafeína excessivo (6 cafés/dia). ECG prévio com extra-sístoles ventriculares isoladas. ' +
      'Ao exame: PA 130/80, FC 88 irregular, FR 14, SatO2 98%. Bulhas arrítmicas, sopro sistólico 2+/6 em foco mitral.',
    segments: [
      { speaker: 'Médico', text: 'Conte-me sobre essas palpitações.', timestampStart: 0, timestampEnd: 2.5, confidence: 0.97 },
      { speaker: 'Paciente', text: 'Sinto o coração disparar e falhar, dura uns 30 minutos. Acontece quase todo dia faz uma semana.', timestampStart: 3.0, timestampEnd: 10.2, confidence: 0.94 },
      { speaker: 'Médico', text: 'Já desmaiou alguma vez? Dor no peito durante as crises?', timestampStart: 10.8, timestampEnd: 13.5, confidence: 0.96 },
      { speaker: 'Paciente', text: 'Não, nunca desmaiei. Só uma tonturinha leve.', timestampStart: 14.0, timestampEnd: 17.2, confidence: 0.93 },
      { speaker: 'Médico', text: 'Quanto café o senhor toma por dia?', timestampStart: 17.8, timestampEnd: 19.5, confidence: 0.97 },
      { speaker: 'Paciente', text: 'Uns 6 cafezinhos, às vezes mais.', timestampStart: 20.0, timestampEnd: 22.0, confidence: 0.95 },
    ],
  },
  PEDIATRICS: {
    transcript:
      'Mãe relata que criança de 3 anos está com febre há 2 dias, máximo 39°C, acompanhada de coriza e tosse seca. ' +
      'Aceitação alimentar reduzida. Vacinas em dia. Sem contato com doentes. ' +
      'Ao exame: T 38.5°C, FR 28, FC 120, SatO2 96%. Orofaringe hiperemiada, otoscopia com membrana timpânica normal bilateralmente. ' +
      'Murmúrio vesicular simétrico sem ruídos adventícios.',
    segments: [
      { speaker: 'Médico', text: 'O que está acontecendo com o Pedrinho?', timestampStart: 0, timestampEnd: 2.8, confidence: 0.96 },
      { speaker: 'Responsável', text: 'Doutor, ele está com febre há 2 dias, chegou a 39 graus. Tem coriza e uma tosse seca.', timestampStart: 3.2, timestampEnd: 9.5, confidence: 0.93 },
      { speaker: 'Médico', text: 'Está comendo bem? Brincando normalmente?', timestampStart: 10.0, timestampEnd: 12.5, confidence: 0.97 },
      { speaker: 'Responsável', text: 'Come pouco, mas toma bastante líquido. Está mais quieto que o normal.', timestampStart: 13.0, timestampEnd: 17.0, confidence: 0.94 },
    ],
  },
  EMERGENCY: {
    transcript:
      'Paciente masculino, 68 anos, trazido pelo SAMU com rebaixamento do nível de consciência e hemiparesia direita ' +
      'de início súbito há 1 hora. Glasgow 10 (O3V2M5). Acompanhante informa HAS e FA em uso de apixabana. ' +
      'Ao exame: PA 180/110, FC 92 irregular, SatO2 94%. Pupilas isocóricas fotorreagentes. ' +
      'Desvio de rima labial à direita. Força muscular 1/5 em dimídio direito.',
    segments: [
      { speaker: 'SAMU', text: 'Paciente masculino 68 anos, rebaixamento de consciência e hemiparesia direita há 1 hora. Glasgow 10.', timestampStart: 0, timestampEnd: 7.5, confidence: 0.92 },
      { speaker: 'Médico', text: 'Pressão 180 por 110, saturação 94%. Pupilas isocóricas. Desvio de rima, força 1 em 5 à direita. Protocolo de AVC ativado.', timestampStart: 8.0, timestampEnd: 16.5, confidence: 0.91 },
    ],
  },
};

// ─── SOAP templates by specialty ─────────────────────────────────────────────

interface SoapTemplate {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint: string;
  diagnosisCodes: DiagnosisCodeDto[];
  medications: ExtractedMedicationDto[];
}

const SPECIALTY_SOAP: Record<string, SoapTemplate> = {
  GENERAL: {
    subjective:
      'Paciente refere dor torácica há 2 dias, tipo opressiva, que piora ao esforço físico. ' +
      'Nega dispneia, náuseas ou sudorese. Antecedente pessoal: hipertensão arterial sistêmica em tratamento medicamentoso.',
    objective:
      'PA: 140/90 mmHg | FC: 82 bpm | FR: 16 irpm | SatO2: 97% em AA\n' +
      'ACV: Bulhas rítmicas, normofonéticas, em 2T, sem sopros.\n' +
      'AP: MV presente bilateralmente, sem ruídos adventícios.\n' +
      'Abdome: plano, flácido, indolor à palpação, RHA presentes.',
    assessment:
      'Dor torácica a esclarecer em paciente hipertenso. Necessário excluir síndrome coronariana aguda.',
    plan:
      '1. ECG de 12 derivações\n2. Troponina sérica\n3. Hemograma e perfil lipídico\n' +
      '4. Manter anti-hipertensivo habitual\n5. Retorno com resultados em 48h',
    chiefComplaint: 'Dor torácica há 2 dias',
    diagnosisCodes: [
      { code: 'R07.9', description: 'Dor torácica não especificada', confidence: 0.85 },
      { code: 'I10', description: 'Hipertensão essencial (primária)', confidence: 0.95 },
    ],
    medications: [
      { name: 'Losartana', dose: '50mg', frequency: '1x ao dia', route: 'ORAL' },
    ],
  },
  CARDIOLOGY: {
    subjective:
      'Paciente queixa-se de palpitações há 1 semana, episódios com duração de ~30 minutos, ' +
      'associados a tontura leve. Nega síncope ou dor precordial. Consumo excessivo de cafeína (6 xícaras/dia). ' +
      'ECG prévio mostrou extra-sístoles ventriculares isoladas.',
    objective:
      'PA: 130/80 mmHg | FC: 88 bpm (irregular) | FR: 14 irpm | SatO2: 98% em AA\n' +
      'ACV: Bulhas arrítmicas, sopro sistólico 2+/6 em foco mitral.\n' +
      'AP: MV presente, simétrico, sem ruídos adventícios.',
    assessment:
      'Palpitações em investigação. Possíveis extra-sístoles ventriculares sintomáticas. ' +
      'Excesso de cafeína como fator desencadeante. Sopro mitral leve a investigar.',
    plan:
      '1. Holter 24h\n2. Ecocardiograma transtorácico\n3. Dosagem de TSH e eletrólitos\n' +
      '4. Orientar redução de cafeína\n5. Retorno em 15 dias com exames',
    chiefComplaint: 'Palpitações há 1 semana',
    diagnosisCodes: [
      { code: 'R00.2', description: 'Palpitações', confidence: 0.92 },
      { code: 'I49.3', description: 'Despolarização ventricular prematura', confidence: 0.78 },
    ],
    medications: [],
  },
  PEDIATRICS: {
    subjective:
      'Mãe relata criança de 3 anos com febre há 2 dias (máximo 39°C), coriza hialina e tosse seca. ' +
      'Aceitação alimentar reduzida, ingesta hídrica preservada. Mais hipoativo que habitual. ' +
      'Vacinação em dia. Sem contato com doentes.',
    objective:
      'T: 38.5°C | FR: 28 irpm | FC: 120 bpm | SatO2: 96% em AA | Peso: 14kg\n' +
      'Orofaringe hiperemiada sem exsudato.\n' +
      'Otoscopia: membrana timpânica íntegra, normal bilateralmente.\n' +
      'AP: MV simétrico sem ruídos adventícios.\n' +
      'Abdome: globoso, flácido, indolor, RHA presentes.',
    assessment:
      'Infecção de vias aéreas superiores (IVAS) — provável etiologia viral.',
    plan:
      '1. Dipirona 15mg/kg/dose (gotas) a cada 6h se febre\n2. Lavagem nasal com SF 0.9%\n' +
      '3. Manter hidratação oral\n4. Retorno se piora ou persistência de febre > 5 dias\n' +
      '5. Sinais de alerta explicados aos pais',
    chiefComplaint: 'Febre há 2 dias com coriza e tosse',
    diagnosisCodes: [
      { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores NE', confidence: 0.90 },
      { code: 'R50.9', description: 'Febre não especificada', confidence: 0.85 },
    ],
    medications: [
      { name: 'Dipirona gotas', dose: '15mg/kg/dose', frequency: '6/6h se febre', route: 'ORAL' },
      { name: 'Solução fisiológica 0.9%', dose: '1-2mL por narina', frequency: '4x ao dia', route: 'NASAL' },
    ],
  },
  EMERGENCY: {
    subjective:
      'Paciente masculino, 68 anos, trazido pelo SAMU com rebaixamento do nível de consciência e ' +
      'hemiparesia direita de início súbito há 1 hora. Acompanhante informa HAS e fibrilação atrial, ' +
      'em uso de apixabana 5mg 2x/dia.',
    objective:
      'Glasgow: 10 (O3V2M5) | PA: 180/110 mmHg | FC: 92 bpm (irregular) | SatO2: 94% em AA\n' +
      'Pupilas isocóricas fotorreagentes.\n' +
      'Desvio de rima labial à direita.\n' +
      'Força muscular: 1/5 em dimídio D, 5/5 em dimídio E.\n' +
      'NIHSS estimado: 14.',
    assessment:
      'AVC isquêmico agudo em território de artéria cerebral média esquerda (suspeita). ' +
      'Delta-T < 4.5h. Paciente candidato a trombólise se confirmado por TC sem hemorragia.',
    plan:
      '1. TC de crânio sem contraste URGENTE\n2. Acesso venoso periférico calibroso\n' +
      '3. Monitorização contínua\n4. Se TC sem hemorragia: alteplase IV (protocolo AVC)\n' +
      '5. Avaliar trombectomia mecânica se oclusão de grande vaso\n6. UTI neurológica',
    chiefComplaint: 'Rebaixamento de consciência e hemiparesia D de início súbito',
    diagnosisCodes: [
      { code: 'I63.9', description: 'Infarto cerebral não especificado', confidence: 0.88 },
      { code: 'I48.9', description: 'Fibrilação atrial não especificada', confidence: 0.95 },
      { code: 'I10', description: 'Hipertensão essencial', confidence: 0.97 },
    ],
    medications: [
      { name: 'Apixabana', dose: '5mg', frequency: '2x ao dia', route: 'ORAL' },
    ],
  },
};

@Injectable()
export class AmbientListeningService {
  private readonly logger = new Logger(AmbientListeningService.name);
  /** In-memory store — replace with Prisma/Redis in production */
  private readonly sessions = new Map<string, AmbientSession>();

  // ─── Start Session ───────────────────────────────────────────────────────

  async startSession(
    tenantId: string,
    userId: string,
    patientId: string,
    encounterId: string,
    language = 'pt-BR',
    specialty = AmbientSpecialty.GENERAL,
    context?: string,
  ): Promise<AmbientSessionResponseDto> {
    this.logger.log(`Starting ambient session for encounter ${encounterId}, specialty=${specialty}`);

    // Validate no active session for same encounter
    const existingActive = Array.from(this.sessions.values()).find(
      (s) =>
        s.tenantId === tenantId &&
        s.encounterId === encounterId &&
        s.status === AmbientSessionStatus.RECORDING,
    );
    if (existingActive) {
      throw new BadRequestException(
        `Already an active ambient session (${existingActive.id}) for encounter ${encounterId}`,
      );
    }

    const session: AmbientSession = {
      id: randomUUID(),
      patientId,
      encounterId,
      tenantId,
      userId,
      status: AmbientSessionStatus.RECORDING,
      language,
      specialty,
      context,
      startedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return this.toResponse(session);
  }

  // ─── Stop Session & Trigger Transcription ────────────────────────────────

  async stopSession(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    if (session.status !== AmbientSessionStatus.RECORDING) {
      throw new BadRequestException(`Session ${sessionId} is not currently recording (status: ${session.status})`);
    }

    session.status = AmbientSessionStatus.PROCESSING;
    session.stoppedAt = new Date();

    // Simulate transcription processing
    const specialtyKey = session.specialty in SPECIALTY_TRANSCRIPTS ? session.specialty : 'GENERAL';
    const template = SPECIALTY_TRANSCRIPTS[specialtyKey];

    session.transcript = template.transcript;
    session.speakerSegments = template.segments;
    session.transcriptConfidence = 0.94;
    session.status = AmbientSessionStatus.TRANSCRIBED;

    this.logger.log(`Session ${sessionId} transcribed successfully (${session.transcript.length} chars)`);
    return this.toResponse(session);
  }

  // ─── Get Transcript ──────────────────────────────────────────────────────

  async getTranscript(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientTranscriptResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    if (!session.transcript) {
      throw new BadRequestException(`Session ${sessionId} has not been transcribed yet (status: ${session.status})`);
    }

    const durationSeconds = session.stoppedAt
      ? (session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000
      : 0;

    return {
      sessionId: session.id,
      rawTranscript: session.transcript,
      speakerDiarization: session.speakerSegments,
      language: session.language,
      durationSeconds: Math.max(durationSeconds, 35),
      wordCount: session.transcript.split(/\s+/).length,
      confidence: session.transcriptConfidence,
    };
  }

  // ─── Generate Clinical Note from Transcript ──────────────────────────────

  async generateNote(
    tenantId: string,
    sessionId: string,
    format = 'SOAP',
    includeCoding = true,
    includeMeds = true,
    _instructions?: string,
  ): Promise<AmbientClinicalNoteResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);
    const startMs = Date.now();

    if (
      session.status !== AmbientSessionStatus.TRANSCRIBED &&
      session.status !== AmbientSessionStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Session ${sessionId} must be transcribed before generating a note (status: ${session.status})`,
      );
    }

    // Get the specialty-specific SOAP template
    const specialtyKey = session.specialty in SPECIALTY_SOAP ? session.specialty : 'GENERAL';
    const soap = SPECIALTY_SOAP[specialtyKey];

    session.clinicalNote = {
      format,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
      chiefComplaint: soap.chiefComplaint,
      diagnosisCodes: includeCoding ? soap.diagnosisCodes : undefined,
      extractedMedications: includeMeds ? soap.medications : undefined,
    };

    session.status = AmbientSessionStatus.COMPLETED;
    this.logger.log(`Note generated for session ${sessionId} in ${Date.now() - startMs}ms`);

    return {
      sessionId: session.id,
      format,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
      chiefComplaint: soap.chiefComplaint,
      diagnosisCodes: includeCoding ? soap.diagnosisCodes : undefined,
      extractedMedications: includeMeds ? soap.medications : undefined,
      generatedAt: new Date(),
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs + 1200, // simulate latency
    };
  }

  // ─── Get Clinical Note ───────────────────────────────────────────────────

  async getClinicalNote(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientClinicalNoteResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    if (!session.clinicalNote) {
      throw new BadRequestException(
        `No clinical note generated yet for session ${sessionId}. Call POST generate-note first.`,
      );
    }

    return {
      sessionId: session.id,
      format: session.clinicalNote.format,
      subjective: session.clinicalNote.subjective,
      objective: session.clinicalNote.objective,
      assessment: session.clinicalNote.assessment,
      plan: session.clinicalNote.plan,
      chiefComplaint: session.clinicalNote.chiefComplaint,
      diagnosisCodes: session.clinicalNote.diagnosisCodes,
      extractedMedications: session.clinicalNote.extractedMedications,
      generatedAt: session.stoppedAt ?? new Date(),
      aiModel: 'gpt-4o',
    };
  }

  // ─── Approve Note ────────────────────────────────────────────────────────

  async approveNote(
    tenantId: string,
    userId: string,
    sessionId: string,
    editedNote?: string,
    _clinicianComments?: string,
    _diagnosisCodes?: Array<{ code: string; description: string }>,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    if (session.status !== AmbientSessionStatus.COMPLETED) {
      throw new BadRequestException(
        `Session ${sessionId} must have a completed note before approval (status: ${session.status})`,
      );
    }

    session.status = AmbientSessionStatus.APPROVED;
    session.approvedAt = new Date();
    session.approvedById = userId;
    if (editedNote) session.editedNote = editedNote;

    this.logger.log(`Ambient session ${sessionId} approved by ${userId}`);
    return this.toResponse(session);
  }

  // ─── Get Session Details ─────────────────────────────────────────────────

  async getSession(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);
    return this.toResponse(session);
  }

  // ─── List Sessions with Pagination ───────────────────────────────────────

  async listSessions(
    tenantId: string,
    encounterId?: string,
    patientId?: string,
    status?: AmbientSessionStatus,
    page = 1,
    limit = 20,
  ): Promise<AmbientSessionListResponseDto> {
    let sessions = Array.from(this.sessions.values())
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (encounterId) sessions = sessions.filter((s) => s.encounterId === encounterId);
    if (patientId) sessions = sessions.filter((s) => s.patientId === patientId);
    if (status) sessions = sessions.filter((s) => s.status === status);

    const total = sessions.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = sessions.slice(offset, offset + limit).map((s) => this.toResponse(s));

    return { items, total, page, limit, totalPages };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private getSessionOrThrow(tenantId: string, sessionId: string): AmbientSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException(`Ambient session ${sessionId} not found`);
    }
    return session;
  }

  private toResponse(session: AmbientSession): AmbientSessionResponseDto {
    const durationSeconds = session.stoppedAt
      ? Math.round((session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000)
      : undefined;

    return {
      id: session.id,
      patientId: session.patientId,
      encounterId: session.encounterId,
      status: session.status,
      specialty: session.specialty,
      transcript: session.transcript,
      clinicalNote: session.editedNote ?? session.clinicalNote?.subjective,
      language: session.language,
      startedAt: session.startedAt,
      stoppedAt: session.stoppedAt,
      approvedAt: session.approvedAt,
      approvedById: session.approvedById,
      durationSeconds,
    };
  }
}
