import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInterConsultDto,
  RespondInterConsultDto,
  CreateCaseDiscussionDto,
  CreateAttendanceDeclarationDto,
  CopyForwardDto,
  SignNoteDto,
  CreateAddendumDto,
  CreateSmartPhraseDto,
  UpdateSmartPhraseDto,
  ResolveSmartLinkDto,
  PhysicalExamMacroDto,
  CompareNotesDto,
  AttachMediaDto,
  CreateAnatomicalDiagramDto,
  CreateFromTemplateDto,
  AiDifferentialDiagnosisDto,
  AiAutoCompleteDto,
  AiTranslateNoteDto,
  AiPatientSummaryDto,
  InterConsultStatus,
  DocumentLockStatus,
  UnifiedTimelineEntry,
  UnifiedTimelineResponse,
} from './dto/clinical-documentation.dto';
import {
  CreateCaseDiscussionFullDto,
  RecordCaseDiscussionOutcomeDto,
  ListCaseDiscussionsFilterDto,
  CaseDiscussionStatus,
} from './dto/case-discussion.dto';

// ============================================================================
// Specialty template defaults
// ============================================================================

const SPECIALTY_TEMPLATES: Record<string, Record<string, string>> = {
  CARDIOLOGY: {
    subjective: 'Queixa principal: dor torácica / dispneia / palpitações.\nHMA: ',
    objective: 'ACV: BRNF 2T, sem sopros. Pulsos periféricos simétricos. PA: ___/____ mmHg. FC: ___ bpm.\nAR: MV presente bilateralmente, sem RA.\nECG: ',
    assessment: 'Classificação funcional NYHA: ___\nRisco cardiovascular: ',
    plan: '1. Solicitar ECG 12 derivações\n2. Enzimas cardíacas seriadas\n3. Ecocardiograma\n4. ',
  },
  ORTHOPEDICS: {
    subjective: 'Mecanismo do trauma: \nLocalização da dor: \nEVA: ___/10\nLimitação funcional: ',
    objective: 'Inspeção: sem deformidades aparentes.\nPalpação: \nADM: preservada / limitada em ___\nTestes especiais: \nNeurovascular distal: preservado.',
    assessment: 'HD: ',
    plan: '1. Rx ___\n2. Imobilização: \n3. Analgesia: \n4. Reavaliação em ___ dias.',
  },
  GYNECOLOGY: {
    subjective: 'DUM: ___/___/___\nCiclo menstrual: regular / irregular, duração ___ dias\nQueixa: ',
    objective: 'Mamas: simétricas, sem nódulos.\nAbdome: plano, indolor.\nEspecular: colo de aspecto normal, sem secreções patológicas.\nToque vaginal: útero AVF, tamanho normal, anexos livres.',
    assessment: 'HD: ',
    plan: '1. Papanicolaou\n2. USG transvaginal\n3. ',
  },
  PEDIATRICS: {
    subjective: 'Idade: ___ anos ___ meses\nQueixa principal: \nVacinação: em dia / atrasada\nDesenvolvimento neuropsicomotor: adequado / atraso em ___\nAlimentação: ',
    objective: 'Peso: ___ kg (P___) | Estatura: ___ cm (P___) | PC: ___ cm\nBEG, corado, hidratado, acianótico, anictérico.\nOroscopia: \nOtoscopia: \nAR: MV presente, sem RA.\nACV: BRNF 2T, sem sopros.\nAbdome: plano, RHA+, indolor.',
    assessment: 'HD: \nZ-scores: peso/idade: ___ | estatura/idade: ___ | IMC/idade: ___',
    plan: '1. \n2. Orientações aos responsáveis:\n3. Retorno em: ',
  },
  PSYCHIATRY: {
    subjective: 'Queixa principal: \nHistória da doença atual: \nAntecedentes psiquiátricos: \nUso de substâncias: \nIdeação suicida: ( ) não ( ) sim - risco: ___\nPHQ-9: ___/27 | GAD-7: ___/21',
    objective: 'Exame do estado mental:\n- Aparência: \n- Atitude: cooperativo / hostil / indiferente\n- Consciência: vigil\n- Orientação: auto e alopsíquica preservadas\n- Atenção: preservada\n- Memória: preservada\n- Pensamento: curso normal, sem delírios\n- Sensopercepção: sem alucinações\n- Humor: \n- Afeto: \n- Juízo de realidade: preservado\n- Insight: presente / parcial / ausente',
    assessment: 'Hipótese diagnóstica (CID-10): \nColumbia Suicide Severity: ',
    plan: '1. Farmacoterapia: \n2. Psicoterapia: \n3. Medidas de segurança: \n4. Retorno em: ',
  },
  NEUROLOGY: {
    subjective: 'Queixa: cefaleia / vertigem / déficit motor / convulsão\nInício: \nDuração: \nFatores associados: ',
    objective: 'Glasgow: ___/15 (O: ___ V: ___ M: ___)\nPupilas: isocóricas, fotorreagentes\nPares cranianos: sem alterações\nForça muscular: MSD ___ / MSE ___ / MID ___ / MIE ___\nSensibilidade: preservada\nCoordenação: preservada\nReflexos: \nMarcha: \nSinais meníngeos: Brudzinski ( ) Kernig ( )',
    assessment: 'NIHSS: ___/42\nHD: ',
    plan: '1. TC de crânio\n2. RNM de encéfalo\n3. ',
  },
  GENERAL: {
    subjective: 'QP: \nHDA: \nAntecedentes: \nMedicações em uso: ',
    objective: 'Estado geral: BEG, LOTE, corado, hidratado.\nSinais vitais: PA ___/___ mmHg, FC ___ bpm, FR ___ irpm, Tax ___ °C, SpO2 ___%.\nCabeça e pescoço: sem alterações.\nAR: MV+ bilateral, sem RA.\nACV: BRNF 2T, sem sopros.\nAbdome: plano, RHA+, indolor, sem VMG.\nExtremidades: sem edema, pulsos palpáveis.',
    assessment: 'HD: ',
    plan: '1. \n2. \n3. ',
  },
};

