import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const bulkFhirKeys = {
  all: ['bulk-fhir'] as const,
  jobs: () => [...bulkFhirKeys.all, 'jobs'] as const,
  job: (id: string) => [...bulkFhirKeys.all, 'job', id] as const,
  resourceTypes: () => [...bulkFhirKeys.all, 'resource-types'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ExportJobStatus = 'EM_FILA' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO' | 'CANCELADO';

export interface ExportJob {
  id: string;
  resourceTypes: string[];
  dateFrom: string | null;
  dateTo: string | null;
  status: ExportJobStatus;
  progress: number; // 0-100
  totalResources: number;
  exportedResources: number;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdBy: string;
}

export interface ResourceTypeInfo {
  type: string;
  count: number;
  lastUpdated: string;
}

export interface CreateExportPayload {
  resourceTypes: string[];
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useBulkExportJobs() {
  return useQuery({
    queryKey: bulkFhirKeys.jobs(),
    queryFn: async () => {
      const { data } = await api.get<ExportJob[]>('/bulk-fhir/jobs');
      return data;
    },
    refetchInterval: 10_000,
  });
}

export function useBulkExportJob(id: string) {
  return useQuery({
    queryKey: bulkFhirKeys.job(id),
    queryFn: async () => {
      const { data } = await api.get<ExportJob>(`/bulk-fhir/jobs/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'EM_FILA' || status === 'PROCESSANDO') return 5_000;
      return false;
    },
  });
}

export function useResourceTypes() {
  return useQuery({
    queryKey: bulkFhirKeys.resourceTypes(),
    queryFn: async () => {
      const { data } = await api.get<ResourceTypeInfo[]>('/bulk-fhir/resource-types');
      return data;
    },
  });
}

export function useCreateExportJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExportPayload) => {
      const { data } = await api.post('/bulk-fhir/jobs', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bulkFhirKeys.jobs() });
    },
  });
}

export function useCancelExportJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.patch(`/bulk-fhir/jobs/${jobId}/cancel`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bulkFhirKeys.jobs() });
    },
  });
}
