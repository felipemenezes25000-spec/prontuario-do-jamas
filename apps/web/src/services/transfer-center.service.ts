import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type TransferStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TransferRequest {
  id: string;
  patientId: string;
  patientName: string;
  originFacility: string;
  originUnit?: string;
  destinationFacility: string;
  destinationUnit?: string;
  clinicalJustification: string;
  urgency: 'ELECTIVE' | 'URGENT' | 'EMERGENCY';
  status: TransferStatus;
  requestedBy: string;
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  rejectionReason?: string;
  transportType?: string;
  estimatedArrival?: string;
  completedAt?: string;
}

export interface AvailableBed {
  facilityName: string;
  unit: string;
  bedNumber: string;
  bedType: 'WARD' | 'ICU' | 'SEMI_ICU' | 'ISOLATION' | 'PEDIATRIC';
  isAvailable: boolean;
}

export interface TransferStats {
  todayTotal: number;
  pending: number;
  completed: number;
  rejected: number;
  inTransit: number;
  avgResponseTimeMinutes: number;
}

export interface TransferFilters {
  status?: TransferStatus;
  urgency?: TransferRequest['urgency'];
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const transferKeys = {
  all: ['transfer-center'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (filters?: TransferFilters) => [...transferKeys.lists(), filters] as const,
  detail: (id: string) => [...transferKeys.all, 'detail', id] as const,
  beds: () => [...transferKeys.all, 'beds'] as const,
  stats: () => [...transferKeys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useTransferRequests(filters?: TransferFilters) {
  return useQuery({
    queryKey: transferKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: TransferRequest[]; total: number }>('/transfer-center/requests', {
        params: filters,
      });
      return data;
    },
  });
}

export function useTransferRequest(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<TransferRequest>(`/transfer-center/requests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAvailableBeds() {
  return useQuery({
    queryKey: transferKeys.beds(),
    queryFn: async () => {
      const { data } = await api.get<AvailableBed[]>('/transfer-center/beds');
      return data;
    },
  });
}

export function useTransferStats() {
  return useQuery({
    queryKey: transferKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<TransferStats>('/transfer-center/stats');
      return data;
    },
  });
}

export function useCreateTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Pick<
        TransferRequest,
        'patientId' | 'originFacility' | 'destinationFacility' | 'clinicalJustification' | 'urgency'
      > & { originUnit?: string; destinationUnit?: string },
    ) => {
      const { data } = await api.post<TransferRequest>('/transfer-center/requests', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
      qc.invalidateQueries({ queryKey: transferKeys.stats() });
    },
  });
}

export function useRespondTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'ACCEPT' | 'REJECT';
      reason?: string;
    }) => {
      const { data } = await api.post<TransferRequest>(`/transfer-center/requests/${id}/respond`, {
        action,
        reason,
      });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: transferKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
      qc.invalidateQueries({ queryKey: transferKeys.stats() });
    },
  });
}
