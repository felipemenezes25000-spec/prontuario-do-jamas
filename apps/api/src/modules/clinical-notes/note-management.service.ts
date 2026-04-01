import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InterconsultationDto,
  InterconsultationResponseDto,
  CopyForwardNoteDto,
  NoteSignatureDto,
  NoteMediaDto,
  AnatomicalDrawingDto,
  SpecialtyTemplateDto,
  NoteAddendumDto,
  InterconsultationStatus,
  NoteSignatureKind,
  InterconsultationRecord,
  NoteMediaRecord,
  AnatomicalDrawingRecord,
  SpecialtyTemplateRecord,
  CopyForwardNoteResult,
  NoteSignatureResult,
  DrawingAnnotationDto,
  SpecialtyTemplateKind,
  TemplateFieldDto,
  EmbeddedScoreDto,
} from './dto/note-management.dto';

// ─── In-memory stores (pending schema migration) ──────────────────────────────

interface StoredInterconsultation {
  id: string;
  encounterId: string;
  requestingDoctorId: string;
  targetSpecialty: SpecialtyTemplateKind;
  reason: string;
  urgency: string;
  status: InterconsultationStatus;
  clinicalContext: string | null;
  preferredResponseDate: Date | null;
  response: string | null;
  recommendations: string | null;
  proposedDiagnosis: string | null;
  respondingDoctorId: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredNoteMedia {
  id: string;
  noteId: string;
  mediaType: string;
  fileKey: string;
  fileName: string;
  mimeType: string | null;
  capturedAt: Date | null;
  description: string | null;
  bodyRegion: string | null;
  uploadedAt: Date;
}

interface StoredAnatomicalDrawing {
  id: string;
  noteId: string;
  bodyRegion: string;
  annotations: DrawingAnnotationDto[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredSpecialtyTemplate {
  id: string;
  specialty: SpecialtyTemplateKind;
  sections: string[];
  embeddedScores: EmbeddedScoreDto[];
  fields: TemplateFieldDto[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const interconsultStore = new Map<string, StoredInterconsultation>();
const mediaStore = new Map<string, StoredNoteMedia>();
const drawingStore = new Map<string, StoredAnatomicalDrawing>();
const templateStore = new Map<string, StoredSpecialtyTemplate>();

// Seed default specialty templates
const DEFAULT_TEMPLATES: Omit<StoredSpecialtyTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    specialty: SpecialtyTemplateKind.CARDIOLOGY,
    description: 'Template de consulta cardiológica',
    sections: ['Queixa Principal', 'HDA', 'Antecedentes Cardiovasculares', 'Exame Físico', 'ECG', 'Ecocardiograma', 'Conduta'],
    embeddedScores: [
      {
        scoreName: 'CHADS2-VASc',
        interpretation: 'Score de risco tromboembólico em fibrilação atrial',
        fields: [
          { key: 'heart_failure', label: 'Insuficiência cardíaca', required: false, options: ['Sim', 'Não'] },
          { key: 'hypertension', label: 'Hipertensão', required: false, options: ['Sim', 'Não'] },
          { key: 'age_75', label: 'Idade ≥ 75 anos', required: false, options: ['Sim', 'Não'] },
          { key: 'diabetes', label: 'Diabetes', required: false, options: ['Sim', 'Não'] },
          { key: 'stroke', label: 'AVC/TIA prévio', required: false, options: ['Sim', 'Não'] },
        ],
      },
    ],
    fields: [
      { key: 'nyha_class', label: 'Classe funcional NYHA', required: false, options: ['I', 'II', 'III', 'IV'] },
      { key: 'ejection_fraction', label: 'Fração de ejeção (%)', required: false, placeholder: 'Ex: 55' },
    ],
  },
  {
    specialty: SpecialtyTemplateKind.PSYCHIATRY,
    description: 'Template de avaliação psiquiátrica',
    sections: ['Queixa Principal', 'HDA', 'História Psiquiátrica Prévia', 'Uso de Substâncias', 'Exame do Estado Mental', 'Hipótese Diagnóstica', 'CID-10', 'Plano Terapêutico'],
    embeddedScores: [
      {
        scoreName: 'PHQ-9',
        interpretation: 'Escala de Depressão: 0-4 mínima, 5-9 leve, 10-14 moderada, 15-19 moderadamente grave, 20-27 grave',
        fields: Array.from({ length: 9 }, (_, i) => ({
          key: `phq9_q${i + 1}`,
          label: `Questão ${i + 1}`,
          required: false,
          options: ['0 - Nenhuma vez', '1 - Vários dias', '2 - Mais da metade dos dias', '3 - Quase todos os dias'],
        })),
      },
    ],
    fields: [
      { key: 'appearance', label: 'Aparência', required: false },
      { key: 'speech', label: 'Fala', required: false },
      { key: 'mood', label: 'Humor', required: false },
      { key: 'thought_content', label: 'Conteúdo do pensamento', required: false },
      { key: 'perception', label: 'Percepção', required: false },
      { key: 'cognition', label: 'Cognição', required: false },
      { key: 'insight', label: 'Insight', required: false, options: ['Presente', 'Parcial', 'Ausente'] },
    ],
  },
  {
    specialty: SpecialtyTemplateKind.ORTHOPEDICS,
    description: 'Template de consulta ortopédica',
    sections: ['Queixa Principal', 'HDA', 'Mecanismo de Trauma', 'Exame Físico', 'Imagem', 'Diagnóstico', 'Conduta Cirúrgica/Conservadora'],
    embeddedScores: [
      {
        scoreName: 'EVA - Escala Visual Analógica de Dor',
        interpretation: '0 = sem dor, 10 = pior dor imaginável',
        fields: [{ key: 'pain_scale', label: 'Intensidade da dor (0-10)', required: true, options: ['0','1','2','3','4','5','6','7','8','9','10'] }],
      },
    ],
    fields: [
      { key: 'affected_limb', label: 'Membro acometido', required: false, options: ['Membro superior direito', 'Membro superior esquerdo', 'Membro inferior direito', 'Membro inferior esquerdo', 'Coluna'] },
      { key: 'rom', label: 'Amplitude de movimento (graus)', required: false, placeholder: 'Ex: Flexão 120°, Extensão 0°' },
      { key: 'neurovascular', label: 'Exame neurovascular distal', required: false },
    ],
  },
];

(function seedTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    const id = crypto.randomUUID();
    const now = new Date();
    templateStore.set(id, { id, ...t, createdAt: now, updatedAt: now });
  }
})();

@Injectable()
export class NoteManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Interconsultation ────────────────────────────────────────────────────

