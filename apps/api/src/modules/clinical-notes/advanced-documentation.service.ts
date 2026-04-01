import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnatomicDrawingDto,
  UpdateAnatomicDrawingDto,
  AnatomicDrawingResultDto,
  DrawingAnnotationDto,
  DiagramType,
  ExamMacroDto,
  ExamSystem,
  ExamMacroTemplateDto,
  CreateCustomMacroDto,
  CommonAbnormalityDto,
  NoteDiffDto,
  NoteDiffResultDto,
  DiffChangeDto,
  DiffChangeType,
  NoteMediaDto,
  NoteMediaResultDto,
  NoteMediaType,
} from './dto/advanced-documentation.dto';

// ============================================================================
// In-memory stores (production: use Prisma models)
// ============================================================================

interface StoredDrawing {
  id: string;
  tenantId: string;
  noteId: string | null;
  encounterId: string;
  diagramType: DiagramType;
  annotations: DrawingAnnotationDto[];
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredMedia {
  id: string;
  tenantId: string;
  noteId: string;
  mediaType: NoteMediaType;
  description: string;
  bodyRegion: string | null;
  capturedAt: string | null;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  authorId: string;
  createdAt: Date;
  isDeleted: boolean;
}

interface StoredCustomMacro {
  id: string;
  tenantId: string;
  ownerId: string;
  system: ExamSystem;
  normalTemplate: string;
  commonAbnormalities: CommonAbnormalityDto[];
  createdAt: Date;
}

const drawingStore = new Map<string, StoredDrawing>();
const mediaStore = new Map<string, StoredMedia>();
const customMacroStore = new Map<string, StoredCustomMacro>();

// ============================================================================
// Default Normal Exam Templates (Portuguese BR)
// ============================================================================

const DEFAULT_NORMAL_EXAMS: Record<ExamSystem, { normalTemplate: string; commonAbnormalities: CommonAbnormalityDto[] }> = {
  [ExamSystem.GENERAL]: {
    normalTemplate: 'Paciente em bom estado geral, lúcido, orientado no tempo e espaço, corado, hidratado, acianótico, anictérico, afebril. Fácies atípica. Peso e estatura adequados para a idade.',
    commonAbnormalities: [
      { name: 'Desidratação', text: 'Sinais de desidratação: mucosas secas, turgor cutâneo diminuído, olhos encovados.' },
      { name: 'Febre', text: 'Paciente febril (T: ___°C), sudoreico.' },
      { name: 'Emagrecimento', text: 'Paciente emagrecido, com perda ponderal significativa.' },
      { name: 'Palidez', text: 'Paciente hipocorado (++/4+), palidez cutâneo-mucosa.' },
      { name: 'Icterícia', text: 'Paciente ictérico (++/4+), escleras amareladas.' },
    ],
  },
  [ExamSystem.HEAD_NECK]: {
    normalTemplate: 'Cabeça normocefálica, sem lesões ou deformidades. Olhos: pupilas isocóricas e fotorreagentes, conjuntivas coradas, escleras anictéricas. Orofaringe sem hiperemia ou exsudato. Pescoço: sem linfonodomegalias palpáveis, tireoide não palpável, ausência de estase jugular.',
    commonAbnormalities: [
      { name: 'Linfonodomegalia cervical', text: 'Linfonodos cervicais palpáveis, móveis, indolores, medindo aproximadamente ___ cm.' },
      { name: 'Amigdalite', text: 'Orofaringe hiperemiada com exsudato purulento em amígdalas bilateralmente.' },
      { name: 'Tireoide aumentada', text: 'Tireoide palpável, aumentada difusamente / nodular, consistência ___.' },
      { name: 'Estase jugular', text: 'Estase jugular presente a 45°, sugestiva de aumento da pressão venosa central.' },
    ],
  },
  [ExamSystem.CARDIOVASCULAR]: {
    normalTemplate: 'Precórdio calmo, ictus cordis não visível e palpável no 5° EIC na LHCE. Ritmo cardíaco regular em 2 tempos (RR2T), bulhas normofonéticas, sem sopros. Pulsos periféricos palpáveis e simétricos. Sem edema de membros inferiores. PA: ___/___mmHg, FC: ___bpm.',
    commonAbnormalities: [
      { name: 'Sopro sistólico', text: 'Sopro sistólico ___/6+ em foco ___, com/sem irradiação para ___.' },
      { name: 'Arritmia', text: 'Ritmo cardíaco irregular, com extrassístoles / fibrilação atrial.' },
      { name: 'Edema MMII', text: 'Edema de membros inferiores bilateral, simétrico, cacifo ___/4+, até ___.' },
      { name: 'Hipertensão', text: 'PA elevada: ___/___mmHg em ambos os membros superiores.' },
      { name: 'B3 presente', text: 'Terceira bulha (B3) presente, galope protodiastólico.' },
    ],
  },
  [ExamSystem.RESPIRATORY]: {
    normalTemplate: 'Tórax simétrico, expansibilidade preservada bilateralmente. Frêmito toracovocal (FTV) normal. Som claro pulmonar à percussão. Murmúrio vesicular presente e simétrico bilateralmente, sem ruídos adventícios. FR: ___irpm, SpO2: ___%.',
    commonAbnormalities: [
      { name: 'Crepitações', text: 'Crepitações finas em bases / terços médios / ápices bilateralmente / à direita / à esquerda.' },
      { name: 'Sibilos', text: 'Sibilos difusos bilaterais, expiratórios / inspiratórios e expiratórios.' },
      { name: 'Roncos', text: 'Roncos difusos bilaterais.' },
      { name: 'Derrame pleural', text: 'Macicez à percussão em base ___, com abolição do MV e do FTV nesta topografia.' },
      { name: 'Dispneia', text: 'Paciente taquipneico (FR: ___irpm), uso de musculatura acessória, tiragem intercostal.' },
    ],
  },
  [ExamSystem.ABDOMEN]: {
    normalTemplate: 'Abdome plano, flácido, indolor à palpação superficial e profunda, sem massas ou visceromegalias palpáveis. Ruídos hidroaéreos presentes e normoativos. Traube livre. Sem sinais de irritação peritoneal (Blumberg negativo).',
    commonAbnormalities: [
      { name: 'Hepatomegalia', text: 'Fígado palpável a ___ cm do RCD, consistência ___, bordas ___, superfície ___.' },
      { name: 'Esplenomegalia', text: 'Baço palpável a ___ cm do RCE. Traube ocupado.' },
      { name: 'Ascite', text: 'Abdome globoso, com sinais de ascite: macicez móvel, semicírculo de Skoda, piparote positivo.' },
      { name: 'Abdome agudo', text: 'Abdome tenso, doloroso à palpação em ___, defesa muscular involuntária, Blumberg positivo.' },
      { name: 'Distensão abdominal', text: 'Abdome distendido, timpânico, com RHA diminuídos / abolidos.' },
    ],
  },
  [ExamSystem.NEUROLOGICAL]: {
    normalTemplate: 'Paciente lúcido, orientado no tempo, espaço e pessoa (Glasgow 15). Pupilas isocóricas e fotorreagentes. Pares cranianos sem alterações. Força muscular grau V em quatro membros, simétrica. Sensibilidade preservada. Reflexos profundos presentes e simétricos. Coordenação preservada (dedo-nariz, calcanhar-joelho). Marcha normal. Sem sinais meníngeos.',
    commonAbnormalities: [
      { name: 'Hemiparesia', text: 'Hemiparesia ___ (D/E), grau ___ proximal e grau ___ distal. Sinal de Babinski presente à ___.' },
      { name: 'Meningismo', text: 'Rigidez de nuca presente, Kernig positivo, Brudzinski positivo.' },
      { name: 'Rebaixamento consciência', text: 'Paciente com rebaixamento do nível de consciência, Glasgow ___ (AO: ___ RV: ___ RM: ___).' },
      { name: 'Afasia', text: 'Afasia de ___ (Broca/Wernicke/mista), compreensão ___ preservada/comprometida, expressão ___ preservada/comprometida.' },
      { name: 'Ataxia', text: 'Dismetria na prova dedo-nariz, disdiadococinesia, marcha atáxica cerebelar.' },
    ],
  },
  [ExamSystem.MUSCULOSKELETAL]: {
    normalTemplate: 'Musculatura eutrófica e eutônica. Articulações sem sinais flogísticos, amplitude de movimento preservada. Coluna sem deformidades, sem dor à palpação. Marcha fisiológica.',
    commonAbnormalities: [
      { name: 'Artrite', text: 'Articulação ___ com sinais flogísticos: edema, calor, rubor, dor à mobilização ativa e passiva. Amplitude de movimento limitada.' },
      { name: 'Lombalgia', text: 'Dor à palpação de musculatura paravertebral lombar. Lasègue positivo à ___°. Manobra de Valsalva positiva.' },
      { name: 'Hipotrofia muscular', text: 'Hipotrofia muscular em ___, diferença de ___ cm na circunferência em relação ao lado contralateral.' },
      { name: 'Fratura', text: 'Deformidade em ___, com edema, equimose, crepitação óssea, dor intensa à palpação e mobilização.' },
    ],
  },
  [ExamSystem.SKIN]: {
    normalTemplate: 'Pele íntegra, corada, hidratada, sem lesões elementares. Turgor e elasticidade preservados. Fâneros sem alterações. Unhas sem baqueteamento, sem alterações de coloração.',
    commonAbnormalities: [
      { name: 'Lesão ulcerada', text: 'Úlcera em ___, medindo ___ x ___ cm, bordas ___, fundo ___, secreção ___.' },
      { name: 'Rash cutâneo', text: 'Rash maculopapular / eritematoso difuso em ___, pruriginoso / não pruriginoso.' },
      { name: 'Celulite', text: 'Área de celulite em ___, com eritema, edema, calor local e dor à palpação, limites ___ definidos.' },
      { name: 'Lesão de pressão', text: 'Lesão por pressão estágio ___ em ___, medindo ___ x ___ cm, com ___ (tecido de granulação/necrose/exsudato).' },
    ],
  },
  [ExamSystem.GENITOURINARY]: {
    normalTemplate: 'Punho-percussão lombar (Giordano) negativo bilateralmente. Sem edema suprapúbico. Sem globo vesical palpável. Genitália externa sem lesões ou alterações.',
    commonAbnormalities: [
      { name: 'Giordano positivo', text: 'Giordano positivo à ___ (direita/esquerda/bilateral), sugestivo de processo inflamatório renal.' },
      { name: 'Globo vesical', text: 'Globo vesical palpável, bexiga distendida, dolorosa à palpação.' },
      { name: 'Edema escrotal', text: 'Edema escrotal ___ (unilateral/bilateral), com/sem dor à palpação, reflexo cremastérico ___.' },
    ],
  },
  [ExamSystem.PSYCHIATRIC]: {
    normalTemplate: 'Paciente vigil, lúcido, orientado auto e alopsiquicamente. Aparência cuidada. Atitude colaborativa. Humor eutímico. Afeto modulado, congruente. Pensamento com curso e forma normais, sem alterações de conteúdo. Sensopercepção sem alterações. Juízo de realidade preservado. Atenção e concentração preservadas. Memória preservada. Inteligência aparentemente normal.',
    commonAbnormalities: [
      { name: 'Humor deprimido', text: 'Humor deprimido, hipotimia, afeto constrito. Pensamento com lentificação do curso. Hipobulia.' },
      { name: 'Agitação psicomotora', text: 'Agitação psicomotora, inquietação, irritabilidade, hostilidade, verborragia.' },
      { name: 'Alucinações', text: 'Alucinações ___ (auditivas/visuais/cenestésicas). Paciente refere ouvir/ver ___.' },
      { name: 'Ideação suicida', text: 'Ideação suicida presente, com/sem plano estruturado. Risco avaliado como ___ (baixo/moderado/alto).' },
      { name: 'Desorientação', text: 'Desorientação ___ (temporal/espacial/pessoal). Glasgow ___.' },
    ],
  },
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AdvancedDocumentationService {
  private readonly logger = new Logger(AdvancedDocumentationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // 8. Anatomic Diagram Drawing
  // =========================================================================

  async saveDrawing(
    tenantId: string,
    authorId: string,
    dto: AnatomicDrawingDto,
  ): Promise<AnatomicDrawingResultDto> {
    // Validate encounter exists
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, tenantId },
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter "${dto.encounterId}" not found`);
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const drawing: StoredDrawing = {
      id,
      tenantId,
      noteId: dto.noteId ?? null,
      encounterId: dto.encounterId,
      diagramType: dto.diagramType,
      annotations: dto.annotations,
      authorId,
      createdAt: now,
      updatedAt: now,
    };

    drawingStore.set(id, drawing);

    // Also persist as clinical document for audit trail
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: encounter.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[ANATOMIC_DRAWING] ${dto.diagramType} - ${dto.annotations.length} anotação(ões)`,
        content: JSON.stringify({
          drawingId: id,
          diagramType: dto.diagramType,
          annotations: dto.annotations,
          encounterId: dto.encounterId,
          noteId: dto.noteId ?? null,
        }),
        status: 'FINAL',
      },
    });

