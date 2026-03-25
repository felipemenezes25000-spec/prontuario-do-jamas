import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type PriorAuthStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface PriorAuthRequest {
  id: string;
  patientName: string;
  insuranceProvider: string;
  procedureCode: string;
  procedureDescription: string;
  justification: string;
  status: PriorAuthStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  authorizationNumber: string | null;
  denialReason: string | null;
  createdAt: string;
  timeline: PriorAuthTimelineEntry[];
}

export interface PriorAuthTimelineEntry {
  id: string;
  status: PriorAuthStatus;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface CreatePriorAuthPayload {
  patientId: string;
  insuranceProvider: string;
  procedureCode: string;
  procedureDescription: string;
  justification: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  attachments?: string[];
}

export interface PriorAuthFilters {
  status?: PriorAuthStatus;
  insuranceProvider?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const priorAuthKeys = {
  all: ['billing-prior-auth'] as const,
  list: (filters?: PriorAuthFilters) => [...priorAuthKeys.all, 'list', filters] as const,
  detail: (id: string) => [...priorAuthKeys.all, 'detail', id] as const,
  insurers: () => [...priorAuthKeys.all, 'insurers'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePriorAuthRequests(filters?: PriorAuthFilters) {
  return useQuery({
    queryKey: priorAuthKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PriorAuthRequest[]>(
        '/billing/prior-auth',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePriorAuthDetail(id: string) {
  return useQuery({
    queryKey: priorAuthKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<PriorAuthRequest>(
        `/billing/prior-auth/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useInsuranceProviders() {
  return useQuery({
    queryKey: priorAuthKeys.insurers(),
    queryFn: async () => {
      const { data } = await api.get<string[]>('/billing/prior-auth/insurers');
      return data;
    },
  });
}

export function useCreatePriorAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePriorAuthPayload) => {
      const { data } = await api.post<PriorAuthRequest>(
        '/billing/prior-auth',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: priorAuthKeys.list() });
    },
  });
}

export function useSubmitPriorAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<PriorAuthRequest>(
        `/billing/prior-auth/${id}/submit`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: priorAuthKeys.detail(id) });
      qc.invalidateQueries({ queryKey: priorAuthKeys.list() });
    },
  });
}
