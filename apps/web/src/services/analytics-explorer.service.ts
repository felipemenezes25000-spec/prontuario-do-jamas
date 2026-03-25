import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Dimension {
  id: string;
  name: string;
  category: string;
  type: 'STRING' | 'DATE' | 'NUMBER' | 'BOOLEAN';
}

export interface Measure {
  id: string;
  name: string;
  category: string;
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
}

export interface AnalyticsQuery {
  id?: string;
  name?: string;
  dimensions: string[];
  measures: string[];
  filters?: Array<{
    dimensionId: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN';
    value: string | string[];
  }>;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' };
  limit?: number;
}

export interface AnalyticsResult {
  columns: Array<{ key: string; label: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  total: number;
  queryTimeMs: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: AnalyticsQuery;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const explorerKeys = {
  all: ['analytics-explorer'] as const,
  dimensions: () => [...explorerKeys.all, 'dimensions'] as const,
  measures: () => [...explorerKeys.all, 'measures'] as const,
  savedQueries: () => [...explorerKeys.all, 'saved'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useDimensions() {
  return useQuery({
    queryKey: explorerKeys.dimensions(),
    queryFn: async () => {
      const { data } = await api.get<Dimension[]>('/analytics/explorer/dimensions');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useMeasures() {
  return useQuery({
    queryKey: explorerKeys.measures(),
    queryFn: async () => {
      const { data } = await api.get<Measure[]>('/analytics/explorer/measures');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useSavedQueries() {
  return useQuery({
    queryKey: explorerKeys.savedQueries(),
    queryFn: async () => {
      const { data } = await api.get<{ data: SavedQuery[]; total: number }>('/analytics/explorer/queries');
      return data;
    },
  });
}

export function useRunQuery() {
  return useMutation({
    mutationFn: async (query: AnalyticsQuery) => {
      const { data } = await api.post<AnalyticsResult>('/analytics/explorer/run', query);
      return data;
    },
  });
}

export function useSaveQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; query: AnalyticsQuery }) => {
      const { data } = await api.post<SavedQuery>('/analytics/explorer/queries', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: explorerKeys.savedQueries() });
    },
  });
}
