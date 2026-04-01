import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSmartPhraseDto,
  ExpandSmartPhraseDto,
  ResolveSmartLinkDto,
  CopyForwardDto,
  LockNoteDto,
  AddendumDto,
  SmartPhraseResponse,
  ExpandedPhraseResponse,
  SmartLinkResolvedResponse,
  SmartLinkKeyword,
  SmartLinkLabData,
  SmartLinkVitalsData,
  SmartLinkMedicationData,
  SmartLinkAllergyData,
  SmartLinkProblemData,
  CopyForwardResultResponse,
  ChangeMarker,
  NoteHistoryResponse,
  NoteVersionResponse,
  NoteSignatureType,
  SmartPhraseVariableType,
  SmartPhraseVariableDto,
} from './dto/smart-documentation.dto';

interface StoredSmartPhrase {
  id: string;
  abbreviation: string;
  expansionText: string;
  variables: SmartPhraseVariableDto[];
  ownerId: string | null;
  specialty: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory store for SmartPhrases. In production this would be backed by a
 * dedicated Prisma model. Using a Map here keeps the feature functional
 * without requiring a schema migration.
 */
const smartPhraseStore = new Map<string, StoredSmartPhrase>();

@Injectable()
export class SmartDocumentationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SmartPhrases ───────────────────────────────────────────────────────

