import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DocumentType } from '@/types';

// ============================================================================
// Response Types
// ============================================================================

export interface DocumentMetadataTemplate {
  found: boolean;
  template: Record<string, unknown>;
  sourceDocumentId: string | null;
  sourceDate: string | null;
}

export interface PatientCommonData {
  medications: string[];
  diagnoses: string[];
  allergies: Array<{
    id: string;
    substance: string;
    type: string;
    severity: string;
    reaction: string | null;
  }>;
  conditions: Array<{
    id: string;
    cidCode: string | null;
    cidDescription: string | null;
    status: string;
    severity: string | null;
    currentTreatment: string | null;
  }>;
  insurance: {
    provider: string | null;
    plan: string | null;
    number: string | null;
  };
}

export interface HistorySuggestion {
  field: string;
  value: string;
  source: string;
  confidence: number;
}

export interface SuggestFromHistoryResult {
  suggestions: HistorySuggestion[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const replicationKeys = {
  all: ['document-replication'] as const,
  metadata: (patientId: string, type: DocumentType) =>
    [...replicationKeys.all, 'metadata', patientId, type] as const,
  patientData: (patientId: string) =>
    [...replicationKeys.all, 'patient-data', patientId] as const,
  suggest: () => [...replicationKeys.all, 'suggest'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetches the last document metadata of a given type for pre-filling.
 * Only runs when both patientId and type are provided.
 */
export function useLastDocumentMetadata(
  patientId: string | undefined,
  type: DocumentType | undefined,
) {
  return useQuery({
    queryKey: replicationKeys.metadata(patientId ?? '', type ?? 'CUSTOM'),
    queryFn: async () => {
      const { data } = await api.get<DocumentMetadataTemplate>(
        `/documents/replicate/${patientId}`,
        { params: { type } },
      );
      return data;
    },
    enabled: !!patientId && !!type,
  });
}

/**
 * Fetches aggregated common data for a patient (medications, diagnoses,
 * allergies, chronic conditions, insurance).
 */
export function usePatientCommonData(patientId: string | undefined) {
  return useQuery({
    queryKey: replicationKeys.patientData(patientId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<PatientCommonData>(
        `/documents/patient-data/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

/**
 * Mutation to get AI-free suggestions from patient document history.
 */
export function useSuggestFromHistory() {
  return useMutation({
    mutationFn: async ({
      patientId,
      context,
    }: {
      patientId: string;
      context: string;
    }) => {
      const { data } = await api.post<SuggestFromHistoryResult>(
        '/documents/suggest',
        { patientId, context },
      );
      return data;
    },
  });
}
