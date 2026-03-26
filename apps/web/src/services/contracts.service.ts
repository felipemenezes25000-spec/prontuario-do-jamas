import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  contractNumber: string;
  type: string;
  counterparty: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  autoRenew: boolean;
  slaTerms: string | null;
  paymentTerms: string;
  status: string;
  renewalHistory: Array<{ date: string; newEndDate: string; newValue: number; adjustmentPct: number }>;
  createdAt: string;
}

export interface ExpiringContract {
  id: string;
  contractNumber: string;
  counterparty: string;
  type: string;
  endDate: string;
  value: number;
  daysRemaining: number;
  autoRenew: boolean;
}

export interface ContractsDashboard {
  activeContracts: number;
  totalCommittedValue: number;
  expiringSoon30: number;
  expiringSoon60: number;
  expiringSoon90: number;
  byType: Array<{ type: string; count: number; totalValue: number }>;
  expiringList: Array<{ id: string; contractNumber: string; counterparty: string; endDate: string; daysRemaining: number }>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const contractsKeys = {
  all: ['contracts'] as const,
  list: (filters?: Record<string, unknown>) => [...contractsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...contractsKeys.all, 'detail', id] as const,
  expiring: (days: number) => [...contractsKeys.all, 'expiring', days] as const,
  dashboard: () => [...contractsKeys.all, 'dashboard'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useContracts(filters?: { type?: string; status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: contractsKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Contract>>('/contracts', { params: filters });
      return data;
    },
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: contractsKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Contract>(`/contracts/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useExpiringContracts(days: number = 90) {
  return useQuery({
    queryKey: contractsKeys.expiring(days),
    queryFn: async () => {
      const { data } = await api.get<ExpiringContract[]>('/contracts/expiring', { params: { days } });
      return data;
    },
  });
}

export function useContractsDashboard() {
  return useQuery({
    queryKey: contractsKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<ContractsDashboard>('/contracts/dashboard');
      return data;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      type: string;
      counterparty: string;
      description: string;
      startDate: string;
      endDate: string;
      value: number;
      autoRenew: boolean;
      slaTerms?: string;
      paymentTerms: string;
    }) => {
      const { data } = await api.post('/contracts', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractsKeys.all });
    },
  });
}

export function useRenewContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: {
      id: string;
      newEndDate: string;
      newValue?: number;
      adjustmentPct?: number;
    }) => {
      const { data } = await api.patch(`/contracts/${id}/renew`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractsKeys.all });
    },
  });
}
