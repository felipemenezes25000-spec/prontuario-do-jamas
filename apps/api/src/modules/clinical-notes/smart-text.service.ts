import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SmartPhraseDto,
  UpdateSmartPhraseTextDto,
  ExpandSmartPhraseTextDto,
  SmartLinkDto,
  ResolveSmartLinkTextDto,
  ExamMacroDto,
  ApplyExamMacroDto,
  NoteDiffDto,
  ExamSystem,
  SmartLinkDataSource,
  SmartPhraseTextRecord,
  ExpandedSmartPhraseResult,
  SmartLinkRecord,
  ResolvedSmartLinkResult,
  ExamMacroRecord,
  AppliedExamMacroResult,
  NoteDiffHunk,
  NoteDiffResult,
  SmartPhraseVariableKind,
  SmartPhraseTextCategory,
} from './dto/smart-text.dto';

// ─── In-memory stores (replace with Prisma models after schema migration) ─────

interface StoredSmartPhrase {
  id: string;
  abbreviation: string;
  expansion: string;
  variables: { name: string; kind: SmartPhraseVariableKind; defaultValue?: string }[];
  personalPerDoctor: boolean;
  ownerId: string | null;
  category: SmartPhraseTextCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredSmartLink {
  id: string;
  keyword: string;
  dataSource: SmartLinkDataSource;
  autoUpdate: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredExamMacro {
  id: string;
  system: ExamSystem;
  normalTemplate: string;
  findings: string[];
  specialty: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const phraseStore = new Map<string, StoredSmartPhrase>();
const linkStore = new Map<string, StoredSmartLink>();
const macroStore = new Map<string, StoredExamMacro>();

// Seed default exam macros
const DEFAULT_MACROS: Omit<StoredExamMacro, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    system: ExamSystem.CARDIO,
    specialty: null,
    normalTemplate:
      'Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas sem sopros. ' +
      'Pulsos periféricos palpáveis e simétricos. Sem turgência jugular. ' +
      'Tempo de enchimento capilar < 2 segundos.',
    findings: [
      'Sopro sistólico +/4+ em foco mitral',
      'Bulhas hipofonéticas',
      'Ritmo irregular',
      'Turgência jugular presente',
      'Edema de membros inferiores',
    ],
  },
  {
    system: ExamSystem.PULMONARY,
    specialty: null,
    normalTemplate:
      'Tórax simétrico com expansibilidade normal. Murmúrio vesicular presente ' +
      'bilateralmente sem ruídos adventícios. Percussão com som claro pulmonar.',
    findings: [
      'Crepitações em base direita',
      'Crepitações em base esquerda',
      'Roncos difusos',
      'Sibilos expiratórios',
      'Diminuição do murmúrio vesicular',
    ],
  },
  {
    system: ExamSystem.ABDOMEN,
    specialty: null,
    normalTemplate:
      'Abdome plano, simétrico, sem cicatrizes. Ruídos hidroaéreos presentes e ' +
      'normoativos. Timpanismo à percussão. Indolor à palpação superficial e profunda, ' +
      'sem visceromegalias. Ausência de massas palpáveis.',
    findings: [
      'Dor à palpação em FID',
      'Dor à palpação em hipocôndrio direito',
      'Hepatomegalia',
      'Esplenomegalia',
      'Sinal de Murphy positivo',
      'Distensão abdominal',
      'Hipertimpanismo',
    ],
  },
  {
    system: ExamSystem.NEURO,
    specialty: null,
    normalTemplate:
      'Orientado em tempo e espaço. Linguagem clara e coerente. Nervos cranianos ' +
      'íntegros. Força muscular 5/5 em membros superiores e inferiores. Reflexos ' +
      'tendinosos ++/4+ e simétricos. Sem déficit sensitivo. Coordenação preservada. ' +
      'Marcha normal. Romberg negativo.',
    findings: [
      'Hemiparesia direita',
      'Hemiparesia esquerda',
      'Afasia',
      'Sinal de Babinski positivo',
      'Reflexos exaltados',
      'Rigidez de nuca',
      'Ataxia de marcha',
    ],
  },
  {
    system: ExamSystem.MUSCULOSKELETAL,
    specialty: null,
    normalTemplate:
      'Sem deformidades ou assimetrias. Amplitude de movimento preservada em todos ' +
      'os planos. Sem dor à palpação de articulações. Força muscular global 5/5.',
    findings: [
      'Edema articular',
      'Calor e rubor articular',
      'Limitação de amplitude de movimento',
      'Dor à palpação',
      'Crepitação articular',
    ],
  },
];

(function seedMacros() {
  for (const m of DEFAULT_MACROS) {
    const id = crypto.randomUUID();
    const now = new Date();
    macroStore.set(id, { id, ...m, createdAt: now, updatedAt: now });
  }
})();

@Injectable()
export class SmartTextService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SmartPhrases ───────────────────────────────────────────────────────────

