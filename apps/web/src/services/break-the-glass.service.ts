import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type BTGStatus = 'PENDING_REVIEW' | 'APPROVED' | 'FLAGGED' | 'VIOLATION';

export interface BreakTheGlassAccess {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  patientId: string;
  patientName: string;
  justification: string;
  accessedAt: string;
  resourcesAccessed: string[];
  ipAddress?: string;
  dpoReviewStatus: BTGStatus;
  dpoReviewedBy?: string;
  dpoReviewedAt?: string;
  dpoNotes?: string;
}

export interface BTGFilters {
  dpoReviewStatus?: BTGStatus;
  userId?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const btgKeys = {
  all: ['break-the-glass'] as const,
  logs: (filters?: BTGFilters) => [...btgKeys.all, 'logs', filters] as const,
  detail: (id: string) => [...btgKeys.all, 'detail', id] as const,
  stats: () => [...btgKeys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useBTGLogs(filters?: BTGFilters) {
  return useQuery({
    queryKey: btgKeys.logs(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: BreakTheGlassAccess[]; total: number }>(
        '/compliance/break-the-glass/logs',
        { params: filters },
      );
      return data;
    },
  });
}

export function useBTGStats() {
  return useQuery({
    queryKey: btgKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<{
        totalAccesses: number;
        pendingReview: number;
        flaggedCount: number;
        violationCount: number;
      }>('/compliance/break-the-glass/stats');
      return data;
    },
  });
}

export function useRequestBreakTheGlass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; justification: string }) => {
      const { data } = await api.post<BreakTheGlassAccess>('/compliance/break-the-glass/request', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: btgKeys.all });
    },
  });
}

export function useReviewBTGAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: 'APPROVED' | 'FLAGGED' | 'VIOLATION';
      notes?: string;
    }) => {
      const { data } = await api.patch<BreakTheGlassAccess>(`/compliance/break-the-glass/logs/${id}/review`, {
        status,
        notes,
      });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: btgKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: btgKeys.all });
    },
  });
}
