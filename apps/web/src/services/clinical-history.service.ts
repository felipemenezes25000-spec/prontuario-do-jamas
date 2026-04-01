import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface ProblemListItem {
  id: string;
  patientId: string;
  description: string;
  icdCode?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | 'INACTIVE';
  onset?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProblemDto {
  description: string;
  icdCode?: string;
  status: ProblemListItem['status'];
  onset?: string;
  notes?: string;
}

export interface UpdateProblemDto {
  description?: string;
  icdCode?: string;
  status?: ProblemListItem['status'];
  onset?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface HomeMedication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  indication?: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface CreateHomeMedicationDto {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  indication?: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ObstetricHistory {
  id: string;
  patientId: string;
  gravida: number;
  para: number;
  abortus: number;
  livingChildren: number;
  lastMenstrualPeriod?: string;
  gestationalAge?: number;
  deliveries: Array<{
    year: number;
    type: 'NORMAL' | 'CESAREAN' | 'FORCEPS';
    outcome: string;
    complications?: string;
  }>;
  prenatalCare: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObstetricHistoryDto {
  gravida: number;
  para: number;
  abortus: number;
  livingChildren: number;
  lastMenstrualPeriod?: string;
  gestationalAge?: number;
  deliveries?: Array<{
    year: number;
    type: 'NORMAL' | 'CESAREAN' | 'FORCEPS';
    outcome: string;
    complications?: string;
  }>;
  prenatalCare: boolean;
  notes?: string;
}

export interface TransfusionHistory {
  id: string;
  patientId: string;
  date: string;
  bloodProduct: string;
  units: number;
  indication: string;
  reactions?: string;
  facility?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateTransfusionHistoryDto {
  date: string;
  bloodProduct: string;
  units: number;
  indication: string;
  reactions?: string;
  facility?: string;
  notes?: string;
}

export interface ImplantedDevice {
  id: string;
  patientId: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  implantDate?: string;
  site?: string;
  mriCompatibility: 'SAFE' | 'CONDITIONAL' | 'UNSAFE' | 'UNKNOWN';
  mriConditions?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface CreateImplantedDeviceDto {
  deviceType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  implantDate?: string;
  site?: string;
  mriCompatibility: ImplantedDevice['mriCompatibility'];
  mriConditions?: string;
  notes?: string;
}

export interface MriAlert {
  patientId: string;
  hasUnsafeDevices: boolean;
  hasConditionalDevices: boolean;
  devices: Array<{
    id: string;
    deviceType: string;
    mriCompatibility: ImplantedDevice['mriCompatibility'];
    mriConditions?: string;
  }>;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  encounterId?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineParams {
  from?: string;
  to?: string;
  types?: string[];
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const clinicalHistoryKeys = {
  all: ['clinical-history'] as const,
  problems: (patientId: string) => [...clinicalHistoryKeys.all, 'problems', patientId] as const,
  homeMedications: (patientId: string) => [...clinicalHistoryKeys.all, 'home-medications', patientId] as const,
  obstetricHistory: (patientId: string) => [...clinicalHistoryKeys.all, 'obstetric-history', patientId] as const,
  transfusionHistory: (patientId: string) => [...clinicalHistoryKeys.all, 'transfusion-history', patientId] as const,
  implantedDevices: (patientId: string) => [...clinicalHistoryKeys.all, 'implanted-devices', patientId] as const,
  mriAlerts: (patientId: string) => [...clinicalHistoryKeys.all, 'mri-alerts', patientId] as const,
  timeline: (patientId: string, params?: TimelineParams) => [...clinicalHistoryKeys.all, 'timeline', patientId, params] as const,
};

// ============================================================================
// Problem List
// ============================================================================

export function useProblems(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.problems(patientId),
    queryFn: async () => {
      const { data } = await api.get<ProblemListItem[]>(`/patients/${patientId}/problems`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...dto }: CreateProblemDto & { patientId: string }) => {
      const { data } = await api.post<ProblemListItem>(`/patients/${patientId}/problems`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.problems(vars.patientId) });
    },
  });
}

export function useUpdateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, id, ...dto }: UpdateProblemDto & { patientId: string; id: string }) => {
      const { data } = await api.patch<ProblemListItem>(`/patients/${patientId}/problems/${id}`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.problems(vars.patientId) });
    },
  });
}

export function useDeleteProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, id }: { patientId: string; id: string }) => {
      await api.delete(`/patients/${patientId}/problems/${id}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.problems(vars.patientId) });
    },
  });
}

// ============================================================================
// Home Medications (Medicamentos em Uso)
// ============================================================================

export function useHomeMedications(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.homeMedications(patientId),
    queryFn: async () => {
      const { data } = await api.get<HomeMedication[]>(`/patients/${patientId}/home-medications`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateHomeMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...dto }: CreateHomeMedicationDto & { patientId: string }) => {
      const { data } = await api.post<HomeMedication>(`/patients/${patientId}/home-medications`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.homeMedications(vars.patientId) });
    },
  });
}

// ============================================================================
// Obstetric History (História Obstétrica)
// ============================================================================

export function useObstetricHistory(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.obstetricHistory(patientId),
    queryFn: async () => {
      const { data } = await api.get<ObstetricHistory>(`/patients/${patientId}/obstetric-history`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateObstetricHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...dto }: CreateObstetricHistoryDto & { patientId: string }) => {
      const { data } = await api.post<ObstetricHistory>(`/patients/${patientId}/obstetric-history`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.obstetricHistory(vars.patientId) });
    },
  });
}

// ============================================================================
// Transfusion History (Histórico de Transfusão)
// ============================================================================

export function useTransfusionHistory(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.transfusionHistory(patientId),
    queryFn: async () => {
      const { data } = await api.get<TransfusionHistory[]>(`/patients/${patientId}/transfusion-history`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateTransfusionHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...dto }: CreateTransfusionHistoryDto & { patientId: string }) => {
      const { data } = await api.post<TransfusionHistory>(`/patients/${patientId}/transfusion-history`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.transfusionHistory(vars.patientId) });
    },
  });
}

// ============================================================================
// Implanted Devices (Dispositivos Implantados)
// ============================================================================

export function useImplantedDevices(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.implantedDevices(patientId),
    queryFn: async () => {
      const { data } = await api.get<ImplantedDevice[]>(`/patients/${patientId}/implanted-devices`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateImplantedDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, ...dto }: CreateImplantedDeviceDto & { patientId: string }) => {
      const { data } = await api.post<ImplantedDevice>(`/patients/${patientId}/implanted-devices`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.implantedDevices(vars.patientId) });
      qc.invalidateQueries({ queryKey: clinicalHistoryKeys.mriAlerts(vars.patientId) });
    },
  });
}

export function useMriAlerts(patientId: string) {
  return useQuery({
    queryKey: clinicalHistoryKeys.mriAlerts(patientId),
    queryFn: async () => {
      const { data } = await api.get<MriAlert>(`/patients/${patientId}/implanted-devices/mri-alerts`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ============================================================================
// Patient Timeline
// ============================================================================

export function usePatientTimeline(patientId: string, params?: TimelineParams) {
  return useQuery({
    queryKey: clinicalHistoryKeys.timeline(patientId, params),
    queryFn: async () => {
      const { data } = await api.get<TimelineEvent[]>(`/patients/${patientId}/timeline`, { params });
      return data;
    },
    enabled: !!patientId,
  });
}
