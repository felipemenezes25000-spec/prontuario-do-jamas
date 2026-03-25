import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProblemDto,
  UpdateProblemDto,
  CreateHomeMedicationDto,
  UpsertObstetricHistoryDto,
  CreateTransfusionHistoryDto,
  CreateImplantedDeviceDto,
  UpsertGenogramDto,
  TimelineFilterDto,
  CreateSpecialtyAnamnesisDto,
  ImportFhirHistoryDto,
  AiInconsistencyCheckDto,
  AiAnamnesisSuggestionsDto,
  ProblemStatus,
} from './dto/anamnesis.dto';

// ============================================================================
// Specialty anamnesis templates
// ============================================================================

const SPECIALTY_QUESTIONS: Record<string, string[]> = {
  CARDIOLOGY: [
    'Classificação funcional NYHA (I-IV)?',
    'Dor torácica: tipo, localização, irradiação, duração, fatores de piora/melhora?',
    'Dispneia: aos esforços / paroxística noturna / ortopneia?',
    'Edema de MMII: unilateral/bilateral, cacifo, quando surgiu?',
    'Palpitações: frequência, duração, regularidade?',
    'Síncope ou pré-síncope?',
    'Fatores de risco: HAS, DM, dislipidemia, tabagismo, história familiar de DAC precoce?',
  ],
  NEUROLOGY: [
    'Cefaleia: localização, tipo (pulsátil/em aperto/facada), duração, frequência, aura?',
    'Convulsões: tipo, frequência, último episódio, fatores precipitantes?',
    'Déficit motor: membro(s) afetado(s), início, progressão?',
    'Alteração de sensibilidade: localização, tipo (dormência/formigamento/dor)?',
    'Alteração visual: campo visual, diplopia, amaurose?',
    'Alteração de marcha: ataxia, espasticidade, claudicação?',
    'Alteração esfincteriana?',
  ],
  ORTHOPEDICS: [
    'Mecanismo de trauma: queda, torção, impacto direto, acidente?',
    'Localização exata da dor?',
    'Intensidade da dor (EVA 0-10)?',
    'Irradiação da dor?',
    'Fatores de piora: movimento, carga, repouso?',
    'Limitação funcional: AVDs afetadas?',
    'Tratamentos prévios: fisioterapia, infiltração, cirurgia?',
  ],
  PULMONOLOGY: [
    'Tosse: seca/produtiva, duração, horário predominante?',
    'Expectoração: volume, cor, odor?',
    'Dispneia: MRC (0-4), progressão?',
    'Hemoptise: volume, frequência?',
    'Sibilância?',
    'Tabagismo: carga tabágica (maços/ano)?',
    'Exposição ocupacional / ambiental?',
  ],
  GASTROENTEROLOGY: [
    'Dor abdominal: localização, tipo, irradiação, relação com alimentação?',
    'Náuseas / vômitos: frequência, conteúdo?',
    'Alteração do hábito intestinal: diarreia/constipação, início, Bristol?',
    'Sangramento GI: hematêmese, melena, hematoquezia?',
    'Disfagia / odinofagia?',
    'Pirose / regurgitação?',
    'Perda de peso: quanto, em quanto tempo?',
  ],
  GENERAL: [
    'Qual a queixa principal?',
    'Quando os sintomas começaram?',
    'Os sintomas são constantes ou intermitentes?',
    'Houve algum tratamento prévio?',
    'Alergias conhecidas?',
    'Medicamentos em uso?',
  ],
};

