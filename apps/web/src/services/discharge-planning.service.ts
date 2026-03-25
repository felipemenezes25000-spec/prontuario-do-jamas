import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface DischargeInstructions {
  id: string;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    specialInstructions?: string;
  }>;
  dietInstructions: string;
  activityRestrictions: string;
  warningSigns: string[];
  followUpAppointments: Array<{
    specialty: string;
    daysAfterDischarge: number;
    location?: string;
    notes?: string;
  }>;
  woundCareInstructions?: string;
  additionalInstructions?: string;
  createdAt: string;
}

export interface DischargeChecklist {
  id: string;
  items: Record<string, boolean>;
  completedCount: number;
  totalCount: number;
  compliance: number;
  safeToDischarge: boolean;
  checkedAt: string;
  createdAt: string;
}

export interface DischargeBarrier {
  id: string;
  barrierType: string;
  description: string;
  responsiblePerson?: string;
  expectedResolutionDate?: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED';
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface MultidisciplinaryRound {
  id: string;
  participants: Array<{ name: string; role: string }>;
  pendingTasks: Array<{
    description: string;
    assignedTo: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }>;
  dailyGoals: string;
  estimatedDischargeDate?: string;
  dischargeReadiness?: string;
  notes?: string;
  roundedAt: string;
  createdAt: string;
}

export interface DischargeSummary {
  patientId: string;
  instructions: DischargeInstructions | null;
  homePrescription: Record<string, unknown> | null;
  latestChecklist: DischargeChecklist | null;
  safeToDischarge: boolean;
  activeBarriers: DischargeBarrier[];
  resolvedBarriers: DischargeBarrier[];
  roundingHistory: MultidisciplinaryRound[];
}

export interface BedAllocationSuggestion {
  totalOccupiedBeds: number;
  patientsNearDischarge: Array<{
    patientId: string;
    patientName: string;
    bed: string;
    ward: string;
    dischargeReadiness: number;
    activeBarriers: number;
  }>;
  patientsWithBarriers: number;
  suggestion: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const dischargeKeys = {
  all: ['discharge-planning'] as const,
  summary: (patientId: string) => [...dischargeKeys.all, 'summary', patientId] as const,
  instructions: (patientId: string) => [...dischargeKeys.all, 'instructions', patientId] as const,
  barriers: (patientId: string) => [...dischargeKeys.all, 'barriers', patientId] as const,
  rounding: (patientId: string) => [...dischargeKeys.all, 'rounding', patientId] as const,
  bedAllocation: () => [...dischargeKeys.all, 'bed-allocation'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useDischargeSummary(patientId: string) {
  return useQuery({
    queryKey: dischargeKeys.summary(patientId),
    queryFn: async () => {
      const { data } = await api.get<DischargeSummary>(`/discharge-planning/summary/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useDischargeInstructions(patientId: string) {
  return useQuery({
    queryKey: dischargeKeys.instructions(patientId),
    queryFn: async () => {
      const { data } = await api.get<DischargeInstructions[]>(`/discharge-planning/instructions/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useActiveBarriers(patientId: string) {
  return useQuery({
    queryKey: dischargeKeys.barriers(patientId),
    queryFn: async () => {
      const { data } = await api.get<DischargeBarrier[]>(`/discharge-planning/barriers/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRoundingHistory(patientId: string) {
  return useQuery({
    queryKey: dischargeKeys.rounding(patientId),
    queryFn: async () => {
      const { data } = await api.get<MultidisciplinaryRound[]>(`/discharge-planning/rounding/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateDischargeInstructions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/discharge-planning/instructions', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId as string) });
      qc.invalidateQueries({ queryKey: dischargeKeys.instructions(variables.patientId as string) });
    },
  });
}

export function useCreateHomePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/discharge-planning/home-prescription', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId as string) });
    },
  });
}

export function useCreateDischargeChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/discharge-planning/checklist', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId as string) });
    },
  });
}

export function useCreateDischargeBarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/discharge-planning/barriers', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.barriers(variables.patientId as string) });
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId as string) });
    },
  });
}

export function useResolveBarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { barrierDocumentId: string; resolutionNotes?: string; patientId: string }) => {
      const { data } = await api.patch('/discharge-planning/barriers/resolve', {
        barrierDocumentId: dto.barrierDocumentId,
        resolutionNotes: dto.resolutionNotes,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.barriers(variables.patientId) });
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId) });
    },
  });
}

export function useCreateMultidisciplinaryRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/discharge-planning/rounding', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dischargeKeys.rounding(variables.patientId as string) });
      qc.invalidateQueries({ queryKey: dischargeKeys.summary(variables.patientId as string) });
    },
  });
}

export function useBedAllocationSuggestion() {
  return useMutation({
    mutationFn: async (dto: { patientId?: string; requiredBedType?: string }) => {
      const { data } = await api.post<BedAllocationSuggestion>('/discharge-planning/bed-allocation-suggestion', dto);
      return data;
    },
  });
}
