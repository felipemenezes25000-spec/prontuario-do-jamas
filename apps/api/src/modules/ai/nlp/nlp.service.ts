import { Injectable, Logger } from '@nestjs/common';
import {
  ExtractedDataResponseDto,
  ExtractedProblemsResponseDto,
  ExtractedMedicationsResponseDto,
  ExtractedAllergiesResponseDto,
} from './dto/nlp.dto';

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  async extractStructuredData(
    _tenantId: string,
    text: string,
    language = 'pt-BR',
  ): Promise<ExtractedDataResponseDto> {
    const start = Date.now();
    this.logger.log(`Extracting structured data from text (${text.length} chars, lang=${language})`);

    // Stub — in production calls GPT-4o NER pipeline
    return {
      entities: [
        {
          entity: 'symptom',
          type: 'SYMPTOM',
          value: 'dor torácica',
          normalizedValue: 'chest_pain',
          confidence: 0.94,
          startOffset: 20,
          endOffset: 33,
        },
        {
          entity: 'duration',
          type: 'TEMPORAL',
          value: 'há 2 dias',
          normalizedValue: '2_days',
          confidence: 0.91,
          startOffset: 34,
          endOffset: 43,
        },
        {
          entity: 'vital_sign',
          type: 'VITAL_SIGN',
          value: 'PA 140/90',
          normalizedValue: 'bp_140_90',
          confidence: 0.98,
        },
        {
          entity: 'condition',
          type: 'CONDITION',
          value: 'hipertensão arterial',
          normalizedValue: 'I10',
          confidence: 0.96,
        },
      ],
      structuredData: {
        symptoms: [{ name: 'dor torácica', duration: '2 dias', quality: 'opressiva' }],
        vitalSigns: { systolicBP: 140, diastolicBP: 90, heartRate: 82 },
        conditions: [{ name: 'hipertensão arterial', icdCode: 'I10' }],
      },
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - start,
    };
  }

  async extractProblems(
    _tenantId: string,
    text: string,
  ): Promise<ExtractedProblemsResponseDto> {
    this.logger.log(`Extracting problems from text (${text.length} chars)`);

    return {
      problems: [
        {
          problemName: 'Hipertensão arterial sistêmica',
          icdCode: 'I10',
          icdDescription: 'Hipertensão essencial (primária)',
          status: 'ACTIVE',
          onset: '2022',
          confidence: 0.95,
        },
        {
          problemName: 'Diabetes mellitus tipo 2',
          icdCode: 'E11.9',
          icdDescription: 'Diabetes mellitus tipo 2 sem complicações',
          status: 'ACTIVE',
          onset: '2023',
          confidence: 0.90,
        },
        {
          problemName: 'Dor torácica a esclarecer',
          icdCode: 'R07.9',
          icdDescription: 'Dor torácica não especificada',
          status: 'ACTIVE',
          confidence: 0.82,
        },
      ],
      aiModel: 'gpt-4o',
    };
  }

  async extractMedications(
    _tenantId: string,
    text: string,
  ): Promise<ExtractedMedicationsResponseDto> {
    this.logger.log(`Extracting medications from text (${text.length} chars)`);

    return {
      medications: [
        {
          medicationName: 'Losartana',
          activeIngredient: 'Losartana potássica',
          dose: '50mg',
          route: 'ORAL',
          frequency: '1x ao dia',
          confidence: 0.95,
        },
        {
          medicationName: 'Metformina',
          activeIngredient: 'Cloridrato de metformina',
          dose: '850mg',
          route: 'ORAL',
          frequency: '2x ao dia',
          duration: 'contínuo',
          confidence: 0.93,
        },
        {
          medicationName: 'AAS',
          activeIngredient: 'Ácido acetilsalicílico',
          dose: '100mg',
          route: 'ORAL',
          frequency: '1x ao dia',
          confidence: 0.78,
        },
      ],
      aiModel: 'gpt-4o',
    };
  }

  async extractAllergies(
    _tenantId: string,
    text: string,
  ): Promise<ExtractedAllergiesResponseDto> {
    this.logger.log(`Extracting allergies from text (${text.length} chars)`);

    return {
      allergies: [
        {
          substance: 'Dipirona',
          type: 'MEDICATION',
          reaction: 'Exantema urticariforme',
          severity: 'MODERATE',
          confidence: 0.92,
        },
        {
          substance: 'Penicilina',
          type: 'MEDICATION',
          reaction: 'Edema de glote',
          severity: 'SEVERE',
          confidence: 0.88,
        },
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Negation Detection ──────────────────────────────────────────────────

  async detectNegations(
    _tenantId: string,
    text: string,
  ): Promise<NegationDetectionResponseDto> {
    this.logger.log(`Detecting negations in text (${text.length} chars)`);

    return {
      assertions: [
        { entity: 'febre', present: false, context: 'Nega febre', confidence: 0.96 },
        { entity: 'vômitos', present: false, context: 'Sem vômitos', confidence: 0.95 },
        { entity: 'dor torácica', present: true, context: 'Refere dor torácica opressiva', confidence: 0.97 },
        { entity: 'dispneia', present: true, context: 'Com dispneia aos esforços', confidence: 0.93 },
        { entity: 'síncope', present: false, context: 'Nega síncope', confidence: 0.94 },
        { entity: 'hemoptise', present: false, context: 'Sem hemoptise', confidence: 0.92 },
      ],
      negationCues: ['nega', 'sem', 'ausência de', 'não apresenta', 'descarta'],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Temporal Expression Extraction ──────────────────────────────────────

  async extractTemporalExpressions(
    _tenantId: string,
    text: string,
  ): Promise<TemporalExtractionResponseDto> {
    this.logger.log(`Extracting temporal expressions from text (${text.length} chars)`);

    return {
      expressions: [
        {
          text: 'há 2 dias',
          type: 'RELATIVE_PAST',
          normalizedValue: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          linkedEntity: 'dor torácica',
          confidence: 0.94,
        },
        {
          text: 'desde janeiro',
          type: 'ABSOLUTE_START',
          normalizedValue: '2026-01-01',
          linkedEntity: 'hipertensão',
          confidence: 0.88,
        },
        {
          text: 'ontem à noite',
          type: 'RELATIVE_PAST',
          normalizedValue: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          linkedEntity: 'febre',
          confidence: 0.91,
        },
        {
          text: 'por 3 semanas',
          type: 'DURATION',
          normalizedValue: 'P3W',
          linkedEntity: 'tosse',
          confidence: 0.90,
        },
        {
          text: 'toda manhã',
          type: 'RECURRING',
          normalizedValue: 'DAILY_AM',
          linkedEntity: 'náuseas',
          confidence: 0.85,
        },
      ],
      aiModel: 'gpt-4o',
    };
  }

  // ─── Relationship Extraction ─────────────────────────────────────────────

  async extractRelationships(
    _tenantId: string,
    text: string,
  ): Promise<RelationshipExtractionResponseDto> {
    this.logger.log(`Extracting relationships from text (${text.length} chars)`);

    return {
      relationships: [
        {
          sourceEntity: 'Losartana',
          sourceType: 'MEDICATION',
          relationship: 'HAS_DOSAGE',
          targetEntity: '50mg',
          targetType: 'DOSAGE',
          confidence: 0.96,
        },
        {
          sourceEntity: 'Losartana',
          sourceType: 'MEDICATION',
          relationship: 'HAS_FREQUENCY',
          targetEntity: '1x ao dia',
          targetType: 'FREQUENCY',
          confidence: 0.94,
        },
        {
          sourceEntity: 'dor torácica',
          sourceType: 'SYMPTOM',
          relationship: 'HAS_DURATION',
          targetEntity: '2 dias',
          targetType: 'DURATION',
          confidence: 0.92,
        },
        {
          sourceEntity: 'dor torácica',
          sourceType: 'SYMPTOM',
          relationship: 'HAS_QUALITY',
          targetEntity: 'opressiva',
          targetType: 'QUALITY',
          confidence: 0.90,
        },
        {
          sourceEntity: 'dor torácica',
          sourceType: 'SYMPTOM',
          relationship: 'RADIATES_TO',
          targetEntity: 'membro superior esquerdo',
          targetType: 'BODY_PART',
          confidence: 0.88,
        },
        {
          sourceEntity: 'hipertensão',
          sourceType: 'CONDITION',
          relationship: 'TREATED_BY',
          targetEntity: 'Losartana',
          targetType: 'MEDICATION',
          confidence: 0.91,
        },
      ],
      entityGraph: {
        nodes: 8,
        edges: 6,
      },
      aiModel: 'gpt-4o',
    };
  }
}

// ─── Additional Response DTOs (inline) ────────────────────────────────────

export interface NegationDetectionResponseDto {
  assertions: Array<{
    entity: string;
    present: boolean;
    context: string;
    confidence: number;
  }>;
  negationCues: string[];
  aiModel: string;
}

export interface TemporalExtractionResponseDto {
  expressions: Array<{
    text: string;
    type: string;
    normalizedValue: string;
    linkedEntity?: string;
    confidence: number;
  }>;
  aiModel: string;
}

export interface RelationshipExtractionResponseDto {
  relationships: Array<{
    sourceEntity: string;
    sourceType: string;
    relationship: string;
    targetEntity: string;
    targetType: string;
    confidence: number;
  }>;
  entityGraph: {
    nodes: number;
    edges: number;
  };
  aiModel: string;
}
