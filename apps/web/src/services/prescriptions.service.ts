import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Prescription,
  PrescriptionItem,
  PaginatedResponse,
  CreatePrescriptionDto,
  CreatePrescriptionItemDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface PrescriptionFilters {
  encounterId?: string;
  patientId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (filters?: PrescriptionFilters) => [...prescriptionKeys.lists(), filters] as const,
  details: () => [...prescriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
  byEncounter: (encounterId: string) => [...prescriptionKeys.all, 'encounter', encounterId] as const,
  byPatient: (patientId: string) => [...prescriptionKeys.all, 'patient', patientId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePrescriptions(filters?: PrescriptionFilters) {
  return useQuery({
    queryKey: prescriptionKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Prescription>>('/prescriptions', { params: filters });
      return data;
    },
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Prescription>(`/prescriptions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useEncounterPrescriptions(encounterId: string) {
  return useQuery({
    queryKey: prescriptionKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Prescription>>('/prescriptions', {
        params: { encounterId },
      });
      return data.data;
    },
    enabled: !!encounterId,
  });
}

export function usePatientPrescriptions(patientId: string) {
  return useQuery({
    queryKey: prescriptionKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Prescription>>('/prescriptions', {
        params: { patientId },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prescription: CreatePrescriptionDto) => {
      const { data } = await api.post<Prescription>('/prescriptions', prescription);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.byEncounter(result.encounterId) });
    },
  });
}

export function useUpdatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prescription> & { id: string }) => {
      const { data } = await api.patch<Prescription>(`/prescriptions/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(vars.id) });
    },
  });
}

export function useAddPrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prescriptionId,
      item,
    }: {
      prescriptionId: string;
      item: CreatePrescriptionItemDto;
    }) => {
      const { data } = await api.post<PrescriptionItem>(
        `/prescriptions/${prescriptionId}/items`,
        item,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
    },
  });
}

export function useUpdatePrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prescriptionId,
      itemId,
      ...updates
    }: Partial<PrescriptionItem> & { prescriptionId: string; itemId: string }) => {
      const { data } = await api.patch<PrescriptionItem>(
        `/prescriptions/${prescriptionId}/items/${itemId}`,
        updates,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
    },
  });
}

export function useDeletePrescriptionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prescriptionId,
      itemId,
    }: {
      prescriptionId: string;
      itemId: string;
    }) => {
      await api.delete(`/prescriptions/${prescriptionId}/items/${itemId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
    },
  });
}

export function useSignPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Prescription>(`/prescriptions/${id}/sign`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

export function useCancelPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post<Prescription>(`/prescriptions/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(vars.id) });
    },
  });
}

export function useCheckInteractions() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; medications: string[] }) => {
      const { data } = await api.post<{ interactions: unknown[]; alerts: string[] }>(
        '/prescriptions/check-interactions',
        payload,
      );
      return data;
    },
  });
}
