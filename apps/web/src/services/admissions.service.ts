import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Admission,
  Bed,
  BedTransfer,
  CreateAdmissionDto,
  CreateBedTransferDto,
  BedStatus,
  DischargeType,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface AdmissionFilters {
  patientId?: string;
  status?: string;
  ward?: string;
  page?: number;
  limit?: number;
}

export interface BedFilters {
  ward?: string;
  floor?: string;
  status?: BedStatus;
  type?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  list: (filters?: AdmissionFilters) => [...admissionKeys.lists(), filters] as const,
  details: () => [...admissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...admissionKeys.details(), id] as const,
  beds: () => ['beds'] as const,
  bedList: (filters?: BedFilters) => [...admissionKeys.beds(), 'list', filters] as const,
  bedDetail: (id: string) => [...admissionKeys.beds(), id] as const,
  transfers: (admissionId: string) => [...admissionKeys.detail(admissionId), 'transfers'] as const,
};

// ============================================================================
// Admissions
// ============================================================================

export function useAdmissions(_filters?: AdmissionFilters) {
  return useQuery({
    queryKey: admissionKeys.list(_filters),
    queryFn: async () => {
      const { data } = await api.get<Admission[]>('/admissions/active');
      return data;
    },
  });
}

export function useAdmission(id: string) {
  return useQuery({
    queryKey: admissionKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Admission>(`/admissions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (admission: CreateAdmissionDto) => {
      const { data } = await api.post<Admission>('/admissions/admit', admission);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.lists() });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

export function useUpdateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Admission> & { id: string }) => {
      const { data } = await api.patch<Admission>(`/admissions/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: admissionKeys.lists() });
      qc.invalidateQueries({ queryKey: admissionKeys.detail(vars.id) });
    },
  });
}

export function useReverseDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      admissionId,
      reason,
    }: {
      admissionId: string;
      reason: string;
    }) => {
      const { data } = await api.post<Admission>(
        `/admissions/${admissionId}/reverse-discharge`,
        { reason },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.all });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

export interface DischargePayload {
  admissionId: string;
  dischargeType: DischargeType;
  dischargeCondition?: string;
  dischargeNotes?: string;
  dischargePrescription?: string;
  dischargeInstructions?: string;
  restrictions?: string;
  alertSigns?: string;
  followUpDate?: string;
  followUpSpecialty?: string;
  generateDocuments?: string[];
}

export function useDischargePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ admissionId, ...payload }: DischargePayload) => {
      const { data } = await api.post<Admission>(
        `/admissions/${admissionId}/discharge`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.all });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

// ============================================================================
// Beds
// ============================================================================

export function useBeds(filters?: BedFilters) {
  return useQuery({
    queryKey: admissionKeys.bedList(filters),
    queryFn: async () => {
      const { data } = await api.get<Bed[]>('/admissions/beds/all', { params: filters });
      return data;
    },
  });
}

export function useBed(id: string) {
  return useQuery({
    queryKey: admissionKeys.bedDetail(id),
    queryFn: async () => {
      const { data } = await api.get<Bed>(`/admissions/beds/all`);
      // API doesn't expose single bed GET — filter client-side
      const bed = (Array.isArray(data) ? data : []).find((b: Bed) => b.id === id);
      if (!bed) throw new Error(`Bed ${id} not found`);
      return bed;
    },
    enabled: !!id,
  });
}

export function useUpdateBedStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BedStatus }) => {
      const { data } = await api.patch<Bed>(`/admissions/beds/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

// ============================================================================
// Bed Transfers
// ============================================================================

export function useBedTransfers(admissionId: string) {
  return useQuery({
    queryKey: admissionKeys.transfers(admissionId),
    queryFn: async () => {
      // No dedicated transfers listing endpoint — retrieve from admission detail
      const { data } = await api.get<Admission & { bedTransfers?: BedTransfer[] }>(
        `/admissions/${admissionId}`,
      );
      return data.bedTransfers ?? [];
    },
    enabled: !!admissionId,
  });
}

export function useRequestBedTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: CreateBedTransferDto) => {
      const { data } = await api.post<BedTransfer>(
        `/admissions/${transfer.admissionId}/transfer`,
        transfer,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: admissionKeys.transfers(vars.admissionId) });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

export function useApproveBedTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ admissionId }: { admissionId: string }) => {
      const { data } = await api.post<BedTransfer>(
        `/admissions/${admissionId}/transfer`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.all });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}

export function useExecuteBedTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ admissionId }: { admissionId: string }) => {
      const { data } = await api.post<BedTransfer>(
        `/admissions/${admissionId}/transfer`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.all });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}
