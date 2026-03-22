import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Admission,
  Bed,
  BedTransfer,
  PaginatedResponse,
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

export function useAdmissions(filters?: AdmissionFilters) {
  return useQuery({
    queryKey: admissionKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Admission>>('/admissions', {
        params: filters,
      });
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
      const { data } = await api.post<Admission>('/admissions', admission);
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

export function useDischargePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      admissionId,
      dischargeType,
      dischargeNotes,
      dischargePrescription,
      dischargeInstructions,
      followUpDate,
    }: {
      admissionId: string;
      dischargeType: DischargeType;
      dischargeNotes?: string;
      dischargePrescription?: string;
      dischargeInstructions?: string;
      followUpDate?: string;
    }) => {
      const { data } = await api.post<Admission>(`/admissions/${admissionId}/discharge`, {
        dischargeType,
        dischargeNotes,
        dischargePrescription,
        dischargeInstructions,
        followUpDate,
      });
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
      const { data } = await api.get<Bed[]>('/beds', { params: filters });
      return data;
    },
  });
}

export function useBed(id: string) {
  return useQuery({
    queryKey: admissionKeys.bedDetail(id),
    queryFn: async () => {
      const { data } = await api.get<Bed>(`/beds/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateBedStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BedStatus }) => {
      const { data } = await api.patch<Bed>(`/beds/${id}/status`, { status });
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
      const { data } = await api.get<BedTransfer[]>(
        `/admissions/${admissionId}/transfers`,
      );
      return data;
    },
    enabled: !!admissionId,
  });
}

export function useRequestBedTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: CreateBedTransferDto) => {
      const { data } = await api.post<BedTransfer>(
        `/admissions/${transfer.admissionId}/transfers`,
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
    mutationFn: async ({ transferId }: { transferId: string }) => {
      const { data } = await api.post<BedTransfer>(
        `/beds/transfers/${transferId}/approve`,
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
    mutationFn: async ({ transferId }: { transferId: string }) => {
      const { data } = await api.post<BedTransfer>(
        `/beds/transfers/${transferId}/execute`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: admissionKeys.all });
      qc.invalidateQueries({ queryKey: admissionKeys.beds() });
    },
  });
}
