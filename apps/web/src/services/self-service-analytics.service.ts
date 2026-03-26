import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'BETWEEN' | 'GREATER_THAN' | 'LESS_THAN';
  value: string | string[];
}

export interface SlicerQuery {
  filters: AnalyticsFilter[];
  groupBy?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface SlicerColumn {
  key: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'DATE';
}

export interface SlicerResult {
  columns: SlicerColumn[];
  rows: Array<Record<string, unknown>>;
  total: number;
  queryTimeMs: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterMetadata {
  diagnoses: FilterOption[];
  procedures: FilterOption[];
  doctors: FilterOption[];
  departments: FilterOption[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const slicerKeys = {
  all: ['self-service-analytics'] as const,
  metadata: () => [...slicerKeys.all, 'metadata'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useFilterMetadata() {
  return useQuery({
    queryKey: slicerKeys.metadata(),
    queryFn: async () => {
      const { data } = await api.get<FilterMetadata>('/self-service-analytics/metadata');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRunSlicerQuery() {
  return useMutation({
    mutationFn: async (query: SlicerQuery) => {
      const { data } = await api.post<SlicerResult>('/self-service-analytics/query', query);
      return data;
    },
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: async (query: SlicerQuery) => {
      const { data } = await api.post('/self-service-analytics/export/csv', query, {
        responseType: 'blob',
      });
      return data as Blob;
    },
  });
}
