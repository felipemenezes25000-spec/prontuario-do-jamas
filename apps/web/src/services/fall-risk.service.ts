import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface MorseFallAssessment {
  id: string;
  patientId: string;
  historyOfFalling: number; // 0 or 25
  secondaryDiagnosis: number; // 0 or 15
  ambulatoryAid: number; // 0, 15, or 30
  ivTherapy: number; // 0 or 20
  gait: number; // 0, 10, or 20
  mentalStatus: number; // 0 or 15
  totalScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  assessedBy: string;
  assessedAt: string;
}

export interface BradenAssessment {
  id: string;
  patientId: string;
  sensoryPerception: number; // 1-4
  moisture: number; // 1-4
  activity: number; // 1-4
  mobility: number; // 1-4
  nutrition: number; // 1-4
  frictionShear: number; // 1-3
  totalScore: number;
  riskLevel: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'NO_RISK';
  assessedBy: string;
  assessedAt: string;
}

export interface FallRiskAlert {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  morseScore: number | null;
  bradenScore: number | null;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  alertDate: string;
  active: boolean;
}

export interface PreventionPlan {
  id: string;
  patientId: string;
  interventions: PreventionIntervention[];
  createdAt: string;
  updatedAt: string;
}

export interface PreventionIntervention {
  id: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const fallRiskKeys = {
  all: ['fall-risk'] as const,
  alerts: (filters?: Record<string, unknown>) =>
    [...fallRiskKeys.all, 'alerts', filters] as const,
  patient: (patientId: string) =>
    [...fallRiskKeys.all, 'patient', patientId] as const,
  morseHistory: (patientId: string) =>
    [...fallRiskKeys.all, 'morse', patientId] as const,
  bradenHistory: (patientId: string) =>
    [...fallRiskKeys.all, 'braden', patientId] as const,
  preventionPlan: (patientId: string) =>
    [...fallRiskKeys.all, 'prevention', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useFallRiskAlerts(filters?: { riskLevel?: string; ward?: string }) {
  return useQuery({
    queryKey: fallRiskKeys.alerts(filters),
    queryFn: async () => {
      const { data } = await api.get<FallRiskAlert[]>('/fall-risk/alerts', { params: filters });
      return data;
    },
  });
}

export function useMorseHistory(patientId: string) {
  return useQuery({
    queryKey: fallRiskKeys.morseHistory(patientId),
    queryFn: async () => {
      const { data } = await api.get<MorseFallAssessment[]>(`/fall-risk/morse/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useBradenHistory(patientId: string) {
  return useQuery({
    queryKey: fallRiskKeys.bradenHistory(patientId),
    queryFn: async () => {
      const { data } = await api.get<BradenAssessment[]>(`/fall-risk/braden/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePreventionPlan(patientId: string) {
  return useQuery({
    queryKey: fallRiskKeys.preventionPlan(patientId),
    queryFn: async () => {
      const { data } = await api.get<PreventionPlan>(`/fall-risk/prevention/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateMorseAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Omit<MorseFallAssessment, 'id' | 'totalScore' | 'riskLevel' | 'assessedBy' | 'assessedAt'>) => {
      const { data } = await api.post<MorseFallAssessment>('/fall-risk/morse', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fallRiskKeys.morseHistory(variables.patientId) });
      qc.invalidateQueries({ queryKey: fallRiskKeys.alerts() });
    },
  });
}

export function useCreateBradenAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Omit<BradenAssessment, 'id' | 'totalScore' | 'riskLevel' | 'assessedBy' | 'assessedAt'>) => {
      const { data } = await api.post<BradenAssessment>('/fall-risk/braden', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fallRiskKeys.bradenHistory(variables.patientId) });
      qc.invalidateQueries({ queryKey: fallRiskKeys.alerts() });
    },
  });
}

export function useToggleIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; interventionId: string; completed: boolean }) => {
      const { data } = await api.patch(`/fall-risk/prevention/${dto.patientId}/intervention/${dto.interventionId}`, {
        completed: dto.completed,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fallRiskKeys.preventionPlan(variables.patientId) });
    },
  });
}
