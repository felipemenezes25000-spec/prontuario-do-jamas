import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  MedicationCheck,
  PaginatedResponse,
  NursingProcess,
  NursingNote,
  FluidBalance,
  CreateNursingProcessDto,
  CreateNursingNoteDto,
  CreateFluidBalanceDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface NursingFilters {
  wardId?: string;
  nurseId?: string;
  status?: string;
  shift?: string;
}

export interface MedicationCheckFilters {
  wardId?: string;
  nurseId?: string;
  status?: string;
  shift?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const nursingKeys = {
  all: ['nursing'] as const,
  medicationChecks: (filters?: MedicationCheckFilters) =>
    [...nursingKeys.all, 'medication-checks', filters] as const,
  processes: () => [...nursingKeys.all, 'processes'] as const,
  processByEncounter: (encounterId: string) =>
    [...nursingKeys.processes(), 'encounter', encounterId] as const,
  processByPatient: (patientId: string) =>
    [...nursingKeys.processes(), 'patient', patientId] as const,
  processDetail: (id: string) => [...nursingKeys.processes(), id] as const,
  notes: () => [...nursingKeys.all, 'notes'] as const,
  notesByEncounter: (encounterId: string) =>
    [...nursingKeys.notes(), 'encounter', encounterId] as const,
  fluidBalance: () => [...nursingKeys.all, 'fluid-balance'] as const,
  fluidBalanceByEncounter: (encounterId: string) =>
    [...nursingKeys.fluidBalance(), 'encounter', encounterId] as const,
  fluidBalanceByPatient: (patientId: string) =>
    [...nursingKeys.fluidBalance(), 'patient', patientId] as const,
};

// ============================================================================
// Medication Checks
// ============================================================================

export function useMedicationChecks(filters?: MedicationCheckFilters) {
  return useQuery({
    queryKey: nursingKeys.medicationChecks(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<MedicationCheck>>(
        '/prescriptions/medication-checks',
        { params: filters },
      );
      return data?.data ?? [];
    },
  });
}

export function useAdministerMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await api.post<MedicationCheck>(
        `/nursing/medication-administrations/${id}/administer`,
        { notes },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...nursingKeys.all, 'medication-checks'] });
    },
  });
}

export function useSkipMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<MedicationCheck>(
        `/nursing/medication-administrations/${id}/skip`,
        { reason },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...nursingKeys.all, 'medication-checks'] });
    },
  });
}

// ============================================================================
// SAE / Nursing Process (Sistematizacao da Assistencia de Enfermagem)
// ============================================================================

export function useNursingProcesses(encounterId: string) {
  return useQuery({
    queryKey: nursingKeys.processByEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<NursingProcess[]>(
        `/nursing/by-encounter/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function usePatientNursingProcesses(patientId: string) {
  return useQuery({
    queryKey: nursingKeys.processByPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<NursingProcess[]>(
        `/nursing/processes/patient/${patientId}/active`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useNursingProcess(id: string) {
  return useQuery({
    queryKey: nursingKeys.processDetail(id),
    queryFn: async () => {
      const { data } = await api.get<NursingProcess>(`/nursing/processes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateNursingProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (process: CreateNursingProcessDto) => {
      const { data } = await api.post<NursingProcess>('/nursing/processes', process);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: nursingKeys.processByEncounter(result.encounterId) });
      qc.invalidateQueries({ queryKey: nursingKeys.processByPatient(result.patientId) });
    },
  });
}

export function useUpdateNursingProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NursingProcess> & { id: string }) => {
      const { data } = await api.patch<NursingProcess>(`/nursing/processes/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingKeys.processDetail(vars.id) });
      qc.invalidateQueries({ queryKey: nursingKeys.processes() });
    },
  });
}

// ============================================================================
// Nursing Notes
// ============================================================================

export function useNursingNotes(encounterId: string) {
  return useQuery({
    queryKey: nursingKeys.notesByEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<NursingNote[]>(
        `/nursing/by-encounter/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useCreateNursingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: CreateNursingNoteDto) => {
      const { data } = await api.post<NursingNote>('/nursing/notes', note);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: nursingKeys.notesByEncounter(result.encounterId) });
    },
  });
}

// ============================================================================
// Fluid Balance
// ============================================================================

export function useFluidBalance(encounterId: string) {
  return useQuery({
    queryKey: nursingKeys.fluidBalanceByEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<FluidBalance[]>(
        `/nursing/by-encounter/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function usePatientFluidBalance(patientId: string) {
  return useQuery({
    queryKey: nursingKeys.fluidBalanceByPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<FluidBalance[]>(
        `/nursing/by-patient/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordFluidBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (balance: CreateFluidBalanceDto) => {
      const { data } = await api.post<FluidBalance>('/nursing/fluid-balance', balance);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingKeys.fluidBalanceByEncounter(vars.encounterId) });
      qc.invalidateQueries({ queryKey: nursingKeys.fluidBalanceByPatient(vars.patientId) });
    },
  });
}