@Injectable()
export class AnamnesisService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Problem List (Active/Inactive)
  // =========================================================================

  async createProblem(tenantId: string, authorId: string, dto: CreateProblemDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[PROBLEM_LIST] ${dto.description}`,
        content: JSON.stringify({
          description: dto.description,
          icdCode: dto.icdCode,
          icdDescription: dto.icdDescription,
          status: dto.status,
          startDate: dto.startDate,
          resolutionDate: dto.resolutionDate,
          notes: dto.notes,
        }),
        status: dto.status === ProblemStatus.ACTIVE ? 'DRAFT' : 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listProblems(tenantId: string, patientId: string, status?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      title: { startsWith: '[PROBLEM_LIST]' },
    };
    if (status) {
      where.content = { contains: `"status":"${status}"` };
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      author: doc.author,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async updateProblem(tenantId: string, id: string, dto: UpdateProblemDto) {
    const doc = await this.findDocOrFail(id, tenantId);
    const existing = JSON.parse(doc.content ?? '{}');

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: {
        title: dto.description ? `[PROBLEM_LIST] ${dto.description}` : undefined,
        content: JSON.stringify({
          ...existing,
          ...(dto.description ? { description: dto.description } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.resolutionDate ? { resolutionDate: dto.resolutionDate } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        }),
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Home Medications
  // =========================================================================

  async createHomeMedication(tenantId: string, authorId: string, dto: CreateHomeMedicationDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[HOME_MEDICATION] ${dto.medicationName}`,
        content: JSON.stringify({
          medicationName: dto.medicationName,
          dose: dto.dose,
          frequency: dto.frequency,
          route: dto.route,
          prescribedBy: dto.prescribedBy,
          externalPharmacy: dto.externalPharmacy,
          active: dto.active ?? true,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listHomeMedications(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[HOME_MEDICATION]' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      author: doc.author,
      createdAt: doc.createdAt,
    }));
  }

  // =========================================================================
  // Obstetric History (GPAC)
  // =========================================================================

  async upsertObstetricHistory(tenantId: string, authorId: string, dto: UpsertObstetricHistoryDto) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId: dto.patientId, title: { startsWith: '[OBSTETRIC_HISTORY]' } },
    });

    const content = JSON.stringify({
      gestations: dto.gestations,
      deliveries: dto.deliveries,
      abortions: dto.abortions,
      cesareans: dto.cesareans,
      livingChildren: dto.livingChildren,
      lastMenstrualPeriod: dto.lastMenstrualPeriod,
      notes: dto.notes,
      gpac: `G${dto.gestations}P${dto.deliveries}A${dto.abortions}C${dto.cesareans}`,
    });

    if (existing) {
      return this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: { content },
        include: { author: { select: { id: true, name: true } } },
      });
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[OBSTETRIC_HISTORY] G${dto.gestations}P${dto.deliveries}A${dto.abortions}C${dto.cesareans}`,
        content,
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async getObstetricHistory(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId, title: { startsWith: '[OBSTETRIC_HISTORY]' } },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!doc) return null;
    return { id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, updatedAt: doc.updatedAt };
  }

  // =========================================================================
  // Transfusion History
  // =========================================================================

  async createTransfusionHistory(tenantId: string, authorId: string, dto: CreateTransfusionHistoryDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[TRANSFUSION_HISTORY] ${dto.bloodProduct}`,
        content: JSON.stringify({
          bloodProduct: dto.bloodProduct,
          date: dto.date,
          indication: dto.indication,
          adverseReaction: dto.adverseReaction ?? false,
          reactionDetails: dto.reactionDetails,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listTransfusionHistory(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[TRANSFUSION_HISTORY]' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({
      id: doc.id,
      ...JSON.parse(doc.content ?? '{}'),
      author: doc.author,
      createdAt: doc.createdAt,
    }));
  }

  // =========================================================================
  // Implanted Devices
  // =========================================================================

  async createImplantedDevice(tenantId: string, authorId: string, dto: CreateImplantedDeviceDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[IMPLANTED_DEVICE:${dto.deviceType}] ${dto.description}`,
        content: JSON.stringify({
          deviceType: dto.deviceType,
          description: dto.description,
          model: dto.model,
          manufacturer: dto.manufacturer,
          serialNumber: dto.serialNumber,
          lot: dto.lot,
          implantDate: dto.implantDate,
          mriCompatible: dto.mriCompatible,
          notes: dto.notes,
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listImplantedDevices(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[IMPLANTED_DEVICE:' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => {
      const parsed = JSON.parse(doc.content ?? '{}');
      return {
        id: doc.id,
        ...parsed,
        mriAlert: parsed.mriCompatible === false,
        author: doc.author,
        createdAt: doc.createdAt,
      };
    });
  }

  // =========================================================================
  // Interactive Genogram
  // =========================================================================

  async upsertGenogram(tenantId: string, authorId: string, dto: UpsertGenogramDto) {
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId: dto.patientId, title: { startsWith: '[GENOGRAM]' } },
    });

    const content = JSON.stringify({
      members: dto.members,
      notes: dto.notes,
      updatedAt: new Date().toISOString(),
    });

    if (existing) {
      return this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: { content },
        include: { author: { select: { id: true, name: true } } },
      });
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: '[GENOGRAM]',
        content,
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async getGenogram(tenantId: string, patientId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, patientId, title: { startsWith: '[GENOGRAM]' } },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!doc) return null;
    return { id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author };
  }

  // =========================================================================
  // Visual Clinical Timeline
  // =========================================================================

  async getVisualTimeline(tenantId: string, patientId: string, filters: TimelineFilterDto) {
    const limit = filters.limit ?? 50;
    const cursorDate = filters.cursor ? new Date(filters.cursor) : undefined;
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    const dateFilter: Record<string, Date> = {};
    if (cursorDate) dateFilter.lt = cursorDate;
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [encounters, documents, vitals, exams] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { patientId, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        include: { primaryDoctor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.clinicalDocument.findMany({
        where: { patientId, tenantId, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.vitalSigns.findMany({
        where: { patientId, ...(hasDateFilter ? { recordedAt: dateFilter } : {}) },
        orderBy: { recordedAt: 'desc' },
        take: limit,
      }),
      this.prisma.examResult.findMany({
        where: { patientId, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    type TimelineItem = {
      id: string;
      type: string;
      date: string;
      title: string;
      summary: string;
      details: Record<string, unknown>;
    };

    const items: TimelineItem[] = [];

    for (const enc of encounters) {
      items.push({
        id: enc.id,
        type: 'encounter',
        date: enc.createdAt.toISOString(),
        title: `Atendimento: ${enc.type}`,
        summary: `${enc.type} - ${enc.status}`,
        details: { type: enc.type, status: enc.status, doctor: enc.primaryDoctor },
      });
    }

    for (const doc of documents) {
      items.push({
        id: doc.id,
        type: 'document',
        date: doc.createdAt.toISOString(),
        title: doc.title,
        summary: doc.content?.slice(0, 150) ?? '',
        details: { type: doc.type, status: doc.status, author: doc.author },
      });
    }

    for (const vs of vitals) {
      const parts: string[] = [];
      if (vs.systolicBP != null) parts.push(`PA ${vs.systolicBP}/${vs.diastolicBP}`);
      if (vs.heartRate != null) parts.push(`FC ${vs.heartRate}`);
      if (vs.temperature != null) parts.push(`T ${vs.temperature}C`);
      items.push({
        id: vs.id,
        type: 'vital_signs',
        date: vs.recordedAt.toISOString(),
        title: 'Sinais Vitais',
        summary: parts.join(' | ') || 'Sinais vitais registrados',
        details: { systolicBP: vs.systolicBP, diastolicBP: vs.diastolicBP, heartRate: vs.heartRate, temperature: vs.temperature, oxygenSaturation: vs.oxygenSaturation },
      });
    }

    for (const exam of exams) {
      items.push({
        id: exam.id,
        type: 'exam',
        date: exam.createdAt.toISOString(),
        title: `Exame: ${exam.examName}`,
        summary: `${exam.examType} - ${exam.status}`,
        details: { examName: exam.examName, examType: exam.examType, status: exam.status },
      });
    }

    // Apply type filter
    const filtered = filters.type
      ? items.filter((item) => item.type === filters.type)
      : items;

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    return {
      items: result,
      hasMore,
      nextCursor: result.length > 0 ? result[result.length - 1].date : null,
    };
  }

  // =========================================================================
  // Specialty Anamnesis Templates
  // =========================================================================

  async createSpecialtyAnamnesis(tenantId: string, authorId: string, dto: CreateSpecialtyAnamnesisDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `[SPECIALTY_ANAMNESIS:${dto.specialty}]`,
        content: JSON.stringify({
          specialty: dto.specialty,
          content: dto.content,
          scores: dto.scores,
          templateQuestions: SPECIALTY_QUESTIONS[dto.specialty] ?? SPECIALTY_QUESTIONS.GENERAL,
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async getSpecialtyAnamnesisTemplate(specialty: string) {
    const questions = SPECIALTY_QUESTIONS[specialty] ?? SPECIALTY_QUESTIONS.GENERAL;
    return { specialty, questions };
  }

  // =========================================================================
  // Import History (FHIR/RNDS)
  // =========================================================================

  async importFhirHistory(tenantId: string, authorId: string, dto: ImportFhirHistoryDto) {
    // Parse FHIR bundle and store as clinical document
    // In production, this would parse the actual FHIR Bundle resource
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `[FHIR_IMPORT] ${dto.source}`,
        content: JSON.stringify({
          source: dto.source,
          importedAt: new Date().toISOString(),
          fhirBundle: dto.fhirBundle,
          status: 'IMPORTED',
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // AI: Inconsistency Detection
  // =========================================================================

  async aiInconsistencyCheck(tenantId: string, dto: AiInconsistencyCheckDto) {
    // Gather patient data
    const [allergies, conditions, medications, socialHistory] = await Promise.all([
      this.prisma.allergy.findMany({ where: { patientId: dto.patientId } }),
      this.prisma.chronicCondition.findMany({ where: { patientId: dto.patientId, status: 'ACTIVE' } }),
      this.prisma.prescription.findMany({
        where: { patientId: dto.patientId, status: 'ACTIVE' },
        include: { items: true },
      }),
      this.prisma.socialHistory.findFirst({ where: { patientId: dto.patientId } }),
    ]);

    // Stub: in production, this calls GPT-4o for analysis
    const inconsistencies: Array<{ type: string; severity: string; description: string; recommendation: string }> = [];

    // Basic rule-based checks
    const hasPenicillinAllergy = allergies.some((a) =>
      a.substance.toLowerCase().includes('penicil'),
    );
    const takesAmoxicillin = medications.some((p) =>
      p.items.some((i) => (i.medicationName ?? '').toLowerCase().includes('amoxicil')),
    );

    if (hasPenicillinAllergy && takesAmoxicillin) {
      inconsistencies.push({
        type: 'ALLERGY_MEDICATION_CONFLICT',
        severity: 'HIGH',
        description: 'Paciente com alergia a penicilina possui prescrição de amoxicilina.',
        recommendation: 'Reavaliar prescrição. Considerar alternativa terapêutica.',
      });
    }

    const deniesSmoking = socialHistory?.smoking === 'NEVER';
    const hasCOPD = conditions.some((c) =>
      (c.cidDescription ?? '').toLowerCase().includes('dpoc') ||
      (c.cidCode ?? '').startsWith('J44'),
    );

    if (deniesSmoking && hasCOPD) {
      inconsistencies.push({
        type: 'HISTORY_DIAGNOSIS_CONFLICT',
        severity: 'MODERATE',
        description: 'Paciente nega tabagismo mas possui diagnóstico de DPOC.',
        recommendation: 'Reavaliar história de tabagismo. Investigar exposição ocupacional.',
      });
    }

    return {
      patientId: dto.patientId,
      inconsistencies,
      totalFound: inconsistencies.length,
      checkedAt: new Date().toISOString(),
      disclaimer: 'Análise assistida por IA — validação clínica obrigatória.',
    };
  }

  // =========================================================================
  // AI: Anamnesis Suggestions
  // =========================================================================

  async aiAnamnesisSuggestions(tenantId: string, dto: AiAnamnesisSuggestionsDto) {
    // Stub: in production, this calls GPT-4o with complaint context
    const complaint = dto.chiefComplaint.toLowerCase();
    const suggestions: string[] = [];

    if (complaint.includes('dor') && complaint.includes('cabeça') || complaint.includes('cefalei')) {
      suggestions.push(
        'Localização da dor (frontal, temporal, occipital, holocraniana)?',
        'Tipo da dor (pulsátil, em aperto, facada)?',
        'Intensidade (EVA 0-10)?',
        'Início: súbito ou gradual?',
        'Presença de aura visual?',
        'Náusea, vômito, fotofobia, fonofobia?',
        'Frequência dos episódios?',
        'Uso de analgésicos: quais e frequência?',
        'Febre associada? Rigidez de nuca?',
        'Trauma crânio-encefálico recente?',
      );
    } else if (complaint.includes('dor') && (complaint.includes('peito') || complaint.includes('toráci'))) {
      suggestions.push(
        'Localização e tipo da dor (aperto, pontada, queimação)?',
        'Irradiação (MSE, mandíbula, dorso)?',
        'Duração do episódio?',
        'Fatores precipitantes (esforço, repouso, alimentação)?',
        'Fatores de alívio (repouso, nitrato sublingual)?',
        'Dispneia associada?',
        'Sudorese, náusea?',
        'Fatores de risco cardiovascular?',
      );
    } else {
      suggestions.push(
        'Quando os sintomas iniciaram?',
        'Os sintomas são constantes ou intermitentes?',
        'Intensidade dos sintomas (0-10)?',
        'Fatores de piora?',
        'Fatores de melhora?',
        'Já procurou atendimento prévio?',
        'Fez algum tratamento?',
        'Antecedentes pessoais relevantes?',
        'Medicamentos em uso?',
      );
    }

    return {
      patientId: dto.patientId,
      chiefComplaint: dto.chiefComplaint,
      suggestedQuestions: suggestions,
      generatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async findDocOrFail(id: string, tenantId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId },
    });
    if (!doc) {
      throw new NotFoundException(`Documento com ID "${id}" não encontrado`);
    }
    return doc;
  }
}
