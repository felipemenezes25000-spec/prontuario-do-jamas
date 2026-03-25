import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CallQueueEntry {
  position: number;
  patientName?: string;
  doctorName?: string;
  room: string;
  scheduledAt: string;
  appointmentId: string;
}

export interface WaitTimeStats {
  doctorId: string;
  doctorName: string;
  avgWaitMinutes: number;
  byShift: Record<string, number>;
  byDayOfWeek: Record<string, number>;
}

export const schedEnhancedKeys = {
  all: ['scheduling-enhanced'] as const,
  callQueue: () => [...schedEnhancedKeys.all, 'call-queue'] as const,
  waitTimeStats: (filters?: Record<string, unknown>) => [...schedEnhancedKeys.all, 'wait-stats', filters] as const,
  waitlist: (filters?: Record<string, unknown>) => [...schedEnhancedKeys.all, 'waitlist', filters] as const,
  noShowRate: (doctorId: string) => [...schedEnhancedKeys.all, 'no-show', doctorId] as const,
};

export function useCallQueue() {
  return useQuery({
    queryKey: schedEnhancedKeys.callQueue(),
    queryFn: async () => {
      const { data } = await api.get<CallQueueEntry[]>('/scheduling-enhanced/call-queue');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useCallNextPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { doctorId: string; room: string }) => {
      const { data } = await api.post('/scheduling-enhanced/call-next', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

export function useWaitTimeStats(filters?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: schedEnhancedKeys.waitTimeStats(filters),
    queryFn: async () => {
      const { data } = await api.get('/scheduling-enhanced/wait-time-stats', { params: filters });
      return data as { stats: WaitTimeStats[]; totalDoctors: number };
    },
  });
}

export function useWaitlist(filters?: { specialty?: string; doctorId?: string }) {
  return useQuery({
    queryKey: schedEnhancedKeys.waitlist(filters),
    queryFn: async () => {
      const { data } = await api.get('/scheduling-enhanced/waitlist', { params: filters });
      return data as Array<{
        waitlistId: string;
        position: number;
        patientName?: string;
        specialty?: string;
        priority: number;
        waitingSince: string;
      }>;
    },
  });
}

export function useAddToWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId?: string; specialty?: string; priority?: number }) => {
      const { data } = await api.post('/scheduling-enhanced/waitlist', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.waitlist() });
    },
  });
}

export function useBlockSchedule() {
  return useMutation({
    mutationFn: async (payload: {
      doctorId: string;
      reason: string;
      startDate: string;
      endDate: string;
      autoReallocate: boolean;
    }) => {
      const { data } = await api.post('/scheduling-enhanced/block-schedule', payload);
      return data;
    },
  });
}

export function useRegisterWalkIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId: string; reason: string; urgency?: string }) => {
      const { data } = await api.post('/scheduling-enhanced/walk-in', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

export function useQrCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post(`/scheduling-enhanced/qr-checkin/${appointmentId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

export function useNoShowRate(doctorId: string) {
  return useQuery({
    queryKey: schedEnhancedKeys.noShowRate(doctorId),
    queryFn: async () => {
      const { data } = await api.get(`/scheduling-enhanced/no-show-rate/${doctorId}`);
      return data as { doctorId: string; noShowRate: number; totalAppointments: number; noShows: number };
    },
    enabled: !!doctorId,
  });
}

export function useSendConfirmations() {
  return useMutation({
    mutationFn: async (hoursAhead?: number) => {
      const { data } = await api.post('/scheduling-enhanced/send-confirmations', null, {
        params: hoursAhead ? { hoursAhead } : undefined,
      });
      return data;
    },
  });
}

// ============================================================================
// Recurring Schedule
// ============================================================================

export interface RecurringSchedulePayload {
  patientId: string;
  doctorId: string;
  type: string;
  intervalMonths: 3 | 6 | 12;
  occurrences: number;
  firstDate: string;
  duration?: number;
  notes?: string;
}

export interface RecurringScheduleResult {
  patientName: string;
  doctorName: string;
  intervalMonths: number;
  appointmentsCreated: number;
  appointments: Array<{ id: string; scheduledAt: string }>;
  reminderNote: string;
}

export function useCreateRecurringSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecurringSchedulePayload) => {
      const { data } = await api.post<RecurringScheduleResult>('/scheduling-enhanced/recurring', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.all });
    },
  });
}

// ============================================================================
// Smart Scheduling (AI)
// ============================================================================

export interface SmartSchedulingPayload {
  patientId: string;
  doctorId?: string;
  specialty?: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  preferredTimeSlots?: string[];
}

export interface SmartSuggestion {
  date: string;
  time: string;
  doctorId: string;
  estimatedDuration: number;
  score: number;
  reason: string;
}

export interface SmartSchedulingResult {
  patientName: string;
  complexity: string;
  suggestions: SmartSuggestion[];
  note: string;
}

export function useSmartSchedulingSuggestion() {
  return useMutation({
    mutationFn: async (payload: SmartSchedulingPayload) => {
      const { data } = await api.post<SmartSchedulingResult>('/scheduling-enhanced/smart-suggestion', payload);
      return data;
    },
  });
}
