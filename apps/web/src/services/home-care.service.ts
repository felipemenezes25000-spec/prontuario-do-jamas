import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const homeCareKeys = {
  all: ['home-care'] as const,
  visits: (params?: Record<string, unknown>) => [...homeCareKeys.all, 'visits', params] as const,
  visit: (id: string) => [...homeCareKeys.all, 'visit', id] as const,
  patients: (params?: Record<string, unknown>) => [...homeCareKeys.all, 'patients', params] as const,
  patientTimeline: (patientId: string) => [...homeCareKeys.all, 'timeline', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type VisitStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface HomeCareVisit {
  id: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  status: VisitStatus;
  visitType: string;
  professional: string;
  professionalRole: string;
  checklist: ChecklistItem[];
  notes: string;
  completedAt?: string;
  duration?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  notes?: string;
}

export interface CreateVisitDto {
  patientId: string;
  scheduledDate: string;
  scheduledTime: string;
  visitType: string;
  checklist: { label: string }[];
  notes?: string;
}

export interface CompleteVisitDto {
  visitId: string;
  checklist: ChecklistItem[];
  notes: string;
  duration: number;
}

export interface HomeCarePatient {
  id: string;
  patientId: string;
  patientName: string;
  address: string;
  phone: string;
  diagnosis: string;
  careLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  nextVisit?: string;
  totalVisits: number;
  status: 'ACTIVE' | 'DISCHARGED' | 'SUSPENDED';
}

// ============================================================================
// Hooks
// ============================================================================

export function useHomeCareVisits(params?: { page?: number; limit?: number; status?: VisitStatus; date?: string }) {
  return useQuery({
    queryKey: homeCareKeys.visits(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: HomeCareVisit[]; total: number }>(
        '/home-care/visits',
        { params },
      );
      return data;
    },
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateVisitDto) => {
      const { data } = await api.post<HomeCareVisit>('/home-care/visits', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeCareKeys.visits() });
      qc.invalidateQueries({ queryKey: homeCareKeys.patients() });
    },
  });
}

export function useCompleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CompleteVisitDto) => {
      const { data } = await api.patch<HomeCareVisit>(
        `/home-care/visits/${dto.visitId}/complete`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeCareKeys.visits() });
      qc.invalidateQueries({ queryKey: homeCareKeys.patients() });
    },
  });
}

export function useHomeCarePatients(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: homeCareKeys.patients(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: HomeCarePatient[]; total: number }>(
        '/home-care/patients',
        { params },
      );
      return data;
    },
  });
}

export function useHomeCareTimeline(patientId: string) {
  return useQuery({
    queryKey: homeCareKeys.patientTimeline(patientId),
    queryFn: async () => {
      const { data } = await api.get<HomeCareVisit[]>(
        `/home-care/patients/${patientId}/timeline`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}
