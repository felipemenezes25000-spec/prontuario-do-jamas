import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type CleaningStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
export type LaundryStatus = 'REQUESTED' | 'COLLECTED' | 'WASHING' | 'READY' | 'DELIVERED';

export interface HousekeepingTask {
  id: string;
  roomNumber: string;
  floor: string;
  type: 'TERMINAL' | 'CONCURRENT' | 'CHECKOUT';
  status: CleaningStatus;
  assignedTo?: string;
  requestedAt: string;
  completedAt?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface LaundryOrder {
  id: string;
  department: string;
  items: Array<{ name: string; quantity: number }>;
  status: LaundryStatus;
  requestedAt: string;
  deliveredAt?: string;
  requestedBy?: string;
}

export interface Companion {
  id: string;
  name: string;
  cpf: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  relationship: string;
  checkedInAt: string;
  checkedOutAt?: string;
  badgeNumber?: string;
}

export interface HospitalityStats {
  pendingCleaning: number;
  inProgressCleaning: number;
  completedToday: number;
  pendingLaundry: number;
  activeCompanions: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const hospitalityKeys = {
  all: ['hospitality'] as const,
  housekeeping: () => [...hospitalityKeys.all, 'housekeeping'] as const,
  laundry: () => [...hospitalityKeys.all, 'laundry'] as const,
  companions: () => [...hospitalityKeys.all, 'companions'] as const,
  stats: () => [...hospitalityKeys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useHousekeepingTasks() {
  return useQuery({
    queryKey: hospitalityKeys.housekeeping(),
    queryFn: async () => {
      const { data } = await api.get<{ data: HousekeepingTask[]; total: number }>('/hospitality/housekeeping');
      return data;
    },
  });
}

export function useLaundryOrders() {
  return useQuery({
    queryKey: hospitalityKeys.laundry(),
    queryFn: async () => {
      const { data } = await api.get<{ data: LaundryOrder[]; total: number }>('/hospitality/laundry');
      return data;
    },
  });
}

export function useCompanions() {
  return useQuery({
    queryKey: hospitalityKeys.companions(),
    queryFn: async () => {
      const { data } = await api.get<{ data: Companion[]; total: number }>('/hospitality/companions');
      return data;
    },
  });
}

export function useHospitalityStats() {
  return useQuery({
    queryKey: hospitalityKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<HospitalityStats>('/hospitality/stats');
      return data;
    },
  });
}

export function useUpdateCleaningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CleaningStatus }) => {
      const { data } = await api.patch<HousekeepingTask>(`/hospitality/housekeeping/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalityKeys.housekeeping() });
      qc.invalidateQueries({ queryKey: hospitalityKeys.stats() });
    },
  });
}

export function useCreateLaundryOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<LaundryOrder, 'id' | 'status' | 'requestedAt'>) => {
      const { data } = await api.post<LaundryOrder>('/hospitality/laundry', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalityKeys.laundry() });
    },
  });
}

export function useRegisterCompanion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Companion, 'id' | 'checkedInAt'>) => {
      const { data } = await api.post<Companion>('/hospitality/companions', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalityKeys.companions() });
      qc.invalidateQueries({ queryKey: hospitalityKeys.stats() });
    },
  });
}
