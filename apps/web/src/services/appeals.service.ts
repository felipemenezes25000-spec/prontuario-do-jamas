import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  BillingAppeal,
  PaginatedResponse,
  CreateAppealDto,
  UpdateAppealStatusDto,
  AppealStatus,
  TissValidationResult,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface AppealFilters {
  status?: AppealStatus;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const appealKeys = {
  all: ['billing-appeals'] as const,
  lists: () => [...appealKeys.all, 'list'] as const,
  list: (filters?: AppealFilters) => [...appealKeys.lists(), filters] as const,
  details: () => [...appealKeys.all, 'detail'] as const,
  detail: (id: string) => [...appealKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useBillingAppeals(filters?: AppealFilters) {
  return useQuery({
    queryKey: appealKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<BillingAppeal>>(
        '/billing/appeals',
        { params: filters },
      );
      return data;
    },
  });
}

export function useBillingAppeal(id: string) {
  return useQuery({
    queryKey: appealKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<BillingAppeal>(`/billing/appeals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAppealDto) => {
      const { data } = await api.post<BillingAppeal>('/billing/appeals', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appealKeys.lists() });
    },
  });
}

export function useUpdateAppealStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpdateAppealStatusDto & { id: string }) => {
      const { data } = await api.patch<BillingAppeal>(
        `/billing/appeals/${id}/status`,
        dto,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: appealKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: appealKeys.lists() });
    },
  });
}

export function useGenerateAIJustification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ aiJustification: string }>(
        `/billing/appeals/${id}/ai-justification`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: appealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: appealKeys.lists() });
    },
  });
}

export function useValidateTissXml() {
  return useMutation({
    mutationFn: async (xml: string) => {
      const { data } = await api.post<TissValidationResult>(
        '/billing/tiss/validate',
        { xml },
      );
      return data;
    },
  });
}
