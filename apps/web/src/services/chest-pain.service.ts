import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface ChestPainCase {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  killipClass: 1 | 2 | 3 | 4;
  timiScore: number;
  status: 'ACTIVATED' | 'ECG_PENDING' | 'TROPONIN_PENDING' | 'CATH_LAB' | 'PCI' | 'COMPLETED' | 'CANCELLED';
  doorTime: string;
  ecgTime: string | null;
  balloonTime: string | null;
  doorToBalloonMinutes: number | null;
  diagnosis: string | null;
  activatedBy: string;
  activatedAt: string;
}

export interface TimiCalculation {
  age65: boolean;
  aspirin7d: boolean;
  knownCoronary: boolean;
  stDeviation: boolean;
  angina24h: boolean;
  elevatedMarkers: boolean;
  riskFactors3: boolean;
  totalScore: number;
  riskLevel: 'LOW' | 'INTERMEDIATE' | 'HIGH';
}

export interface ChestPainChecklistItem {
  id: string;
  caseId: string;
  description: string;
  category: 'ECG' | 'TROPONIN' | 'MEDICATION' | 'HEMODYNAMIC' | 'CATH_LAB';
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const chestPainKeys = {
  all: ['chest-pain'] as const,
  activeCases: () => [...chestPainKeys.all, 'active-cases'] as const,
  case: (caseId: string) => [...chestPainKeys.all, 'case', caseId] as const,
  checklist: (caseId: string) => [...chestPainKeys.all, 'checklist', caseId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useChestPainActiveCases() {
  return useQuery({
    queryKey: chestPainKeys.activeCases(),
    queryFn: async () => {
      const { data } = await api.get<ChestPainCase[]>('/chest-pain/active-cases');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useChestPainCase(caseId: string) {
  return useQuery({
    queryKey: chestPainKeys.case(caseId),
    queryFn: async () => {
      const { data } = await api.get<ChestPainCase>(`/chest-pain/cases/${caseId}`);
      return data;
    },
    enabled: !!caseId,
  });
}

export function useChestPainChecklist(caseId: string) {
  return useQuery({
    queryKey: chestPainKeys.checklist(caseId),
    queryFn: async () => {
      const { data } = await api.get<ChestPainChecklistItem[]>(`/chest-pain/cases/${caseId}/checklist`);
      return data;
    },
    enabled: !!caseId,
  });
}

export function useActivateChestPainProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; killipClass: number; timiData: Omit<TimiCalculation, 'totalScore' | 'riskLevel'> }) => {
      const { data } = await api.post<ChestPainCase>('/chest-pain/activate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chestPainKeys.activeCases() });
    },
  });
}

export function useCompleteChestPainChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { caseId: string; itemId: string }) => {
      const { data } = await api.patch(`/chest-pain/cases/${dto.caseId}/checklist/${dto.itemId}/complete`);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: chestPainKeys.checklist(variables.caseId) });
      qc.invalidateQueries({ queryKey: chestPainKeys.activeCases() });
    },
  });
}
