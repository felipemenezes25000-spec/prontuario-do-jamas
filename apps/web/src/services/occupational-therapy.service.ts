import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const otKeys = {
  all: ['occupational-therapy'] as const,
  assessments: (params?: Record<string, unknown>) => [...otKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...otKeys.all, 'assessment', id] as const,
  plans: (params?: Record<string, unknown>) => [...otKeys.all, 'plans', params] as const,
  progress: (patientId: string) => [...otKeys.all, 'progress', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ScaleType = 'BARTHEL' | 'FIM' | 'KATZ' | 'LAWTON';

export interface ADLItem {
  activity: string;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface OTAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  scaleType: ScaleType;
  items: ADLItem[];
  totalScore: number;
  maxTotalScore: number;
  interpretation: string;
  goals: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreateOTAssessmentDto {
  patientId: string;
  encounterId: string;
  scaleType: ScaleType;
  items: ADLItem[];
  goals: string;
}

export interface RehabPlan {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId: string;
  objectives: string[];
  activities: string[];
  frequency: string;
  duration: string;
  adaptations: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface CreateRehabPlanDto {
  patientId: string;
  assessmentId: string;
  objectives: string[];
  activities: string[];
  frequency: string;
  duration: string;
  adaptations?: string;
}

export interface ProgressRecord {
  id: string;
  patientId: string;
  planId: string;
  date: string;
  activitiesPerformed: string[];
  observations: string;
  barthelScore?: number;
  fimScore?: number;
  therapist: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useOTAssessments(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: otKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: OTAssessment[]; total: number }>(
        '/occupational-therapy/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreateOTAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateOTAssessmentDto) => {
      const { data } = await api.post<OTAssessment>('/occupational-therapy/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: otKeys.assessments() });
    },
  });
}

export function useOTPlans(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: otKeys.plans(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: RehabPlan[]; total: number }>(
        '/occupational-therapy/plans',
        { params },
      );
      return data;
    },
  });
}

export function useCreateOTPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRehabPlanDto) => {
      const { data } = await api.post<RehabPlan>('/occupational-therapy/plans', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: otKeys.plans() });
    },
  });
}

export function useOTProgress(patientId: string) {
  return useQuery({
    queryKey: otKeys.progress(patientId),
    queryFn: async () => {
      const { data } = await api.get<ProgressRecord[]>(
        `/occupational-therapy/progress/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}