    this.logger.log(`Anatomic drawing saved: ${id} for encounter ${dto.encounterId}`);

    return {
      id,
      noteId: drawing.noteId,
      encounterId: drawing.encounterId,
      diagramType: drawing.diagramType,
      annotations: drawing.annotations,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async getDrawings(
    tenantId: string,
    encounterId: string,
  ): Promise<AnatomicDrawingResultDto[]> {
    const results: AnatomicDrawingResultDto[] = [];

    for (const drawing of drawingStore.values()) {
      if (drawing.tenantId === tenantId && drawing.encounterId === encounterId) {
        results.push({
          id: drawing.id,
          noteId: drawing.noteId,
          encounterId: drawing.encounterId,
          diagramType: drawing.diagramType,
          annotations: drawing.annotations,
          createdAt: drawing.createdAt.toISOString(),
          updatedAt: drawing.updatedAt.toISOString(),
        });
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async updateDrawing(
    tenantId: string,
    drawingId: string,
    dto: UpdateAnatomicDrawingDto,
  ): Promise<AnatomicDrawingResultDto> {
    const drawing = drawingStore.get(drawingId);

    if (!drawing || drawing.tenantId !== tenantId) {
      throw new NotFoundException(`Drawing "${drawingId}" not found`);
    }

    if (dto.diagramType !== undefined) drawing.diagramType = dto.diagramType;
    if (dto.annotations !== undefined) drawing.annotations = dto.annotations;
    drawing.updatedAt = new Date();

    drawingStore.set(drawingId, drawing);

    return {
      id: drawing.id,
      noteId: drawing.noteId,
      encounterId: drawing.encounterId,
      diagramType: drawing.diagramType,
      annotations: drawing.annotations,
      createdAt: drawing.createdAt.toISOString(),
      updatedAt: drawing.updatedAt.toISOString(),
    };
  }

  // =========================================================================
  // 9. Physical Exam Macros
  // =========================================================================

  getExamMacro(system: ExamSystem): ExamMacroTemplateDto {
    const template = DEFAULT_NORMAL_EXAMS[system];
    return {
      id: `default-${system}`,
      system,
      normalTemplate: template.normalTemplate,
      commonAbnormalities: template.commonAbnormalities,
    };
  }

  getAllExamMacros(): ExamMacroTemplateDto[] {
    return Object.values(ExamSystem).map((system) => this.getExamMacro(system));
  }

  applyExamMacro(dto: ExamMacroDto): { system: ExamSystem; text: string } {
    const template = DEFAULT_NORMAL_EXAMS[dto.system];
    const normalText = dto.normalText ?? template.normalTemplate;

    if (!dto.abnormalFindings || dto.abnormalFindings.length === 0) {
      return { system: dto.system, text: normalText };
    }

    // Build final text: normal text + abnormal findings
    const abnormalSection = dto.abnormalFindings
      .map((f) => `- ${f.finding}: ${f.description}`)
      .join('\n');

    const text = `${normalText}\n\nAlterações encontradas:\n${abnormalSection}`;

    return { system: dto.system, text };
  }

  async createCustomMacro(
    tenantId: string,
    ownerId: string,
    dto: CreateCustomMacroDto,
  ): Promise<ExamMacroTemplateDto> {
    const id = crypto.randomUUID();

    const macro: StoredCustomMacro = {
      id,
      tenantId,
      ownerId,
      system: dto.system,
      normalTemplate: dto.normalTemplate,
      commonAbnormalities: dto.commonAbnormalities ?? [],
      createdAt: new Date(),
    };

    customMacroStore.set(id, macro);

    this.logger.log(`Custom exam macro created: ${id} for system ${dto.system}`);

    return {
      id,
      system: macro.system,
      normalTemplate: macro.normalTemplate,
      commonAbnormalities: macro.commonAbnormalities,
    };
  }

  getCustomMacros(tenantId: string, ownerId: string): ExamMacroTemplateDto[] {
    const results: ExamMacroTemplateDto[] = [];

    for (const macro of customMacroStore.values()) {
      if (macro.tenantId === tenantId && macro.ownerId === ownerId) {
        results.push({
          id: macro.id,
          system: macro.system,
          normalTemplate: macro.normalTemplate,
          commonAbnormalities: macro.commonAbnormalities,
        });
      }
    }

    return results;
  }

  // =========================================================================
  // 10. Note Diff (side-by-side comparison)
  // =========================================================================

  async compareNotes(
    tenantId: string,
    dto: NoteDiffDto,
  ): Promise<NoteDiffResultDto> {
    const [doc1, doc2] = await Promise.all([
      this.prisma.clinicalDocument.findFirst({
        where: { id: dto.noteId1, tenantId },
        include: { author: { select: { name: true } } },
      }),
      this.prisma.clinicalDocument.findFirst({
        where: { id: dto.noteId2, tenantId },
        include: { author: { select: { name: true } } },
      }),
    ]);

    if (!doc1) {
      throw new NotFoundException(`Note "${dto.noteId1}" not found`);
    }
    if (!doc2) {
      throw new NotFoundException(`Note "${dto.noteId2}" not found`);
    }

    const content1 = doc1.content ?? '';
    const content2 = doc2.content ?? '';

    const changes = this.computeLineDiff(content1, content2);

    return {
      note1: {
        content: content1,
        date: doc1.createdAt.toISOString(),
        author: doc1.author?.name ?? 'Unknown',
      },
      note2: {
        content: content2,
        date: doc2.createdAt.toISOString(),
        author: doc2.author?.name ?? 'Unknown',
      },
      changes,
    };
  }

  /**
   * Simple line-by-line diff algorithm.
   * For each line, determines if it was added, removed, or modified.
   */
  private computeLineDiff(text1: string, text2: string): DiffChangeDto[] {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const changes: DiffChangeDto[] = [];

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = i < lines1.length ? lines1[i] : undefined;
      const line2 = i < lines2.length ? lines2[i] : undefined;

      if (line1 === undefined && line2 !== undefined) {
        changes.push({
          type: DiffChangeType.ADDED,
          lineNumber: i + 1,
          oldText: null,
          newText: line2,
        });
      } else if (line1 !== undefined && line2 === undefined) {
        changes.push({
          type: DiffChangeType.REMOVED,
          lineNumber: i + 1,
          oldText: line1,
          newText: null,
        });
      } else if (line1 !== line2) {
        changes.push({
          type: DiffChangeType.MODIFIED,
          lineNumber: i + 1,
          oldText: line1 ?? null,
          newText: line2 ?? null,
        });
      }
    }

    return changes;
  }

  async getConsecutiveNotes(
    tenantId: string,
    patientId: string,
    limit: number = 10,
  ): Promise<Array<{ id: string; title: string; date: string; author: string }>> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      date: doc.createdAt.toISOString(),
      author: doc.author?.name ?? 'Unknown',
    }));
  }

  // =========================================================================
  // 11. Note with Media (photos, audio, video)
  // =========================================================================

  async attachMedia(
    tenantId: string,
    authorId: string,
    dto: NoteMediaDto,
  ): Promise<NoteMediaResultDto> {
    // Validate the note exists
    const note = await this.prisma.clinicalDocument.findFirst({
      where: { id: dto.noteId, tenantId },
    });

    if (!note) {
      throw new NotFoundException(`Note "${dto.noteId}" not found`);
    }

    const id = crypto.randomUUID();

    const media: StoredMedia = {
      id,
      tenantId,
      noteId: dto.noteId,
      mediaType: dto.mediaType,
      description: dto.description,
      bodyRegion: dto.bodyRegion ?? null,
      capturedAt: dto.capturedAt ?? null,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      storageKey: dto.storageKey,
      authorId,
      createdAt: new Date(),
      isDeleted: false,
    };

    mediaStore.set(id, media);

    // Also create an audit record in the clinical document's content
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: note.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[NOTE_MEDIA] ${dto.mediaType} - ${dto.description.slice(0, 80)}`,
        content: JSON.stringify({
          mediaId: id,
          noteId: dto.noteId,
          mediaType: dto.mediaType,
          description: dto.description,
          bodyRegion: dto.bodyRegion ?? null,
          capturedAt: dto.capturedAt ?? null,
          fileSize: dto.fileSize,
          mimeType: dto.mimeType,
          storageKey: dto.storageKey,
        }),
        status: 'FINAL',
      },
    });

    this.logger.log(`Media attached: ${id} (${dto.mediaType}) to note ${dto.noteId}`);

    return {
      id,
      noteId: media.noteId,
      mediaType: media.mediaType,
      description: media.description,
      bodyRegion: media.bodyRegion,
      capturedAt: media.capturedAt,
      fileSize: media.fileSize,
      mimeType: media.mimeType,
      storageKey: media.storageKey,
      createdAt: media.createdAt.toISOString(),
      isDeleted: false,
    };
  }

  getMediaForNote(tenantId: string, noteId: string): NoteMediaResultDto[] {
    const results: NoteMediaResultDto[] = [];

    for (const media of mediaStore.values()) {
      if (media.tenantId === tenantId && media.noteId === noteId && !media.isDeleted) {
        results.push({
          id: media.id,
          noteId: media.noteId,
          mediaType: media.mediaType,
          description: media.description,
          bodyRegion: media.bodyRegion,
          capturedAt: media.capturedAt,
          fileSize: media.fileSize,
          mimeType: media.mimeType,
          storageKey: media.storageKey,
          createdAt: media.createdAt.toISOString(),
          isDeleted: false,
        });
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  removeMedia(tenantId: string, mediaId: string): { id: string; deleted: boolean } {
    const media = mediaStore.get(mediaId);

    if (!media || media.tenantId !== tenantId) {
      throw new NotFoundException(`Media "${mediaId}" not found`);
    }

    if (media.isDeleted) {
      throw new BadRequestException(`Media "${mediaId}" is already deleted`);
    }

    // Soft delete
    media.isDeleted = true;
    mediaStore.set(mediaId, media);

    this.logger.log(`Media soft-deleted: ${mediaId}`);

    return { id: mediaId, deleted: true };
  }
}