  async createSmartPhrase(
    userId: string,
    dto: CreateSmartPhraseDto,
  ): Promise<SmartPhraseResponse> {
    // Check for duplicate abbreviation for the same owner
    for (const phrase of smartPhraseStore.values()) {
      if (
        phrase.abbreviation === dto.abbreviation &&
        (phrase.ownerId === (dto.ownerId ?? userId) || phrase.ownerId === null)
      ) {
        throw new ConflictException(
          `SmartPhrase with abbreviation "${dto.abbreviation}" already exists`,
        );
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredSmartPhrase = {
      id,
      abbreviation: dto.abbreviation,
      expansionText: dto.expansionText,
      variables: dto.variables ?? [],
      ownerId: dto.ownerId ?? userId,
      specialty: dto.specialty ?? null,
      category: dto.category ?? null,
      createdAt: now,
      updatedAt: now,
    };

    smartPhraseStore.set(id, stored);

    return this.toSmartPhraseResponse(stored);
  }

  async getSmartPhrases(filters: {
    userId?: string;
    shared?: boolean;
    specialty?: string;
    abbreviation?: string;
  }): Promise<SmartPhraseResponse[]> {
    const results: SmartPhraseResponse[] = [];

    for (const phrase of smartPhraseStore.values()) {
      let match = true;

      if (filters.userId && !filters.shared) {
        match = match && phrase.ownerId === filters.userId;
      }
      if (filters.shared) {
        match =
          match &&
          (phrase.ownerId === null ||
            phrase.ownerId === filters.userId);
      }
      if (filters.specialty) {
        match =
          match &&
          phrase.specialty?.toLowerCase() === filters.specialty.toLowerCase();
      }
      if (filters.abbreviation) {
        match =
          match &&
          phrase.abbreviation
            .toLowerCase()
            .includes(filters.abbreviation.toLowerCase());
      }

      if (match) {
        results.push(this.toSmartPhraseResponse(phrase));
      }
    }

    return results.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  async expandSmartPhrase(
    userId: string,
    dto: ExpandSmartPhraseDto,
  ): Promise<ExpandedPhraseResponse> {
    // Find the phrase by abbreviation (user-owned first, then shared)
    let phrase: StoredSmartPhrase | undefined;
    for (const p of smartPhraseStore.values()) {
      if (p.abbreviation === dto.abbreviation) {
        if (p.ownerId === userId) {
          phrase = p;
          break; // user-owned takes priority
        }
        if (!phrase) {
          phrase = p; // fallback to shared/other
        }
      }
    }

    if (!phrase) {
      throw new NotFoundException(
        `SmartPhrase with abbreviation "${dto.abbreviation}" not found`,
      );
    }

    let expandedText = phrase.expansionText;
    const unresolvedVariables: string[] = [];
    const valueMap = new Map<string, string>();

    // Build value map from provided variable values
    if (dto.variableValues) {
      for (const v of dto.variableValues) {
        valueMap.set(v.name, v.value);
      }
    }

    // Replace variables
    for (const variable of phrase.variables) {
      const placeholder = `{{${variable.name}}}`;
      if (!expandedText.includes(placeholder)) {
        continue;
      }

      const providedValue = valueMap.get(variable.name);

      if (providedValue) {
        expandedText = expandedText.replaceAll(placeholder, providedValue);
        continue;
      }

      // Try to auto-resolve PATIENT_DATA and LAB_RESULT variables
      if (
        variable.type === SmartPhraseVariableType.PATIENT_DATA &&
        dto.patientId
      ) {
        const resolved = await this.resolvePatientDataVariable(
          dto.patientId,
          variable.name,
        );
        if (resolved) {
          expandedText = expandedText.replaceAll(placeholder, resolved);
          continue;
        }
      }

      if (
        variable.type === SmartPhraseVariableType.LAB_RESULT &&
        dto.patientId
      ) {
        const resolved = await this.resolveLabResultVariable(
          dto.patientId,
          variable.name,
        );
        if (resolved) {
          expandedText = expandedText.replaceAll(placeholder, resolved);
          continue;
        }
      }

      unresolvedVariables.push(variable.name);
    }

    return {
      originalAbbreviation: dto.abbreviation,
      expandedText,
      unresolvedVariables,
    };
  }

  // ─── SmartLinks ─────────────────────────────────────────────────────────

  async resolveSmartLink(
    dto: ResolveSmartLinkDto,
  ): Promise<SmartLinkResolvedResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID "${dto.patientId}" not found`,
      );
    }

    switch (dto.keyword) {
      case SmartLinkKeyword.LAB_RECENTE:
        return this.resolveLabRecente(dto.patientId);
      case SmartLinkKeyword.SINAIS_VITAIS:
        return this.resolveSinaisVitais(dto.patientId);
      case SmartLinkKeyword.MEDICAMENTOS:
        return this.resolveMedicamentos(dto.patientId);
      case SmartLinkKeyword.ALERGIAS:
        return this.resolveAlergias(dto.patientId);
      case SmartLinkKeyword.PROBLEMAS:
        return this.resolveProblemas(dto.patientId);
      default: {
        const exhaustive: never = dto.keyword;
        throw new BadRequestException(
          `Unknown SmartLink keyword: ${exhaustive as string}`,
        );
      }
    }
  }

  // ─── CopyForward ───────────────────────────────────────────────────────

  async copyForwardNote(
    userId: string,
    dto: CopyForwardDto,
  ): Promise<CopyForwardResultResponse> {
    const sourceNote = await this.prisma.clinicalNote.findUnique({
      where: { id: dto.sourceNoteId },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    if (!sourceNote) {
      throw new NotFoundException(
        `Source note with ID "${dto.sourceNoteId}" not found`,
      );
    }

    // Verify target encounter exists
    const targetEncounter = await this.prisma.encounter.findUnique({
      where: { id: dto.targetEncounterId },
    });

    if (!targetEncounter) {
      throw new NotFoundException(
        `Target encounter with ID "${dto.targetEncounterId}" not found`,
      );
    }

    const changeMarkers: ChangeMarker[] = [];

    if (dto.highlightChanges !== false) {
      const fields = [
        'subjective',
        'objective',
        'assessment',
        'plan',
        'freeText',
      ] as const;
      for (const field of fields) {
        if (sourceNote[field]) {
          changeMarkers.push({
            field,
            sourceValue: sourceNote[field],
            note: `Copied from note dated ${sourceNote.createdAt.toISOString()} by ${sourceNote.author.name}. Review and update as needed.`,
          });
        }
      }
    }

    return {
      copiedContent: {
        subjective: sourceNote.subjective,
        objective: sourceNote.objective,
        assessment: sourceNote.assessment,
        plan: sourceNote.plan,
        freeText: sourceNote.freeText,
        diagnosisCodes: sourceNote.diagnosisCodes,
        procedureCodes: sourceNote.procedureCodes,
      },
      sourceDate: sourceNote.createdAt,
      sourceAuthor: {
        id: sourceNote.author.id,
        name: sourceNote.author.name,
      },
      changeMarkers,
    };
  }

  // ─── NoteLocking ────────────────────────────────────────────────────────

  async lockNote(
    noteId: string,
    userId: string,
    dto: LockNoteDto,
  ): Promise<{ noteId: string; lockedAt: Date; signatureType: NoteSignatureType }> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException(`Clinical note with ID "${noteId}" not found`);
    }

    if (note.status === 'SIGNED' || note.status === 'COSIGNED') {
      throw new BadRequestException('Note is already locked/signed');
    }

    if (
      dto.signatureType === NoteSignatureType.DIGITAL_ICP &&
      !dto.signatureHash
    ) {
      throw new BadRequestException(
        'Digital signature hash is required for DIGITAL_ICP signature type',
      );
    }

    const now = new Date();

    await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        status: 'SIGNED',
        signedAt: now,
        signedById: userId,
        digitalSignatureHash: dto.signatureHash ?? null,
        signatureBlock: dto.signatureBlock ?? null,
      },
    });

    return {
      noteId,
      lockedAt: now,
      signatureType: dto.signatureType,
    };
  }

  async addAddendum(
    noteId: string,
    userId: string,
    dto: AddendumDto,
  ): Promise<{ id: string; originalNoteId: string; createdAt: Date }> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException(`Clinical note with ID "${noteId}" not found`);
    }

    if (note.status !== 'SIGNED' && note.status !== 'COSIGNED') {
      throw new BadRequestException(
        'Addenda can only be added to signed/locked notes',
      );
    }

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Mark parent as amended
    await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: { status: 'AMENDED' },
    });

    // Create the addendum as a child note
    const addendum = await this.prisma.clinicalNote.create({
      data: {
        encounterId: note.encounterId,
        authorId: userId,
        authorRole: author.role,
        type: 'ADDENDUM',
        freeText: `[ADDENDUM] ${dto.addendumText}\n\n[REASON] ${dto.reason}`,
        parentNoteId: noteId,
        version: note.version + 1,
        diagnosisCodes: [],
        procedureCodes: [],
      },
    });

    return {
      id: addendum.id,
      originalNoteId: noteId,
      createdAt: addendum.createdAt,
    };
  }

  async getNoteHistory(noteId: string): Promise<NoteHistoryResponse> {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        amendments: {
          orderBy: { version: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Clinical note with ID "${noteId}" not found`);
    }

    const isLocked =
      note.status === 'SIGNED' ||
      note.status === 'COSIGNED' ||
      note.status === 'AMENDED';

    // Build version list: original note + all amendments
    const versions: NoteVersionResponse[] = [
      {
        versionNumber: note.version,
        content: {
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          freeText: note.freeText,
        },
        author: {
          id: note.author.id,
          name: note.author.name,
          role: note.author.role,
        },
        timestamp: note.createdAt,
        isLocked,
        signatureType: note.digitalSignatureHash
          ? NoteSignatureType.DIGITAL_ICP
          : note.signedAt
            ? NoteSignatureType.ELECTRONIC
            : null,
        addenda: [],
      },
    ];

    // Map amendments as addenda on the original version
    const addendaEntries = note.amendments.map((amendment) => ({
      id: amendment.id,
      text: amendment.freeText ?? '',
      reason: this.extractReason(amendment.freeText),
      author: {
        id: amendment.author.id,
        name: amendment.author.name,
      },
      createdAt: amendment.createdAt,
    }));

    if (versions[0]) {
      versions[0].addenda = addendaEntries;
    }

    // Also add each amendment as its own version entry
    for (const amendment of note.amendments) {
      versions.push({
        versionNumber: amendment.version,
        content: {
          subjective: amendment.subjective,
          objective: amendment.objective,
          assessment: amendment.assessment,
          plan: amendment.plan,
          freeText: amendment.freeText,
        },
        author: {
          id: amendment.author.id,
          name: amendment.author.name,
          role: amendment.author.role,
        },
        timestamp: amendment.createdAt,
        isLocked: amendment.status === 'SIGNED' || amendment.status === 'COSIGNED',
        signatureType: amendment.digitalSignatureHash
          ? NoteSignatureType.DIGITAL_ICP
          : amendment.signedAt
            ? NoteSignatureType.ELECTRONIC
            : null,
        addenda: [],
      });
    }

    return {
      noteId,
      currentVersion: Math.max(...versions.map((v) => v.versionNumber)),
      isLocked,
      versions,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private toSmartPhraseResponse(stored: StoredSmartPhrase): SmartPhraseResponse {
    return {
      id: stored.id,
      abbreviation: stored.abbreviation,
      expansionText: stored.expansionText,
      variables: stored.variables,
      ownerId: stored.ownerId,
      specialty: stored.specialty,
      category: stored.category as SmartPhraseResponse['category'],
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  private async resolvePatientDataVariable(
    patientId: string,
    variableName: string,
  ): Promise<string | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        fullName: true,
        socialName: true,
        birthDate: true,
        gender: true,
        cpf: true,
        mrn: true,
        bloodType: true,
      },
    });

    if (!patient) return null;

    const fieldMap: Record<string, string | null> = {
      nome: patient.socialName ?? patient.fullName,
      nome_completo: patient.fullName,
      data_nascimento: patient.birthDate?.toLocaleDateString('pt-BR') ?? null,
      sexo: patient.gender,
      cpf: patient.cpf,
      prontuario: patient.mrn,
      tipo_sanguineo: patient.bloodType,
    };

    return fieldMap[variableName.toLowerCase()] ?? null;
  }

