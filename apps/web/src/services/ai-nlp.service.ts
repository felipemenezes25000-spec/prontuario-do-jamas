import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'PROBLEM' | 'MEDICATION' | 'ALLERGY' | 'PROCEDURE' | 'VITAL_SIGN' | 'LAB_RESULT';

export interface ExtractedEntity {
  id: string;
  type: EntityType;
  text: string;
  normalizedText?: string;
  code?: string;
  codeSystem?: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
  attributes?: Record<string, string>;
}

export interface NLPExtractionResult {
  entities: ExtractedEntity[];
  summary?: string;
  processingTimeMs: number;
}

export interface NLPStructuredResult {
  structured: Record<string, unknown>;
  format: string;
}

export interface InconsistencyResult {
  inconsistencies: Array<{
    id: string;
    type: 'CONTRADICTION' | 'MISSING_DATA' | 'IMPLAUSIBLE_VALUE' | 'DUPLICATE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    location: string;
    suggestion?: string;
  }>;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  processingTimeMs: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  medicalTermsPreserved: number;
  processingTimeMs: number;
}

export interface NLPStats {
  totalExtractions: number;
  totalEntitiesFound: number;
  avgConfidence: number;
  avgProcessingTimeMs: number;
  entityDistribution: Record<string, number>;
  extractionsToday: number;
}

export interface TextSummarizationResult {
  summary: string;
  keyPoints: string[];
  wordCount: number;
  reductionPercent: number;
  processingTimeMs: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const nlpKeys = {
  all: ['ai', 'nlp'] as const,
  stats: () => [...nlpKeys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useNLPStats() {
  return useQuery({
    queryKey: nlpKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<NLPStats>('/ai/nlp/stats');
      return data;
    },
  });
}

export function useExtractEntities() {
  return useMutation({
    mutationFn: async (payload: { text: string; types?: EntityType[] }) => {
      const { data } = await api.post<NLPExtractionResult>('/ai/nlp/extract', payload);
      return data;
    },
  });
}

export function useStructureText() {
  return useMutation({
    mutationFn: async (payload: { text: string; outputFormat: 'FHIR' | 'JSON' | 'CSV' }) => {
      const { data } = await api.post<NLPStructuredResult>(
        '/ai/nlp/structure',
        payload,
      );
      return data;
    },
  });
}

export function useDetectInconsistencies() {
  return useMutation({
    mutationFn: async (payload: { text: string; patientId?: string }) => {
      const { data } = await api.post<InconsistencyResult>('/ai/nlp/inconsistencies', payload);
      return data;
    },
  });
}

export function useTranslateText() {
  return useMutation({
    mutationFn: async (payload: { text: string; targetLanguage: 'EN' | 'ES' | 'FR' }) => {
      const { data } = await api.post<TranslationResult>('/ai/nlp/translate', payload);
      return data;
    },
  });
}

export function useSummarizeText() {
  return useMutation({
    mutationFn: async (payload: { text: string; maxLength?: number }) => {
      const { data } = await api.post<TextSummarizationResult>('/ai/nlp/summarize', payload);
      return data;
    },
  });
}

export function useDeIdentifyText() {
  return useMutation({
    mutationFn: async (payload: { text: string }) => {
      const { data } = await api.post<{ deidentifiedText: string; removedEntities: number; processingTimeMs: number }>(
        '/ai/nlp/deidentify',
        payload,
      );
      return data;
    },
  });
}
