import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { PrismaService } from '../../prisma/prisma.service';

export interface PatientDocument {
  id: string;
  tenantId: string;
  mrn: string;
  fullName: string;
  socialName?: string;
  cpf?: string;
  cns?: string;
  birthDate: string;
  gender: string;
  phone?: string;
  email?: string;
  insuranceProvider?: string;
  tags: string[];
  allergies: string[];
  conditions: string[];
  riskScore?: number;
  isActive: boolean;
}

export interface ClinicalNoteDocument {
  id: string;
  tenantId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  authorId: string;
  authorName: string;
  type: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  freeText?: string;
  diagnosisCodes: string[];
  createdAt: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(SearchService.name);
  private readonly PATIENTS_INDEX = 'voxpep-patients';
  private readonly NOTES_INDEX = 'voxpep-clinical-notes';
  private esAvailable = false;

  constructor(
    private config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const esUrl =
      this.config.get<string>('elasticsearch.url') ||
      'http://localhost:9200';
    this.client = new Client({ node: esUrl });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Elasticsearch connected — full-text search enabled');
      await this.createIndices();
      this.esAvailable = true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Elasticsearch unavailable: ${msg} — falling back to PostgreSQL ILIKE search`,
      );
    }
  }

  private async createIndices() {
    const patientsExists = await this.client.indices.exists({
      index: this.PATIENTS_INDEX,
    });
    if (!patientsExists) {
      await this.client.indices.create({
        index: this.PATIENTS_INDEX,
        settings: {
          analysis: {
            analyzer: {
              brazilian_medical: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'brazilian_stemmer'],
              },
            },
            filter: {
              brazilian_stemmer: {
                type: 'stemmer',
                language: 'brazilian',
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenantId: { type: 'keyword' },
            mrn: { type: 'keyword' },
            fullName: {
              type: 'text',
              analyzer: 'brazilian_medical',
              fields: { keyword: { type: 'keyword' } },
            },
            socialName: { type: 'text', analyzer: 'brazilian_medical' },
            cpf: { type: 'keyword' },
            cns: { type: 'keyword' },
            birthDate: { type: 'date' },
            gender: { type: 'keyword' },
            phone: { type: 'keyword' },
            email: { type: 'keyword' },
            insuranceProvider: { type: 'keyword' },
            tags: { type: 'keyword' },
            allergies: { type: 'text', analyzer: 'brazilian_medical' },
            conditions: { type: 'text', analyzer: 'brazilian_medical' },
            riskScore: { type: 'float' },
            isActive: { type: 'boolean' },
          },
        },
      });
      this.logger.log('Created patients index');
    }

    const notesExists = await this.client.indices.exists({
      index: this.NOTES_INDEX,
    });
    if (!notesExists) {
      await this.client.indices.create({
        index: this.NOTES_INDEX,
        settings: {
          analysis: {
            analyzer: {
              brazilian_medical: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'brazilian_stemmer'],
              },
            },
            filter: {
              brazilian_stemmer: {
                type: 'stemmer',
                language: 'brazilian',
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            tenantId: { type: 'keyword' },
            encounterId: { type: 'keyword' },
            patientId: { type: 'keyword' },
            patientName: { type: 'text', analyzer: 'brazilian_medical' },
            authorId: { type: 'keyword' },
            authorName: { type: 'text' },
            type: { type: 'keyword' },
            subjective: { type: 'text', analyzer: 'brazilian_medical' },
            objective: { type: 'text', analyzer: 'brazilian_medical' },
            assessment: { type: 'text', analyzer: 'brazilian_medical' },
            plan: { type: 'text', analyzer: 'brazilian_medical' },
            freeText: { type: 'text', analyzer: 'brazilian_medical' },
            diagnosisCodes: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      this.logger.log('Created clinical notes index');
    }
  }

  // === Patient Indexing ===
  async indexPatient(patient: PatientDocument): Promise<void> {
    if (!this.esAvailable) return;
    try {
      await this.client.index({
        index: this.PATIENTS_INDEX,
        id: patient.id,
        document: patient,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index patient ${patient.id}: ${msg}`);
    }
  }

  async removePatient(patientId: string): Promise<void> {
    if (!this.esAvailable) return;
    try {
      await this.client.delete({
        index: this.PATIENTS_INDEX,
        id: patientId,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove patient ${patientId}: ${msg}`);
    }
  }

  // === Patient Search ===
  async searchPatients(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, unknown>;
    } = {},
  ): Promise<{ results: PatientDocument[]; total: number }> {
    if (this.esAvailable) {
      return this.esSearchPatients(tenantId, query, options);
    }
    return this.pgSearchPatients(tenantId, query, options);
  }

  // --- Elasticsearch patient search ---
  private async esSearchPatients(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, unknown>;
    },
  ): Promise<{ results: PatientDocument[]; total: number }> {
    const { page = 1, pageSize = 20, filters = {} } = options;

    try {
      const must: Record<string, unknown>[] = [
        { term: { tenantId } },
        { term: { isActive: true } },
      ];

      if (query) {
        must.push({
          bool: {
            should: [
              { match: { fullName: { query, boost: 3, fuzziness: 'AUTO' } } },
              { match: { socialName: { query, boost: 2 } } },
              { term: { mrn: { value: query, boost: 5 } } },
              { term: { cpf: { value: query.replace(/\D/g, ''), boost: 5 } } },
              { term: { cns: { value: query, boost: 4 } } },
              { match: { allergies: query } },
              { match: { conditions: query } },
              { term: { tags: query.toLowerCase() } },
            ],
            minimum_should_match: 1,
          },
        });
      }

      if (filters.insuranceProvider) {
        must.push({ term: { insuranceProvider: filters.insuranceProvider } });
      }
      if (Array.isArray(filters.tags) && filters.tags.length > 0) {
        must.push({ terms: { tags: filters.tags } });
      }
      if (filters.gender) {
        must.push({ term: { gender: filters.gender } });
      }

      const response = await this.client.search<PatientDocument>({
        index: this.PATIENTS_INDEX,
        from: (page - 1) * pageSize,
        size: pageSize,
        query: { bool: { must } },
        sort: query
          ? [{ _score: { order: 'desc' } }, { 'fullName.keyword': { order: 'asc' } }]
          : [{ 'fullName.keyword': { order: 'asc' } }],
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        results: hits.map((hit) => hit._source as PatientDocument),
        total,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`ES patient search failed, falling back to PG: ${msg}`);
      return this.pgSearchPatients(tenantId, query, options);
    }
  }

  // --- PostgreSQL ILIKE fallback for patient search ---
  private async pgSearchPatients(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, unknown>;
    },
  ): Promise<{ results: PatientDocument[]; total: number }> {
    const { page = 1, pageSize = 20, filters = {} } = options;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
    };

    if (query) {
      const cleanQuery = query.replace(/\D/g, '');
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { socialName: { contains: query, mode: 'insensitive' } },
        { cpf: { contains: cleanQuery } },
        { mrn: { contains: query, mode: 'insensitive' } },
        { cns: { contains: query } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters.insuranceProvider) {
      where.insuranceProvider = filters.insuranceProvider;
    }
    if (filters.gender) {
      where.gender = filters.gender;
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          tenantId: true,
          mrn: true,
          fullName: true,
          socialName: true,
          cpf: true,
          cns: true,
          birthDate: true,
          gender: true,
          phone: true,
          email: true,
          insuranceProvider: true,
          isActive: true,
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      results: patients.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        mrn: p.mrn ?? '',
        fullName: p.fullName,
        socialName: p.socialName ?? undefined,
        cpf: p.cpf ?? undefined,
        cns: p.cns ?? undefined,
        birthDate: p.birthDate.toISOString(),
        gender: p.gender,
        phone: p.phone ?? undefined,
        email: p.email ?? undefined,
        insuranceProvider: p.insuranceProvider ?? undefined,
        tags: [],
        allergies: [],
        conditions: [],
        isActive: p.isActive,
      })),
      total,
    };
  }

  // === Clinical Note Indexing ===
  async indexNote(note: ClinicalNoteDocument): Promise<void> {
    if (!this.esAvailable) return;
    try {
      await this.client.index({
        index: this.NOTES_INDEX,
        id: note.id,
        document: note,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index note ${note.id}: ${msg}`);
    }
  }

  // === Clinical Note Search ===
  async searchNotes(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      patientId?: string;
      authorId?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    } = {},
  ): Promise<{ results: ClinicalNoteDocument[]; total: number }> {
    if (this.esAvailable) {
      return this.esSearchNotes(tenantId, query, options);
    }
    return this.pgSearchNotes(tenantId, query, options);
  }

  // --- ES clinical note search ---
  private async esSearchNotes(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      patientId?: string;
      authorId?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    },
  ): Promise<{ results: ClinicalNoteDocument[]; total: number }> {
    const { page = 1, pageSize = 20 } = options;

    try {
      const must: Record<string, unknown>[] = [{ term: { tenantId } }];

      if (query) {
        must.push({
          multi_match: {
            query,
            fields: [
              'subjective^2',
              'objective^2',
              'assessment^3',
              'plan^2',
              'freeText',
              'patientName',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      if (options.patientId) must.push({ term: { patientId: options.patientId } });
      if (options.authorId) must.push({ term: { authorId: options.authorId } });
      if (options.type) must.push({ term: { type: options.type } });
      if (options.dateFrom || options.dateTo) {
        const range: Record<string, string> = {};
        if (options.dateFrom) range.gte = options.dateFrom;
        if (options.dateTo) range.lte = options.dateTo;
        must.push({ range: { createdAt: range } });
      }

      const response = await this.client.search<ClinicalNoteDocument>({
        index: this.NOTES_INDEX,
        from: (page - 1) * pageSize,
        size: pageSize,
        query: { bool: { must } },
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } },
        ],
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        results: hits.map((hit) => hit._source as ClinicalNoteDocument),
        total,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`ES note search failed, falling back to PG: ${msg}`);
      return this.pgSearchNotes(tenantId, query, options);
    }
  }

  // --- PostgreSQL ILIKE fallback for clinical notes ---
  private async pgSearchNotes(
    tenantId: string,
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      patientId?: string;
      authorId?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    },
  ): Promise<{ results: ClinicalNoteDocument[]; total: number }> {
    const { page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      encounter: { tenantId },
    };

    if (query) {
      where.OR = [
        { subjective: { contains: query, mode: 'insensitive' } },
        { objective: { contains: query, mode: 'insensitive' } },
        { assessment: { contains: query, mode: 'insensitive' } },
        { plan: { contains: query, mode: 'insensitive' } },
        { freeText: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (options.patientId) {
      where.encounter = {
        ...(where.encounter as Record<string, unknown>),
        patientId: options.patientId,
      };
    }
    if (options.authorId) where.authorId = options.authorId;
    if (options.type) where.type = options.type;
    if (options.dateFrom || options.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (options.dateFrom) createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo) createdAt.lte = new Date(options.dateTo);
      where.createdAt = createdAt;
    }

    const [notes, total] = await Promise.all([
      this.prisma.clinicalNote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          encounter: {
            select: {
              id: true,
              patient: { select: { id: true, fullName: true } },
            },
          },
        },
      }),
      this.prisma.clinicalNote.count({ where }),
    ]);

    return {
      results: notes.map((n) => ({
        id: n.id,
        tenantId,
        encounterId: n.encounterId,
        patientId: n.encounter.patient.id,
        patientName: n.encounter.patient.fullName,
        authorId: n.authorId,
        authorName: n.author.name,
        type: n.type,
        subjective: n.subjective ?? undefined,
        objective: n.objective ?? undefined,
        assessment: n.assessment ?? undefined,
        plan: n.plan ?? undefined,
        freeText: n.freeText ?? undefined,
        diagnosisCodes: Array.isArray(n.diagnosisCodes)
          ? (n.diagnosisCodes as string[])
          : [],
        createdAt: n.createdAt.toISOString(),
      })),
      total,
    };
  }

  // === Bulk operations ===
  async bulkIndexPatients(patients: PatientDocument[]): Promise<void> {
    if (!this.esAvailable || !patients.length) return;

    const operations = patients.flatMap((doc) => [
      { index: { _index: this.PATIENTS_INDEX, _id: doc.id } },
      doc,
    ]);

    try {
      const result = await this.client.bulk({ operations });
      if (result.errors) {
        this.logger.error('Bulk index had errors');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk index failed: ${msg}`);
    }
  }

  // === Health check ===
  async isHealthy(): Promise<boolean> {
    if (!this.esAvailable) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
