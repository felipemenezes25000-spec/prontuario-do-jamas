import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type EquipmentStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'CALIBRATION' | 'OUT_OF_SERVICE';
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';

export interface EquipmentItem {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  department: string;
  status: EquipmentStatus;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  lastCalibrationAt: string | null;
  nextCalibrationAt: string | null;
}

export interface WorkOrder {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: MaintenanceType;
  description: string;
  status: WorkOrderStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: string | null;
  createdAt: string;
  completedAt: string | null;
  cost: number | null;
  notes: string | null;
}

export interface PreventiveSchedule {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: MaintenanceType;
  scheduledDate: string;
  status: WorkOrderStatus;
  technicianName: string | null;
}

export interface EquipmentIndicators {
  totalEquipment: number;
  operational: number;
  inMaintenance: number;
  outOfService: number;
  avgMtbfHours: number;
  availabilityPercent: number;
  openWorkOrders: number;
  overdueMaintenances: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const eqMaintKeys = {
  all: ['equipment-maintenance'] as const,
  list: (filters?: Record<string, unknown>) => [...eqMaintKeys.all, 'list', filters] as const,
  workOrders: (filters?: Record<string, unknown>) => [...eqMaintKeys.all, 'work-orders', filters] as const,
  schedule: (month?: string) => [...eqMaintKeys.all, 'schedule', month] as const,
  indicators: () => [...eqMaintKeys.all, 'indicators'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useEquipmentMaintenanceList(filters?: { status?: EquipmentStatus; department?: string }) {
  return useQuery({
    queryKey: eqMaintKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: EquipmentItem[]; total: number }>('/equipment-maintenance/equipment', { params: filters });
      return data;
    },
  });
}

export function useWorkOrders(filters?: { status?: WorkOrderStatus; equipmentId?: string }) {
  return useQuery({
    queryKey: eqMaintKeys.workOrders(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkOrder[]; total: number }>('/equipment-maintenance/work-orders', { params: filters });
      return data;
    },
  });
}

export function usePreventiveSchedule(month?: string) {
  return useQuery({
    queryKey: eqMaintKeys.schedule(month),
    queryFn: async () => {
      const { data } = await api.get<PreventiveSchedule[]>('/equipment-maintenance/schedule', { params: { month } });
      return data;
    },
  });
}

export function useEquipmentIndicators() {
  return useQuery({
    queryKey: eqMaintKeys.indicators(),
    queryFn: async () => {
      const { data } = await api.get<EquipmentIndicators>('/equipment-maintenance/indicators');
      return data;
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      equipmentId: string;
      type: MaintenanceType;
      description: string;
      priority: WorkOrder['priority'];
      assignedTo?: string;
    }) => {
      const { data } = await api.post<WorkOrder>('/equipment-maintenance/work-orders', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eqMaintKeys.workOrders() });
      qc.invalidateQueries({ queryKey: eqMaintKeys.indicators() });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkOrderStatus }) => {
      const { data } = await api.patch<WorkOrder>(`/equipment-maintenance/work-orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eqMaintKeys.workOrders() });
      qc.invalidateQueries({ queryKey: eqMaintKeys.indicators() });
    },
  });
}
