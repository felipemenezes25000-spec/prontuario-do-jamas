import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ExamResult,
  PaginatedResponse,
  CreateExamRequestDto,
  ExamType,
  ExamStatus,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface ExamFilters {
  patientId?: string;
  encounterId?: string;
  examType?: ExamType;
  status?: ExamStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters?: ExamFilters) => [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, 'detail'] as const,
  detail: (id: string) => [...examKeys.details(), id] as const,
  byPatient: (patientId: string) => [...examKeys.all, 'patient', patientId] as const,
  byEncounter: (encounterId: string) => [...examKeys.all, 'encounter', encounterId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useExams(filters?: ExamFilters) {
  return useQuery({
    queryKey: examKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ExamResult>>('/exams', {
        params: filters,
      });
      return data;
    },
  });
}

export function useExam(id: string) {
  return useQuery({
    queryKey: examKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ExamResult>(`/exams/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientExams(patientId: string) {
  return useQuery({
    queryKey: examKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ExamResult>>('/exams', {
        params: { patientId },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useEncounterExams(encounterId: string) {
  return useQuery({
    queryKey: examKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<ExamResult[]>('/exams', {
        params: { encounterId },
      });
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useRequestExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exam: CreateExamRequestDto) => {
      const { data } = await api.post<ExamResult>('/exams', exam);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: examKeys.lists() });
      qc.invalidateQueries({ queryKey: examKeys.byPatient(result.patientId) });
      if (result.encounterId) {
        qc.invalidateQueries({ queryKey: examKeys.byEncounter(result.encounterId) });
      }
    },
  });
}

export function useUpdateExamResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExamResult> & { id: string }) => {
      const { data } = await api.patch<ExamResult>(`/exams/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: examKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: examKeys.lists() });
    },
  });
}

export function useUpdateExamStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExamStatus }) => {
      const { data } = await api.patch<ExamResult>(`/exams/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: examKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

export function useReviewExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, report }: { id: string; report?: string }) => {
      const { data } = await api.post<ExamResult>(`/exams/${id}/review`, { report });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: examKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

export function useCancelExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post<ExamResult>(`/exams/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: examKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}
