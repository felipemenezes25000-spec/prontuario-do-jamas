import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface SepsisScreening {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  qsofaScore: number;
  qsofaAlteredMentation: boolean;
  qsofaSystolicBp: boolean;
  qsofaRespRate: boolean;
  sofaScore: number | null;
  sofaRespiration: number;
  sofaCoagulation: number;
  sofaLiver: number;
  sofaCardiovascular: number;
  sofaCns: number;
  sofaRenal: number;
  sirsTemp: boolean;
  sirsHeartRate: boolean;
  sirsRespRate: boolean;
  sirsWbc: boolean;
  sirsScore: number;
  status: 'SCREENING' | 'SUSPECTED' | 'CONFIRMED' | 'SEPTIC_SHOCK' | 'RESOLVED' | 'RULED_OUT';
  screenedBy: string;
  screenedAt: string;
}

export interface SepsisBundle {
  id: string;
  screeningId: string;
  bundleType: 'HOUR_1' | 'HOUR_3';
  items: BundleItem[];
  completedAt: string | null;
  compliance: number;
}

export interface BundleItem {
  id: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

export interface SepsisCase {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  status: string;
  qsofaScore: number;
  sofaScore: number | null;
  activatedAt: string;
  elapsedMinutes: number;
  bundle1hCompliance: number;
  bundle3hCompliance: number;
}

export interface SepsisComplianceData {
  totalCases: number;
  bundle1hCompliance: number;
  bundle3hCompliance: number;
  mortalityRate: number;
  avgTimeToAntibiotic: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const sepsisKeys = {
  all: ['sepsis'] as const,
  activeCases: () => [...sepsisKeys.all, 'active-cases'] as const,
  screening: (patientId: string) => [...sepsisKeys.all, 'screening', patientId] as const,
  bundles: (screeningId: string) => [...sepsisKeys.all, 'bundles', screeningId] as const,
  compliance: () => [...sepsisKeys.all, 'compliance'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useSepsisActiveCases() {
  return useQuery({
    queryKey: sepsisKeys.activeCases(),
    queryFn: async () => {
      const { data } = await api.get<SepsisCase[]>('/sepsis/active-cases');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useSepsisScreening(patientId: string) {
  return useQuery({
    queryKey: sepsisKeys.screening(patientId),
    queryFn: async () => {
      const { data } = await api.get<SepsisScreening[]>(`/sepsis/screening/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useSepsisBundles(screeningId: string) {
  return useQuery({
    queryKey: sepsisKeys.bundles(screeningId),
    queryFn: async () => {
      const { data } = await api.get<SepsisBundle[]>(`/sepsis/bundles/${screeningId}`);
      return data;
    },
    enabled: !!screeningId,
  });
}

export function useSepsisCompliance() {
  return useQuery({
    queryKey: sepsisKeys.compliance(),
    queryFn: async () => {
      const { data } = await api.get<SepsisComplianceData>('/sepsis/compliance');
      return data;
    },
  });
}

export function useCreateSepsisScreening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      qsofaAlteredMentation: boolean;
      qsofaSystolicBp: boolean;
      qsofaRespRate: boolean;
      sofaRespiration?: number;
      sofaCoagulation?: number;
      sofaLiver?: number;
      sofaCardiovascular?: number;
      sofaCns?: number;
      sofaRenal?: number;
      sirsTemp?: boolean;
      sirsHeartRate?: boolean;
      sirsRespRate?: boolean;
      sirsWbc?: boolean;
    }) => {
      const { data } = await api.post<SepsisScreening>('/sepsis/screening', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sepsisKeys.activeCases() });
    },
  });
}

export function useCompleteBundleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { screeningId: string; bundleId: string; itemId: string }) => {
      const { data } = await api.patch(`/sepsis/bundles/${dto.bundleId}/items/${dto.itemId}/complete`);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: sepsisKeys.bundles(variables.screeningId) });
      qc.invalidateQueries({ queryKey: sepsisKeys.activeCases() });
      qc.invalidateQueries({ queryKey: sepsisKeys.compliance() });
    },
  });
}
