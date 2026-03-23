import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { VitalSigns, PaginatedResponse, CreateVitalSignsDto } from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const vitalSignsKeys = {
  all: ['vital-signs'] as const,
  byPatient: (patientId: string) => [...vitalSignsKeys.all, 'patient', patientId] as const,
  byEncounter: (encounterId: string) => [...vitalSignsKeys.all, 'encounter', encounterId] as const,
  latest: (patientId: string) => [...vitalSignsKeys.byPatient(patientId), 'latest'] as const,
  trends: (patientId: string) => [...vitalSignsKeys.byPatient(patientId), 'trends'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useVitalSigns(patientId: string) {
  return useQuery({
    queryKey: vitalSignsKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<VitalSigns>>(
        `/vital-signs/patient/${patientId}`,
      );
      return data?.data ?? [];
    },
    enabled: !!patientId,
  });
}

export function useEncounterVitalSigns(encounterId: string) {
  return useQuery({
    queryKey: vitalSignsKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<VitalSigns[]>(
        `/vital-signs/by-encounter/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useLatestVitalSigns(patientId: string) {
  return useQuery({
    queryKey: vitalSignsKeys.latest(patientId),
    queryFn: async () => {
      const { data } = await api.get<VitalSigns>(
        `/vital-signs/patient/${patientId}/latest`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

interface VitalSignsTrendPoint {
  id: string;
  recordedAt: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  newsScore: number | null;
  newsClassification: string | null;
}

export function useVitalSignsTrends(patientId: string, count = 20) {
  return useQuery({
    queryKey: vitalSignsKeys.trends(patientId),
    queryFn: async () => {
      const { data } = await api.get<VitalSignsTrendPoint[]>(
        `/vital-signs/patient/${patientId}/trends`,
        { params: { count } },
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordVitalSigns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vitalSigns: CreateVitalSignsDto) => {
      const { data } = await api.post<VitalSigns>('/vital-signs', vitalSigns);
      return data;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: vitalSignsKeys.byPatient(vars.patientId) });
      void qc.invalidateQueries({ queryKey: vitalSignsKeys.trends(vars.patientId) });
      void qc.invalidateQueries({ queryKey: vitalSignsKeys.latest(vars.patientId) });
      if (vars.encounterId) {
        void qc.invalidateQueries({ queryKey: vitalSignsKeys.byEncounter(vars.encounterId) });
      }
    },
  });
}
