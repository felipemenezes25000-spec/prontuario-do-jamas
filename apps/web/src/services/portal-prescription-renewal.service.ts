import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type RenewalStatus = 'REQUESTED' | 'IN_REVIEW' | 'APPROVED' | 'DENIED';

export interface ActivePrescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  endDate: string | null;
  renewalEligible: boolean;
  lastRenewalDate: string | null;
}

export interface RenewalRequest {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  status: RenewalStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  denialReason: string | null;
  notes: string | null;
}

export interface RequestRenewalPayload {
  prescriptionId: string;
  notes?: string;
}

export interface RenewalFilters {
  status?: RenewalStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const renewalKeys = {
  all: ['portal-prescription-renewal'] as const,
  prescriptions: () => [...renewalKeys.all, 'prescriptions'] as const,
  requests: (filters?: RenewalFilters) => [...renewalKeys.all, 'requests', filters] as const,
  history: () => [...renewalKeys.all, 'history'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useActivePrescriptions() {
  return useQuery({
    queryKey: renewalKeys.prescriptions(),
    queryFn: async () => {
      const { data } = await api.get<ActivePrescription[]>(
        '/patient-portal/prescriptions/active',
      );
      return data;
    },
  });
}

export function useRenewalRequests(filters?: RenewalFilters) {
  return useQuery({
    queryKey: renewalKeys.requests(filters),
    queryFn: async () => {
      const { data } = await api.get<RenewalRequest[]>(
        '/patient-portal/prescriptions/renewals',
        { params: filters },
      );
      return data;
    },
  });
}

export function useRenewalHistory() {
  return useQuery({
    queryKey: renewalKeys.history(),
    queryFn: async () => {
      const { data } = await api.get<RenewalRequest[]>(
        '/patient-portal/prescriptions/renewals/history',
      );
      return data;
    },
  });
}

export function useRequestRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RequestRenewalPayload) => {
      const { data } = await api.post<RenewalRequest>(
        '/patient-portal/prescriptions/renewals/request',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: renewalKeys.all });
    },
  });
}
