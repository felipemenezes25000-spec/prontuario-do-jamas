import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  BillingEntry,
  PaginatedResponse,
  CreateBillingEntryDto,
  BillingStatus,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface BillingFilters {
  encounterId?: string;
  patientId?: string;
  status?: BillingStatus;
  insuranceProvider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const billingKeys = {
  all: ['billing'] as const,
  lists: () => [...billingKeys.all, 'list'] as const,
  list: (filters?: BillingFilters) => [...billingKeys.lists(), filters] as const,
  details: () => [...billingKeys.all, 'detail'] as const,
  detail: (id: string) => [...billingKeys.details(), id] as const,
  byEncounter: (encounterId: string) => [...billingKeys.all, 'encounter', encounterId] as const,
  byPatient: (patientId: string) => [...billingKeys.all, 'patient', patientId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useBillingEntries(filters?: BillingFilters) {
  return useQuery({
    queryKey: billingKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<BillingEntry>>('/billing', {
        params: filters,
      });
      return data;
    },
  });
}

export function useBillingEntry(id: string) {
  return useQuery({
    queryKey: billingKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<BillingEntry>(`/billing/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useEncounterBilling(encounterId: string) {
  return useQuery({
    queryKey: billingKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<BillingEntry[]>('/billing', {
        params: { encounterId },
      });
      return data;
    },
    enabled: !!encounterId,
  });
}

export function usePatientBilling(patientId: string) {
  return useQuery({
    queryKey: billingKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<BillingEntry>>('/billing', {
        params: { patientId },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateBillingEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: CreateBillingEntryDto) => {
      const { data } = await api.post<BillingEntry>('/billing', entry);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: billingKeys.lists() });
      qc.invalidateQueries({ queryKey: billingKeys.byEncounter(result.encounterId) });
    },
  });
}

export function useUpdateBillingEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BillingEntry> & { id: string }) => {
      const { data } = await api.patch<BillingEntry>(`/billing/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: billingKeys.lists() });
    },
  });
}

export function useUpdateBillingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BillingStatus }) => {
      const { data } = await api.patch<BillingEntry>(`/billing/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useGenerateTissXml() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ tissXml: string; billingEntry: BillingEntry }>(
        `/billing/${id}/generate-tiss`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: billingKeys.detail(id) });
    },
  });
}

export function useSubmitBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<BillingEntry>(`/billing/${id}/submit`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: billingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useAppealBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<BillingEntry>(`/billing/${id}/appeal`, { reason });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useDeleteBillingEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/billing/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.lists() });
    },
  });
}
