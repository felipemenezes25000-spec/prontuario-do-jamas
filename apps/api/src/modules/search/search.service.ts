import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

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
  private available = false;

  constructor(private config: ConfigService) {
    const esUrl =
      this.config.get<string>('elasticsearch.url') ||
      'http://localhost:9200';
    this.client = new Client({ node: esUrl });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Elasticsearch connected');
      await this.createIndices();
      this.available = true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Elasticsearch not available: ${msg}. Search will be degraded.`,
      );
    }
  }

  private async createIndices() {
    // Create patients index with Portuguese analyzer
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

    // Create clinical notes index
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
            patientName: {
              type: 'text',
              analyzer: 'brazilian_medical',
            },
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
    if (!this.available) {
      this.logger.debug(
        `[DEGRADED] indexPatient skipped - patientId: ${patient.id}`,
      );
      return;
    }
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
    if (!this.available) return;
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
      filters?: Record<string, any>;
    } = {},
  ): Promise<{ results: PatientDocument[]; total: number }> {
    if (!this.available) {
      return { results: [], total: 0 };
    }

    const { page = 1, pageSize = 20, filters = {} } = options;

    try {
      const must: any[] = [
        { term: { tenantId } },
        { term: { isActive: true } },
      ];

      // Multi-field search
      if (query) {
        must.push({
          bool: {
            should: [
              {
                match: {
                  fullName: { query, boost: 3, fuzziness: 'AUTO' },
                },
              },
              { match: { socialName: { query, boost: 2 } } },
              { term: { mrn: { value: query, boost: 5 } } },
              {
                term: {
                  cpf: { value: query.replace(/\D/g, ''), boost: 5 },
                },
              },
              { term: { cns: { value: query, boost: 4 } } },
              { match: { allergies: query } },
              { match: { conditions: query } },
              { term: { tags: query.toLowerCase() } },
            ],
            minimum_should_match: 1,
          },
        });
      }

      // Apply filters
      if (filters.insuranceProvider) {
        must.push({
          term: { insuranceProvider: filters.insuranceProvider },
        });
      }
      if (filters.tags?.length) {
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
        highlight: {
          fields: {
            fullName: {},
            conditions: {},
            allergies: {},
          },
        },
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        results: hits.map((hit) => ({
          ...(hit._source as PatientDocument),
          _highlight: hit.highlight,
        })),
        total,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Patient search failed: ${msg}`);
      return { results: [], total: 0 };
    }
  }

  // === Clinical Note Indexing ===
  async indexNote(note: ClinicalNoteDocument): Promise<void> {
    if (!this.available) {
      this.logger.debug(
        `[DEGRADED] indexNote skipped - noteId: ${note.id}`,
      );
      return;
    }
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
    if (!this.available) {
      return { results: [], total: 0 };
    }

    const { page = 1, pageSize = 20 } = options;

    try {
      const must: any[] = [{ term: { tenantId } }];

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
            analyzer: 'brazilian_medical',
          },
        });
      }

      if (options.patientId)
        must.push({ term: { patientId: options.patientId } });
      if (options.authorId)
        must.push({ term: { authorId: options.authorId } });
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
        highlight: {
          fields: {
            subjective: { fragment_size: 150, number_of_fragments: 2 },
            objective: { fragment_size: 150, number_of_fragments: 2 },
            assessment: { fragment_size: 150, number_of_fragments: 2 },
            plan: { fragment_size: 150, number_of_fragments: 2 },
          },
        },
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        results: hits.map((hit) => ({
          ...(hit._source as ClinicalNoteDocument),
          _highlight: hit.highlight,
        })),
        total,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Note search failed: ${msg}`);
      return { results: [], total: 0 };
    }
  }

  // === Bulk operations ===
  async bulkIndexPatients(patients: PatientDocument[]): Promise<void> {
    if (!this.available || !patients.length) return;

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
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
