import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface CohortCriteria {
  ageRange?: { min: number; max: number };
  gender?: string;
  diagnoses?: string[];
  medications?: string[];
  dateRange?: { start: string; end: string };
  departments?: string[];
}

export interface CohortResult {
  id: string;
  name?: string;
  criteria: CohortCriteria;
  patientCount: number;
  patients: Array<{
    id: string;
    name: string;
    age: number;
    gender: string;
    lastEncounter?: string;
  }>;
  createdAt: string;
}

export interface LongitudinalData {
  patientId: string;
  patientName: string;
  timeline: Array<{
    date: string;
    type: 'ENCOUNTER' | 'LAB' | 'PRESCRIPTION' | 'PROCEDURE' | 'DIAGNOSIS';
    description: string;
    details?: Record<string, unknown>;
  }>;
}

export interface BenchmarkComparison {
  metric: string;
  facilityValue: number;
  benchmarkValue: number;
  percentile: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  unit: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const warehouseKeys = {
  all: ['data-warehouse'] as const,
  cohorts: () => [...warehouseKeys.all, 'cohorts'] as const,
  longitudinal: (patientId: string) => [...warehouseKeys.all, 'longitudinal', patientId] as const,
  benchmarks: () => [...warehouseKeys.all, 'benchmarks'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useCohorts() {
  return useQuery({
    queryKey: warehouseKeys.cohorts(),
    queryFn: async () => {
      const { data } = await api.get<{ data: CohortResult[]; total: number }>('/analytics/warehouse/cohorts');
      return data;
    },
  });
}

export function useLongitudinalData(patientId: string) {
  return useQuery({
    queryKey: warehouseKeys.longitudinal(patientId),
    queryFn: async () => {
      const { data } = await api.get<LongitudinalData>(`/analytics/warehouse/longitudinal/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useBenchmarks() {
  return useQuery({
    queryKey: warehouseKeys.benchmarks(),
    queryFn: async () => {
      const { data } = await api.get<BenchmarkComparison[]>('/analytics/warehouse/benchmarks');
      return data;
    },
  });
}

export function useBuildCohort() {
  return useMutation({
    mutationFn: async (payload: { name?: string; criteria: CohortCriteria }) => {
      const { data } = await api.post<CohortResult>('/analytics/warehouse/cohorts', payload);
      return data;
    },
  });
}
