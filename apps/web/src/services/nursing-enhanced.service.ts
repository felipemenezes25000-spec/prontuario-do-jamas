import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface WoundRecord {
  id: string;
  location: string;
  classification: string;
  stage?: string;
  length?: number;
  width?: number;
  depth?: number;
  area?: number;
  photoUrl?: string;
  assessedAt: string;
  author: { id: string; name: string } | null;
}

export interface PainRecord {
  id: string;
  scaleType: string;
  score: number;
  location?: string;
  postAnalgesia?: boolean;
  reassessmentScore?: number;
  assessedAt: string;
  author: { id: string; name: string } | null;
}

export interface RepositioningData {
  records: Array<{
    id: string;
    position: string;
    recordedAt: string;
    notes?: string;
    author: { id: string; name: string } | null;
  }>;
  isOverdue: boolean;
  nextDueAt: string | null;
}

export interface CatheterBundle {
  id: string;
  catheterType: string;
  insertionDate: string;
  dwellDays: number;
  isOverdue: boolean;
  alertMessage: string | null;
  careChecklist: Record<string, boolean>;
}

export interface StaffingResult {
  totalHoursNeeded: number;
  totalProfessionals: number;
  distribution: { nurses: number; technicians: number; auxiliaries: number };
  perShift: { morning: number; afternoon: number; night: number };
  reference: string;
}

export interface AiFallRiskPrediction {
  patientId: string;
  predictedRisk: string;
  riskScore: number;
  factors: Array<{ factor: string; weight: number; present: boolean }>;
  recommendations: string[];
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const nursingEnhKeys = {
  all: ['nursing-enhanced'] as const,
  wounds: (patientId: string) => [...nursingEnhKeys.all, 'wounds', patientId] as const,
  pain: (patientId: string) => [...nursingEnhKeys.all, 'pain', patientId] as const,
  eliminations: (patientId: string) => [...nursingEnhKeys.all, 'eliminations', patientId] as const,
  repositioning: (patientId: string, encounterId: string) =>
    [...nursingEnhKeys.all, 'repositioning', patientId, encounterId] as const,
  catheters: (patientId: string) => [...nursingEnhKeys.all, 'catheters', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useWounds(patientId: string) {
  return useQuery({
    queryKey: nursingEnhKeys.wounds(patientId),
    queryFn: async () => {
      const { data } = await api.get<WoundRecord[]>(`/nursing-enhanced/wounds/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRegisterWound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      location: string;
      classification: string;
      stage?: string;
      length?: number;
      width?: number;
    }) => {
      const { data } = await api.post('/nursing-enhanced/wounds', dto);
      return data;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: nursingEnhKeys.wounds(v.patientId) }); },
  });
}

export function usePainScales(patientId: string) {
  return useQuery({
    queryKey: nursingEnhKeys.pain(patientId),
    queryFn: async () => {
      const { data } = await api.get<PainRecord[]>(`/nursing-enhanced/pain/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordPain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      scaleType: string;
      score: number;
      location?: string;
    }) => {
      const { data } = await api.post('/nursing-enhanced/pain', dto);
      return data;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: nursingEnhKeys.pain(v.patientId) }); },
  });
}

export function useEliminations(patientId: string) {
  return useQuery({
    queryKey: nursingEnhKeys.eliminations(patientId),
    queryFn: async () => {
      const { data } = await api.get(`/nursing-enhanced/elimination/${patientId}`);
      return data as Array<Record<string, unknown>>;
    },
    enabled: !!patientId,
  });
}

export function useRecordElimination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      type: string;
      volume?: number;
      aspect?: string;
      bristolScale?: number;
    }) => {
      const { data } = await api.post('/nursing-enhanced/elimination', dto);
      return data;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: nursingEnhKeys.eliminations(v.patientId) }); },
  });
}

export function useRepositioning(patientId: string, encounterId: string) {
  return useQuery({
    queryKey: nursingEnhKeys.repositioning(patientId, encounterId),
    queryFn: async () => {
      const { data } = await api.get<RepositioningData>(`/nursing-enhanced/repositioning/${patientId}/${encounterId}`);
      return data;
    },
    enabled: !!patientId && !!encounterId,
  });
}

export function useRecordRepositioning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; encounterId: string; position: string }) => {
      const { data } = await api.post('/nursing-enhanced/repositioning', dto);
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: nursingEnhKeys.repositioning(v.patientId, v.encounterId) });
    },
  });
}

export function useCatheterBundles(patientId: string) {
  return useQuery({
    queryKey: nursingEnhKeys.catheters(patientId),
    queryFn: async () => {
      const { data } = await api.get<CatheterBundle[]>(`/nursing-enhanced/catheter-bundle/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCalculateStaffing() {
  return useMutation({
    mutationFn: async (dto: {
      totalMinimal: number;
      totalIntermediate: number;
      totalSemiIntensive: number;
      totalIntensive: number;
    }) => {
      const { data } = await api.post<StaffingResult>('/nursing-enhanced/staffing-calculator', dto);
      return data;
    },
  });
}

export function useAssessMorse() {
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      historyOfFalling: number;
      secondaryDiagnosis: number;
      ambulatoryAid: number;
      ivTherapy: number;
      gait: number;
      mentalStatus: number;
    }) => {
      const { data } = await api.post('/nursing-enhanced/morse', dto);
      return data;
    },
  });
}

export function useAssessBraden() {
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      sensoryPerception: number;
      moisture: number;
      activity: number;
      mobility: number;
      nutrition: number;
      frictionShear: number;
    }) => {
      const { data } = await api.post('/nursing-enhanced/braden', dto);
      return data;
    },
  });
}

export function useAssessFugulin() {
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/nursing-enhanced/fugulin', dto);
      return data;
    },
  });
}

export function useAiFallRiskPrediction(patientId: string) {
  return useQuery({
    queryKey: [...nursingEnhKeys.all, 'ai-fall-risk', patientId],
    queryFn: async () => {
      const { data } = await api.get<AiFallRiskPrediction>(`/nursing-enhanced/ai/fall-risk/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useAiWoundPrediction(patientId: string) {
  return useQuery({
    queryKey: [...nursingEnhKeys.all, 'ai-wound', patientId],
    queryFn: async () => {
      const { data } = await api.get(`/nursing-enhanced/ai/wound-prediction/${patientId}`);
      return data as Record<string, unknown>;
    },
    enabled: !!patientId,
  });
}
