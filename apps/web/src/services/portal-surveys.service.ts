import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type QuestionType = 'SCALE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'YES_NO' | 'NPS';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  minScale?: number;
  maxScale?: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'PREM' | 'PROM' | 'NPS' | 'GENERAL';
  questionCount: number;
  dueDate: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  questions: SurveyQuestion[];
}

export interface SurveyAnswer {
  questionId: string;
  value: string | number;
}

export interface SurveySubmission {
  surveyId: string;
  answers: SurveyAnswer[];
}

export interface NpsResult {
  score: number;
  classification: 'DETRACTOR' | 'PASSIVE' | 'PROMOTER';
  totalResponses: number;
  detractorCount: number;
  passiveCount: number;
  promoterCount: number;
}

export interface SurveyFilters {
  status?: 'PENDING' | 'COMPLETED';
  type?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const surveyKeys = {
  all: ['portal-surveys'] as const,
  list: (filters?: SurveyFilters) => [...surveyKeys.all, 'list', filters] as const,
  detail: (id: string) => [...surveyKeys.all, 'detail', id] as const,
  nps: () => [...surveyKeys.all, 'nps'] as const,
  history: () => [...surveyKeys.all, 'history'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSurveys(filters?: SurveyFilters) {
  return useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Survey[]>(
        '/patient-portal/surveys',
        { params: filters },
      );
      return data;
    },
  });
}

export function useSurveyDetail(id: string) {
  return useQuery({
    queryKey: surveyKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Survey>(`/patient-portal/surveys/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useNpsResult() {
  return useQuery({
    queryKey: surveyKeys.nps(),
    queryFn: async () => {
      const { data } = await api.get<NpsResult>('/patient-portal/surveys/nps');
      return data;
    },
  });
}

export function useSurveyHistory() {
  return useQuery({
    queryKey: surveyKeys.history(),
    queryFn: async () => {
      const { data } = await api.get<Survey[]>(
        '/patient-portal/surveys',
        { params: { status: 'COMPLETED' } },
      );
      return data;
    },
  });
}

export function useSubmitSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submission: SurveySubmission) => {
      const { data } = await api.post<Survey>(
        `/patient-portal/surveys/${submission.surveyId}/submit`,
        { answers: submission.answers },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: surveyKeys.all });
    },
  });
}
