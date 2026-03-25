import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Encounter,
  Prescription,
  VitalSigns,
  PaginatedResponse,
} from '@/types';

// ============================================================================
// Response types for portal-specific endpoints
// ============================================================================

export interface PortalExamResult {
  id: string;
  examType: string;
  status: string;
  examName: string;
  requestedAt: string | null;
  completedAt: string | null;
  aiInterpretation: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string } | null;
}

export interface PortalAppointment {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  duration: number;
  notes: string | null;
  createdAt: string;
  doctor: { id: string; name: string } | null;
}

export interface PortalDocument {
  id: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  signedAt: string | null;
  author: { id: string; name: string } | null;
}

export interface RequestAppointmentPayload {
  preferredDate?: string;
  specialty?: string;
  reason?: string;
  type?: string;
}

// ============================================================================
// Filter types
// ============================================================================

export interface PortalFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  patientId?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const portalKeys = {
  all: ['patient-portal'] as const,
  encounters: (filters?: PortalFilters) => [...portalKeys.all, 'encounters', filters] as const,
  results: (filters?: PortalFilters) => [...portalKeys.all, 'results', filters] as const,
  prescriptions: (filters?: PortalFilters) => [...portalKeys.all, 'prescriptions', filters] as const,
  appointments: (filters?: PortalFilters) => [...portalKeys.all, 'appointments', filters] as const,
  vitals: (filters?: PortalFilters) => [...portalKeys.all, 'vitals', filters] as const,
  documents: (filters?: PortalFilters) => [...portalKeys.all, 'documents', filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePortalEncounters(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.encounters(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>(
        '/patient-portal/my-encounters',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePortalResults(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.results(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PortalExamResult>>(
        '/patient-portal/my-results',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePortalPrescriptions(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.prescriptions(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Prescription>>(
        '/patient-portal/my-prescriptions',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePortalAppointments(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.appointments(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PortalAppointment>>(
        '/patient-portal/my-appointments',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePortalVitals(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.vitals(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<VitalSigns>>(
        '/patient-portal/my-vitals',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePortalDocuments(filters?: PortalFilters) {
  return useQuery({
    queryKey: portalKeys.documents(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PortalDocument>>(
        '/patient-portal/my-documents',
        { params: filters },
      );
      return data;
    },
  });
}

export function useRequestAppointment(patientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RequestAppointmentPayload) => {
      const { data } = await api.post<PortalAppointment>(
        '/patient-portal/request-appointment',
        payload,
        { params: patientId ? { patientId } : undefined },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.appointments() });
    },
  });
}
