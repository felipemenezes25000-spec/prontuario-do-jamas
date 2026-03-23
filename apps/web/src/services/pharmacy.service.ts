import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Prescription,
  Dispensation,
  CreateDispensationDto,
  DrugInventory,
  CreateDrugInventoryDto,
  UpdateDrugInventoryDto,
  InventoryAlerts,
  InventoryStatus,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const pharmacyKeys = {
  all: ['pharmacy'] as const,
  pendingDispensation: () => [...pharmacyKeys.all, 'pending-dispensation'] as const,
  dispensationHistory: (prescriptionId: string) =>
    [...pharmacyKeys.all, 'dispensation-history', prescriptionId] as const,
  inventory: (filters?: InventoryFilters) =>
    [...pharmacyKeys.all, 'inventory', filters] as const,
  inventoryAlerts: () => [...pharmacyKeys.all, 'inventory-alerts'] as const,
};

export interface InventoryFilters {
  status?: InventoryStatus;
  location?: string;
  search?: string;
}

// ============================================================================
// Dispensation Hooks
// ============================================================================

interface PrescriptionWithDispensation extends Prescription {
  items: Array<Prescription['items'][number] & {
    dispensations: Dispensation[];
  }>;
}

export function usePendingDispensation() {
  return useQuery({
    queryKey: pharmacyKeys.pendingDispensation(),
    queryFn: async () => {
      const { data } = await api.get<PrescriptionWithDispensation[]>(
        '/pharmacy/pending-dispensation',
      );
      return data;
    },
  });
}

export function useDispense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDispensationDto) => {
      const { data } = await api.post<Dispensation>('/pharmacy/dispense', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.pendingDispensation() });
      qc.invalidateQueries({ queryKey: pharmacyKeys.all });
    },
  });
}

export function useDispensationHistory(prescriptionId: string) {
  return useQuery({
    queryKey: pharmacyKeys.dispensationHistory(prescriptionId),
    queryFn: async () => {
      const { data } = await api.get<Dispensation[]>(
        `/pharmacy/dispensation-history/${prescriptionId}`,
      );
      return data;
    },
    enabled: !!prescriptionId,
  });
}

// ============================================================================
// Inventory Hooks
// ============================================================================

export function useInventory(filters?: InventoryFilters) {
  return useQuery({
    queryKey: pharmacyKeys.inventory(filters),
    queryFn: async () => {
      const { data } = await api.get<DrugInventory[]>('/pharmacy/inventory', {
        params: filters,
      });
      return data;
    },
  });
}

export function useCreateInventoryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDrugInventoryDto) => {
      const { data } = await api.post<DrugInventory>(
        '/pharmacy/inventory',
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.inventory() });
      qc.invalidateQueries({ queryKey: pharmacyKeys.inventoryAlerts() });
    },
  });
}

export function useUpdateInventoryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpdateDrugInventoryDto & { id: string }) => {
      const { data } = await api.patch<DrugInventory>(
        `/pharmacy/inventory/${id}`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.inventory() });
      qc.invalidateQueries({ queryKey: pharmacyKeys.inventoryAlerts() });
    },
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: pharmacyKeys.inventoryAlerts(),
    queryFn: async () => {
      const { data } = await api.get<InventoryAlerts>(
        '/pharmacy/inventory/alerts',
      );
      return data;
    },
  });
}
