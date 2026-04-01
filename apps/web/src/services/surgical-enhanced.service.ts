import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface SpongeCountItem {
  name: string;
  expectedCount: number;
  actualCount: number;
}

export interface SpongeCountRecord {
  id: string;
  procedureId: string;
  phase: 'BEFORE' | 'DURING' | 'AFTER';
  items: SpongeCountItem[];
  discrepancies: Array<{ name: string; expected: number; actual: number }>;
  allMatch: boolean;
  countedById: string;
  verifiedById?: string;
  countedAt: string;
  observations?: string;
}

export interface CreateSpongeCountDto {
  procedureId: string;
  phase: 'BEFORE' | 'DURING' | 'AFTER';
  items: SpongeCountItem[];
  observations?: string;
}

export interface VerifySpongeCountDto {
  procedureId: string;
  recordId: string;
  verifiedById: string;
}

export interface PreAnesthesiaEvaluation {
  id: string;
  procedureId: string;
  patientId: string;
  evaluatorId: string;
  comorbidities: string[];
  currentMedications: string[];
  allergies: string[];
  previousAnesthesia: { date?: string; type?: string; complications?: string };
  airway: {
    mallampati: 1 | 2 | 3 | 4;
    mouthOpening: string;
    neckMobility: string;
    thyromental: string;
    dentition: string;
    beardOrObesity: boolean;
  };
  fastingHours: number;
  fastingSolidsHours: number;
  asaClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  asaEmergency: boolean;
  cardiacRiskScore: string;
  pulmonaryRiskScore: string;
  labResults: Record<string, unknown>;
  anesthesiaPlan: string;
  consentObtained: boolean;
  observations?: string;
  evaluatedAt: string;
}

export interface CreatePreAnesthesiaEvalDto {
  procedureId: string;
  patientId: string;
  comorbidities: string[];
  currentMedications: string[];
  allergies: string[];
  previousAnesthesia: { date?: string; type?: string; complications?: string };
  airway: {
    mallampati: 1 | 2 | 3 | 4;
    mouthOpening: string;
    neckMobility: string;
    thyromental: string;
    dentition: string;
    beardOrObesity: boolean;
  };
  fastingHours: number;
  fastingSolidsHours: number;
  asaClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  asaEmergency: boolean;
  cardiacRiskScore: string;
  pulmonaryRiskScore: string;
  labResults: Record<string, unknown>;
  anesthesiaPlan: string;
  consentObtained: boolean;
  observations?: string;
}

export interface AnesthesiaRecord {
  id: string;
  procedureId: string;
  patientId: string;
  anesthesiologistId: string;
  type: 'GENERAL' | 'REGIONAL' | 'LOCAL' | 'SEDATION' | 'COMBINED';
  technique: string;
  agents: Array<{ name: string; dose: string; route: string; time: string }>;
  airwayManagement: string;
  intubationDetails?: { tube: string; size: string; cuffPressure: number; attempts: number };
  monitoringParams: string[];
  vitals: Array<{ time: string; hr: number; sbp: number; dbp: number; spo2: number; etco2?: number; temp?: number }>;
  fluidsAdministered: Array<{ type: string; volumeMl: number; time: string }>;
  bloodProducts: Array<{ type: string; units: number; time: string }>;
  complications: string[];
  events: Array<{ time: string; description: string }>;
  startAt: string;
  endAt?: string;
  notes?: string;
}

export interface CreateAnesthesiaRecordDto {
  procedureId: string;
  patientId: string;
  type: 'GENERAL' | 'REGIONAL' | 'LOCAL' | 'SEDATION' | 'COMBINED';
  technique: string;
  agents: Array<{ name: string; dose: string; route: string; time: string }>;
  airwayManagement: string;
  intubationDetails?: { tube: string; size: string; cuffPressure: number; attempts: number };
  monitoringParams: string[];
  notes?: string;
}

