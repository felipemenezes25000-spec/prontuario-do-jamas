import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface SkinAssessment {
  id: string;
  patientId: string;
  bodyRegion: string;
  skinIntegrity: 'INTACT' | 'COMPROMISED';
  description: string;
  assessedBy: string;
  assessedAt: string;
}

export type NpuapStage = 'STAGE_I' | 'STAGE_II' | 'STAGE_III' | 'STAGE_IV' | 'UNSTAGEABLE' | 'DEEP_TISSUE';

export interface WoundRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  bodyRegion: string;
  stage: NpuapStage;
  length: number;
  width: number;
  depth: number;
  exudate: string;
  tissueType: string;
  edges: string;
  bradenScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositioningSchedule {
  id: string;
  patientId: string;
  scheduledAt: string;
  position: string;
  completedAt: string | null;
  completedBy: string | null;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const pressureInjuryKeys = {
  all: ['pressure-injury'] as const,
  assessments: (patientId: string) =>
    [...pressureInjuryKeys.all, 'assessments', patientId] as const,
  wounds: (filters?: Record<string, unknown>) =>
    [...pressureInjuryKeys.all, 'wounds', filters] as const,
  patientWounds: (patientId: string) =>
    [...pressureInjuryKeys.all, 'patient-wounds', patientId] as const,
  repositioning: (patientId: string) =>
    [...pressureInjuryKeys.all, 'repositioning', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useSkinAssessments(patientId: string) {
  return useQuery({
    queryKey: pressureInjuryKeys.assessments(patientId),
    queryFn: async () => {
      const { data } = await api.get<SkinAssessment[]>(`/pressure-injury/assessments/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useWoundRecords(filters?: { stage?: string; ward?: string }) {
  return useQuery({
    queryKey: pressureInjuryKeys.wounds(filters),
    queryFn: async () => {
      const { data } = await api.get<WoundRecord[]>('/pressure-injury/wounds', { params: filters });
      return data;
    },
  });
}

export function useRepositioningSchedule(patientId: string) {
  return useQuery({
    queryKey: pressureInjuryKeys.repositioning(patientId),
    queryFn: async () => {
      const { data } = await api.get<RepositioningSchedule[]>(`/pressure-injury/repositioning/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateSkinAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; bodyRegion: string; skinIntegrity: string; description: string }) => {
      const { data } = await api.post<SkinAssessment>('/pressure-injury/assessments', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: pressureInjuryKeys.assessments(variables.patientId) });
    },
  });
}

export function useCreateWoundRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Omit<WoundRecord, 'id' | 'patientName' | 'mrn' | 'bed' | 'ward' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await api.post<WoundRecord>('/pressure-injury/wounds', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pressureInjuryKeys.wounds() });
    },
  });
}

export function useCompleteRepositioning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; scheduleId: string }) => {
      const { data } = await api.patch(`/pressure-injury/repositioning/${dto.scheduleId}/complete`);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: pressureInjuryKeys.repositioning(variables.patientId) });
    },
  });
}
