import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface PyxisCabinet {
  id: string;
  name: string;
  location: string;
  ward: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  totalSlots: number;
  occupiedSlots: number;
}

export interface PyxisInventoryItem {
  id: string;
  cabinetId: string;
  cabinetName: string;
  medicationName: string;
  lot: string;
  expirationDate: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  slot: string;
  status: 'ADEQUATE' | 'LOW' | 'CRITICAL' | 'EXPIRED';
}

export interface PyxisTransaction {
  id: string;
  cabinetId: string;
  cabinetName: string;
  medicationName: string;
  type: 'DISPENSE' | 'RETURN' | 'RESTOCK' | 'WASTE' | 'OVERRIDE';
  quantity: number;
  patientName: string | null;
  patientMrn: string | null;
  performedBy: string;
  performedAt: string;
  reason: string | null;
}

export interface RestockRequest {
  id: string;
  cabinetId: string;
  cabinetName: string;
  medicationName: string;
  currentQuantity: number;
  requestedQuantity: number;
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'CANCELLED';
  requestedBy: string;
  requestedAt: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const pyxisKeys = {
  all: ['pyxis'] as const,
  cabinets: () => [...pyxisKeys.all, 'cabinets'] as const,
  inventory: (cabinetId?: string) =>
    [...pyxisKeys.all, 'inventory', cabinetId] as const,
  transactions: (filters?: Record<string, unknown>) =>
    [...pyxisKeys.all, 'transactions', filters] as const,
  restockRequests: () =>
    [...pyxisKeys.all, 'restock-requests'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function usePyxisCabinets() {
  return useQuery({
    queryKey: pyxisKeys.cabinets(),
    queryFn: async () => {
      const { data } = await api.get<PyxisCabinet[]>('/pyxis/cabinets');
      return data;
    },
  });
}

export function usePyxisInventory(cabinetId?: string) {
  return useQuery({
    queryKey: pyxisKeys.inventory(cabinetId),
    queryFn: async () => {
      const { data } = await api.get<PyxisInventoryItem[]>('/pyxis/inventory', {
        params: cabinetId ? { cabinetId } : undefined,
      });
      return data;
    },
  });
}

export function usePyxisTransactions(filters?: { cabinetId?: string; type?: string; date?: string }) {
  return useQuery({
    queryKey: pyxisKeys.transactions(filters),
    queryFn: async () => {
      const { data } = await api.get<PyxisTransaction[]>('/pyxis/transactions', { params: filters });
      return data;
    },
  });
}

export function useRestockRequests() {
  return useQuery({
    queryKey: pyxisKeys.restockRequests(),
    queryFn: async () => {
      const { data } = await api.get<RestockRequest[]>('/pyxis/restock-requests');
      return data;
    },
  });
}

export function useCreateRestockRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { cabinetId: string; medicationName: string; requestedQuantity: number }) => {
      const { data } = await api.post<RestockRequest>('/pyxis/restock-requests', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pyxisKeys.restockRequests() });
    },
  });
}

export function useDispenseFromPyxis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { cabinetId: string; inventoryItemId: string; quantity: number; patientId?: string; reason?: string }) => {
      const { data } = await api.post('/pyxis/dispense', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pyxisKeys.inventory() });
      qc.invalidateQueries({ queryKey: pyxisKeys.transactions() });
    },
  });
}