export interface IntraopMonitoringEntry {
  id: string;
  procedureId: string;
  timestamp: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  spo2: number;
  etco2?: number;
  temperature?: number;
  respiratoryRate?: number;
  tidalVolume?: number;
  peep?: number;
  fio2?: number;
  urineOutput?: number;
  bloodLoss?: number;
  notes?: string;
}

export interface CreateIntraopMonitoringDto {
  procedureId: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  spo2: number;
  etco2?: number;
  temperature?: number;
  respiratoryRate?: number;
  tidalVolume?: number;
  peep?: number;
  fio2?: number;
  urineOutput?: number;
  bloodLoss?: number;
  notes?: string;
}

export interface OperatingRoom {
  id: string;
  name: string;
  floor: string;
  building?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED';
  currentProcedure?: { id: string; name: string; surgeonName: string; estimatedEnd: string };
  equipment: string[];
  capabilities: string[];
}

export interface ORMapEntry {
  roomId: string;
  roomName: string;
  slots: Array<{
    procedureId: string;
    procedureName: string;
    surgeonName: string;
    patientName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

export interface ORUtilizationMetrics {
  totalRooms: number;
  totalProcedures: number;
  averageUtilizationPercent: number;
  averageTurnoverMinutes: number;
  firstCaseOnTimePercent: number;
  cancellationRate: number;
  utilizationByRoom: Array<{ roomId: string; roomName: string; utilizationPercent: number; procedures: number }>;
  utilizationByDay: Array<{ date: string; utilizationPercent: number }>;
  cancellations: Array<{ reason: string; count: number }>;
  averageDurationByType: Array<{ procedureType: string; avgMinutes: number; count: number }>;
  peakHours: Array<{ hour: number; avgProcedures: number }>;
}

export interface PreferenceCard {
  id: string;
  surgeonId: string;
  surgeonName: string;
  procedureType: string;
  instruments: string[];
  sutures: string[];
  materials: string[];
  patientPosition: string;
  equipment: string[];
  implants?: string[];
  specialRequirements?: string;
  notes?: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface CreatePreferenceCardDto {
  surgeonId: string;
  procedureType: string;
  instruments: string[];
  sutures: string[];
  materials: string[];
  patientPosition: string;
  equipment: string[];
  implants?: string[];
  specialRequirements?: string;
  notes?: string;
}

export interface UpdatePreferenceCardDto {
  instruments?: string[];
  sutures?: string[];
  materials?: string[];
  patientPosition?: string;
  equipment?: string[];
  implants?: string[];
  specialRequirements?: string;
  notes?: string;
}

export interface ERASProtocol {
  id: string;
  procedureId: string;
  patientId: string;
  procedureType: string;
  preOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  intraOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  postOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  compliancePercent: number;
  outcomeLOS?: number;
  outcomeReadmission?: boolean;
  outcomeComplications?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateERASProtocolDto {
  procedureId: string;
  patientId: string;
  procedureType: string;
  preOp: Record<string, boolean>;
  intraOp: Record<string, boolean>;
  postOp: Record<string, boolean>;
  observations?: string;
}

export interface UpdateERASItemDto {
  phase: 'preOp' | 'intraOp' | 'postOp';
  item: string;
  completed: boolean;
  notes?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalEnhancedKeys = {
  all: ['surgical-enhanced'] as const,
  spongeCount: (procedureId: string) => [...surgicalEnhancedKeys.all, 'sponge-count', procedureId] as const,
  preAnesthesia: (procedureId: string) => [...surgicalEnhancedKeys.all, 'pre-anesthesia', procedureId] as const,
  anesthesiaRecord: (procedureId: string) => [...surgicalEnhancedKeys.all, 'anesthesia-record', procedureId] as const,
  intraopMonitoring: (procedureId: string) => [...surgicalEnhancedKeys.all, 'intraop', procedureId] as const,
  orMap: (date: string) => [...surgicalEnhancedKeys.all, 'or-map', date] as const,
  orRooms: () => [...surgicalEnhancedKeys.all, 'or-rooms'] as const,
  orUtilization: (params?: Record<string, string>) => [...surgicalEnhancedKeys.all, 'or-utilization', params] as const,
  preferenceCards: (surgeonId: string) => [...surgicalEnhancedKeys.all, 'preference-cards', surgeonId] as const,
  preferenceCard: (id: string) => [...surgicalEnhancedKeys.all, 'preference-card', id] as const,
  eras: (procedureId: string) => [...surgicalEnhancedKeys.all, 'eras', procedureId] as const,
  erasCompliance: (params?: Record<string, string>) => [...surgicalEnhancedKeys.all, 'eras-compliance', params] as const,
};

// ============================================================================
// Sponge Count (Contagem de Compressas)
// ============================================================================

export function useSpongeCountRecords(procedureId: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.spongeCount(procedureId),
    queryFn: async () => {
      const { data } = await api.get<SpongeCountRecord[]>(`/surgical/sponge-count/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
  });
}

export function useCreateSpongeCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSpongeCountDto) => {
      const { data } = await api.post<SpongeCountRecord>('/surgical/sponge-count', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.spongeCount(vars.procedureId) });
    },
  });
}

export function useVerifySpongeCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: VerifySpongeCountDto) => {
      const { data } = await api.post<SpongeCountRecord>(`/surgical/sponge-count/${dto.recordId}/verify`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.spongeCount(vars.procedureId) });
    },
  });
}

// ============================================================================
// Pre-Anesthesia Evaluation (APA)
// ============================================================================

export function usePreAnesthesiaEvaluation(procedureId: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.preAnesthesia(procedureId),
    queryFn: async () => {
      const { data } = await api.get<PreAnesthesiaEvaluation>(`/surgical/pre-anesthesia/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
  });
}

export function useCreatePreAnesthesiaEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePreAnesthesiaEvalDto) => {
      const { data } = await api.post<PreAnesthesiaEvaluation>('/surgical/pre-anesthesia', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preAnesthesia(vars.procedureId) });
    },
  });
}

export function useUpdatePreAnesthesiaEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, procedureId, ...updates }: Partial<CreatePreAnesthesiaEvalDto> & { id: string; procedureId: string }) => {
      const { data } = await api.patch<PreAnesthesiaEvaluation>(`/surgical/pre-anesthesia/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preAnesthesia(vars.procedureId) });
    },
  });
}

// ============================================================================
// Anesthesia Record (Ficha de Anestesia)
// ============================================================================

export function useAnesthesiaRecord(procedureId: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.anesthesiaRecord(procedureId),
    queryFn: async () => {
      const { data } = await api.get<AnesthesiaRecord>(`/surgical/anesthesia-record/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
  });
}

export function useCreateAnesthesiaRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAnesthesiaRecordDto) => {
      const { data } = await api.post<AnesthesiaRecord>('/surgical/anesthesia-record', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.anesthesiaRecord(vars.procedureId) });
    },
  });
}

export function useUpdateAnesthesiaRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, procedureId, ...updates }: Partial<AnesthesiaRecord> & { id: string; procedureId: string }) => {
      const { data } = await api.patch<AnesthesiaRecord>(`/surgical/anesthesia-record/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.anesthesiaRecord(vars.procedureId) });
    },
  });
}

export function useAddAnesthesiaEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, procedureId: _procedureId, event }: { recordId: string; procedureId: string; event: { time: string; description: string } }) => {
      const { data } = await api.post(`/surgical/anesthesia-record/${recordId}/event`, event);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.anesthesiaRecord(vars.procedureId) });
    },
  });
}

// ============================================================================
// Intraoperative Monitoring
// ============================================================================

export function useIntraopMonitoring(procedureId: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.intraopMonitoring(procedureId),
    queryFn: async () => {
      const { data } = await api.get<IntraopMonitoringEntry[]>(`/surgical/intraop-monitoring/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
    refetchInterval: 30000,
  });
}

export function useRecordIntraopVitals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateIntraopMonitoringDto) => {
      const { data } = await api.post<IntraopMonitoringEntry>('/surgical/intraop-monitoring', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.intraopMonitoring(vars.procedureId) });
    },
  });
}

// ============================================================================
// OR Map (Mapa de Salas)
// ============================================================================

