import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface WaitingRoomEntry {
  waitingId: string;
  patientName: string;
  position: number;
  waitTime: number;
  joinedAt: string;
}

export interface AsyncConsultation {
  consultationId: string;
  specialty: string;
  description: string;
  patientName?: string;
  status: string;
  hasResponse: boolean;
  createdAt: string;
}

export interface RpmAlert {
  alertId: string;
  patientName?: string;
  patientId?: string;
  metric: string;
  value: number;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
}

export const teleEnhancedKeys = {
  all: ['telemedicine-enhanced'] as const,
  waitingRoom: (roomName: string) => [...teleEnhancedKeys.all, 'waiting-room', roomName] as const,
  asyncConsultations: (filters?: Record<string, unknown>) => [...teleEnhancedKeys.all, 'async', filters] as const,
  rpmAlerts: (filters?: Record<string, unknown>) => [...teleEnhancedKeys.all, 'rpm-alerts', filters] as const,
};

export function useWaitingRoom(roomName: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.waitingRoom(roomName),
    queryFn: async () => {
      const { data } = await api.get<WaitingRoomEntry[]>(`/telemedicine-enhanced/waiting-room/${roomName}`);
      return data;
    },
    refetchInterval: 10000,
    enabled: !!roomName,
  });
}

export function useJoinWaitingRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { encounterId: string; roomName: string }) => {
      const { data } = await api.post('/telemedicine-enhanced/waiting-room', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.all });
    },
  });
}

export function useAdmitPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (waitingId: string) => {
      const { data } = await api.patch(`/telemedicine-enhanced/waiting-room/${waitingId}/admit`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.all });
    },
  });
}

export function useAsyncConsultations(filters?: { status?: string; specialty?: string; page?: number }) {
  return useQuery({
    queryKey: teleEnhancedKeys.asyncConsultations(filters),
    queryFn: async () => {
      const { data } = await api.get('/telemedicine-enhanced/async-consultation', { params: filters });
      return data as { data: AsyncConsultation[]; total: number; page: number; pageSize: number; totalPages: number };
    },
  });
}

export function useCreateAsyncConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { specialty: string; description: string; photos?: string[] }) => {
      const { data } = await api.post('/telemedicine-enhanced/async-consultation', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.asyncConsultations() });
    },
  });
}

export function useRpmAlerts(filters?: { patientId?: string; acknowledged?: boolean; page?: number }) {
  return useQuery({
    queryKey: teleEnhancedKeys.rpmAlerts(filters),
    queryFn: async () => {
      const { data } = await api.get('/telemedicine-enhanced/rpm/alerts', { params: filters });
      return data as { data: RpmAlert[]; total: number; page: number; pageSize: number; totalPages: number };
    },
  });
}

export function useSubmitRpmReading() {
  return useMutation({
    mutationFn: async (payload: { metric: string; value: number; deviceId?: string }) => {
      const { data } = await api.post('/telemedicine-enhanced/rpm/reading', payload);
      return data;
    },
  });
}

// ============================================================================
// IA: Urgency Detection
// ============================================================================

export interface UrgencyDetectionResult {
  sessionId: string;
  patientName: string;
  analysedAt: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  urgencyScore: number;
  detectedSignals: string[];
  recommendation: string;
  disclaimer: string;
}

export function useDetectUrgency() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<UrgencyDetectionResult>(
        `/telemedicine-enhanced/session/${sessionId}/detect-urgency`,
      );
      return data;
    },
  });
}

// ============================================================================
// Multi-participant
// ============================================================================

export interface Participant {
  id: string;
  participantName: string;
  role: string;
  joinedAt: string;
}

export const teleParticipantKeys = {
  all: ['tele-participants'] as const,
  room: (roomName: string) => [...teleParticipantKeys.all, roomName] as const,
};

export function useRoomParticipants(roomName: string) {
  return useQuery({
    queryKey: teleParticipantKeys.room(roomName),
    queryFn: async () => {
      const { data } = await api.get<Participant[]>(`/telemedicine-enhanced/room/${roomName}/participants`);
      return data;
    },
    enabled: !!roomName,
    refetchInterval: 10000,
  });
}

export function useAddParticipant(roomName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { participantName: string; role: string; email?: string }) => {
      const { data } = await api.post(`/telemedicine-enhanced/room/${roomName}/participant`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleParticipantKeys.room(roomName) });
    },
  });
}

export function useRequestDoctorConsult() {
  return useMutation({
    mutationFn: async (payload: {
      encounterId: string;
      targetSpecialty: string;
      targetDoctorId?: string;
      consultType: string;
      urgency: string;
      clinicalQuestion: string;
      attachments?: string[];
    }) => {
      const { data } = await api.post('/telemedicine-enhanced/d2d-consult', payload);
      return data;
    },
  });
}
