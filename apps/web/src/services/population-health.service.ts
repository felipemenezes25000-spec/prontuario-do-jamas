import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface ConditionSummaryItem {
  conditionCode: string;
  conditionLabel: string;
  patientCount: number;
}

export interface CareGapItem {
  patientId: string;
  patientName: string;
  mrn: string;
  condition: string;
  gapType: string;
  lastDate: string | null;
  daysOverdue: number;
  urgency: 'RED' | 'YELLOW' | 'GREEN';
}

export interface RiskStratificationItem {
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  conditionCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  conditions: string[];
  recentAdmission: boolean;
}

export interface RiskSummary {
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  patients: RiskStratificationItem[];
}

export interface PopulationDashboardData {
  conditionCounts: ConditionSummaryItem[];
  gapsSummary: { withGaps: number; withoutGaps: number };
  monthlyDiagnoses: Array<{ month: string; count: number }>;
}

export interface ConditionPatient {
  id: string;
  fullName: string;
  mrn: string;
  birthDate: string;
  gender: string;
  cidCode: string;
  diagnosedAt: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const populationHealthKeys = {
  all: ['population-health'] as const,
  conditionsSummary: (filters?: Record<string, unknown>) =>
    [...populationHealthKeys.all, 'conditions-summary', filters] as const,
  patientsByCondition: (code: string, filters?: Record<string, unknown>) =>
    [...populationHealthKeys.all, 'patients', code, filters] as const,
  careGaps: (filters?: Record<string, unknown>) =>
    [...populationHealthKeys.all, 'care-gaps', filters] as const,
  riskStratification: () =>
    [...populationHealthKeys.all, 'risk-stratification'] as const,
  dashboard: () =>
    [...populationHealthKeys.all, 'dashboard'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useConditionsSummary(filters?: {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  diagnosedFrom?: string;
  diagnosedTo?: string;
}) {
  return useQuery({
    queryKey: populationHealthKeys.conditionsSummary(filters),
    queryFn: async () => {
      const { data } = await api.get<ConditionSummaryItem[]>(
        '/population-health/conditions-summary',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePatientsByCondition(
  conditionCode: string,
  filters?: { page?: number; pageSize?: number; ageMin?: number; ageMax?: number; gender?: string },
) {
  return useQuery({
    queryKey: populationHealthKeys.patientsByCondition(conditionCode, filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ConditionPatient>>(
        '/population-health/patients-by-condition',
        { params: { conditionCode, ...filters } },
      );
      return data;
    },
    enabled: !!conditionCode,
  });
}

export function useCareGaps(filters?: {
  conditionCode?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: populationHealthKeys.careGaps(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CareGapItem>>(
        '/population-health/care-gaps',
        { params: filters },
      );
      return data;
    },
  });
}

export function useRiskStratification() {
  return useQuery({
    queryKey: populationHealthKeys.riskStratification(),
    queryFn: async () => {
      const { data } = await api.get<RiskSummary>(
        '/population-health/risk-stratification',
      );
      return data;
    },
  });
}

export function usePopulationDashboard() {
  return useQuery({
    queryKey: populationHealthKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<PopulationDashboardData>(
        '/population-health/dashboard',
      );
      return data;
    },
  });
}
