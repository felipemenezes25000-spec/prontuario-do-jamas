import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const emergencyKeys = {
  all: ['emergency'] as const,
  board: () => [...emergencyKeys.all, 'board'] as const,
  metrics: () => [...emergencyKeys.all, 'metrics'] as const,
  protocols: () => [...emergencyKeys.all, 'protocols'] as const,
  patient: (id: string) => [...emergencyKeys.all, 'patient', id] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface EmergencyPatient {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  triageLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  status: 'WAITING' | 'IN_CARE' | 'OBSERVATION' | 'DISCHARGE';
  chiefComplaint: string;
  arrivalTime: string;
  doorToDocMinutes: number | null;
  bed?: string;
  doctor?: string;
  encounterId: string;
}

export interface EmergencyMetrics {
  avgDoorToDoc: number;
  occupancyRate: number;
  waitingCount: number;
  inCareCount: number;
  observationCount: number;
  dischargeCount: number;
  totalToday: number;
}

export interface ProtocolActivation {
  patientId: string;
  encounterId: string;
  protocol: 'AVC' | 'IAM' | 'SEPSIS' | 'TRAUMA';
  notes?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useEmergencyBoard() {
  return useQuery({
    queryKey: emergencyKeys.board(),
    queryFn: async () => {
      const { data } = await api.get<EmergencyPatient[]>('/emergency/board');
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useEmergencyMetrics() {
  return useQuery({
    queryKey: emergencyKeys.metrics(),
    queryFn: async () => {
      const { data } = await api.get<EmergencyMetrics>('/emergency/metrics');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useActivateProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProtocolActivation) => {
      const { data } = await api.post('/emergency/protocols/activate', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useUpdatePatientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, status }: { patientId: string; status: EmergencyPatient['status'] }) => {
      const { data } = await api.patch(`/emergency/patients/${patientId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

// ─── Advanced Emergency Hooks ────────────────────────────────────────────────

export interface ReclassifyPayload {
  recordId: string;
  authorId: string;
  newManchesterLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  chiefComplaint?: string;
  painScale?: string;
  justification: string;
}

export interface NedocsResult {
  id: string;
  nedocsScore: number;
  level: 'NOT_BUSY' | 'BUSY' | 'EXTREMELY_BUSY' | 'OVERCROWDED';
  recommendation: string;
  inputs: Record<string, number>;
}

export interface NedocsPayload {
  totalEdBeds: number;
  totalEdPatients: number;
  ventilatorsInUse: number;
  admittedWaitingBed: number;
  longestWaitHours: number;
  totalHospitalBeds: number;
  admissionsLastHour: number;
}

export function useReclassifyRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, ...payload }: ReclassifyPayload) => {
      const { data } = await api.post(`/emergency/${recordId}/reclassify`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useAssignFastTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.post(`/emergency/${recordId}/fast-track`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useCalculateNedocs() {
  return useMutation({
    mutationFn: async (payload: NedocsPayload) => {
      const { data } = await api.post<NedocsResult>('/emergency/nedocs', payload);
      return data;
    },
  });
}
