import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Encounter,
  EncounterStatus,
  PaginatedResponse,
  CreateEncounterDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface EncounterFilters {
  status?: EncounterStatus;
  doctorId?: string;
  patientId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const encounterKeys = {
  all: ['encounters'] as const,
  lists: () => [...encounterKeys.all, 'list'] as const,
  list: (filters?: EncounterFilters) => [...encounterKeys.lists(), filters] as const,
  details: () => [...encounterKeys.all, 'detail'] as const,
  detail: (id: string) => [...encounterKeys.details(), id] as const,
  byPatient: (patientId: string) => [...encounterKeys.all, 'patient', patientId] as const,
  byDoctor: (doctorId: string) => [...encounterKeys.all, 'doctor', doctorId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useEncounters(filters?: EncounterFilters) {
  return useQuery({
    queryKey: encounterKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>('/encounters', { params: filters });
      return data;
    },
  });
}

export function useEncounter(id: string) {
  return useQuery({
    queryKey: encounterKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Encounter>(`/encounters/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientEncounters(patientId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: encounterKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>('/encounters', {
        params: { patientId, page, limit },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useDoctorEncounters(doctorId: string, filters?: Omit<EncounterFilters, 'doctorId'>) {
  return useQuery({
    queryKey: encounterKeys.byDoctor(doctorId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>('/encounters', {
        params: { doctorId, ...filters },
      });
      return data;
    },
    enabled: !!doctorId,
  });
}

export function useCreateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounter: CreateEncounterDto) => {
      const { data } = await api.post<Encounter>('/encounters', encounter);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: encounterKeys.lists() });
    },
  });
}

export function useUpdateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Encounter> & { id: string }) => {
      const { data } = await api.patch<Encounter>(`/encounters/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: encounterKeys.lists() });
      qc.invalidateQueries({ queryKey: encounterKeys.detail(vars.id) });
    },
  });
}

export function useUpdateEncounterStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EncounterStatus }) => {
      const { data } = await api.patch<Encounter>(`/encounters/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: encounterKeys.lists() });
      qc.invalidateQueries({ queryKey: encounterKeys.detail(vars.id) });
    },
  });
}

export function useDeleteEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/encounters/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: encounterKeys.lists() });
    },
  });
}
