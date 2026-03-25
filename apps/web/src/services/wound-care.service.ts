import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export type WoundClassification = 'NPUAP_I' | 'NPUAP_II' | 'NPUAP_III' | 'NPUAP_IV' | 'NPUAP_UNSTAGEABLE' | 'WAGNER_0' | 'WAGNER_1' | 'WAGNER_2' | 'WAGNER_3' | 'WAGNER_4' | 'WAGNER_5' | 'SURGICAL' | 'TRAUMATIC' | 'BURN';

export interface Wound {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  bodyLocation: string;
  classification: WoundClassification;
  status: 'ACTIVE' | 'HEALING' | 'HEALED' | 'WORSENING';
  openedAt: string;
  healedAt: string | null;
  createdAt: string;
}

export interface WoundEvolution {
  id: string;
  woundId: string;
  length: number;
  width: number;
  depth: number;
  area: number;
  exudate: 'NONE' | 'SCANT' | 'MODERATE' | 'ABUNDANT';
  exudateType: string;
  tissueType: string;
  edges: string;
  perilesionalSkin: string;
  pain: number;
  observations: string;
  evaluatedBy: string;
  evaluatedAt: string;
  photoUrl: string | null;
}

export interface DressingPlan {
  id: string;
  woundId: string;
  dressingType: string;
  frequency: string;
  instructions: string;
  active: boolean;
  createdAt: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const woundCareKeys = {
  all: ['wound-care'] as const,
  wounds: (filters?: Record<string, unknown>) =>
    [...woundCareKeys.all, 'wounds', filters] as const,
  wound: (woundId: string) =>
    [...woundCareKeys.all, 'wound', woundId] as const,
  evolutions: (woundId: string) =>
    [...woundCareKeys.all, 'evolutions', woundId] as const,
  dressingPlans: (woundId: string) =>
    [...woundCareKeys.all, 'dressing-plans', woundId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useWounds(filters?: { classification?: string; status?: string }) {
  return useQuery({
    queryKey: woundCareKeys.wounds(filters),
    queryFn: async () => {
      const { data } = await api.get<Wound[]>('/wound-care/wounds', { params: filters });
      return data;
    },
  });
}

export function useWoundEvolutions(woundId: string) {
  return useQuery({
    queryKey: woundCareKeys.evolutions(woundId),
    queryFn: async () => {
      const { data } = await api.get<WoundEvolution[]>(`/wound-care/wounds/${woundId}/evolutions`);
      return data;
    },
    enabled: !!woundId,
  });
}

export function useDressingPlans(woundId: string) {
  return useQuery({
    queryKey: woundCareKeys.dressingPlans(woundId),
    queryFn: async () => {
      const { data } = await api.get<DressingPlan[]>(`/wound-care/wounds/${woundId}/dressing-plans`);
      return data;
    },
    enabled: !!woundId,
  });
}

export function useCreateWound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; bodyLocation: string; classification: WoundClassification }) => {
      const { data } = await api.post<Wound>('/wound-care/wounds', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: woundCareKeys.wounds() });
    },
  });
}

export function useCreateEvolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Omit<WoundEvolution, 'id' | 'area' | 'evaluatedBy' | 'evaluatedAt' | 'photoUrl'>) => {
      const { data } = await api.post<WoundEvolution>(`/wound-care/wounds/${dto.woundId}/evolutions`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: woundCareKeys.evolutions(variables.woundId) });
      qc.invalidateQueries({ queryKey: woundCareKeys.wounds() });
    },
  });
}

export function useCreateDressingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { woundId: string; dressingType: string; frequency: string; instructions: string }) => {
      const { data } = await api.post<DressingPlan>(`/wound-care/wounds/${dto.woundId}/dressing-plans`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: woundCareKeys.dressingPlans(variables.woundId) });
    },
  });
}
