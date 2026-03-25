import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface AmbientSession {
  id: string;
  encounterId?: string;
  patientId?: string;
  patientName?: string;
  status: 'RECORDING' | 'PROCESSING' | 'READY' | 'ERROR';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: string;
  clinicalNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  createdAt: string;
}

export interface AmbientSessionFilters {
  status?: AmbientSession['status'];
  patientId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const ambientKeys = {
  all: ['ai', 'ambient'] as const,
  lists: () => [...ambientKeys.all, 'list'] as const,
  list: (filters?: AmbientSessionFilters) => [...ambientKeys.lists(), filters] as const,
  detail: (id: string) => [...ambientKeys.all, 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAmbientSessions(filters?: AmbientSessionFilters) {
  return useQuery({
    queryKey: ambientKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: AmbientSession[]; total: number }>('/ai/ambient/sessions', {
        params: filters,
      });
      return data;
    },
  });
}

export function useAmbientSession(id: string) {
  return useQuery({
    queryKey: ambientKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<AmbientSession>(`/ai/ambient/sessions/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const session = query.state.data;
      return session?.status === 'PROCESSING' ? 3000 : false;
    },
  });
}

export function useStartAmbientSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { encounterId?: string; patientId?: string }) => {
      const { data } = await api.post<AmbientSession>('/ai/ambient/sessions/start', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ambientKeys.lists() });
    },
  });
}

export function useStopAmbientSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<AmbientSession>(`/ai/ambient/sessions/${sessionId}/stop`);
      return data;
    },
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ambientKeys.detail(sessionId) });
      qc.invalidateQueries({ queryKey: ambientKeys.lists() });
    },
  });
}

export function useApproveAmbientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, encounterId }: { sessionId: string; encounterId: string }) => {
      const { data } = await api.post<{ success: boolean }>(`/ai/ambient/sessions/${sessionId}/approve`, {
        encounterId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ambientKeys.lists() });
    },
  });
}