// ============================================================================
// Physical exam normal findings per system
// ============================================================================

const NORMAL_EXAM: Record<string, string> = {
  HEAD_NECK: 'Cabeça normocefálica, sem lesões. Pescoço: sem linfonodomegalias, tireoide não palpável, sem sopros carotídeos.',
  CARDIOVASCULAR: 'ACV: BRNF 2T, sem sopros. Pulsos periféricos simétricos e amplos. Sem edema de MMII. TEC < 3s.',
  RESPIRATORY: 'AR: MV presente e simétrico bilateralmente, sem ruídos adventícios. Expansibilidade torácica preservada. FTV simétrico.',
  ABDOMINAL: 'Abdome plano, RHA presentes nos 4 quadrantes, flácido, indolor à palpação superficial e profunda, sem VMG palpáveis. Traube livre.',
  NEUROLOGICAL: 'Glasgow 15 (O4V5M6). Pupilas isocóricas e fotorreagentes. Pares cranianos sem alterações. Força grau V nos 4 membros. Sensibilidade preservada. Coordenação sem alterações. Reflexos simétricos. Marcha sem alterações.',
  MUSCULOSKELETAL: 'Sem deformidades. ADM preservada em todas as articulações. Força muscular grau V global. Sem dor à palpação de coluna.',
  SKIN: 'Pele íntegra, corada, hidratada, anictérica, acianótica. Sem lesões ou erupções. Unhas sem alterações.',
  GENITOURINARY: 'Punho-percussão lombar negativa bilateral. Sem globo vesical palpável.',
  PSYCHIATRIC: 'Vigil, LOTE, cooperativo. Humor eutímico, afeto congruente. Pensamento organizado, sem delírios. Sem alucinações. Juízo preservado.',
};

// ============================================================================
// SmartLink resolvers
// ============================================================================

const SMARTLINK_RESOLVERS: Record<string, string> = {
  '@labrecente': 'LATEST_LAB',
  '@sinaisvitais': 'LATEST_VITALS',
  '@alergias': 'ALLERGIES',
  '@medicamentos': 'ACTIVE_MEDICATIONS',
  '@diagnosticos': 'ACTIVE_DIAGNOSES',
  '@ultimaconsulta': 'LAST_NOTE',
};

