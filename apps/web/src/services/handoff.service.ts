import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface SbarData {
  s: string;
  b: string;
  a: string;
  r: string;
}

export interface HandoffPatient {
  patientId: string;
  sbar: SbarData;
  notes?: string;
}

export interface CreateHandoffDto {
  sectorId?: string;
  fromNurseId: string;
  toNurseId: string;
  patients: HandoffPatient[];
  shift?: 'MORNING' | 'AFTERNOON' | 'NIGHT';
}

export interface NursingHandoff {
  id: string;
  sectorId: string | null;
  fromNurseId: string;
  toNurseId: string;
  fromNurse: { id: string; name: string };
  toNurse: { id: string; name: string };
  patients: HandoffPatient[];
  shift: string | null;
  tenantId: string;
  createdAt: string;
}

export interface HandoffSummaryResult {
  summary: string;
  criticalItems: Array<{ patient: string; item: string; urgency: string }>;
  pendingTasks: Array<{ patient: string; task: string; dueAt?: string }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const handoffKeys = {
  all: ['handoffs'] as const,
  history: (sectorId?: string) => [...handoffKeys.all, 'history', sectorId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useHandoffHistory(sectorId?: string) {
  return useQuery({
    queryKey: handoffKeys.history(sectorId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<NursingHandoff>>(
        '/nursing/handoff/history',
        { params: { sectorId } },
      );
      return data;
    },
  });
}

export function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateHandoffDto) => {
      const { data } = await api.post<NursingHandoff>('/nursing/handoff', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
}

export function useGenerateSbar() {
  return useMutation({
    mutationFn: async (params: {
      ward: string;
      shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
      patientIds: string[];
    }) => {
      const { data } = await api.post<HandoffSummaryResult>(
        '/ai/handoff-summary',
        params,
      );
      return data;
    },
  });
}
