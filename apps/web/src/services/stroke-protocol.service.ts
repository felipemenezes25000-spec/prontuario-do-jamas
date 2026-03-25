import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface StrokeCode {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  nihssScore: number;
  status: 'ACTIVATED' | 'IMAGING' | 'DECISION' | 'TREATMENT' | 'POST_TREATMENT' | 'COMPLETED' | 'CANCELLED';
  strokeType: 'ISCHEMIC' | 'HEMORRHAGIC' | 'TIA' | 'UNDETERMINED';
  activatedAt: string;
  doorTime: string;
  ctTime: string | null;
  needleTime: string | null;
  doorToNeedleMinutes: number | null;
  thrombolysisEligible: boolean;
  thrombectomyEligible: boolean;
  activatedBy: string;
}

export interface NihssAssessment {
  id: string;
  strokeCodeId: string;
  consciousness: number;
  consciousnessQuestions: number;
  consciousnessCommands: number;
  bestGaze: number;
  visual: number;
  facialPalsy: number;
  motorArmLeft: number;
  motorArmRight: number;
  motorLegLeft: number;
  motorLegRight: number;
  limbAtaxia: number;
  sensory: number;
  bestLanguage: number;
  dysarthria: number;
  extinctionInattention: number;
  totalScore: number;
  assessedBy: string;
  assessedAt: string;
}

export interface StrokeChecklist {
  id: string;
  strokeCodeId: string;
  items: StrokeChecklistItem[];
}

export interface StrokeChecklistItem {
  id: string;
  description: string;
  category: 'THROMBOLYSIS' | 'THROMBECTOMY' | 'GENERAL';
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const strokeProtocolKeys = {
  all: ['stroke-protocol'] as const,
  activeCodes: () => [...strokeProtocolKeys.all, 'active-codes'] as const,
  code: (codeId: string) => [...strokeProtocolKeys.all, 'code', codeId] as const,
  nihss: (codeId: string) => [...strokeProtocolKeys.all, 'nihss', codeId] as const,
  checklist: (codeId: string) => [...strokeProtocolKeys.all, 'checklist', codeId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useActiveStrokeCodes() {
  return useQuery({
    queryKey: strokeProtocolKeys.activeCodes(),
    queryFn: async () => {
      const { data } = await api.get<StrokeCode[]>('/stroke-protocol/active-codes');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useStrokeCode(codeId: string) {
  return useQuery({
    queryKey: strokeProtocolKeys.code(codeId),
    queryFn: async () => {
      const { data } = await api.get<StrokeCode>(`/stroke-protocol/codes/${codeId}`);
      return data;
    },
    enabled: !!codeId,
  });
}

export function useNihssAssessments(codeId: string) {
  return useQuery({
    queryKey: strokeProtocolKeys.nihss(codeId),
    queryFn: async () => {
      const { data } = await api.get<NihssAssessment[]>(`/stroke-protocol/codes/${codeId}/nihss`);
      return data;
    },
    enabled: !!codeId,
  });
}

export function useStrokeChecklist(codeId: string) {
  return useQuery({
    queryKey: strokeProtocolKeys.checklist(codeId),
    queryFn: async () => {
      const { data } = await api.get<StrokeChecklist>(`/stroke-protocol/codes/${codeId}/checklist`);
      return data;
    },
    enabled: !!codeId,
  });
}

export function useActivateStrokeCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; strokeType: string }) => {
      const { data } = await api.post<StrokeCode>('/stroke-protocol/activate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: strokeProtocolKeys.activeCodes() });
    },
  });
}

export function useCreateNihssAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Omit<NihssAssessment, 'id' | 'totalScore' | 'assessedBy' | 'assessedAt'>) => {
      const { data } = await api.post<NihssAssessment>(`/stroke-protocol/codes/${dto.strokeCodeId}/nihss`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: strokeProtocolKeys.nihss(variables.strokeCodeId) });
      qc.invalidateQueries({ queryKey: strokeProtocolKeys.activeCodes() });
    },
  });
}

export function useCompleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { codeId: string; itemId: string }) => {
      const { data } = await api.patch(`/stroke-protocol/codes/${dto.codeId}/checklist/${dto.itemId}/complete`);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: strokeProtocolKeys.checklist(variables.codeId) });
    },
  });
}