  async requestInterconsultation(
    dto: InterconsultationDto,
  ): Promise<InterconsultationRecord> {
    // Verify encounter exists
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: dto.encounterId },
    });
    if (!encounter) {
      throw new NotFoundException(`Encounter "${dto.encounterId}" not found`);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredInterconsultation = {
      id,
      encounterId: dto.encounterId,
      requestingDoctorId: dto.requestingDoctorId,
      targetSpecialty: dto.targetSpecialty,
      reason: dto.reason,
      urgency: dto.urgency,
      status: InterconsultationStatus.PENDING,
      clinicalContext: dto.clinicalContext ?? null,
      preferredResponseDate: dto.preferredResponseDate
        ? new Date(dto.preferredResponseDate)
        : null,
      response: null,
      recommendations: null,
      proposedDiagnosis: null,
      respondingDoctorId: null,
      respondedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    interconsultStore.set(id, stored);
    return this.mapInterconsult(stored);
  }

  async respondToInterconsultation(
    dto: InterconsultationResponseDto,
  ): Promise<InterconsultationRecord> {
    const stored = interconsultStore.get(dto.requestId);
    if (!stored) {
      throw new NotFoundException(`Interconsultation "${dto.requestId}" not found`);
    }
    if (stored.status === InterconsultationStatus.ANSWERED) {
      throw new ConflictException('Interconsultation has already been answered');
    }
    const now = new Date();
    const updated: StoredInterconsultation = {
      ...stored,
      status: InterconsultationStatus.ANSWERED,
      response: dto.response,
      recommendations: dto.recommendations ?? null,
      proposedDiagnosis: dto.proposedDiagnosis ?? null,
      respondingDoctorId: dto.respondingDoctorId,
      respondedAt: now,
      updatedAt: now,
    };
    interconsultStore.set(dto.requestId, updated);
    return this.mapInterconsult(updated);
  }

  async listInterconsultations(filters: {
    encounterId?: string;
    status?: string;
    targetSpecialty?: string;
  }): Promise<InterconsultationRecord[]> {
    return [...interconsultStore.values()]
      .filter((i) => {
        let match = true;
        if (filters.encounterId) match = match && i.encounterId === filters.encounterId;
        if (filters.status) match = match && i.status === filters.status;
        if (filters.targetSpecialty)
          match = match && i.targetSpecialty === filters.targetSpecialty;
        return match;
      })
      .map(this.mapInterconsult)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getInterconsultation(id: string): Promise<InterconsultationRecord> {
    const stored = interconsultStore.get(id);
    if (!stored) {
      throw new NotFoundException(`Interconsultation "${id}" not found`);
    }
    return this.mapInterconsult(stored);
  }

  // ─── CopyForward ─────────────────────────────────────────────────────────

  async copyForwardNote(
    userId: string,
    dto: CopyForwardNoteDto,
  ): Promise<CopyForwardNoteResult> {
    const sourceNote = await this.prisma.clinicalNote.findUnique({
      where: { id: dto.sourceNoteId },
      include: { author: { select: { name: true } } },
    });
    if (!sourceNote) {
      throw new NotFoundException(`Source note "${dto.sourceNoteId}" not found`);
    }
    const targetEncounter = await this.prisma.encounter.findUnique({
      where: { id: dto.targetEncounterId },
    });
    if (!targetEncounter) {
      throw new NotFoundException(`Target encounter "${dto.targetEncounterId}" not found`);
    }

    const allFields: Record<string, string | null> = {
      subjective: sourceNote.subjective,
      objective: sourceNote.objective,
      assessment: sourceNote.assessment,
      plan: sourceNote.plan,
      freeText: sourceNote.freeText,
    };

    const copiedContent: Record<string, string | null> = {};
    const sectionsFilter = dto.sections?.length ? dto.sections : Object.keys(allFields);

    for (const field of sectionsFilter) {
      if (field in allFields) {
        copiedContent[field] = allFields[field];
      }
    }

    const highlightedSections =
      dto.highlightChanges !== false ? Object.keys(copiedContent) : [];

    return {
      copiedContent,
      sourceNoteId: dto.sourceNoteId,
      sourceDate: sourceNote.createdAt,
      sourceAuthor: sourceNote.author.name,
      highlightedSections,
    };
  }

  // ─── Signature & Lock ─────────────────────────────────────────────────────

  async signNote(
    userId: string,
    dto: NoteSignatureDto,
  ): Promise<NoteSignatureResult> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: dto.noteId },
    });
    if (!note) {
      throw new NotFoundException(`Clinical note "${dto.noteId}" not found`);
    }
    if (note.status === 'SIGNED' || note.status === 'COSIGNED') {
      throw new BadRequestException('Note is already signed/locked');
    }
    if (dto.signatureType === NoteSignatureKind.DIGITAL_ICP && !dto.signatureHash) {
      throw new BadRequestException(
        'signatureHash is required for DIGITAL_ICP signature type',
      );
    }

    const now = new Date();
    await this.prisma.clinicalNote.update({
      where: { id: dto.noteId },
      data: {
        status: 'SIGNED',
        signedAt: now,
        signedById: userId,
        digitalSignatureHash: dto.signatureHash ?? null,
        signatureBlock: dto.signatureBlock ?? null,
      },
    });

    return {
      noteId: dto.noteId,
      signedAt: now,
      signatureType: dto.signatureType,
      isLocked: dto.lockAfterSign ?? true,
      signedById: userId,
    };
  }

  async addLockedNoteAddendum(
    noteId: string,
    userId: string,
    dto: NoteAddendumDto,
  ): Promise<{ id: string; originalNoteId: string; createdAt: Date }> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException(`Clinical note "${noteId}" not found`);
    }
    if (note.status !== 'SIGNED' && note.status !== 'COSIGNED') {
      throw new BadRequestException(
        'Addenda can only be added to signed/locked notes (CFM requirement)',
      );
    }

    const author = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!author) throw new NotFoundException('Author user not found');

    await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: { status: 'AMENDED' },
    });

    const addendum = await this.prisma.clinicalNote.create({
      data: {
        encounterId: note.encounterId,
        authorId: userId,
        authorRole: author.role,
        type: 'ADDENDUM',
        freeText: `[ADDENDUM] ${dto.addendumText}\n\n[MOTIVO] ${dto.reason}`,
        parentNoteId: noteId,
        version: note.version + 1,
        diagnosisCodes: [],
        procedureCodes: [],
      },
    });

    return { id: addendum.id, originalNoteId: noteId, createdAt: addendum.createdAt };
  }

  // ─── Note Media ───────────────────────────────────────────────────────────

  async attachMedia(dto: NoteMediaDto): Promise<NoteMediaRecord> {
    // Verify note exists
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: dto.noteId },
    });
    if (!note) {
      throw new NotFoundException(`Clinical note "${dto.noteId}" not found`);
    }
    // Locked notes cannot receive new media
    if (note.status === 'SIGNED' || note.status === 'COSIGNED') {
      throw new BadRequestException(
        'Cannot attach media to a signed/locked note. Use an addendum instead.',
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredNoteMedia = {
      id,
      noteId: dto.noteId,
      mediaType: dto.mediaType,
      fileKey: dto.fileKey,
      fileName: dto.fileName,
      mimeType: dto.mimeType ?? null,
      capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : null,
      description: dto.description ?? null,
      bodyRegion: dto.bodyRegion ?? null,
      uploadedAt: now,
    };
    mediaStore.set(id, stored);
    return this.mapMedia(stored);
  }

  async listNoteMedia(noteId: string): Promise<NoteMediaRecord[]> {
    return [...mediaStore.values()]
      .filter((m) => m.noteId === noteId)
      .map(this.mapMedia)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteNoteMedia(id: string): Promise<{ deleted: boolean }> {
    if (!mediaStore.has(id)) {
      throw new NotFoundException(`Media item "${id}" not found`);
    }
    mediaStore.delete(id);
    return { deleted: true };
  }

  // ─── Anatomical Drawing ───────────────────────────────────────────────────

  async saveAnatomicalDrawing(
    dto: AnatomicalDrawingDto,
  ): Promise<AnatomicalDrawingRecord> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: dto.noteId },
    });
    if (!note) {
      throw new NotFoundException(`Clinical note "${dto.noteId}" not found`);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredAnatomicalDrawing = {
      id,
      noteId: dto.noteId,
      bodyRegion: dto.bodyRegion,
      annotations: dto.annotations,
      description: dto.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    drawingStore.set(id, stored);
    return this.mapDrawing(stored);
  }

  async listAnatomicalDrawings(noteId: string): Promise<AnatomicalDrawingRecord[]> {
    return [...drawingStore.values()]
      .filter((d) => d.noteId === noteId)
      .map(this.mapDrawing)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAnatomicalDrawing(
    id: string,
    dto: Partial<AnatomicalDrawingDto>,
  ): Promise<AnatomicalDrawingRecord> {
    const existing = drawingStore.get(id);
    if (!existing) {
      throw new NotFoundException(`Anatomical drawing "${id}" not found`);
    }
    const updated: StoredAnatomicalDrawing = {
      ...existing,
      annotations: dto.annotations ?? existing.annotations,
      description: dto.description ?? existing.description,
      updatedAt: new Date(),
    };
    drawingStore.set(id, updated);
    return this.mapDrawing(updated);
  }

  // ─── Specialty Templates ──────────────────────────────────────────────────

  async listSpecialtyTemplates(specialty?: string): Promise<SpecialtyTemplateRecord[]> {
    const all = [...templateStore.values()].map(this.mapTemplate);
    if (specialty) {
      return all.filter((t) => t.specialty === specialty);
    }
    return all;
  }

  async getSpecialtyTemplate(id: string): Promise<SpecialtyTemplateRecord> {
    const stored = templateStore.get(id);
    if (!stored) {
      throw new NotFoundException(`Specialty template "${id}" not found`);
    }
    return this.mapTemplate(stored);
  }

  async createSpecialtyTemplate(
    dto: SpecialtyTemplateDto,
  ): Promise<SpecialtyTemplateRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredSpecialtyTemplate = {
      id,
      specialty: dto.specialty,
      sections: dto.sections,
      embeddedScores: dto.embeddedScores ?? [],
      fields: dto.fields ?? [],
      description: dto.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    templateStore.set(id, stored);
    return this.mapTemplate(stored);
  }

  async updateSpecialtyTemplate(
    id: string,
    dto: Partial<SpecialtyTemplateDto>,
  ): Promise<SpecialtyTemplateRecord> {
    const existing = templateStore.get(id);
    if (!existing) {
      throw new NotFoundException(`Specialty template "${id}" not found`);
    }
    const updated: StoredSpecialtyTemplate = {
      ...existing,
      sections: dto.sections ?? existing.sections,
      embeddedScores: dto.embeddedScores ?? existing.embeddedScores,
      fields: dto.fields ?? existing.fields,
      description: dto.description ?? existing.description,
      updatedAt: new Date(),
    };
    templateStore.set(id, updated);
    return this.mapTemplate(updated);
  }

  // ─── Private Mappers ──────────────────────────────────────────────────────

  private mapInterconsult(s: StoredInterconsultation): InterconsultationRecord {
    return {
      id: s.id,
      encounterId: s.encounterId,
      requestingDoctorId: s.requestingDoctorId,
      targetSpecialty: s.targetSpecialty,
      reason: s.reason,
      urgency: s.urgency as InterconsultationRecord['urgency'],
      status: s.status,
      clinicalContext: s.clinicalContext,
      preferredResponseDate: s.preferredResponseDate,
      response: s.response,
      recommendations: s.recommendations,
      proposedDiagnosis: s.proposedDiagnosis,
      respondingDoctorId: s.respondingDoctorId,
      respondedAt: s.respondedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapMedia(s: StoredNoteMedia): NoteMediaRecord {
    return {
      id: s.id,
      noteId: s.noteId,
      mediaType: s.mediaType as NoteMediaRecord['mediaType'],
      fileKey: s.fileKey,
      fileName: s.fileName,
      mimeType: s.mimeType,
      capturedAt: s.capturedAt,
      description: s.description,
      bodyRegion: s.bodyRegion,
      uploadedAt: s.uploadedAt,
    };
  }

  private mapDrawing(s: StoredAnatomicalDrawing): AnatomicalDrawingRecord {
    return {
      id: s.id,
      noteId: s.noteId,
      bodyRegion: s.bodyRegion,
      annotations: s.annotations,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapTemplate(s: StoredSpecialtyTemplate): SpecialtyTemplateRecord {
    return {
      id: s.id,
      specialty: s.specialty,
      sections: s.sections,
      embeddedScores: s.embeddedScores,
      fields: s.fields,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
