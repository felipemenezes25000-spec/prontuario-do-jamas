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
  phase: SpongeCountRecord['phase'];
  items: SpongeCountItem[];
  observations?: string;
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

export interface CreatePreAnesthesiaDto {
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
  type: AnesthesiaRecord['type'];
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

export interface OperatingRoomMapEntry {
  roomId: string;
  roomName: string;
  floor: string;
  status: 'AVAILABLE' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED';
  currentProcedure?: {
    id: string;
    name: string;
    surgeonName: string;
    patientName: string;
    estimatedEnd: string;
  };
  slots: Array<{
    procedureId: string;
    procedureName: string;
    surgeonName: string;
    patientName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  equipment: string[];
  capabilities: string[];
}

export interface RoomUtilizationParams {
  startDate?: string;
  endDate?: string;
  roomId?: string;
}

export interface RoomUtilizationReport {
  totalRooms: number;
  totalProcedures: number;
  averageUtilizationPercent: number;
  averageTurnoverMinutes: number;
  firstCaseOnTimePercent: number;
  cancellationRate: number;
  utilizationByRoom: Array<{ roomId: string; roomName: string; utilizationPercent: number; procedures: number }>;
  utilizationByDay: Array<{ date: string; utilizationPercent: number }>;
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

export interface ErasChecklist {
  id: string;
  procedureId: string;
  patientId: string;
  procedureType: string;
  preOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  intraOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  postOp: Record<string, { completed: boolean; completedAt?: string; completedBy?: string; notes?: string }>;
  compliancePercent: number;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErasChecklistDto {
  procedureId: string;
  patientId: string;
  procedureType: string;
  preOp: Record<string, boolean>;
  intraOp: Record<string, boolean>;
  postOp: Record<string, boolean>;
  observations?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalSafetyKeys = {
  all: ['surgical-safety'] as const,
  spongeCount: (procedureId: string) => [...surgicalSafetyKeys.all, 'sponge-count', procedureId] as const,
  preAnesthesia: (patientId: string) => [...surgicalSafetyKeys.all, 'pre-anesthesia', patientId] as const,
  anesthesiaRecord: (procedureId: string) => [...surgicalSafetyKeys.all, 'anesthesia-record', procedureId] as const,
  intraopMonitoring: (procedureId: string) => [...surgicalSafetyKeys.all, 'intraop', procedureId] as const,
  orMap: () => [...surgicalSafetyKeys.all, 'or-map'] as const,
  roomUtilization: (params?: RoomUtilizationParams) => [...surgicalSafetyKeys.all, 'room-utilization', params] as const,
  cards: (surgeonId?: string) => [...surgicalSafetyKeys.all, 'preference-cards', surgeonId] as const,
  card: (id: string) => [...surgicalSafetyKeys.all, 'preference-card', id] as const,
  eras: (procedureId: string) => [...surgicalSafetyKeys.all, 'eras', procedureId] as const,
};

// ============================================================================
// Sponge Count (Contagem de Compressas)
// ============================================================================

export function useRecordSpongeCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSpongeCountDto) => {
      const { data } = await api.post<SpongeCountRecord>('/surgical/safety/sponge-count', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.spongeCount(vars.procedureId) });
    },
  });
}

// ============================================================================
// Pre-Anesthesia Evaluation (APA)
// ============================================================================

export function useCreatePreAnesthesia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePreAnesthesiaDto) => {
      const { data } = await api.post<PreAnesthesiaEvaluation>('/surgical/safety/pre-anesthesia', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.preAnesthesia(vars.patientId) });
    },
  });
}

export function useGetPreAnesthesia(patientId: string) {
  return useQuery({
    queryKey: surgicalSafetyKeys.preAnesthesia(patientId),
    queryFn: async () => {
      const { data } = await api.get<PreAnesthesiaEvaluation[]>(`/surgical/safety/pre-anesthesia/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ============================================================================
// Anesthesia Record (Ficha de Anestesia)
// ============================================================================

export function useCreateAnesthesiaRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAnesthesiaRecordDto) => {
      const { data } = await api.post<AnesthesiaRecord>('/surgical/safety/anesthesia-record', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.anesthesiaRecord(vars.procedureId) });
    },
  });
}

// ============================================================================
// Intraoperative Monitoring (Monitorização Intraoperatória)
// ============================================================================

export function useRecordIntraopVitals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateIntraopMonitoringDto) => {
      const { data } = await api.post<IntraopMonitoringEntry>('/surgical/safety/intraop-monitoring', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.intraopMonitoring(vars.procedureId) });
    },
  });
}

// ============================================================================
// Operating Room Map (Mapa de Salas)
// ============================================================================

export function useORMap() {
  return useQuery({
    queryKey: surgicalSafetyKeys.orMap(),
    queryFn: async () => {
      const { data } = await api.get<OperatingRoomMapEntry[]>('/surgical/safety/operating-room-map');
      return data;
    },
    refetchInterval: 30000,
  });
}

// ============================================================================
// Room Utilization (Utilização das Salas)
// ============================================================================

export function useRoomUtilization(params?: RoomUtilizationParams) {
  return useQuery({
    queryKey: surgicalSafetyKeys.roomUtilization(params),
    queryFn: async () => {
      const { data } = await api.get<RoomUtilizationReport>('/surgical/safety/room-utilization', { params });
      return data;
    },
  });
}

// ============================================================================
// Preference Cards (Cartões de Preferência)
// ============================================================================

export function usePreferenceCards(surgeonId?: string, procedureType?: string) {
  return useQuery({
    queryKey: [...surgicalSafetyKeys.cards(surgeonId), procedureType],
    queryFn: async () => {
      const { data } = await api.get<PreferenceCard[]>('/surgical/safety/preference-cards', {
        params: { surgeonId, procedureType },
      });
      return data;
    },
  });
}

export function useCreatePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePreferenceCardDto) => {
      const { data } = await api.post<PreferenceCard>('/surgical/safety/preference-cards', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.cards(vars.surgeonId) });
    },
  });
}

export function useUpdatePreferenceCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, surgeonId, ...dto }: UpdatePreferenceCardDto & { id: string; surgeonId: string }) => {
      const { data } = await api.patch<PreferenceCard>(`/surgical/safety/preference-cards/${id}`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.card(vars.id) });
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.cards(vars.surgeonId) });
    },
  });
}

// ============================================================================
// ERAS Protocol (Recuperação Acelerada Pós-Operatória)
// ============================================================================

export function useRecordErasChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateErasChecklistDto) => {
      const { data } = await api.post<ErasChecklist>('/surgical/safety/eras-protocol', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: surgicalSafetyKeys.eras(vars.procedureId) });
    },
  });
}
