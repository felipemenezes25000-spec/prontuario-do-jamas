import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const nutritionKeys = {
  all: ['nutrition'] as const,
  assessments: (params?: Record<string, unknown>) => [...nutritionKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...nutritionKeys.all, 'assessment', id] as const,
  dietPlans: (params?: Record<string, unknown>) => [...nutritionKeys.all, 'dietPlans', params] as const,
  dietPlan: (id: string) => [...nutritionKeys.all, 'dietPlan', id] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ScreeningTool = 'MNA' | 'NRS_2002' | 'MUST' | 'SGA';
export type NutritionalRisk = 'LOW' | 'MODERATE' | 'HIGH';

export interface NutritionalAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  screeningTool: ScreeningTool;
  score: number;
  risk: NutritionalRisk;
  weight: number;
  height: number;
  bmi: number;
  notes: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreateAssessmentDto {
  patientId: string;
  encounterId: string;
  screeningTool: ScreeningTool;
  score: number;
  weight: number;
  height: number;
  notes?: string;
}

export interface DietPlan {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  dietType: string;
  calories: number;
  restrictions: string[];
  mealPlan: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
}

export interface CreateDietPlanDto {
  patientId: string;
  encounterId: string;
  dietType: string;
  calories: number;
  restrictions: string[];
  mealPlan: string;
  startDate: string;
  endDate?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useNutritionalAssessments(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: nutritionKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: NutritionalAssessment[]; total: number }>(
        '/nutrition/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAssessmentDto) => {
      const { data } = await api.post<NutritionalAssessment>('/nutrition/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutritionKeys.assessments() });
    },
  });
}

export function useDietPlans(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: nutritionKeys.dietPlans(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: DietPlan[]; total: number }>(
        '/nutrition/diet-plans',
        { params },
      );
      return data;
    },
  });
}

export function useCreateDietPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDietPlanDto) => {
      const { data } = await api.post<DietPlan>('/nutrition/diet-plans', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutritionKeys.dietPlans() });
    },
  });
}