  private async resolveLabResultVariable(
    patientId: string,
    variableName: string,
  ): Promise<string | null> {
    const latestExam = await this.prisma.examResult.findFirst({
      where: {
        patientId,
        examName: { contains: variableName, mode: 'insensitive' },
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!latestExam) return null;

    return JSON.stringify(latestExam.labResults);
  }

  private async resolveLabRecente(
    patientId: string,
  ): Promise<SmartLinkResolvedResponse> {
    const exams = await this.prisma.examResult.findMany({
      where: {
        patientId,
        examType: 'LABORATORY',
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        examName: true,
        examCode: true,
        labResults: true,
        completedAt: true,
        status: true,
      },
    });

    const data: SmartLinkLabData[] = exams.map((e) => ({
      examName: e.examName,
      examCode: e.examCode,
      labResults: e.labResults as Record<string, unknown> | null,
      completedAt: e.completedAt,
      status: e.status,
    }));

    const formattedLines = data.map(
      (d) =>
        `- ${d.examName}${d.completedAt ? ` (${d.completedAt.toLocaleDateString('pt-BR')})` : ''}: ${d.status}`,
    );

    return {
      keyword: SmartLinkKeyword.LAB_RECENTE,
      prefix: '@',
      resolvedAt: new Date(),
      data,
      formattedText:
        formattedLines.length > 0
          ? `Exames laboratoriais recentes:\n${formattedLines.join('\n')}`
          : 'Nenhum exame laboratorial encontrado.',
    };
  }

  private async resolveSinaisVitais(
    patientId: string,
  ): Promise<SmartLinkResolvedResponse> {
    const vitals = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      select: {
        recordedAt: true,
        systolicBP: true,
        diastolicBP: true,
        heartRate: true,
        respiratoryRate: true,
        temperature: true,
        oxygenSaturation: true,
        painScale: true,
      },
    });

    const data: SmartLinkVitalsData = vitals ?? {
      recordedAt: new Date(),
      systolicBP: null,
      diastolicBP: null,
      heartRate: null,
      respiratoryRate: null,
      temperature: null,
      oxygenSaturation: null,
      painScale: null,
    };

    const parts: string[] = [];
    if (data.systolicBP !== null && data.diastolicBP !== null) {
      parts.push(`PA: ${data.systolicBP}/${data.diastolicBP} mmHg`);
    }
    if (data.heartRate !== null) {
      parts.push(`FC: ${data.heartRate} bpm`);
    }
    if (data.respiratoryRate !== null) {
      parts.push(`FR: ${data.respiratoryRate} irpm`);
    }
    if (data.temperature !== null) {
      parts.push(`Temp: ${data.temperature}°C`);
    }
    if (data.oxygenSaturation !== null) {
      parts.push(`SpO2: ${data.oxygenSaturation}%`);
    }
    if (data.painScale !== null) {
      parts.push(`Dor: ${data.painScale}/10`);
    }

    return {
      keyword: SmartLinkKeyword.SINAIS_VITAIS,
      prefix: '@',
      resolvedAt: new Date(),
      data,
      formattedText:
        parts.length > 0
          ? `Sinais vitais (${data.recordedAt.toLocaleDateString('pt-BR')} ${data.recordedAt.toLocaleTimeString('pt-BR')}): ${parts.join(' | ')}`
          : 'Nenhum registro de sinais vitais encontrado.',
    };
  }

