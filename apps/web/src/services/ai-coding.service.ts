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

export interface CodingStats {
  totalSessions: number;
  totalSuggestions: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  accuracyRate: number;
  avgConfidence: number;
  sessionsByDay: Array<{ date: string; count: number; accuracy: number }>;
}

export interface CodingMetricPoint {
  date: string;
  accuracy: number;
  suggestions: number;
  accepted: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const codingKeys = {
  all: ['ai', 'coding'] as const,
  lists: () => [...codingKeys.all, 'list'] as const,
  list: (filters?: CodingFilters) => [...codingKeys.lists(), filters] as const,
  detail: (id: string) => [...codingKeys.all, 'detail', id] as const,
  stats: () => [...codingKeys.all, 'stats'] as const,
  metrics: () => [...codingKeys.all, 'metrics'] as const,
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

export function useCodingSession(id: string) {
  return useQuery({
    queryKey: codingKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<CodingSession>(`/ai/coding/sessions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCodingStats() {
  return useQuery({
    queryKey: codingKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<CodingStats>('/ai/coding/stats');
      return data;
    },
  });
}

export function useCodingMetrics() {
  return useQuery({
    queryKey: codingKeys.metrics(),
    queryFn: async () => {
      const { data } = await api.get<CodingMetricPoint[]>('/ai/coding/metrics');
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
      qc.invalidateQueries({ queryKey: codingKeys.stats() });
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
      qc.invalidateQueries({ queryKey: codingKeys.stats() });
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
      qc.invalidateQueries({ queryKey: codingKeys.stats() });
    },
  });
}

export function useReviewCodingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<CodingSession>(`/ai/coding/sessions/${sessionId}/review`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: codingKeys.lists() });
    },
  });
}
