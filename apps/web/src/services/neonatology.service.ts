import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const neonatologyKeys = {
  all: ['neonatology'] as const,
  admissions: (params?: Record<string, unknown>) => [...neonatologyKeys.all, 'admissions', params] as const,
  admission: (id: string) => [...neonatologyKeys.all, 'admission', id] as const,
  weightChart: (patientId: string) => [...neonatologyKeys.all, 'weight', patientId] as const,
  phototherapy: (patientId: string) => [...neonatologyKeys.all, 'phototherapy', patientId] as const,
  alerts: (params?: Record<string, unknown>) => [...neonatologyKeys.all, 'alerts', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface NICUAdmission {
  id: string;
  patientId: string;
  patientName: string;
  motherName: string;
  birthDate: string;
  gestationalWeeks: number;
  birthWeight: number;
  currentWeight: number;
  apgar1: number;
  apgar5: number;
  capurroScore: number;
  deliveryType: 'VAGINAL' | 'CESAREAN';
  diagnosis: string[];
  bed: string;
  status: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';
  admittedAt: string;
  dischargedAt?: string;
}

export interface CreateNICUAdmissionDto {
  patientId: string;
  motherName: string;
  gestationalWeeks: number;
  birthWeight: number;
  apgar1: number;
  apgar5: number;
  capurroScore: number;
  deliveryType: 'VAGINAL' | 'CESAREAN';
  diagnosis: string[];
  bed: string;
}

export interface WeightRecord {
  id: string;
  patientId: string;
  date: string;
  weight: number;
  dayOfLife: number;
  percentChange: number;
}

export interface CreateWeightDto {
  patientId: string;
  weight: number;
}

export interface PhototherapySession {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime?: string;
  type: 'CONVENTIONAL' | 'INTENSIVE' | 'DOUBLE';
  bilirubinBefore: number;
  bilirubinAfter?: number;
  irradiance: number;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  notes?: string;
}

export interface CreatePhototherapyDto {
  patientId: string;
  type: PhototherapySession['type'];
  bilirubinBefore: number;
  irradiance: number;
  notes?: string;
}

export interface NeonatalAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'WEIGHT_LOSS' | 'TEMPERATURE' | 'BILIRUBIN' | 'APNEA' | 'BRADYCARDIA' | 'DESATURATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useNICUAdmissions(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: neonatologyKeys.admissions(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: NICUAdmission[]; total: number }>(
        '/neonatology/admissions',
        { params },
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateNICUAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateNICUAdmissionDto) => {
      const { data } = await api.post<NICUAdmission>('/neonatology/admissions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: neonatologyKeys.admissions() });
    },
  });
}

export function useWeightChart(patientId: string) {
  return useQuery({
    queryKey: neonatologyKeys.weightChart(patientId),
    queryFn: async () => {
      const { data } = await api.get<WeightRecord[]>(
        `/neonatology/patients/${patientId}/weight`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateWeightRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWeightDto) => {
      const { data } = await api.post<WeightRecord>('/neonatology/weight', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: neonatologyKeys.weightChart(variables.patientId) });
      qc.invalidateQueries({ queryKey: neonatologyKeys.admissions() });
    },
  });
}

export function usePhototherapy(patientId: string) {
  return useQuery({
    queryKey: neonatologyKeys.phototherapy(patientId),
    queryFn: async () => {
      const { data } = await api.get<PhototherapySession[]>(
        `/neonatology/patients/${patientId}/phototherapy`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreatePhototherapy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePhototherapyDto) => {
      const { data } = await api.post<PhototherapySession>('/neonatology/phototherapy', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: neonatologyKeys.phototherapy(variables.patientId) });
    },
  });
}

export function useNeonatalAlerts(params?: { page?: number; limit?: number; severity?: string }) {
  return useQuery({
    queryKey: neonatologyKeys.alerts(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: NeonatalAlert[]; total: number }>(
        '/neonatology/alerts',
        { params },
      );
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await api.patch(`/neonatology/alerts/${alertId}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: neonatologyKeys.alerts() });
    },
  });
}
