import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface Problem {
  id: string;
  description: string;
  icdCode?: string;
  icdDescription?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RESOLVED';
  startDate?: string;
  resolutionDate?: string;
  notes?: string;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export interface HomeMedication {
  id: string;
  medicationName: string;
  dose?: string;
  frequency?: string;
  route?: string;
  prescribedBy?: string;
  active: boolean;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export interface ObstetricHistory {
  id: string;
  gestations: number;
  deliveries: number;
  abortions: number;
  cesareans: number;
  gpac: string;
  livingChildren?: number;
  lastMenstrualPeriod?: string;
  notes?: string;
}

export interface ImplantedDevice {
  id: string;
  deviceType: string;
  description: string;
  model?: string;
  manufacturer?: string;
  implantDate?: string;
  mriCompatible?: boolean;
  mriAlert: boolean;
}

export interface GenogramMember {
  name: string;
  relation: string;
  deceased?: boolean;
  ageAtDeath?: number;
  conditions?: string[];
  notes?: string;
}

export interface Genogram {
  id: string;
  members: GenogramMember[];
  notes?: string;
}

export interface TimelineItem {
  id: string;
  type: string;
  date: string;
  title: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface InconsistencyResult {
  patientId: string;
  inconsistencies: Array<{
    type: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  totalFound: number;
}

export interface AnamnesisSuggestions {
  patientId: string;
  chiefComplaint: string;
  suggestedQuestions: string[];
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const anamnesisKeys = {
  all: ['anamnesis'] as const,
  problems: (patientId: string, status?: string) =>
    [...anamnesisKeys.all, 'problems', patientId, status] as const,
  homeMeds: (patientId: string) =>
    [...anamnesisKeys.all, 'home-meds', patientId] as const,
  obstetric: (patientId: string) =>
    [...anamnesisKeys.all, 'obstetric', patientId] as const,
  transfusions: (patientId: string) =>
    [...anamnesisKeys.all, 'transfusions', patientId] as const,
  devices: (patientId: string) =>
    [...anamnesisKeys.all, 'devices', patientId] as const,
  genogram: (patientId: string) =>
    [...anamnesisKeys.all, 'genogram', patientId] as const,
  timeline: (patientId: string) =>
    [...anamnesisKeys.all, 'timeline', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useProblems(patientId: string, status?: string) {
  return useQuery({
    queryKey: anamnesisKeys.problems(patientId, status),
    queryFn: async () => {
      const { data } = await api.get<Problem[]>(`/anamnesis/problems/${patientId}`, {
        params: status ? { status } : {},
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      description: string;
      icdCode?: string;
      status: string;
    }) => {
      const { data } = await api.post('/anamnesis/problems', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: anamnesisKeys.problems(variables.patientId) });
    },
  });
}

export function useHomeMedications(patientId: string) {
  return useQuery({
    queryKey: anamnesisKeys.homeMeds(patientId),
    queryFn: async () => {
      const { data } = await api.get<HomeMedication[]>(`/anamnesis/home-medications/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateHomeMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      medicationName: string;
      dose?: string;
      frequency?: string;
    }) => {
      const { data } = await api.post('/anamnesis/home-medications', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: anamnesisKeys.homeMeds(variables.patientId) });
    },
  });
}

export function useObstetricHistory(patientId: string) {
  return useQuery({
    queryKey: anamnesisKeys.obstetric(patientId),
    queryFn: async () => {
      const { data } = await api.get<ObstetricHistory | null>(`/anamnesis/obstetric-history/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useImplantedDevices(patientId: string) {
  return useQuery({
    queryKey: anamnesisKeys.devices(patientId),
    queryFn: async () => {
      const { data } = await api.get<ImplantedDevice[]>(`/anamnesis/implanted-devices/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateImplantedDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      deviceType: string;
      description: string;
      model?: string;
      manufacturer?: string;
      mriCompatible?: boolean;
    }) => {
      const { data } = await api.post('/anamnesis/implanted-devices', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: anamnesisKeys.devices(variables.patientId) });
    },
  });
}

export function useGenogram(patientId: string) {
  return useQuery({
    queryKey: anamnesisKeys.genogram(patientId),
    queryFn: async () => {
      const { data } = await api.get<Genogram | null>(`/anamnesis/genogram/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useVisualTimeline(patientId: string, type?: string) {
  return useQuery({
    queryKey: [...anamnesisKeys.timeline(patientId), type],
    queryFn: async () => {
      const { data } = await api.get<{ items: TimelineItem[]; hasMore: boolean }>(`/anamnesis/timeline/${patientId}`, {
        params: type ? { type } : {},
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useAiInconsistencyCheck() {
  return useMutation({
    mutationFn: async (dto: { patientId: string }) => {
      const { data } = await api.post<InconsistencyResult>('/anamnesis/ai/inconsistency-check', dto);
      return data;
    },
  });
}

export function useAiAnamnesisSuggestions() {
  return useMutation({
    mutationFn: async (dto: { patientId: string; chiefComplaint: string }) => {
      const { data } = await api.post<AnamnesisSuggestions>('/anamnesis/ai/anamnesis-suggestions', dto);
      return data;
    },
  });
}
