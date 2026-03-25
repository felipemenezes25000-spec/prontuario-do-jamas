import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'CALIBRATION_EXPIRED' | 'DECOMMISSIONED';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';

export interface Equipment {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  department: string;
  status: EquipmentStatus;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
  lastCalibrationAt?: string;
  nextCalibrationAt?: string;
  purchaseDate?: string;
}

export interface MaintenanceEvent {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  technicianName?: string;
  cost?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: MaintenanceType;
  date: string;
  status: MaintenanceEvent['status'];
}

export interface EquipmentFilters {
  status?: EquipmentStatus;
  department?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (filters?: EquipmentFilters) => [...equipmentKeys.lists(), filters] as const,
  detail: (id: string) => [...equipmentKeys.all, 'detail', id] as const,
  maintenance: () => [...equipmentKeys.all, 'maintenance'] as const,
  calendar: (month: string) => [...equipmentKeys.all, 'calendar', month] as const,
  overdue: () => [...equipmentKeys.all, 'overdue'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useEquipmentList(filters?: EquipmentFilters) {
  return useQuery({
    queryKey: equipmentKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Equipment[]; total: number }>('/equipment', {
        params: filters,
      });
      return data;
    },
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Equipment>(`/equipment/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMaintenanceEvents() {
  return useQuery({
    queryKey: equipmentKeys.maintenance(),
    queryFn: async () => {
      const { data } = await api.get<{ data: MaintenanceEvent[]; total: number }>('/equipment/maintenance');
      return data;
    },
  });
}

export function useMaintenanceCalendar(month: string) {
  return useQuery({
    queryKey: equipmentKeys.calendar(month),
    queryFn: async () => {
      const { data } = await api.get<CalendarEvent[]>('/equipment/maintenance/calendar', {
        params: { month },
      });
      return data;
    },
  });
}

export function useOverdueAlerts() {
  return useQuery({
    queryKey: equipmentKeys.overdue(),
    queryFn: async () => {
      const { data } = await api.get<{ data: MaintenanceEvent[]; total: number }>('/equipment/maintenance/overdue');
      return data;
    },
  });
}

export function useCreateMaintenanceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<MaintenanceEvent, 'id' | 'status'>) => {
      const { data } = await api.post<MaintenanceEvent>('/equipment/maintenance', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equipmentKeys.maintenance() });
      qc.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}

export function useUpdateEquipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EquipmentStatus }) => {
      const { data } = await api.patch<Equipment>(`/equipment/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: equipmentKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}