export function useORRooms() {
  return useQuery({
    queryKey: surgicalEnhancedKeys.orRooms(),
    queryFn: async () => {
      const { data } = await api.get<OperatingRoom[]>('/surgical/or-rooms');
      return data;
    },
  });
}

export function useORMap(date: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.orMap(date),
    queryFn: async () => {
      const { data } = await api.get<ORMapEntry[]>('/surgical/or-map', { params: { date } });
      return data;
    },
    enabled: !!date,
  });
}

export function useUpdateORRoomStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string; status: OperatingRoom['status'] }) => {
      const { data } = await api.patch<OperatingRoom>(`/surgical/or-rooms/${roomId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.orRooms() });
    },
  });
}

// ============================================================================
// OR Utilization Metrics (Métricas de CC)
// ============================================================================

export function useORUtilizationMetrics(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.orUtilization(params as Record<string, string>),
    queryFn: async () => {
      const { data } = await api.get<ORUtilizationMetrics>('/surgical/or-utilization', { params });
      return data;
    },
  });
}

// ============================================================================
// Preference Cards (Cartões de Preferência)
// ============================================================================

export function usePreferenceCards(surgeonId: string, procedureType?: string) {
  return useQuery({
    queryKey: [...surgicalEnhancedKeys.preferenceCards(surgeonId), procedureType],
    queryFn: async () => {
      const { data } = await api.get<PreferenceCard[]>(`/surgical/preference-cards/${surgeonId}`, {
        params: procedureType ? { procedureType } : {},
      });
      return data;
    },
    enabled: !!surgeonId,
  });
}

export function usePreferenceCard(id: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.preferenceCard(id),
    queryFn: async () => {
      const { data } = await api.get<PreferenceCard>(`/surgical/preference-cards/detail/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePreferenceCardDto) => {
      const { data } = await api.post<PreferenceCard>('/surgical/preference-cards', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preferenceCards(vars.surgeonId) });
    },
  });
}

export function useUpdatePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, surgeonId, ...updates }: UpdatePreferenceCardDto & { id: string; surgeonId: string }) => {
      const { data } = await api.patch<PreferenceCard>(`/surgical/preference-cards/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preferenceCard(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preferenceCards(vars.surgeonId) });
    },
  });
}

export function useDeletePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, surgeonId: _surgeonId }: { id: string; surgeonId: string }) => {
      await api.delete(`/surgical/preference-cards/${id}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.preferenceCards(vars.surgeonId) });
    },
  });
}

// ============================================================================
// ERAS Protocol (Enhanced Recovery After Surgery)
// ============================================================================

export function useERASProtocol(procedureId: string) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.eras(procedureId),
    queryFn: async () => {
      const { data } = await api.get<ERASProtocol>(`/surgical/eras/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
  });
}

export function useCreateERASProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateERASProtocolDto) => {
      const { data } = await api.post<ERASProtocol>('/surgical/eras', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.eras(vars.procedureId) });
    },
  });
}

export function useUpdateERASItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ protocolId, procedureId, ...update }: UpdateERASItemDto & { protocolId: string; procedureId: string }) => {
      const { data } = await api.patch<ERASProtocol>(`/surgical/eras/${protocolId}/item`, update);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalEnhancedKeys.eras(vars.procedureId) });
    },
  });
}

export function useERASComplianceMetrics(params?: { startDate?: string; endDate?: string; procedureType?: string }) {
  return useQuery({
    queryKey: surgicalEnhancedKeys.erasCompliance(params as Record<string, string>),
    queryFn: async () => {
      const { data } = await api.get<{
        totalProtocols: number;
        averageCompliance: number;
        complianceByPhase: { preOp: number; intraOp: number; postOp: number };
        complianceByItem: Array<{ item: string; phase: string; compliancePercent: number }>;
        outcomesComparison: { erasLOS: number; nonErasLOS: number; erasReadmission: number; nonErasReadmission: number };
      }>('/surgical/eras/compliance', { params });
      return data;
    },
  });
}
