import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface DietOrder {
  id: string;
  patientId: string;
  dietType: string;
  restrictions?: string;
  calorieTarget?: number;
  status: string;
  createdAt: string;
}

export interface LaundryDashboard {
  totalKg: number;
  totalLoss: number;
  totalRecords: number;
  bySector: Array<{ sector: string; kg: number }>;
}

export interface WasteDashboard {
  totalKg: number;
  totalRecords: number;
  byGroup: Array<{ group: string; label: string; totalKg: number; records: number }>;
  anvisaCompliant: boolean;
}

export interface Complaint {
  id: string;
  type: string;
  description: string;
  patientName?: string;
  sector?: string;
  status: string;
  slaDeadline: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface OmbudsmanDashboard {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  overSla: number;
  byType: Array<{ type: string; count: number }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const hospitalKeys = {
  all: ['hospital-services'] as const,
  sndDashboard: () => [...hospitalKeys.all, 'snd', 'dashboard'] as const,
  diets: (pid?: string) => [...hospitalKeys.all, 'snd', 'diets', pid] as const,
  laundry: () => [...hospitalKeys.all, 'laundry', 'dashboard'] as const,
  waste: () => [...hospitalKeys.all, 'waste', 'dashboard'] as const,
  ombudsman: () => [...hospitalKeys.all, 'ombudsman', 'dashboard'] as const,
  complaints: (s?: string) => [...hospitalKeys.all, 'ombudsman', 'list', s] as const,
  same: () => [...hospitalKeys.all, 'same', 'dashboard'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSndDashboard() {
  return useQuery({
    queryKey: hospitalKeys.sndDashboard(),
    queryFn: async () => { const { data } = await api.get('/hospital-services/snd/dashboard'); return data; },
  });
}

export function useDietOrders(patientId?: string) {
  return useQuery({
    queryKey: hospitalKeys.diets(patientId),
    queryFn: async () => { const { data } = await api.get('/hospital-services/snd/diets', { params: { patientId } }); return data; },
  });
}

export function useCreateDietOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; dietType: string; restrictions?: string; calorieTarget?: number }) => {
      const { data } = await api.post('/hospital-services/snd/diets', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.all }); },
  });
}

export function useLaundryDashboard() {
  return useQuery({
    queryKey: hospitalKeys.laundry(),
    queryFn: async () => { const { data } = await api.get<LaundryDashboard>('/hospital-services/laundry/dashboard'); return data; },
  });
}

export function useRecordLaundry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sector: string; weightKg: number; linenType?: string; lossCount?: number }) => {
      const { data } = await api.post('/hospital-services/laundry', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.laundry() }); },
  });
}

export function useWasteDashboard() {
  return useQuery({
    queryKey: hospitalKeys.waste(),
    queryFn: async () => { const { data } = await api.get<WasteDashboard>('/hospital-services/waste/dashboard'); return data; },
  });
}

export function useRecordWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sector: string; group: string; weightKg: number; destination?: string }) => {
      const { data } = await api.post('/hospital-services/waste', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.waste() }); },
  });
}

export function useOmbudsmanDashboard() {
  return useQuery({
    queryKey: hospitalKeys.ombudsman(),
    queryFn: async () => { const { data } = await api.get<OmbudsmanDashboard>('/hospital-services/ombudsman/dashboard'); return data; },
  });
}

export function useComplaints(status?: string) {
  return useQuery({
    queryKey: hospitalKeys.complaints(status),
    queryFn: async () => { const { data } = await api.get<{ data: Complaint[]; total: number }>('/hospital-services/ombudsman', { params: { status } }); return data; },
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; description: string; patientName?: string; sector?: string }) => {
      const { data } = await api.post('/hospital-services/ombudsman', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: hospitalKeys.all }); },
  });
}

export function useSameDashboard() {
  return useQuery({
    queryKey: hospitalKeys.same(),
    queryFn: async () => { const { data } = await api.get('/hospital-services/same/dashboard'); return data; },
  });
}
