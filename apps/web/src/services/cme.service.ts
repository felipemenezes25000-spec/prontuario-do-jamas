import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type InstrumentStatus = 'DIRTY' | 'WASHING' | 'STERILIZING' | 'STERILE' | 'IN_USE' | 'EXPIRED';
export type CycleResult = 'APPROVED' | 'FAILED' | 'PENDING';

export interface Instrument {
  id: string;
  name: string;
  barcode: string;
  status: InstrumentStatus;
  lastSterilizedAt?: string;
  expiresAt?: string;
  kitId?: string;
  kitName?: string;
  timeline: Array<{
    action: string;
    timestamp: string;
    userId: string;
    userName?: string;
  }>;
}

export interface SterilizationCycle {
  id: string;
  cycleNumber: string;
  equipmentId: string;
  equipmentName?: string;
  startedAt: string;
  endedAt?: string;
  temperature: number;
  pressure: number;
  duration: number;
  biologicalIndicator: CycleResult;
  chemicalIndicator: CycleResult;
  result: CycleResult;
  instrumentIds: string[];
  operatorName?: string;
}

export interface SurgicalKit {
  id: string;
  name: string;
  specialty: string;
  instruments: Instrument[];
  isComplete: boolean;
  status: 'READY' | 'IN_USE' | 'INCOMPLETE' | 'STERILIZING';
}

export interface CMEStats {
  totalInstruments: number;
  sterileCount: number;
  inProcessCount: number;
  expiredCount: number;
  cyclesToday: number;
  complianceRate: number;
}

export interface CMEFilters {
  status?: InstrumentStatus;
  kitId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const cmeKeys = {
  all: ['cme'] as const,
  instruments: (filters?: CMEFilters) => [...cmeKeys.all, 'instruments', filters] as const,
  instrument: (id: string) => [...cmeKeys.all, 'instrument', id] as const,
  cycles: () => [...cmeKeys.all, 'cycles'] as const,
  kits: () => [...cmeKeys.all, 'kits'] as const,
  stats: () => [...cmeKeys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useInstruments(filters?: CMEFilters) {
  return useQuery({
    queryKey: cmeKeys.instruments(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Instrument[]; total: number }>('/cme/instruments', {
        params: filters,
      });
      return data;
    },
  });
}

export function useSterilizationCycles() {
  return useQuery({
    queryKey: cmeKeys.cycles(),
    queryFn: async () => {
      const { data } = await api.get<{ data: SterilizationCycle[]; total: number }>('/cme/cycles');
      return data;
    },
  });
}

export function useSurgicalKits() {
  return useQuery({
    queryKey: cmeKeys.kits(),
    queryFn: async () => {
      const { data } = await api.get<{ data: SurgicalKit[]; total: number }>('/cme/kits');
      return data;
    },
  });
}

export function useCMEStats() {
  return useQuery({
    queryKey: cmeKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<CMEStats>('/cme/stats');
      return data;
    },
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<SterilizationCycle, 'id' | 'result'>) => {
      const { data } = await api.post<SterilizationCycle>('/cme/cycles', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmeKeys.cycles() });
      qc.invalidateQueries({ queryKey: cmeKeys.stats() });
    },
  });
}

export function useUpdateInstrumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InstrumentStatus }) => {
      const { data } = await api.patch<Instrument>(`/cme/instruments/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmeKeys.all });
    },
  });
}
