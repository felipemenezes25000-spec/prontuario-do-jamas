import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type TrialStatus = 'PLANNING' | 'RECRUITING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

export interface ClinicalTrial {
  id: string;
  title: string;
  protocol: string;
  principalInvestigator: string;
  sponsor?: string;
  status: TrialStatus;
  startDate: string;
  endDate?: string;
  targetEnrollment: number;
  currentEnrollment: number;
  description: string;
  eligibilityCriteria?: string;
  createdAt: string;
}

export interface EligiblePatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  matchScore: number;
  matchingCriteria: string[];
  excludingCriteria?: string[];
}

export interface TrialEnrollment {
  id: string;
  trialId: string;
  patientId: string;
  patientName: string;
  enrolledAt: string;
  status: 'SCREENING' | 'ENROLLED' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'SCREEN_FAIL';
  consentSignedAt?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
}

export interface TrialFilters {
  status?: TrialStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const researchKeys = {
  all: ['clinical-research'] as const,
  trials: (filters?: TrialFilters) => [...researchKeys.all, 'trials', filters] as const,
  trial: (id: string) => [...researchKeys.all, 'trial', id] as const,
  eligible: (trialId: string) => [...researchKeys.all, 'eligible', trialId] as const,
  enrollments: (trialId: string) => [...researchKeys.all, 'enrollments', trialId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useClinicalTrials(filters?: TrialFilters) {
  return useQuery({
    queryKey: researchKeys.trials(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: ClinicalTrial[]; total: number }>('/analytics/research/trials', {
        params: filters,
      });
      return data;
    },
  });
}

export function useClinicalTrial(id: string) {
  return useQuery({
    queryKey: researchKeys.trial(id),
    queryFn: async () => {
      const { data } = await api.get<ClinicalTrial>(`/analytics/research/trials/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useEligiblePatients(trialId: string) {
  return useQuery({
    queryKey: researchKeys.eligible(trialId),
    queryFn: async () => {
      const { data } = await api.get<{ data: EligiblePatient[]; total: number }>(
        `/analytics/research/trials/${trialId}/eligible`,
      );
      return data;
    },
    enabled: !!trialId,
  });
}

export function useTrialEnrollments(trialId: string) {
  return useQuery({
    queryKey: researchKeys.enrollments(trialId),
    queryFn: async () => {
      const { data } = await api.get<{ data: TrialEnrollment[]; total: number }>(
        `/analytics/research/trials/${trialId}/enrollments`,
      );
      return data;
    },
    enabled: !!trialId,
  });
}

export function useCreateTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<ClinicalTrial, 'id' | 'currentEnrollment' | 'createdAt'>) => {
      const { data } = await api.post<ClinicalTrial>('/analytics/research/trials', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: researchKeys.all });
    },
  });
}

export function useEnrollPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { trialId: string; patientId: string }) => {
      const { data } = await api.post<TrialEnrollment>(
        `/analytics/research/trials/${payload.trialId}/enroll`,
        { patientId: payload.patientId },
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: researchKeys.enrollments(vars.trialId) });
      qc.invalidateQueries({ queryKey: researchKeys.trial(vars.trialId) });
    },
  });
}

export function useFindEligiblePatients() {
  return useMutation({
    mutationFn: async (trialId: string) => {
      const { data } = await api.post<{ data: EligiblePatient[]; total: number }>(
        `/analytics/research/trials/${trialId}/find-eligible`,
      );
      return data;
    },
  });
}
