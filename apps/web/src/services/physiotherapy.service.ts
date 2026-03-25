import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const physioKeys = {
  all: ['physiotherapy'] as const,
  assessments: (params?: Record<string, unknown>) => [...physioKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...physioKeys.all, 'assessment', id] as const,
  plans: (params?: Record<string, unknown>) => [...physioKeys.all, 'plans', params] as const,
  sessions: (params?: Record<string, unknown>) => [...physioKeys.all, 'sessions', params] as const,
  session: (id: string) => [...physioKeys.all, 'session', id] as const,
  patientTimeline: (patientId: string) => [...physioKeys.all, 'timeline', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface MuscleGroup {
  name: string;
  leftStrength: number;
  rightStrength: number;
  rom: number;
  notes?: string;
}

export interface PhysioAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  diagnosis: string;
  muscleGroups: MuscleGroup[];
  functionalCapacity: string;
  painScale: number;
  goals: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreatePhysioAssessmentDto {
  patientId: string;
  encounterId: string;
  diagnosis: string;
  muscleGroups: MuscleGroup[];
  functionalCapacity: string;
  painScale: number;
  goals: string;
}

export interface RehabPlan {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId: string;
  exercises: string[];
  frequency: string;
  duration: string;
  goals: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface PhysioSession {
  id: string;
  patientId: string;
  patientName: string;
  planId: string;
  date: string;
  exercisesPerformed: string[];
  evolution: string;
  painBefore: number;
  painAfter: number;
  therapist: string;
  duration: number;
}

export interface CreateSessionDto {
  patientId: string;
  planId: string;
  exercisesPerformed: string[];
  evolution: string;
  painBefore: number;
  painAfter: number;
  duration: number;
}

// ============================================================================
// Hooks
// ============================================================================

export function usePhysioAssessments(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: physioKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PhysioAssessment[]; total: number }>(
        '/physiotherapy/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreatePhysioAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePhysioAssessmentDto) => {
      const { data } = await api.post<PhysioAssessment>('/physiotherapy/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: physioKeys.assessments() });
    },
  });
}

export function useRehabPlans(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: physioKeys.plans(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: RehabPlan[]; total: number }>(
        '/physiotherapy/plans',
        { params },
      );
      return data;
    },
  });
}

export function usePhysioSessions(params?: { page?: number; limit?: number; patientId?: string }) {
  return useQuery({
    queryKey: physioKeys.sessions(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PhysioSession[]; total: number }>(
        '/physiotherapy/sessions',
        { params },
      );
      return data;
    },
  });
}

export function useCreatePhysioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSessionDto) => {
      const { data } = await api.post<PhysioSession>('/physiotherapy/sessions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: physioKeys.sessions() });
      qc.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}