@Injectable()
export class ClinicalDocumentationService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Interconsultation
  // =========================================================================

  async createInterConsult(tenantId: string, authorId: string, dto: CreateInterConsultDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[INTERCONSULT:REQUEST] ${dto.requestingSpecialty} → ${dto.targetSpecialty}`,
        content: JSON.stringify({
          requestingSpecialty: dto.requestingSpecialty,
          targetSpecialty: dto.targetSpecialty,
          targetDoctorId: dto.targetDoctorId,
          clinicalQuestion: dto.clinicalQuestion,
          relevantHistory: dto.relevantHistory,
          urgency: dto.urgency,
          status: InterConsultStatus.REQUESTED,
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async respondInterConsult(tenantId: string, responderId: string, documentId: string, dto: RespondInterConsultDto) {
    const doc = await this.findDocumentOrFail(documentId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    return this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: {
        content: JSON.stringify({
          ...existing,
          status: InterConsultStatus.COMPLETED,
          response: dto.response,
          recommendations: dto.recommendations,
          followUpPlan: dto.followUpPlan,
          respondedBy: responderId,
          respondedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listInterConsults(tenantId: string, patientId?: string, status?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      title: { startsWith: '[INTERCONSULT:' },
    };
    if (patientId) where.patientId = patientId;
    if (status) {
      where.content = { contains: `"status":"${status}"` };
    }

    return this.prisma.clinicalDocument.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================================
  // Case Discussion / Medical Board (legacy simple method)
  // =========================================================================

  async createCaseDiscussion(tenantId: string, authorId: string, dto: CreateCaseDiscussionDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[CASE_DISCUSSION] ${dto.title}`,
        content: JSON.stringify({
          clinicalSummary: dto.clinicalSummary,
          participants: dto.participants,
          conclusions: dto.conclusions,
          agreedPlan: dto.agreedPlan,
          discussionDate: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listCaseDiscussions(tenantId: string, patientId?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      title: { startsWith: '[CASE_DISCUSSION]' },
    };
    if (patientId) where.patientId = patientId;

    return this.prisma.clinicalDocument.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================================
  // Enhanced Case Discussion / Junta Médica
  // =========================================================================

  async createCaseDiscussionFull(tenantId: string, authorId: string, dto: CreateCaseDiscussionFullDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[CASE_DISCUSSION:${dto.type}] ${dto.title}`,
        content: JSON.stringify({
          discussionType: dto.type,
          scheduledDate: dto.scheduledDate,
          participants: dto.participants,
          clinicalSummary: dto.clinicalSummary,
          questionsForDiscussion: dto.questionsForDiscussion,
          status: CaseDiscussionStatus.SCHEDULED,
          createdAt: new Date().toISOString(),
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async recordDiscussionOutcome(tenantId: string, userId: string, dto: RecordCaseDiscussionOutcomeDto) {
    const doc = await this.findDocumentOrFail(dto.discussionId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    return this.prisma.clinicalDocument.update({
      where: { id: dto.discussionId },
      data: {
        content: JSON.stringify({
          ...existing,
          status: CaseDiscussionStatus.COMPLETED,
          conclusions: dto.conclusions,
          agreedPlan: dto.agreedPlan,
          recommendations: dto.recommendations,
          followUpDate: dto.followUpDate,
          dissenting: dto.dissenting,
          recordingUrl: dto.recordingUrl,
          completedBy: userId,
          completedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listCaseDiscussionsFull(tenantId: string, filters: ListCaseDiscussionsFilterDto) {
    const where: Record<string, unknown> = {
      tenantId,
      title: { startsWith: '[CASE_DISCUSSION' },
    };
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.type) {
      where.title = { startsWith: `[CASE_DISCUSSION:${filters.type}]` };
    }
    if (filters.status) {
      where.content = { contains: `"status":"${filters.status}"` };
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (filters.dateFrom || filters.dateTo) {
      return docs.filter((d) => {
        const parsed = JSON.parse(d.content ?? '{}');
        const scheduledDate = parsed.scheduledDate as string | undefined;
        if (!scheduledDate) return true;
        if (filters.dateFrom && scheduledDate < filters.dateFrom) return false;
        if (filters.dateTo && scheduledDate > filters.dateTo) return false;
        return true;
      });
    }

    return docs;
  }

  async getCaseDiscussion(tenantId: string, discussionId: string) {
    const doc = await this.findDocumentOrFail(discussionId, tenantId);
    const content = JSON.parse(doc.content ?? '{}');
    return { ...doc, parsedContent: content };
  }

  // =========================================================================
  // Attendance Declaration
  // =========================================================================

  async createAttendanceDeclaration(tenantId: string, authorId: string, dto: CreateAttendanceDeclarationDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[ATTENDANCE_DECLARATION] ${dto.purpose}`,
        content: JSON.stringify({
          purpose: dto.purpose,
          startTime: dto.startTime ?? new Date().toISOString(),
          endTime: dto.endTime,
          notes: dto.notes,
          generatedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Copy-Forward
  // =========================================================================

  async copyForward(tenantId: string, authorId: string, dto: CopyForwardDto) {
    const source = await this.findDocumentOrFail(dto.sourceDocumentId, tenantId);

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: source.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: source.type,
        title: `[COPY_FORWARD] ${source.title}`,
        content: JSON.stringify({
          copiedFrom: source.id,
          copiedAt: new Date().toISOString(),
          originalContent: source.content,
          modifications: dto.modifications,
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Note Signing / Locking (CFM compliant)
  // =========================================================================

  async signNote(tenantId: string, userId: string, dto: SignNoteDto) {
    const doc = await this.findDocumentOrFail(dto.documentId, tenantId);

    if (doc.status === 'FINAL') {
      throw new ForbiddenException('Documento já foi assinado. Use addendum para alterações.');
    }

    return this.prisma.clinicalDocument.update({
      where: { id: dto.documentId },
      data: {
        status: 'FINAL',
        content: JSON.stringify({
          ...JSON.parse(doc.content ?? '{}'),
          signedBy: userId,
          signedAt: new Date().toISOString(),
          digitalSignatureHash: dto.digitalSignatureHash,
          lockStatus: DocumentLockStatus.SIGNED,
        }),
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createAddendum(tenantId: string, authorId: string, dto: CreateAddendumDto) {
    const original = await this.findDocumentOrFail(dto.originalDocumentId, tenantId);

    if (original.status !== 'FINAL') {
      throw new ForbiddenException('Só é possível adicionar addendum a documentos assinados.');
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: original.patientId,
        encounterId: original.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[ADDENDUM] ${original.title}`,
        content: JSON.stringify({
          originalDocumentId: dto.originalDocumentId,
          addendumContent: dto.addendumContent,
          reason: dto.reason,
          addendumDate: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // SmartPhrases
  // =========================================================================

  async createSmartPhrase(tenantId: string, userId: string, dto: CreateSmartPhraseDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId: userId,
        patientId: 'SYSTEM',
        type: 'CUSTOM',
        title: `[SMARTPHRASE] ${dto.shortcut}`,
        content: JSON.stringify({
          shortcut: dto.shortcut,
          expansion: dto.expansion,
          category: dto.category,
          specialty: dto.specialty,
          ownerId: userId,
        }),
        status: 'FINAL',
      },
    });
  }

  async listSmartPhrases(tenantId: string, userId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[SMARTPHRASE]' },
        authorId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSmartPhrase(tenantId: string, userId: string, id: string, dto: UpdateSmartPhraseDto) {
    const doc = await this.findDocumentOrFail(id, tenantId);
    if (doc.authorId !== userId) {
      throw new ForbiddenException('Você só pode editar suas próprias frases.');
    }
    const existing = JSON.parse(doc.content ?? '{}');
    return this.prisma.clinicalDocument.update({
      where: { id },
      data: {
        title: dto.shortcut ? `[SMARTPHRASE] ${dto.shortcut}` : undefined,
        content: JSON.stringify({
          ...existing,
          ...(dto.shortcut ? { shortcut: dto.shortcut } : {}),
          ...(dto.expansion ? { expansion: dto.expansion } : {}),
          ...(dto.category ? { category: dto.category } : {}),
        }),
      },
    });
  }

  async deleteSmartPhrase(tenantId: string, userId: string, id: string) {
    const doc = await this.findDocumentOrFail(id, tenantId);
    if (doc.authorId !== userId) {
      throw new ForbiddenException('Você só pode excluir suas próprias frases.');
    }
    return this.prisma.clinicalDocument.delete({ where: { id } });
  }

  async expandSmartPhrase(tenantId: string, userId: string, shortcut: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        authorId: userId,
        title: `[SMARTPHRASE] ${shortcut}`,
      },
    });
    if (!doc) return null;
    const parsed = JSON.parse(doc.content ?? '{}');
    return { shortcut, expansion: parsed.expansion };
  }

  // =========================================================================
  // SmartLinks
  // =========================================================================

  async resolveSmartLink(tenantId: string, dto: ResolveSmartLinkDto) {
    const resolverType = SMARTLINK_RESOLVERS[dto.linkCode];
    if (!resolverType) {
      return { linkCode: dto.linkCode, resolved: false, data: null };
    }

    let data: unknown = null;

    switch (resolverType) {
      case 'LATEST_VITALS':
        data = await this.prisma.vitalSigns.findFirst({
          where: { patientId: dto.patientId },
          orderBy: { recordedAt: 'desc' },
        });
        break;
      case 'ALLERGIES':
        data = await this.prisma.allergy.findMany({
          where: { patientId: dto.patientId },
        });
        break;
      case 'ACTIVE_MEDICATIONS': {
        const prescriptions = await this.prisma.prescription.findMany({
          where: { patientId: dto.patientId, status: 'ACTIVE' },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        data = prescriptions.flatMap((p) => p.items);
        break;
      }
      case 'ACTIVE_DIAGNOSES':
        data = await this.prisma.chronicCondition.findMany({
          where: { patientId: dto.patientId, status: 'ACTIVE' },
        });
        break;
      case 'LATEST_LAB':
        data = await this.prisma.examResult.findMany({
          where: { patientId: dto.patientId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        break;
      case 'LAST_NOTE':
        data = await this.prisma.clinicalNote.findFirst({
          where: { encounter: { patientId: dto.patientId } },
          orderBy: { createdAt: 'desc' },
        });
        break;
    }

    return { linkCode: dto.linkCode, resolved: true, data };
  }

  // =========================================================================
  // Physical Exam Macros
  // =========================================================================

  async applyPhysicalExamMacro(tenantId: string, authorId: string, dto: PhysicalExamMacroDto) {
    const text = dto.normal
      ? NORMAL_EXAM[dto.system] ?? 'Sem alterações.'
      : `${dto.abnormalities ?? ''}${dto.notes ? `\nObservações: ${dto.notes}` : ''}`;

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        authorId,
        patientId: 'SYSTEM',
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `[EXAM_MACRO:${dto.system}]`,
        content: JSON.stringify({
          system: dto.system,
          normal: dto.normal,
          text,
          abnormalities: dto.abnormalities,
          notes: dto.notes,
        }),
        status: 'DRAFT',
      },
    });
  }

  async getPhysicalExamDefaults() {
    return Object.entries(NORMAL_EXAM).map(([system, normalText]) => ({
      system,
      normalText,
    }));
  }

  // =========================================================================
  // Note Comparison (Side-by-Side Diff)
  // =========================================================================

  async compareNotes(tenantId: string, dto: CompareNotesDto) {
    const [docA, docB] = await Promise.all([
      this.findDocumentOrFail(dto.documentIdA, tenantId),
      this.findDocumentOrFail(dto.documentIdB, tenantId),
    ]);

    const contentA = JSON.parse(docA.content ?? '{}');
    const contentB = JSON.parse(docB.content ?? '{}');

    const allKeys = new Set([...Object.keys(contentA), ...Object.keys(contentB)]);
    const differences: Array<{
      field: string;
      valueA: unknown;
      valueB: unknown;
      changed: boolean;
    }> = [];

    for (const key of allKeys) {
      differences.push({
        field: key,
        valueA: contentA[key] ?? null,
        valueB: contentB[key] ?? null,
        changed: JSON.stringify(contentA[key]) !== JSON.stringify(contentB[key]),
      });
    }

    return {
      documentA: { id: docA.id, title: docA.title, date: docA.createdAt },
      documentB: { id: docB.id, title: docB.title, date: docB.createdAt },
      differences,
      totalChanges: differences.filter((d) => d.changed).length,
    };
  }

  // =========================================================================
  // Media Attachments
  // =========================================================================

  async attachMedia(tenantId: string, dto: AttachMediaDto) {
    const doc = await this.findDocumentOrFail(dto.documentId, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');
    const media = existing.media ?? [];
    media.push({
      id: `media-${Date.now()}`,
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      description: dto.description,
      timestamp: dto.timestamp ?? new Date().toISOString(),
    });

    return this.prisma.clinicalDocument.update({
      where: { id: dto.documentId },
      data: {
        content: JSON.stringify({ ...existing, media }),
      },
    });
  }

  // =========================================================================
  // Anatomical Diagram
  // =========================================================================

  async createAnatomicalDiagram(tenantId: string, authorId: string, dto: CreateAnatomicalDiagramDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[ANATOMICAL_DIAGRAM] ${dto.bodyRegion}`,
        content: JSON.stringify({
          bodyRegion: dto.bodyRegion,
          markings: dto.markings,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Specialty Templates
  // =========================================================================

  async createFromTemplate(tenantId: string, authorId: string, dto: CreateFromTemplateDto) {
    const template = SPECIALTY_TEMPLATES[dto.specialty] ?? SPECIALTY_TEMPLATES.GENERAL;

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[SPECIALTY_NOTE:${dto.specialty}]`,
        content: JSON.stringify({
          specialty: dto.specialty,
          template,
          overrides: dto.overrides,
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async getAvailableTemplates() {
    return Object.keys(SPECIALTY_TEMPLATES).map((key) => ({
      specialty: key,
      fields: Object.keys(SPECIALTY_TEMPLATES[key]),
    }));
  }

  // =========================================================================
  // AI Features (stubs — require AI service integration)
  // =========================================================================

  async aiDifferentialDiagnosis(_tenantId: string, dto: AiDifferentialDiagnosisDto) {
    // Stub: in production, this calls GPT-4o
    return {
      patientId: dto.patientId,
      differentials: [
        { diagnosis: 'Infarto Agudo do Miocárdio', probability: 0.35, icd: 'I21', justification: 'Dor torácica típica com fatores de risco cardiovascular' },
        { diagnosis: 'Angina Instável', probability: 0.25, icd: 'I20.0', justification: 'Padrão de dor sugestivo, necessita excluir IAM' },
        { diagnosis: 'Embolia Pulmonar', probability: 0.15, icd: 'I26', justification: 'Dispneia e dor pleurítica associadas' },
        { diagnosis: 'Doença do Refluxo Gastroesofágico', probability: 0.10, icd: 'K21', justification: 'Diagnóstico diferencial frequente de dor torácica' },
        { diagnosis: 'Costocondrite', probability: 0.08, icd: 'M94.0', justification: 'Dor reprodutível à palpação' },
      ],
      disclaimer: 'Sugestão gerada por IA — requer validação clínica pelo profissional responsável.',
      generatedAt: new Date().toISOString(),
    };
  }

  async aiAutoComplete(_tenantId: string, dto: AiAutoCompleteDto) {
    // Stub: in production, this calls GPT-4o with context
    return {
      encounterId: dto.encounterId,
      section: dto.section,
      suggestions: [
        `${dto.partialText}... paciente refere melhora progressiva dos sintomas com medicação em uso.`,
        `${dto.partialText}... mantém quadro estável, sem sinais de alarme.`,
        `${dto.partialText}... necessita reavaliação em 48h para ajuste terapêutico.`,
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async aiTranslateNote(tenantId: string, dto: AiTranslateNoteDto) {
    const doc = await this.findDocumentOrFail(dto.documentId, tenantId);
    // Stub: in production, this calls GPT-4o for translation
    return {
      originalDocumentId: dto.documentId,
      targetLanguage: dto.targetLanguage,
      translatedContent: `[AI Translation to ${dto.targetLanguage}]: ${doc.content?.slice(0, 200)}...`,
      disclaimer: 'Tradução automática — pode conter imprecisões.',
      generatedAt: new Date().toISOString(),
    };
  }

  async aiPatientSummary(tenantId: string, dto: AiPatientSummaryDto) {
    // Gather patient data for summary
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId },
      include: {
        allergies: true,
        chronicConditions: { where: { status: 'ACTIVE' } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    // Stub: in production, this calls GPT-4o
    return {
      patientId: dto.patientId,
      patientName: patient.fullName,
      summary: `Resumo para o paciente: ${patient.fullName} está sendo acompanhado em nossa unidade. ` +
        `Diagnósticos atuais: ${patient.chronicConditions.map((c) => c.cidDescription).join(', ') || 'nenhum registrado'}. ` +
        `Alergias: ${patient.allergies.map((a) => a.substance).join(', ') || 'nenhuma registrada'}. ` +
        'Este resumo foi elaborado em linguagem acessível para compreensão do paciente e familiares.',
      readingLevel: 'Ensino Fundamental',
      language: 'pt-BR',
      generatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Unified Clinical Timeline
  // =========================================================================

  async getUnifiedTimeline(
    tenantId: string,
    patientId: string,
    filters?: { startDate?: string; endDate?: string; types?: string[]; cursor?: string; limit?: number },
  ): Promise<UnifiedTimelineResponse> {
    const limit = filters?.limit ?? 20;
    const cursorDate = filters?.cursor ? new Date(filters.cursor) : undefined;
    const startDate = filters?.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters?.endDate ? new Date(filters.endDate) : undefined;

    // Verify patient exists in tenant
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente com ID "${patientId}" não encontrado`);
    }

    // Build date filter for clinicalDocument
    const dateFilter: Record<string, Date> = {};
    if (cursorDate) dateFilter.lt = cursorDate;
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build type filter: if types are specified, filter by title prefix
    const titleFilter = filters?.types?.length
      ? { OR: filters.types.map((t) => ({ title: { startsWith: `[${t}]` } as const })) }
      : {};

    // Query all ClinicalDocuments for this patient, sorted by date desc
    const where = {
      tenantId,
      patientId,
      status: { not: 'VOIDED' as const },
      ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      ...titleFilter,
    };

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const hasMore = documents.length > limit;
    const resultDocs = documents.slice(0, limit);

    const items: UnifiedTimelineEntry[] = resultDocs.map((doc) => {
      const parsedContent = doc.content ? JSON.parse(doc.content) : {};
      const docType = this.extractDocumentType(doc.title);

      return {
        id: doc.id,
        type: docType,
        title: doc.title,
        summary: this.generateSummary(doc.title, parsedContent),
        createdAt: doc.createdAt.toISOString(),
        createdBy: doc.author ?? null,
        metadata: {
          documentType: doc.type,
          status: doc.status,
          encounterId: doc.encounterId,
          pdfUrl: doc.pdfUrl,
          ...parsedContent,
        },
      };
    });

    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].createdAt
      : null;

    return { items, total, nextCursor, hasMore };
  }

  private extractDocumentType(title: string): string {
    const match = title.match(/^\[([^\]]+)\]/);
    return match ? match[1] : 'UNKNOWN';
  }

  private generateSummary(title: string, content: Record<string, unknown>): string {
    // Remove the bracket prefix to get a human-readable summary
    const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '');
    if (cleanTitle) return cleanTitle;

    // Fallback: use content keys to build a summary
    const keys = Object.keys(content).filter((k) => k !== 'updatedAt' && k !== 'createdAt');
    if (keys.length === 0) return title;
    return keys.slice(0, 3).join(', ');
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async findDocumentOrFail(id: string, tenantId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId },
    });
    if (!doc) {
      throw new NotFoundException(`Documento com ID "${id}" não encontrado`);
    }
    return doc;
  }
}
