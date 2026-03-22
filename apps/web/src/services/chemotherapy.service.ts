import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface ChemoProtocol {
  id: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  regimen: string;
  indication: string;
  drugs: Array<{
    name: string;
    dose: number;
    unit: string;
    route?: string;
    day?: number;
    infusionTime?: string;
  }>;
  premedications?: Array<{ name: string; dose: string; timing: string }>;
  cycleDays: number;
  maxCycles: number;
  emetogenicRisk?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { cycles: number };
}

export interface ChemoCycle {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId?: string;
  protocolId: string;
  cycleNumber: number;
  status: ChemoCycleStatus;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  bsa?: number;
  weight?: number;
  height?: number;
  adjustedDoses?: Array<{
    name: string;
    originalDose: number;
    unit: string;
    adjustedDose: number;
    route?: string;
    day?: number;
  }>;
  toxicities?: Array<{ type: string; grade: number; description: string }>;
  labResults?: Array<{ name: string; value: string; unit: string }>;
  nurseNotes?: string;
  doctorNotes?: string;
  createdAt: string;
  updatedAt: string;
  protocol?: {
    id: string;
    name: string;
    regimen: string;
    maxCycles?: number;
  };
  patient?: { id: string; fullName: string; mrn: string };
}

export type ChemoCycleStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SUSPENDED'
  | 'CANCELLED';

export interface CreateProtocolPayload {
  name: string;
  nameEn?: string;
  regimen: string;
  indication: string;
  drugs: Array<{
    name: string;
    dose: number;
    unit: string;
    route?: string;
    day?: number;
    infusionTime?: string;
  }>;
  premedications?: Array<{ name: string; dose: string; timing: string }>;
  cycleDays: number;
  maxCycles: number;
  emetogenicRisk?: string;
  notes?: string;
}

export interface CreateCyclePayload {
  patientId: string;
  encounterId?: string;
  protocolId: string;
  cycleNumber: number;
  scheduledDate: string;
  weight?: number;
  height?: number;
  nurseNotes?: string;
  doctorNotes?: string;
}

export interface UpdateCycleStatusPayload {
  status: ChemoCycleStatus;
  toxicities?: Array<{ type: string; grade: number; description: string }>;
  labResults?: Array<{ name: string; value: string; unit: string }>;
  nurseNotes?: string;
  doctorNotes?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const chemoKeys = {
  all: ['chemotherapy'] as const,
  protocols: () => [...chemoKeys.all, 'protocols'] as const,
  protocolList: (page?: number) => [...chemoKeys.protocols(), 'list', page] as const,
  protocolDetail: (id: string) => [...chemoKeys.protocols(), id] as const,
  cycles: () => [...chemoKeys.all, 'cycles'] as const,
  cyclesByPatient: (patientId: string) => [...chemoKeys.cycles(), 'patient', patientId] as const,
};

// ============================================================================
// Protocol Hooks
// ============================================================================

export function useChemoProtocols(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: chemoKeys.protocolList(page),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ChemoProtocol>>(
        '/chemotherapy/protocols',
        { params: { page, pageSize } },
      );
      return data;
    },
  });
}

export function useChemoProtocol(id: string) {
  return useQuery({
    queryKey: chemoKeys.protocolDetail(id),
    queryFn: async () => {
      const { data } = await api.get<ChemoProtocol>(
        `/chemotherapy/protocols/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProtocolPayload) => {
      const { data } = await api.post<ChemoProtocol>(
        '/chemotherapy/protocols',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chemoKeys.protocols() });
    },
  });
}

// ============================================================================
// Cycle Hooks
// ============================================================================

export function useChemoCycles(patientId: string) {
  return useQuery({
    queryKey: chemoKeys.cyclesByPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<ChemoCycle[]>(
        `/chemotherapy/cycles/patient/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCyclePayload) => {
      const { data } = await api.post<ChemoCycle>(
        '/chemotherapy/cycles',
        payload,
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({
        queryKey: chemoKeys.cyclesByPatient(result.patientId),
      });
      qc.invalidateQueries({ queryKey: chemoKeys.protocols() });
    },
  });
}

export function useUpdateCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cycleId,
      ...payload
    }: UpdateCycleStatusPayload & { cycleId: string }) => {
      const { data } = await api.patch<ChemoCycle>(
        `/chemotherapy/cycles/${cycleId}/status`,
        payload,
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({
        queryKey: chemoKeys.cyclesByPatient(result.patientId),
      });
      qc.invalidateQueries({ queryKey: chemoKeys.protocols() });
    },
  });
}