  async createSmartPhrase(
    userId: string,
    dto: SmartPhraseDto,
  ): Promise<SmartPhraseTextRecord> {
    // Check for duplicate abbreviation per owner
    for (const p of phraseStore.values()) {
      const sameOwner =
        p.ownerId === (dto.ownerId ?? userId) || p.ownerId === null;
      if (p.abbreviation === dto.abbreviation && sameOwner) {
        throw new ConflictException(
          `SmartPhrase abbreviation "${dto.abbreviation}" already exists`,
        );
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredSmartPhrase = {
      id,
      abbreviation: dto.abbreviation,
      expansion: dto.expansion,
      variables: dto.variables ?? [],
      personalPerDoctor: dto.personalPerDoctor ?? false,
      ownerId: dto.personalPerDoctor ? (dto.ownerId ?? userId) : null,
      category: dto.category ?? null,
      createdAt: now,
      updatedAt: now,
    };
    phraseStore.set(id, stored);
    return this.mapPhrase(stored);
  }

  async listSmartPhrases(filters: {
    userId?: string;
    category?: string;
    abbreviation?: string;
  }): Promise<SmartPhraseTextRecord[]> {
    const results: SmartPhraseTextRecord[] = [];
    for (const p of phraseStore.values()) {
      let match = true;
      if (filters.userId) {
        match =
          match && (p.ownerId === filters.userId || p.ownerId === null);
      }
      if (filters.category) {
        match =
          match &&
          p.category?.toLowerCase() === filters.category.toLowerCase();
      }
      if (filters.abbreviation) {
        match =
          match &&
          p.abbreviation
            .toLowerCase()
            .includes(filters.abbreviation.toLowerCase());
      }
      if (match) results.push(this.mapPhrase(p));
    }
    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateSmartPhrase(
    id: string,
    dto: UpdateSmartPhraseTextDto,
  ): Promise<SmartPhraseTextRecord> {
    const existing = phraseStore.get(id);
    if (!existing) {
      throw new NotFoundException(`SmartPhrase "${id}" not found`);
    }
    const updated: StoredSmartPhrase = {
      ...existing,
      abbreviation: dto.abbreviation ?? existing.abbreviation,
      expansion: dto.expansion ?? existing.expansion,
      variables: dto.variables ?? existing.variables,
      personalPerDoctor: dto.personalPerDoctor ?? existing.personalPerDoctor,
      category: dto.category ?? existing.category,
      updatedAt: new Date(),
    };
    phraseStore.set(id, updated);
    return this.mapPhrase(updated);
  }

  async deleteSmartPhrase(id: string): Promise<{ deleted: boolean }> {
    if (!phraseStore.has(id)) {
      throw new NotFoundException(`SmartPhrase "${id}" not found`);
    }
    phraseStore.delete(id);
    return { deleted: true };
  }

  async expandSmartPhrase(
    userId: string,
    dto: ExpandSmartPhraseTextDto,
  ): Promise<ExpandedSmartPhraseResult> {
    // User-owned phrase takes priority over shared
    let phrase: StoredSmartPhrase | undefined;
    for (const p of phraseStore.values()) {
      if (p.abbreviation === dto.abbreviation) {
        if (p.ownerId === userId) { phrase = p; break; }
        if (!phrase) phrase = p;
      }
    }
    if (!phrase) {
      throw new NotFoundException(
        `SmartPhrase abbreviation "${dto.abbreviation}" not found`,
      );
    }

    let expandedText = phrase.expansion;
    const unresolvedVariables: string[] = [];

    for (const variable of phrase.variables) {
      const placeholder = `{{${variable.name}}}`;
      if (!expandedText.includes(placeholder)) continue;

      const provided = dto.variableValues?.[variable.name];
      if (provided) {
        expandedText = expandedText.replaceAll(placeholder, provided);
        continue;
      }
      if (variable.defaultValue) {
        expandedText = expandedText.replaceAll(placeholder, variable.defaultValue);
        continue;
      }
      // Auto-resolve patient data
      if (variable.kind === SmartPhraseVariableKind.PATIENT_DATA && dto.patientId) {
        const resolved = await this.resolvePatientVar(dto.patientId, variable.name);
        if (resolved) {
          expandedText = expandedText.replaceAll(placeholder, resolved);
          continue;
        }
      }
      if (variable.kind === SmartPhraseVariableKind.LAB_RESULT && dto.patientId) {
        const resolved = await this.resolveLabVar(dto.patientId, variable.name);
        if (resolved) {
          expandedText = expandedText.replaceAll(placeholder, resolved);
          continue;
        }
      }
      unresolvedVariables.push(variable.name);
    }

    return { abbreviation: dto.abbreviation, expandedText, unresolvedVariables };
  }

  // ─── SmartLinks ─────────────────────────────────────────────────────────────

  async createSmartLink(dto: SmartLinkDto): Promise<SmartLinkRecord> {
    for (const l of linkStore.values()) {
      if (l.keyword === dto.keyword) {
        throw new ConflictException(`SmartLink keyword "${dto.keyword}" already exists`);
      }
    }
    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredSmartLink = {
      id,
      keyword: dto.keyword,
      dataSource: dto.dataSource,
      autoUpdate: dto.autoUpdate ?? false,
      description: dto.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    linkStore.set(id, stored);
    return this.mapLink(stored);
  }

  async listSmartLinks(): Promise<SmartLinkRecord[]> {
    return [...linkStore.values()]
      .map(this.mapLink)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async deleteSmartLink(id: string): Promise<{ deleted: boolean }> {
    if (!linkStore.has(id)) {
      throw new NotFoundException(`SmartLink "${id}" not found`);
    }
    linkStore.delete(id);
    return { deleted: true };
  }

  async resolveSmartLink(
    dto: ResolveSmartLinkTextDto,
  ): Promise<ResolvedSmartLinkResult> {
    // Ensure patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Find link definition by keyword
    let linkDef: StoredSmartLink | undefined;
    for (const l of linkStore.values()) {
      if (l.keyword === dto.keyword) { linkDef = l; break; }
    }

    // Determine dataSource — from registered link or infer from keyword suffix
    const dataSource = linkDef?.dataSource ?? this.inferDataSource(dto.keyword);

    switch (dataSource) {
      case SmartLinkDataSource.LAB:
        return this.fetchLabData(dto.keyword, dto.patientId, dataSource);
      case SmartLinkDataSource.VITALS:
        return this.fetchVitalsData(dto.keyword, dto.patientId, dataSource);
      case SmartLinkDataSource.MEDS:
        return this.fetchMedsData(dto.keyword, dto.patientId, dataSource);
      case SmartLinkDataSource.DIAGNOSES:
        return this.fetchDiagnosesData(dto.keyword, dto.patientId, dataSource);
      default: {
        const _exhaustive: never = dataSource;
        throw new BadRequestException(`Unknown data source: ${_exhaustive as string}`);
      }
    }
  }

  // ─── Exam Macros ─────────────────────────────────────────────────────────────

  async listExamMacros(system?: string): Promise<ExamMacroRecord[]> {
    const all = [...macroStore.values()].map(this.mapMacro);
    if (system) {
      return all.filter((m) => m.system === system);
    }
    return all;
  }

  async createExamMacro(dto: ExamMacroDto): Promise<ExamMacroRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const stored: StoredExamMacro = {
      id,
      system: dto.system,
      normalTemplate: dto.normalTemplate,
      findings: dto.findings ?? [],
      specialty: dto.specialty ?? null,
      createdAt: now,
      updatedAt: now,
    };
    macroStore.set(id, stored);
    return this.mapMacro(stored);
  }

  async updateExamMacro(
    id: string,
    dto: Partial<ExamMacroDto>,
  ): Promise<ExamMacroRecord> {
    const existing = macroStore.get(id);
    if (!existing) {
      throw new NotFoundException(`ExamMacro "${id}" not found`);
    }
    const updated: StoredExamMacro = {
      ...existing,
      normalTemplate: dto.normalTemplate ?? existing.normalTemplate,
      findings: dto.findings ?? existing.findings,
      specialty: dto.specialty ?? existing.specialty,
      updatedAt: new Date(),
    };
    macroStore.set(id, updated);
    return this.mapMacro(updated);
  }

  async applyExamMacro(dto: ApplyExamMacroDto): Promise<AppliedExamMacroResult> {
    // Find the macro for this system
    let macro: StoredExamMacro | undefined;
    for (const m of macroStore.values()) {
      if (m.system === dto.system) { macro = m; break; }
    }
    if (!macro) {
      throw new NotFoundException(`No macro found for system "${dto.system}"`);
    }

    let resultText = macro.normalTemplate;
    const appliedFindings: string[] = [];

    if (dto.selectedFindings && dto.selectedFindings.length > 0) {
      const findingsBlock = dto.selectedFindings
        .map((f) => `• ${f}`)
        .join('\n');
      resultText += `\n\nAchados relevantes:\n${findingsBlock}`;
      appliedFindings.push(...dto.selectedFindings);
    }

    if (dto.freeTextOverride) {
      resultText += `\n\n${dto.freeTextOverride}`;
    }

    return { system: dto.system, resultText, appliedFindings };
  }

  // ─── Note Diff ───────────────────────────────────────────────────────────────

  async diffNotes(dto: NoteDiffDto): Promise<NoteDiffResult> {
    const [note1, note2] = await Promise.all([
      this.prisma.clinicalNote.findUnique({
        where: { id: dto.noteId1 },
        include: { author: { select: { name: true } } },
      }),
      this.prisma.clinicalNote.findUnique({
        where: { id: dto.noteId2 },
        include: { author: { select: { name: true } } },
      }),
    ]);

    if (!note1) throw new NotFoundException(`Note "${dto.noteId1}" not found`);
    if (!note2) throw new NotFoundException(`Note "${dto.noteId2}" not found`);

    const fields = ['subjective', 'objective', 'assessment', 'plan', 'freeText'] as const;
    const hunks: NoteDiffHunk[] = fields.map((field) => {
      const old = (note1[field] as string | null) ?? null;
      const nw = (note2[field] as string | null) ?? null;
      let changeType: NoteDiffHunk['changeType'] = 'unchanged';
      if (old === null && nw !== null) changeType = 'added';
      else if (old !== null && nw === null) changeType = 'removed';
      else if (old !== nw) changeType = 'modified';
      return { field, oldText: old, newText: nw, changeType };
    });

    const changedCount = hunks.filter((h) => h.changeType !== 'unchanged').length;
    const summary =
      changedCount === 0
        ? 'Notas idênticas — nenhuma diferença encontrada.'
        : `${changedCount} seção(ões) com diferenças detectadas.`;

    return {
      noteId1: dto.noteId1,
      noteId2: dto.noteId2,
      date1: note1.createdAt,
      date2: note2.createdAt,
      author1: note1.author.name,
      author2: note2.author.name,
      hunks,
      summary,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private mapPhrase(s: StoredSmartPhrase): SmartPhraseTextRecord {
    return {
      id: s.id,
      abbreviation: s.abbreviation,
      expansion: s.expansion,
      variables: s.variables,
      personalPerDoctor: s.personalPerDoctor,
      ownerId: s.ownerId,
      category: s.category,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapLink(s: StoredSmartLink): SmartLinkRecord {
    return {
      id: s.id,
      keyword: s.keyword,
      dataSource: s.dataSource,
      autoUpdate: s.autoUpdate,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private mapMacro(s: StoredExamMacro): ExamMacroRecord {
    return {
      id: s.id,
      system: s.system,
      normalTemplate: s.normalTemplate,
      findings: s.findings,
      specialty: s.specialty,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private inferDataSource(keyword: string): SmartLinkDataSource {
    const k = keyword.toLowerCase();
    if (k.includes('lab') || k.includes('exame')) return SmartLinkDataSource.LAB;
    if (k.includes('vital') || k.includes('sinal')) return SmartLinkDataSource.VITALS;
    if (k.includes('med') || k.includes('farm')) return SmartLinkDataSource.MEDS;
    return SmartLinkDataSource.DIAGNOSES;
  }

  private async fetchLabData(
    keyword: string,
    patientId: string,
    dataSource: SmartLinkDataSource,
  ): Promise<ResolvedSmartLinkResult> {
    const exams = await this.prisma.examResult.findMany({
      where: { patientId, examType: 'LABORATORY' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { examName: true, labResults: true, completedAt: true, status: true },
    });
    const lines = exams.map(
      (e) =>
        `• ${e.examName}${e.completedAt ? ` (${e.completedAt.toLocaleDateString('pt-BR')})` : ''}: ${e.status}`,
    );
    return {
      keyword,
      dataSource,
      resolvedAt: new Date(),
      formattedText:
        lines.length > 0
          ? `Exames laboratoriais recentes:\n${lines.join('\n')}`
          : 'Nenhum exame laboratorial encontrado.',
      rawData: exams,
    };
  }

  private async fetchVitalsData(
    keyword: string,
    patientId: string,
    dataSource: SmartLinkDataSource,
  ): Promise<ResolvedSmartLinkResult> {
    const v = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });
    const parts: string[] = [];
    if (v) {
      if (v.systolicBP !== null && v.diastolicBP !== null)
        parts.push(`PA: ${v.systolicBP}/${v.diastolicBP} mmHg`);
      if (v.heartRate !== null) parts.push(`FC: ${v.heartRate} bpm`);
      if (v.respiratoryRate !== null) parts.push(`FR: ${v.respiratoryRate} irpm`);
      if (v.temperature !== null) parts.push(`Temp: ${v.temperature}°C`);
      if (v.oxygenSaturation !== null) parts.push(`SpO2: ${v.oxygenSaturation}%`);
    }
    return {
      keyword,
      dataSource,
      resolvedAt: new Date(),
      formattedText: parts.length > 0 ? parts.join(' | ') : 'Sinais vitais não disponíveis.',
      rawData: v,
    };
  }

  private async fetchMedsData(
    keyword: string,
    patientId: string,
    dataSource: SmartLinkDataSource,
  ): Promise<ResolvedSmartLinkResult> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId, status: 'ACTIVE' },
      include: {
        items: { select: { medicationName: true, dose: true, route: true, frequency: true } },
      },
      take: 20,
    });
    const lines = prescriptions.flatMap((p) =>
      p.items
        .filter((i) => i.medicationName)
        .map((i) => `• ${i.medicationName} ${i.dose ?? ''} ${i.route ?? ''} ${i.frequency ?? ''}`.trim()),
    );
    return {
      keyword,
      dataSource,
      resolvedAt: new Date(),
      formattedText:
        lines.length > 0
          ? `Medicamentos em uso:\n${lines.join('\n')}`
          : 'Nenhum medicamento ativo.',
      rawData: prescriptions,
    };
  }

  private async fetchDiagnosesData(
    keyword: string,
    patientId: string,
    dataSource: SmartLinkDataSource,
  ): Promise<ResolvedSmartLinkResult> {
    const conditions = await this.prisma.chronicCondition.findMany({
      where: { patientId, status: 'ACTIVE' },
      orderBy: { diagnosedAt: 'desc' },
      select: { cidCode: true, cidDescription: true, severity: true },
    });
    const lines = conditions.map(
      (c) => `• ${c.cidDescription ?? 'N/A'} (${c.cidCode ?? 'CID N/A'})`,
    );
    return {
      keyword,
      dataSource,
      resolvedAt: new Date(),
      formattedText:
        lines.length > 0
          ? `Diagnósticos ativos:\n${lines.join('\n')}`
          : 'Nenhum diagnóstico ativo.',
      rawData: conditions,
    };
  }

  private async resolvePatientVar(
    patientId: string,
    name: string,
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
    const map: Record<string, string | null> = {
      nome: patient.socialName ?? patient.fullName,
      nome_completo: patient.fullName,
      data_nascimento: patient.birthDate?.toLocaleDateString('pt-BR') ?? null,
      sexo: patient.gender,
      cpf: patient.cpf,
      prontuario: patient.mrn,
      tipo_sanguineo: patient.bloodType,
    };
    return map[name.toLowerCase()] ?? null;
  }

  private async resolveLabVar(
    patientId: string,
    name: string,
  ): Promise<string | null> {
    const exam = await this.prisma.examResult.findFirst({
      where: {
        patientId,
        examName: { contains: name, mode: 'insensitive' },
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      select: { labResults: true },
    });
    if (!exam) return null;
    return JSON.stringify(exam.labResults);
  }
}
