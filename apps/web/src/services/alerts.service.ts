import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ClinicalAlert,
  PaginatedResponse,
  AlertType,
  AlertSeverity,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface AlertFilters {
  patientId?: string;
  encounterId?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: (filters?: AlertFilters) => [...alertKeys.lists(), filters] as const,
  active: () => [...alertKeys.all, 'active'] as const,
  byPatient: (patientId: string) => [...alertKeys.all, 'patient', patientId] as const,
  byEncounter: (encounterId: string) => [...alertKeys.all, 'encounter', encounterId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ClinicalAlert>>('/alerts', {
        params: filters,
      });
      return data;
    },
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: alertKeys.active(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ClinicalAlert>>('/alerts', {
        params: { isActive: true, limit: 100 },
      });
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function usePatientAlerts(patientId: string) {
  return useQuery({
    queryKey: alertKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<ClinicalAlert[]>('/alerts', {
        params: { patientId, isActive: true },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useEncounterAlerts(encounterId: string) {
  return useQuery({
    queryKey: alertKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<ClinicalAlert[]>('/alerts', {
        params: { encounterId },
      });
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actionTaken }: { id: string; actionTaken?: string }) => {
      const { data } = await api.post<ClinicalAlert>(`/alerts/${id}/acknowledge`, {
        actionTaken,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actionTaken }: { id: string; actionTaken?: string }) => {
      const { data } = await api.post<ClinicalAlert>(`/alerts/${id}/resolve`, {
        actionTaken,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post<ClinicalAlert>(`/alerts/${id}/dismiss`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
