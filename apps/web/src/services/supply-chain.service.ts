import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface SupplyItem {
  id: string;
  name: string;
  code: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  lot?: string;
  expiryDate?: string;
  unitCost: number;
  unit?: string;
  supplier?: string;
  abcCurve: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: string;
  items: Array<{ supplyItemId: string; itemName: string; quantity: number; unitPrice: number }>;
  totalValue: number;
  createdAt: string;
}

export interface Contract {
  id: string;
  counterpartyName: string;
  counterpartyType: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  totalValue?: number;
  status: string;
}

export interface SupplyDashboard {
  totalItems: number;
  totalValue: number;
  belowReorderPoint: number;
  expiringSoon: number;
  pendingOrders: number;
  activeContracts: number;
  byCategory: Array<{ category: string; count: number; value: number }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const supplyKeys = {
  all: ['supply-chain'] as const,
  dashboard: () => [...supplyKeys.all, 'dashboard'] as const,
  items: (filters?: Record<string, unknown>) => [...supplyKeys.all, 'items', filters] as const,
  orders: (status?: string) => [...supplyKeys.all, 'orders', status] as const,
  contracts: (status?: string) => [...supplyKeys.all, 'contracts', status] as const,
  abc: () => [...supplyKeys.all, 'abc'] as const,
  expiring: (days?: number) => [...supplyKeys.all, 'expiring', days] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSupplyDashboard() {
  return useQuery({
    queryKey: supplyKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<SupplyDashboard>('/supply-chain/dashboard');
      return data;
    },
  });
}

export function useSupplyItems(filters?: { category?: string; belowReorder?: boolean }) {
  return useQuery({
    queryKey: supplyKeys.items(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: SupplyItem[]; total: number }>('/supply-chain/items', { params: filters });
      return data;
    },
  });
}

export function useCreateSupplyItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SupplyItem>) => {
      const { data } = await api.post<SupplyItem>('/supply-chain/items', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: supplyKeys.all }); },
  });
}

export function useAbcAnalysis() {
  return useQuery({
    queryKey: supplyKeys.abc(),
    queryFn: async () => {
      const { data } = await api.get('/supply-chain/abc-analysis');
      return data;
    },
  });
}

export function useExpiringItems(days = 30) {
  return useQuery({
    queryKey: supplyKeys.expiring(days),
    queryFn: async () => {
      const { data } = await api.get('/supply-chain/expiring', { params: { days } });
      return data;
    },
  });
}

export function usePurchaseOrders(status?: string) {
  return useQuery({
    queryKey: supplyKeys.orders(status),
    queryFn: async () => {
      const { data } = await api.get<{ data: PurchaseOrder[]; total: number }>('/supply-chain/orders', { params: { status } });
      return data;
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { supplierId: string; items: Array<{ supplyItemId: string; quantity: number; unitPrice: number }> }) => {
      const { data } = await api.post<PurchaseOrder>('/supply-chain/orders', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: supplyKeys.all }); },
  });
}

export function useContracts(status?: string) {
  return useQuery({
    queryKey: supplyKeys.contracts(status),
    queryFn: async () => {
      const { data } = await api.get<{ data: Contract[]; total: number }>('/supply-chain/contracts', { params: { status } });
      return data;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Contract> & { startDate: string; endDate: string }) => {
      const { data } = await api.post<Contract>('/supply-chain/contracts', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: supplyKeys.all }); },
  });
}
