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

// ============================================================================
// Sponge Count (Contagem de Compressas)
// ============================================================================

export interface SpongeCountItem {
  name: string;
  expectedCount: number;
  actualCount: number;
}

export interface SpongeCountDto {
  procedureId: string;
  phase: 'BEFORE' | 'AFTER';
  items: SpongeCountItem[];
  observations?: string;
}

export function useCreateSpongeCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SpongeCountDto) => {
      const { data } = await api.post('/surgical/sponge-count', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.procedureId) });
    },
  });
}

export function useVerifySpongeCount(procedureId: string) {
  return useQuery({
    queryKey: [...surgicalKeys.detail(procedureId), 'sponge-count'],
    queryFn: async () => {
      const { data } = await api.get(`/surgical/sponge-count/${procedureId}/verify`);
      return data as { allMatch: boolean; discrepancies: Array<{ name: string; before: number; after: number }> };
    },
    enabled: !!procedureId,
  });
}

// ============================================================================
// Pre-Anesthetic Evaluation (APA)
// ============================================================================

export interface ApaAirway {
  mallampati: 1 | 2 | 3 | 4;
  mouthOpening: string;
  neckMobility: string;
  thyromental: string;
  dentition: string;
  beardOrObesity: boolean;
}

export interface ApaDto {
  procedureId: string;
  patientId: string;
  comorbidities: string[];
  currentMedications: string[];
  allergies: string[];
  previousAnesthesia: { date?: string; type?: string; complications?: string };
  airway: ApaAirway;
  fastingHours: number;
  fastingSolidsHours: number;
  asaClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  asaEmergency: boolean;
  cardiacRisk: string;
  pulmonaryRisk: string;
  labResults: Record<string, unknown>;
  anesthesiaPlan: string;
  consentObtained: boolean;
  observations?: string;
}

export function useCreateApa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ApaDto) => {
      const { data } = await api.post('/surgical/pre-anesthetic-evaluation', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.procedureId) });
    },
  });
}

// ============================================================================
// Room Utilization Metrics (Métricas de CC)
// ============================================================================

export interface UtilizationMetrics {
  totalProcedures: number;
  averageTurnoverMinutes: number;
  cancellationRate: number;
  utilizationByRoom: Array<{ room: string; utilizationPercent: number; procedures: number }>;
  cancellations: Array<{ reason: string; count: number }>;
  averageDurationByType: Array<{ procedureType: string; avgMinutes: number }>;
}

export function useUtilizationMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [...surgicalKeys.all, 'utilization', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<UtilizationMetrics>('/surgical/utilization-metrics', {
        params: { startDate, endDate },
      });
      return data;
    },
    enabled: !!(startDate && endDate),
  });
}

// ============================================================================
// Preference Cards
// ============================================================================

export interface PreferenceCard {
  id: string;
  surgeonId: string;
  procedureType: string;
  instruments: string[];
  sutures: string[];
  materials: string[];
  patientPosition: string;
  equipment: string[];
  specialRequirements?: string;
  notes?: string;
}

export interface PreferenceCardDto {
  surgeonId: string;
  procedureType: string;
  instruments: string[];
  sutures: string[];
  materials: string[];
  patientPosition: string;
  equipment: string[];
  specialRequirements?: string;
  notes?: string;
}

export function useCreatePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: PreferenceCardDto) => {
      const { data } = await api.post('/surgical/preference-card', dto);
      return data as PreferenceCard;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...surgicalKeys.all, 'preference-card', vars.surgeonId] });
    },
  });
}

export function usePreferenceCards(surgeonId: string, procedureType?: string) {
  return useQuery({
    queryKey: [...surgicalKeys.all, 'preference-card', surgeonId, procedureType],
    queryFn: async () => {
      const { data } = await api.get<PreferenceCard[]>(`/surgical/preference-card/${surgeonId}`, {
        params: procedureType ? { procedureType } : {},
      });
      return data;
    },
    enabled: !!surgeonId,
  });
}

// ============================================================================
// ERAS Checklist
// ============================================================================

export interface ErasDto {
  procedureId: string;
  patientId: string;
  preOp: Record<string, boolean>;
  intraOp: Record<string, boolean>;
  postOp: Record<string, boolean>;
  observations?: string;
}

export function useCreateErasChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ErasDto) => {
      const { data } = await api.post('/surgical/eras-checklist', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalKeys.detail(vars.procedureId) });
    },
  });
}

// ============================================================================
// AI Duration Estimation
// ============================================================================

export interface DurationEstimation {
  procedureName: string;
  estimatedMinutes: number;
  confidenceInterval: { min: number; max: number };
  basedOnCases: number;
  factors: Array<{ factor: string; impact: string }>;
}

export function useEstimateDuration() {
  return useMutation({
    mutationFn: async (dto: { procedureName: string; surgeonId: string; patientComorbidities?: number }) => {
      const { data } = await api.post<DurationEstimation>('/surgical/estimate-duration', dto);
      return data;
    },
  });
}

// ============================================================================
// Video Recording
// ============================================================================

export interface VideoRecording {
  id: string;
  recordingId: string;
  surgeryId: string;
  status: 'RECORDING' | 'COMPLETED';
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number | null;
  url: string | null;
  storageKey: string;
  createdAt: string;
}

export const videoKeys = {
  all: ['surgical-videos'] as const,
  list: (surgeryId: string) => [...videoKeys.all, surgeryId] as const,
};

export function useSurgeryVideos(surgeryId: string) {
  return useQuery({
    queryKey: videoKeys.list(surgeryId),
    queryFn: async () => {
      const { data } = await api.get<VideoRecording[]>(`/surgical/${surgeryId}/videos`);
      return data;
    },
    enabled: !!surgeryId,
  });
}

export function useStartVideoRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surgeryId: string) => {
      const { data } = await api.post(`/surgical/${surgeryId}/video/start`);
      return data as { recordingId: string; surgeryId: string; status: string; startedAt: string; message: string };
    },
    onSuccess: (_, surgeryId) => {
      qc.invalidateQueries({ queryKey: videoKeys.list(surgeryId) });
    },
  });
}

export function useStopVideoRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surgeryId: string) => {
      const { data } = await api.post(`/surgical/${surgeryId}/video/stop`);
      return data as { recordingId: string; surgeryId: string; status: string; stoppedAt: string; durationSeconds: number; url: string };
    },
    onSuccess: (_, surgeryId) => {
      qc.invalidateQueries({ queryKey: videoKeys.list(surgeryId) });
    },
  });
}
