import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  TriageAssessment,
  CreateTriageDto,
  TriageLevel,
  PaginatedResponse,
  ManchesterFlowchart,
  ManchesterFlowchartSummary,
  FlowchartSuggestion,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const triageKeys = {
  all: ['triage'] as const,
  detail: (encounterId: string) => [...triageKeys.all, 'encounter', encounterId] as const,
  queue: () => [...triageKeys.all, 'queue'] as const,
  queueByLevel: (level?: TriageLevel) => [...triageKeys.queue(), level] as const,
  flowcharts: () => [...triageKeys.all, 'flowcharts'] as const,
  flowchart: (code: string) => [...triageKeys.all, 'flowchart', code] as const,
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
  triagedAt?: string;
  maxWaitTimeMinutes?: number;
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
    refetchInterval: 15_000, // Refresh queue every 15 seconds
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

// ============================================================================
// Manchester Flowchart Hooks
// ============================================================================

export function useFlowcharts() {
  return useQuery({
    queryKey: triageKeys.flowcharts(),
    queryFn: async () => {
      const { data } = await api.get<ManchesterFlowchartSummary[]>(
        '/triage/flowcharts',
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // Flowcharts rarely change
  });
}

export function useFlowchart(code: string) {
  return useQuery({
    queryKey: triageKeys.flowchart(code),
    queryFn: async () => {
      const { data } = await api.get<ManchesterFlowchart>(
        `/triage/flowcharts/${code}`,
      );
      return data;
    },
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuggestFlowchart() {
  return useMutation({
    mutationFn: async (chiefComplaint: string) => {
      const { data } = await api.post<FlowchartSuggestion>(
        '/triage/suggest-flowchart',
        { chiefComplaint },
      );
      return data;
    },
  });
}
