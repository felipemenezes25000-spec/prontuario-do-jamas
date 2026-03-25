import { useMutation } from '@tanstack/react-query';
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

// ============================================================================
// Hooks
// ============================================================================

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
      const { data } = await api.post<{ structured: Record<string, unknown>; format: string }>(
        '/ai/nlp/structure',
        payload,
      );
      return data;
    },
  });
}
