import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SurgicalProcedure,
  PaginatedResponse,
  CreateSurgicalProcedureDto,
  SurgicalStatus,
  AnesthesiaData,
  IntraopVitalRecord,
  FluidBalanceData,
  OpmeItem,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface SurgicalFilters {
  patientId?: string;
  surgeonId?: string;
  status?: SurgicalStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Types for OMS Checklist
// ============================================================================

export interface SafetyChecklistItem {
  item: string;
  checked: boolean;
  notes?: string;
}

export interface SafetyChecklist {
  items: SafetyChecklistItem[];
  completedAt?: string;
  completedById?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalKeys = {
  all: ['surgical'] as const,
  lists: () => [...surgicalKeys.all, 'list'] as const,
  list: (filters?: SurgicalFilters) => [...surgicalKeys.lists(), filters] as const,
  details: () => [...surgicalKeys.all, 'detail'] as const,
  detail: (id: string) => [...surgicalKeys.details(), id] as const,
  byPatient: (patientId: string) => [...surgicalKeys.all, 'patient', patientId] as const,
  bySurgeon: (surgeonId: string) => [...surgicalKeys.all, 'surgeon', surgeonId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSurgicalProcedures(filters?: SurgicalFilters) {
  return useQuery({
    queryKey: surgicalKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SurgicalProcedure>>('/surgical', {
        params: filters,
      });
      return data;
    },
  });
}

export function useSurgicalProcedure(id: string) {
  return useQuery({
    queryKey: surgicalKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<SurgicalProcedure>(`/surgical/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientSurgeries(patientId: string) {
  return useQuery({
    queryKey: surgicalKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SurgicalProcedure>>('/surgical', {
        params: { patientId },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useSurgeonProcedures(surgeonId: string, filters?: Omit<SurgicalFilters, 'surgeonId'>) {
  return useQuery({
    queryKey: surgicalKeys.bySurgeon(surgeonId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SurgicalProcedure>>('/surgical', {
        params: { surgeonId, ...filters },
      });
      return data;
    },
    enabled: !!surgeonId,
  });
}

export function useCreateSurgicalProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (procedure: CreateSurgicalProcedureDto) => {
      const { data } = await api.post<SurgicalProcedure>('/surgical', procedure);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: surgicalKeys.lists() });
    },
  });
}

export function useUpdateSurgicalProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SurgicalProcedure> & { id: string }) => {
      const { data } = await api.patch<SurgicalProcedure>(`/surgical/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalKeys.lists() });
    },
  });
}

export function useUpdateSurgicalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SurgicalStatus }) => {
      const { data } = await api.patch<SurgicalProcedure>(`/surgical/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalKeys.all });
    },
  });
}

// ============================================================================
// OMS Safety Checklist (Cirurgia Segura)
// ============================================================================

export function useSaveChecklistBefore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checklist }: { id: string; checklist: SafetyChecklist }) => {
      const { data } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}/checklist/before`,
        checklist,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

export function useSaveChecklistDuring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checklist }: { id: string; checklist: SafetyChecklist }) => {
      const { data } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}/checklist/during`,
        checklist,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

export function useSaveChecklistAfter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checklist }: { id: string; checklist: SafetyChecklist }) => {
      const { data } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}/checklist/after`,
        checklist,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

// ============================================================================
// Surgical Description
// ============================================================================

export function useSaveSurgicalDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      description,
      complications,
      bloodLoss,
    }: {
      id: string;
      description: string;
      complications?: string;
      bloodLoss?: number;
    }) => {
      const { data } = await api.post<SurgicalProcedure>(`/surgical/${id}/complete`, {
        surgicalDescription: description,
        complications,
        bloodLoss,
      });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

// ============================================================================
// Anesthesia Record
// ============================================================================

export function useSaveAnesthesiaData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AnesthesiaData }) => {
      const { data: result } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}`,
        { anesthesiaData: data },
      );
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalKeys.lists() });
    },
  });
}

export function useSaveIntraopVitals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, vitals }: { id: string; vitals: IntraopVitalRecord[] }) => {
      const { data: result } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}`,
        { intraopVitals: vitals },
      );
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

export function useSaveFluidBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: FluidBalanceData }) => {
      const { data: result } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}`,
        { fluidBalance: balance },
      );
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

export function useSaveOpmeData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: OpmeItem[] }) => {
      const { data: result } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}`,
        { opmeData: items },
      );
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
    },
  });
}

export function useRecordSurgicalTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, timestamp }: {
      id: string;
      field: 'patientInAt' | 'anesthesiaStartAt' | 'incisionAt' | 'sutureAt' | 'anesthesiaEndAt' | 'patientOutAt';
      timestamp: string;
    }) => {
      const { data: result } = await api.patch<SurgicalProcedure>(
        `/surgical/${id}`,
        { [field]: timestamp },
      );
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalKeys.lists() });
    },
  });
}

export function useCancelSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; reason?: string }) => {
      const { data } = await api.patch<SurgicalProcedure>(`/surgical/${id}/status`, {
        status: 'CANCELLED',
      });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalKeys.all });
    },
  });
}
