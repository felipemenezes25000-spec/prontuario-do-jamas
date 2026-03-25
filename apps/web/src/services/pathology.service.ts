import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const pathologyKeys = {
  all: ['pathology'] as const,
  requests: () => [...pathologyKeys.all, 'requests'] as const,
  request: (id: string) => [...pathologyKeys.all, 'request', id] as const,
  reports: () => [...pathologyKeys.all, 'reports'] as const,
  report: (id: string) => [...pathologyKeys.all, 'report', id] as const,
};

// ============================================================================
// Types
// ============================================================================

export type PathologyStep = 'MACROSCOPIA' | 'MICROSCOPIA' | 'IHQ' | 'LAUDO_FINAL';
export type PathologyStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface BiopsyRequest {
  id: string;
  patientName: string;
  patientId: string;
  requestingDoctor: string;
  material: string;
  biopsySite: string;
  clinicalIndication: string;
  clinicalHistory: string;
  requestedAt: string;
  status: PathologyStatus;
  currentStep: PathologyStep;
  urgent: boolean;
}

export interface PathologyReport {
  id: string;
  requestId: string;
  patientName: string;
  patientId: string;
  material: string;
  biopsySite: string;
  currentStep: PathologyStep;
  macroscopy: string;
  microscopy: string;
  immunohistochemistry: string;
  finalDiagnosis: string;
  pathologist: string;
  signedAt: string | null;
  status: PathologyStatus;
}

export interface CreateBiopsyRequestPayload {
  patientId: string;
  material: string;
  biopsySite: string;
  clinicalIndication: string;
  clinicalHistory: string;
  urgent: boolean;
}

export interface UpdateReportPayload {
  reportId: string;
  step: PathologyStep;
  content: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useBiopsyRequests() {
  return useQuery({
    queryKey: pathologyKeys.requests(),
    queryFn: async () => {
      const { data } = await api.get<BiopsyRequest[]>('/pathology/requests');
      return data;
    },
  });
}

export function useBiopsyRequest(id: string) {
  return useQuery({
    queryKey: pathologyKeys.request(id),
    queryFn: async () => {
      const { data } = await api.get<BiopsyRequest>(`/pathology/requests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePathologyReports() {
  return useQuery({
    queryKey: pathologyKeys.reports(),
    queryFn: async () => {
      const { data } = await api.get<PathologyReport[]>('/pathology/reports');
      return data;
    },
  });
}

export function usePathologyReport(id: string) {
  return useQuery({
    queryKey: pathologyKeys.report(id),
    queryFn: async () => {
      const { data } = await api.get<PathologyReport>(`/pathology/reports/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBiopsyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBiopsyRequestPayload) => {
      const { data } = await api.post('/pathology/requests', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pathologyKeys.all });
    },
  });
}

export function useUpdatePathologyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateReportPayload) => {
      const { data } = await api.patch(`/pathology/reports/${payload.reportId}`, {
        step: payload.step,
        content: payload.content,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pathologyKeys.all });
    },
  });
}

export function useSignPathologyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data } = await api.patch(`/pathology/reports/${reportId}/sign`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pathologyKeys.all });
    },
  });
}
