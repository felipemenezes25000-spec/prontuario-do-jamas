import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
// Schedule types (A3)
// ============================================================================

export interface ScheduleSlot {
  scheduledAt: string;
  status: 'PENDING' | 'DONE' | 'LATE' | 'SKIPPED' | 'SUSPENDED';
  checkId: string | null;
  administeredBy: { id: string; name: string } | null;
  lot: string | null;
  observations: string | null;
  checkedAt: string | null;
}

export interface ScheduleRow {
  prescriptionItem: {
    id: string;
    name: string;
    dose: string | null;
    route: string | null;
    frequency: string | null;
    frequencyHours: number | null;
    isHighAlert: boolean;
    isControlled: boolean;
  };
  schedule: ScheduleSlot[];
}

export interface AdministerMedicationDto {
  prescriptionItemId: string;
  encounterId: string;
  scheduledAt: string;
  checkedAt?: string;
  lot?: string;
  observations?: string;
}

export interface SkipMedicationDto {
  prescriptionItemId: string;
  encounterId: string;
  scheduledAt: string;
  observations: string;
}

export interface SuspendMedicationDto {
  prescriptionItemId: string;
  encounterId: string;
  observations: string;
}

// ============================================================================
// Timeline types (A9)
// ============================================================================

export interface TimelineEntry {
  id: string;
  type: 'clinical_note' | 'prescription' | 'exam' | 'vital_signs' | 'triage' | 'document';
  date: string;
  professional: { id: string; name: string } | null;
  summary: string;
  details: Record<string, unknown>;
}

export interface TimelineResponse {
  items: TimelineEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TimelineFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
}

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
  schedule: (encounterId: string) =>
    [...nursingKeys.all, 'schedule', encounterId] as const,
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
  timeline: (patientId: string, filters?: TimelineFilters) =>
    ['patients', patientId, 'timeline', filters] as const,
};

// ============================================================================
// Medication Schedule (A3)
// ============================================================================

export function useMedicationSchedule(encounterId: string) {
  return useQuery({
    queryKey: nursingKeys.schedule(encounterId),
    queryFn: async () => {
      const { data } = await api.get<ScheduleRow[]>(
        `/nursing/schedule/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
    refetchInterval: 30000, // Refresh every 30s for real-time updates
  });
}

export function useAdministerMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AdministerMedicationDto) => {
      const { data } = await api.post<MedicationCheck>(
        '/nursing/administer',
        dto,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingKeys.schedule(vars.encounterId) });
      qc.invalidateQueries({ queryKey: [...nursingKeys.all, 'medication-checks'] });
    },
  });
}

export function useSkipMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SkipMedicationDto) => {
      const { data } = await api.post<MedicationCheck>(
        '/nursing/skip',
        dto,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingKeys.schedule(vars.encounterId) });
      qc.invalidateQueries({ queryKey: [...nursingKeys.all, 'medication-checks'] });
    },
  });
}

export function useSuspendMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SuspendMedicationDto) => {
      const { data } = await api.post('/nursing/suspend', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingKeys.schedule(vars.encounterId) });
      qc.invalidateQueries({ queryKey: [...nursingKeys.all, 'medication-checks'] });
    },
  });
}

// ============================================================================
// Medication Checks (A6 — legacy endpoint for nursing index)
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

// ============================================================================
// Patient Timeline (A9)
// ============================================================================

export function usePatientTimeline(patientId: string, filters?: TimelineFilters) {
  return useInfiniteQuery({
    queryKey: nursingKeys.timeline(patientId, filters),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<TimelineResponse>(
        `/patients/${patientId}/timeline`,
        {
          params: {
            ...filters,
            cursor: pageParam,
            limit: 20,
          },
        },
      );
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled: !!patientId,
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
