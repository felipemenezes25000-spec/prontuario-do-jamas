import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface WasteRecord {
  id: string;
  wasteGroup: string;
  source: string;
  weight: number;
  containerId: string | null;
  description: string;
  status: string;
  createdAt: string;
}

export interface WasteDashboard {
  totalKgByGroup: Array<{ group: string; kg: number }>;
  monthlyTrend: Array<{ month: string; kg: number }>;
  estimatedMonthlyCost: number;
  pendingDisposals: number;
  totalRecordsThisMonth: number;
}

export interface PendingDisposal {
  id: string;
  wasteGroup: string;
  source: string;
  weight: number;
  containerId: string | null;
  description: string;
  status: string;
  registeredAt: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const wasteKeys = {
  all: ['waste-management'] as const,
  dashboard: () => [...wasteKeys.all, 'dashboard'] as const,
  pending: () => [...wasteKeys.all, 'pending'] as const,
  monthlyReport: (year: number, month: number) => [...wasteKeys.all, 'report', year, month] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useWasteDashboard() {
  return useQuery({
    queryKey: wasteKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<WasteDashboard>('/waste-management/dashboard');
      return data;
    },
  });
}

export function usePendingDisposals() {
  return useQuery({
    queryKey: wasteKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<PendingDisposal[]>('/waste-management/pending-disposals');
      return data;
    },
  });
}

export function useWasteMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: wasteKeys.monthlyReport(year, month),
    queryFn: async () => {
      const { data } = await api.get('/waste-management/monthly-report', { params: { year, month } });
      return data;
    },
    enabled: year > 0 && month > 0,
  });
}

export function useRegisterWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      wasteGroup: string;
      source: string;
      weight: number;
      containerId?: string;
      description: string;
    }) => {
      const { data } = await api.post('/waste-management/register', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}

export function useRecordWeighing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      containerId: string;
      grossWeight: number;
      netWeight: number;
      weighedBy: string;
    }) => {
      const { data } = await api.post('/waste-management/weighing', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}

export function useRecordDisposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      manifestId: string;
      transportCompany: string;
      driverName: string;
      vehiclePlate: string;
      disposalMethod: string;
      certificateNumber?: string;
    }) => {
      const { data } = await api.post('/waste-management/disposal', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wasteKeys.all });
    },
  });
}
