import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Appointment,
  PaginatedResponse,
  AppointmentStatus,
  CreateAppointmentDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  type?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters?: AppointmentFilters) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  byDoctor: (doctorId: string, date?: string) =>
    [...appointmentKeys.all, 'doctor', doctorId, date] as const,
  byPatient: (patientId: string) => [...appointmentKeys.all, 'patient', patientId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Appointment>>('/appointments', {
        params: filters,
      });
      return data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Appointment>(`/appointments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDoctorAppointments(doctorId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: appointmentKeys.byDoctor(doctorId, dateFrom),
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>(`/appointments/by-doctor/${doctorId}`, {
        params: { dateFrom, dateTo },
      });
      return data;
    },
    enabled: !!doctorId,
  });
}

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>(`/appointments/by-patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointment: CreateAppointmentDto) => {
      const { data } = await api.post<Appointment>('/appointments', appointment);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(vars.id) });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useConfirmAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; method?: string }) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}/confirm`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}/cancel`, {
        cancellationReason: reason,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      scheduledAt,
      duration,
    }: {
      id: string;
      scheduledAt: string;
      duration?: number;
    }) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}/reschedule`, {
        scheduledAt,
        duration,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}
