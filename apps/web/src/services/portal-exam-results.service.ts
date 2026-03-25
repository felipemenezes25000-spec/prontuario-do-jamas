import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type ResultFlag = 'ALTO' | 'BAIXO' | 'NORMAL' | 'CRITICO';

export interface ExamResultItem {
  parameter: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  flag: ResultFlag;
}

export interface ExamResult {
  id: string;
  examName: string;
  examType: string;
  category: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  requestedAt: string;
  completedAt: string | null;
  results: ExamResultItem[];
  layExplanation: string | null;
  doctorName: string;
  pdfUrl: string | null;
}

export interface ExamResultGroup {
  date: string;
  exams: ExamResult[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface ExamTrend {
  parameter: string;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  points: TrendPoint[];
}

export interface ExamResultFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const examResultKeys = {
  all: ['portal-exam-results'] as const,
  list: (filters?: ExamResultFilters) => [...examResultKeys.all, 'list', filters] as const,
  detail: (id: string) => [...examResultKeys.all, 'detail', id] as const,
  trend: (examName: string, parameter: string) =>
    [...examResultKeys.all, 'trend', examName, parameter] as const,
  categories: () => [...examResultKeys.all, 'categories'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useExamResults(filters?: ExamResultFilters) {
  return useQuery({
    queryKey: examResultKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<ExamResultGroup[]>(
        '/patient-portal/exam-results',
        { params: filters },
      );
      return data;
    },
  });
}

export function useExamResultDetail(id: string) {
  return useQuery({
    queryKey: examResultKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ExamResult>(`/patient-portal/exam-results/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useExamTrend(examName: string, parameter: string) {
  return useQuery({
    queryKey: examResultKeys.trend(examName, parameter),
    queryFn: async () => {
      const { data } = await api.get<ExamTrend>(
        '/patient-portal/exam-results/trend',
        { params: { examName, parameter } },
      );
      return data;
    },
    enabled: !!examName && !!parameter,
  });
}

export function useExamCategories() {
  return useQuery({
    queryKey: examResultKeys.categories(),
    queryFn: async () => {
      const { data } = await api.get<string[]>('/patient-portal/exam-results/categories');
      return data;
    },
  });
}

export function useDownloadExamPdf() {
  return useMutation({
    mutationFn: async (examId: string) => {
      const { data } = await api.get<Blob>(`/patient-portal/exam-results/${examId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado-exame-${examId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
