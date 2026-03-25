import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string | null;
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface SchedulingAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  scheduledAt: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes: string | null;
  createdAt: string;
}

export interface BookAppointmentPayload {
  slotId: string;
  doctorId: string;
  specialty: string;
  notes?: string;
}

export interface SchedulingFilters {
  specialty?: string;
  doctorId?: string;
  date?: string;
  weekStart?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const schedulingKeys = {
  all: ['portal-scheduling'] as const,
  doctors: (specialty?: string) => [...schedulingKeys.all, 'doctors', specialty] as const,
  specialties: () => [...schedulingKeys.all, 'specialties'] as const,
  slots: (filters?: SchedulingFilters) => [...schedulingKeys.all, 'slots', filters] as const,
  appointments: (filters?: SchedulingFilters) => [...schedulingKeys.all, 'appointments', filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSpecialties() {
  return useQuery({
    queryKey: schedulingKeys.specialties(),
    queryFn: async () => {
      const { data } = await api.get<string[]>('/patient-portal/scheduling/specialties');
      return data;
    },
  });
}

export function useDoctors(specialty?: string) {
  return useQuery({
    queryKey: schedulingKeys.doctors(specialty),
    queryFn: async () => {
      const { data } = await api.get<Doctor[]>('/patient-portal/scheduling/doctors', {
        params: { specialty },
      });
      return data;
    },
    enabled: !!specialty,
  });
}

export function useTimeSlots(filters?: SchedulingFilters) {
  return useQuery({
    queryKey: schedulingKeys.slots(filters),
    queryFn: async () => {
      const { data } = await api.get<TimeSlot[]>('/patient-portal/scheduling/slots', {
        params: filters,
      });
      return data;
    },
    enabled: !!filters?.doctorId && !!filters?.date,
  });
}

export function useMyAppointments(filters?: SchedulingFilters) {
  return useQuery({
    queryKey: schedulingKeys.appointments(filters),
    queryFn: async () => {
      const { data } = await api.get<SchedulingAppointment[]>(
        '/patient-portal/scheduling/my-appointments',
        { params: filters },
      );
      return data;
    },
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BookAppointmentPayload) => {
      const { data } = await api.post<SchedulingAppointment>(
        '/patient-portal/scheduling/book',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulingKeys.all });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      await api.post(`/patient-portal/scheduling/${appointmentId}/cancel`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulingKeys.appointments() });
    },
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, newSlotId }: { appointmentId: string; newSlotId: string }) => {
      const { data } = await api.post<SchedulingAppointment>(
        `/patient-portal/scheduling/${appointmentId}/reschedule`,
        { newSlotId },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulingKeys.all });
    },
  });
}
