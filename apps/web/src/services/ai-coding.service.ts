import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface CodingSuggestion {
  id: string;
  code: string;
  description: string;
  codeSystem: 'CID10' | 'CBHPM' | 'TUSS';
  confidence: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  specificityNote?: string;
  alternativeCodes?: Array<{ code: string; description: string; confidence: number }>;
}

export interface CodingSession {
  id: string;
  encounterId: string;
  patientName?: string;
  clinicalText: string;
  suggestions: CodingSuggestion[];
  status: 'PROCESSING' | 'READY' | 'REVIEWED';
  createdAt: string;
}

export interface CodingFilters {
  encounterId?: string;
  status?: CodingSession['status'];
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const codingKeys = {
  all: ['ai', 'coding'] as const,
  lists: () => [...codingKeys.all, 'list'] as const,
  list: (filters?: CodingFilters) => [...codingKeys.lists(), filters] as const,
  detail: (id: string) => [...codingKeys.all, 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useCodingSessions(filters?: CodingFilters) {
  return useQuery({
    queryKey: codingKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: CodingSession[]; total: number }>('/ai/coding/sessions', {
        params: filters,
      });
      return data;
    },
  });
}

export function useGenerateCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { encounterId: string; clinicalText: string }) => {
      const { data } = await api.post<CodingSession>('/ai/coding/generate', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: codingKeys.lists() });
    },
  });
}

export function useUpdateCodeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      suggestionId,
      status,
    }: {
      sessionId: string;
      suggestionId: string;
      status: 'ACCEPTED' | 'REJECTED';
    }) => {
      const { data } = await api.patch<CodingSuggestion>(
        `/ai/coding/sessions/${sessionId}/suggestions/${suggestionId}`,
        { status },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: codingKeys.lists() });
    },
  });
}

export function useBatchCoding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterIds: string[]) => {
      const { data } = await api.post<{ sessions: CodingSession[] }>('/ai/coding/batch', { encounterIds });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: codingKeys.lists() });
    },
  });
}
