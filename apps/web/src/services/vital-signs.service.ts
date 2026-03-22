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
};

// ============================================================================
// Hooks
// ============================================================================

export function useVitalSigns(patientId: string) {
  return useQuery({
    queryKey: vitalSignsKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<VitalSigns>>(
        `/patients/${patientId}/vital-signs`,
      );
      return data.data;
    },
    enabled: !!patientId,
  });
}

export function useEncounterVitalSigns(encounterId: string) {
  return useQuery({
    queryKey: vitalSignsKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<VitalSigns[]>(
        `/encounters/${encounterId}/vital-signs`,
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
        `/patients/${patientId}/vital-signs/latest`,
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
      qc.invalidateQueries({ queryKey: vitalSignsKeys.byPatient(vars.patientId) });
      if (vars.encounterId) {
        qc.invalidateQueries({ queryKey: vitalSignsKeys.byEncounter(vars.encounterId) });
      }
    },
  });
}
