import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface BcmaVerification {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  prescriptionItemId: string;
  medicationName: string;
  dose: string;
  route: string;
  scheduledTime: string;
  rightPatient: boolean;
  rightMedication: boolean;
  rightDose: boolean;
  rightRoute: boolean;
  rightTime: boolean;
  allRightsVerified: boolean;
  barcode: string;
  status: 'PENDING' | 'VERIFIED' | 'ADMINISTERED' | 'HELD' | 'REFUSED' | 'MISSED';
  administeredAt: string | null;
  administeredBy: string | null;
  notes: string | null;
}

export interface PendingMedication {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  scheduledTime: string;
  barcode: string;
  status: 'PENDING' | 'OVERDUE';
}

export interface AdministrationRecord {
  id: string;
  patientName: string;
  mrn: string;
  medicationName: string;
  dose: string;
  route: string;
  scheduledTime: string;
  administeredAt: string;
  administeredBy: string;
  allRightsVerified: boolean;
  status: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const bcmaKeys = {
  all: ['bcma'] as const,
  pending: (filters?: Record<string, unknown>) =>
    [...bcmaKeys.all, 'pending', filters] as const,
  history: (filters?: Record<string, unknown>) =>
    [...bcmaKeys.all, 'history', filters] as const,
  verification: (barcode: string) =>
    [...bcmaKeys.all, 'verification', barcode] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function usePendingMedications(filters?: { ward?: string; patientId?: string }) {
  return useQuery({
    queryKey: bcmaKeys.pending(filters),
    queryFn: async () => {
      const { data } = await api.get<PendingMedication[]>('/bcma/pending', { params: filters });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAdministrationHistory(filters?: { patientId?: string; date?: string }) {
  return useQuery({
    queryKey: bcmaKeys.history(filters),
    queryFn: async () => {
      const { data } = await api.get<AdministrationRecord[]>('/bcma/history', { params: filters });
      return data;
    },
  });
}

export function useVerifyBarcode() {
  return useMutation({
    mutationFn: async (barcode: string) => {
      const { data } = await api.post<BcmaVerification>('/bcma/verify', { barcode });
      return data;
    },
  });
}

export function useAdministerMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { verificationId: string; notes?: string }) => {
      const { data } = await api.post('/bcma/administer', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bcmaKeys.pending() });
      qc.invalidateQueries({ queryKey: bcmaKeys.history() });
    },
  });
}

export function useHoldMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { pendingId: string; reason: string }) => {
      const { data } = await api.post('/bcma/hold', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bcmaKeys.pending() });
    },
  });
}
