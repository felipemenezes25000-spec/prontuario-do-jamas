import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  TriageAssessment,
  CreateTriageDto,
  TriageLevel,
  PaginatedResponse,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const triageKeys = {
  all: ['triage'] as const,
  detail: (encounterId: string) => [...triageKeys.all, 'encounter', encounterId] as const,
  queue: () => [...triageKeys.all, 'queue'] as const,
  queueByLevel: (level?: TriageLevel) => [...triageKeys.queue(), level] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface TriageQueueItem {
  encounterId: string;
  patientId: string;
  patientName: string;
  chiefComplaint: string;
  level: TriageLevel;
  waitTimeMinutes: number;
  arrivedAt: string;
}

export interface TriageQueueFilters {
  level?: TriageLevel;
  page?: number;
  limit?: number;
}

// ============================================================================
// Hooks
// ============================================================================

export function useTriageAssessment(encounterId: string) {
  return useQuery({
    queryKey: triageKeys.detail(encounterId),
    queryFn: async () => {
      const { data } = await api.get<TriageAssessment>(
        `/triage/encounter/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useTriageQueue(filters?: TriageQueueFilters) {
  return useQuery({
    queryKey: triageKeys.queueByLevel(filters?.level),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<TriageQueueItem>>(
        '/triage/queue',
        { params: filters },
      );
      return data;
    },
    refetchInterval: 30_000, // Refresh queue every 30 seconds
  });
}

export function useCreateTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (triage: CreateTriageDto) => {
      const { data } = await api.post<TriageAssessment>('/triage', triage);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: triageKeys.queue() });
      qc.invalidateQueries({ queryKey: triageKeys.detail(result.encounterId) });
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
  });
}

export function useUpdateTriageLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      encounterId,
      level,
      reason,
    }: {
      encounterId: string;
      level: TriageLevel;
      reason?: string;
    }) => {
      const { data } = await api.patch<TriageAssessment>(
        `/triage/encounter/${encounterId}/level`,
        { level, overrideReason: reason },
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: triageKeys.queue() });
      qc.invalidateQueries({ queryKey: triageKeys.detail(result.encounterId) });
    },
  });
}

export function useReassessTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      encounterId,
      notes,
    }: {
      encounterId: string;
      notes: string;
    }) => {
      const { data } = await api.post<TriageAssessment>(
        `/triage/encounter/${encounterId}/reassess`,
        { notes },
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: triageKeys.queue() });
      qc.invalidateQueries({ queryKey: triageKeys.detail(result.encounterId) });
    },
  });
}
