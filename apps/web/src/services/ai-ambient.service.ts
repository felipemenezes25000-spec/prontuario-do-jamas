import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type AmbientSessionStatus = 'RECORDING' | 'PROCESSING' | 'READY' | 'ERROR';

export interface AmbientSession {
  id: string;
  encounterId?: string;
  patientId?: string;
  patientName?: string;
  status: AmbientSessionStatus;
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
  language?: string;
  specialty?: string;
  template?: string;
  createdAt: string;
}

export interface AmbientSessionFilters {
  status?: AmbientSessionStatus;
  patientId?: string;
  page?: number;
  limit?: number;
}

export interface AmbientConfig {
  language: string;
  specialty: string;
  template: string;
  autoSoapGeneration: boolean;
  noiseReduction: boolean;
  speakerDiarization: boolean;
}

export interface AmbientStats {
  totalSessions: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
  soapGeneratedCount: number;
  approvalRate: number;
  sessionsToday: number;
}

export interface TranscriptionChunk {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  confidence: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const ambientKeys = {
  all: ['ai', 'ambient'] as const,
  lists: () => [...ambientKeys.all, 'list'] as const,
  list: (filters?: AmbientSessionFilters) => [...ambientKeys.lists(), filters] as const,
  detail: (id: string) => [...ambientKeys.all, 'detail', id] as const,
  config: () => [...ambientKeys.all, 'config'] as const,
  stats: () => [...ambientKeys.all, 'stats'] as const,
  transcription: (id: string) => [...ambientKeys.all, 'transcription', id] as const,
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

export function useAmbientConfig() {
  return useQuery({
    queryKey: ambientKeys.config(),
    queryFn: async () => {
      const { data } = await api.get<AmbientConfig>('/ai/ambient/config');
      return data;
    },
  });
}

export function useAmbientStats() {
  return useQuery({
    queryKey: ambientKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<AmbientStats>('/ai/ambient/stats');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAmbientTranscription(sessionId: string) {
  return useQuery({
    queryKey: ambientKeys.transcription(sessionId),
    queryFn: async () => {
      const { data } = await api.get<{ chunks: TranscriptionChunk[] }>(`/ai/ambient/sessions/${sessionId}/transcription`);
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 2000,
  });
}

export function useStartAmbientSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { encounterId?: string; patientId?: string; language?: string; specialty?: string; template?: string }) => {
      const { data } = await api.post<AmbientSession>('/ai/ambient/sessions/start', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ambientKeys.lists() });
      qc.invalidateQueries({ queryKey: ambientKeys.stats() });
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
      qc.invalidateQueries({ queryKey: ambientKeys.stats() });
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

export function useUpdateAmbientConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AmbientConfig>) => {
      const { data } = await api.patch<AmbientConfig>('/ai/ambient/config', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ambientKeys.config() });
    },
  });
}