  private async resolveMedicamentos(
    patientId: string,
  ): Promise<SmartLinkResolvedResponse> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          select: {
            medicationName: true,
            dose: true,
            route: true,
            frequency: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const data: SmartLinkMedicationData[] = prescriptions.flatMap((p) =>
      p.items
        .filter((item) => item.medicationName !== null)
        .map((item) => ({
          medicationName: item.medicationName as string,
          dose: item.dose,
          route: item.route,
          frequency: item.frequency,
          status: item.status,
          startDate: item.createdAt,
        })),
    );

    const formattedLines = data.map(
      (d) =>
        `- ${d.medicationName} ${d.dose ?? ''} ${d.route ?? ''} ${d.frequency ?? ''}`.trim(),
    );

    return {
      keyword: SmartLinkKeyword.MEDICAMENTOS,
      prefix: '@',
      resolvedAt: new Date(),
      data,
      formattedText:
        formattedLines.length > 0
          ? `Medicamentos em uso:\n${formattedLines.join('\n')}`
          : 'Nenhum medicamento ativo encontrado.',
    };
  }

  private async resolveAlergias(
    patientId: string,
  ): Promise<SmartLinkResolvedResponse> {
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: {
        substance: true,
        type: true,
        severity: true,
        reaction: true,
      },
    });

    const data: SmartLinkAllergyData[] = allergies.map((a) => ({
      substance: a.substance,
      type: a.type,
      severity: a.severity,
      reaction: a.reaction,
    }));

    const formattedLines = data.map(
      (d) => `- ${d.substance} (${d.severity}): ${d.reaction ?? 'sem reacao registrada'}`,
    );

    return {
      keyword: SmartLinkKeyword.ALERGIAS,
      prefix: '@',
      resolvedAt: new Date(),
      data,
      formattedText:
        formattedLines.length > 0
          ? `Alergias:\n${formattedLines.join('\n')}`
          : 'NKDA (sem alergias conhecidas)',
    };
  }

  private async resolveProblemas(
    patientId: string,
  ): Promise<SmartLinkResolvedResponse> {
    const conditions = await this.prisma.chronicCondition.findMany({
      where: { patientId, status: 'ACTIVE' },
      orderBy: { diagnosedAt: 'desc' },
      select: {
        cidCode: true,
        cidDescription: true,
        status: true,
        severity: true,
        diagnosedAt: true,
      },
    });

    const data: SmartLinkProblemData[] = conditions.map((c) => ({
      cidCode: c.cidCode,
      cidDescription: c.cidDescription,
      status: c.status,
      severity: c.severity,
      diagnosedAt: c.diagnosedAt,
    }));

    const formattedLines = data.map(
      (d) =>
        `- ${d.cidDescription ?? 'Sem descricao'} (${d.cidCode ?? 'CID N/A'}) - ${d.severity ?? 'gravidade nao informada'}`,
    );

    return {
      keyword: SmartLinkKeyword.PROBLEMAS,
      prefix: '@',
      resolvedAt: new Date(),
      data,
      formattedText:
        formattedLines.length > 0
          ? `Lista de problemas ativos:\n${formattedLines.join('\n')}`
          : 'Nenhum problema ativo registrado.',
    };
  }

  private extractReason(freeText: string | null): string {
    if (!freeText) return '';
    const reasonMatch = /\[REASON]\s*(.+)/s.exec(freeText);
    return reasonMatch?.[1]?.trim() ?? '';
  }
}
