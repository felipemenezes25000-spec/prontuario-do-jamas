import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const emergencyBoardKeys = {
  all: ['emergency-board'] as const,
  trackingBoard: (params?: TrackingBoardParams) =>
    [...emergencyBoardKeys.all, 'tracking-board', params] as const,
  doorToMetrics: (patientId: string) =>
    [...emergencyBoardKeys.all, 'door-to-metrics', patientId] as const,
  bedRegulations: (params?: BedRegulationListParams) =>
    [...emergencyBoardKeys.all, 'bed-regulation', params] as const,
  overcrowding: () => [...emergencyBoardKeys.all, 'overcrowding'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ManchesterLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

export interface TrackingBoardParams {
  sector?: string;
  triageLevel?: ManchesterLevel;
  status?: 'WAITING' | 'IN_CARE' | 'OBSERVATION' | 'PENDING_DISCHARGE';
}

export interface TrackingBoardEntry {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  triageLevel: ManchesterLevel;
  status: 'WAITING' | 'IN_CARE' | 'OBSERVATION' | 'PENDING_DISCHARGE';
  chiefComplaint: string;
  arrivalTime: string;
  waitingMinutes: number;
  bed?: string;
  assignedDoctor?: string;
  assignedNurse?: string;
  flags: string[];
}

export interface DoorToMetrics {
  patientId: string;
  arrivalTime: string;
  triageTime: string | null;
  doorToTriageMinutes: number | null;
  firstContactTime: string | null;
  doorToDocMinutes: number | null;
  firstMedicationTime: string | null;
  imagingOrderedTime: string | null;
  labOrderedTime: string | null;
  admissionDecisionTime: string | null;
  dischargeTime: string | null;
  totalLosMinutes: number | null;
}

export interface ReclassifyPatientPayload {
  recordId: string;
  authorId: string;
  newManchesterLevel: ManchesterLevel;
  chiefComplaint?: string;
  painScale?: string;
  justification: string;
}

export interface ReclassifyPatientResponse {
  id: string;
  recordId: string;
  previousLevel: ManchesterLevel;
  newLevel: ManchesterLevel;
  justification: string;
  reclassifiedAt: string;
  reclassifiedBy: string;
}

export interface FastTrackPayload {
  patientId: string;
  encounterId: string;
  triageLevel: ManchesterLevel;
  chiefComplaint: string;
  assignedTo?: string;
}

export interface FastTrackRecord {
  id: string;
  patientId: string;
  encounterId: string;
  assignedAt: string;
  assignedTo?: string;
  estimatedWaitMinutes: number;
}

export interface TraumaProtocolPayload {
  patientId: string;
  encounterId: string;
  traumaType: string;
  mechanism: string;
  vitalSigns: {
    sbp: number;
    hr: number;
    rr: number;
    gcs: number;
    spo2: number;
    temperature?: number;
  };
  injuries: string[];
  teamActivated: boolean;
  activationLevel: 'I' | 'II' | 'III';
  notes?: string;
}

export interface TraumaProtocolRecord {
  id: string;
  patientId: string;
  encounterId: string;
  traumaType: string;
  activationLevel: 'I' | 'II' | 'III';
  activatedAt: string;
  teamNotifiedAt: string | null;
}

export interface CardiacArrestPayload {
  patientId: string;
  encounterId?: string;
  location: string;
  witnessedBy: 'UNWITNESSED' | 'LAYPERSON' | 'HEALTHCARE_PROVIDER';
  initialRhythm: string;
  bystanterCprPerformed: boolean;
  aedUsed: boolean;
  arrivalRhythm: string;
  downtime: string;
  teamLeaderId: string;
  notes?: string;
}

export interface CardiacArrestRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  initialRhythm: string;
  rosc: boolean | null;
  roscTime: string | null;
  recordedAt: string;
}

export interface ChestPainProtocolPayload {
  patientId: string;
  encounterId: string;
  onsetTime: string;
  painCharacteristics: string;
  radiationPattern?: string;
  associatedSymptoms: string[];
  ekgInterpretation?: string;
  stemiActivated: boolean;
  initialTroponin?: number;
  heparinGiven: boolean;
  aspirinGiven: boolean;
  notes?: string;
}

export interface ChestPainProtocolRecord {
  id: string;
  patientId: string;
  encounterId: string;
  stemiActivated: boolean;
  doorToEkgMinutes: number | null;
  doorToBalloonMinutes: number | null;
  recordedAt: string;
}

export interface ObservationUnitPayload {
  patientId: string;
  encounterId: string;
  admissionReason: string;
  expectedStayHours: number;
  attendingId: string;
  bed: string;
  careInstructions?: string;
}

export interface ObservationUnitRecord {
  id: string;
  patientId: string;
  encounterId: string;
  bed: string;
  admittedAt: string;
  expectedDischargeAt: string;
  status: 'ACTIVE' | 'EXTENDED' | 'DISCHARGED';
}

export interface HandoffPayload {
  fromProviderId: string;
  toProviderId: string;
  encounterId: string;
  patientId: string;
  situation: string;
  background: string;
  assessment: string;
  recommendations: string;
  pendingTasks: string[];
  criticalValues?: string[];
}

export interface HandoffRecord {
  id: string;
  encounterId: string;
  patientId: string;
  fromProviderId: string;
  toProviderId: string;
  handoffAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface OvercrowdingIndex {
  score: number;
  level: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  occupancyRate: number;
  waitingCount: number;
  longestWaitMinutes: number;
  boardedPatients: number;
  recommendation: string;
  calculatedAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useTrackingBoard(params?: TrackingBoardParams) {
  return useQuery({
    queryKey: emergencyBoardKeys.trackingBoard(params),
    queryFn: async () => {
      const { data } = await api.get<TrackingBoardEntry[]>('/emergency/tracking-board', { params });
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useDoorToMetrics(patientId: string) {
  return useQuery({
    queryKey: emergencyBoardKeys.doorToMetrics(patientId),
    queryFn: async () => {
      const { data } = await api.get<DoorToMetrics>(`/emergency/door-to-metrics/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useReclassifyPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReclassifyPatientPayload) => {
      const { data } = await api.post<ReclassifyPatientResponse>(
        '/emergency/reclassification',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useRegisterFastTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FastTrackPayload) => {
      const { data } = await api.post<FastTrackRecord>('/emergency/fast-track', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useRecordTraumaProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TraumaProtocolPayload) => {
      const { data } = await api.post<TraumaProtocolRecord>('/emergency/trauma-protocol', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useRecordCardiacArrest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CardiacArrestPayload) => {
      const { data } = await api.post<CardiacArrestRecord>('/emergency/cardiac-arrest', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useRecordChestPainProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ChestPainProtocolPayload) => {
      const { data } = await api.post<ChestPainProtocolRecord>('/emergency/chest-pain', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useAdmitToObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ObservationUnitPayload) => {
      const { data } = await api.post<ObservationUnitRecord>('/emergency/observation-unit', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.all });
    },
  });
}

export function useRecordHandoff() {
  return useMutation({
    mutationFn: async (payload: HandoffPayload) => {
      const { data } = await api.post<HandoffRecord>('/emergency/handoff', payload);
      return data;
    },
  });
}

export function useOvercrowdingIndex() {
  return useQuery({
    queryKey: emergencyBoardKeys.overcrowding(),
    queryFn: async () => {
      const { data } = await api.get<OvercrowdingIndex>('/emergency/overcrowding');
      return data;
    },
    refetchInterval: 60_000,
  });
}

// ─── Bed Regulation ──────────────────────────────────────────────────────────

export interface BedRegulationPayload {
  patientId: string;
  encounterId: string;
  requestedUnit: string;
  clinicalJustification: string;
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  requestedBy: string;
}

export interface BedRegulation {
  id: string;
  patientId: string;
  encounterId: string;
  requestedUnit: string;
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'ALLOCATED' | 'TRANSFERRED' | 'CANCELLED';
  requestedAt: string;
  allocatedBed?: string;
  allocatedAt?: string;
}

export type BedRegulationListParams = {
  status?: BedRegulation['status'];
  urgencyLevel?: BedRegulation['urgencyLevel'];
  requestedUnit?: string;
};

export function useRequestBedRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BedRegulationPayload) => {
      const { data } = await api.post<BedRegulation>('/emergency/bed-regulation', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyBoardKeys.bedRegulations() });
    },
  });
}

export function useBedRegulations(params?: BedRegulationListParams) {
  return useQuery({
    queryKey: emergencyBoardKeys.bedRegulations(params),
    queryFn: async () => {
      const { data } = await api.get<BedRegulation[]>('/emergency/bed-regulation', { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}
