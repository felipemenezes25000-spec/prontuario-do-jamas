import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const psychologyKeys = {
  all: ['psychology'] as const,
  assessments: (params?: Record<string, unknown>) => [...psychologyKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...psychologyKeys.all, 'assessment', id] as const,
  sessions: (params?: Record<string, unknown>) => [...psychologyKeys.all, 'sessions', params] as const,
  riskAssessments: (params?: Record<string, unknown>) => [...psychologyKeys.all, 'risk', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ScaleType = 'PHQ9' | 'GAD7' | 'BDI' | 'BAI' | 'MINI' | 'WHOQOL';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface PsychologicalAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  scaleType: ScaleType;
  score: number;
  maxScore: number;
  interpretation: string;
  responses: number[];
  notes: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreatePsychAssessmentDto {
  patientId: string;
  encounterId: string;
  scaleType: ScaleType;
  responses: number[];
  notes?: string;
}

export interface PsychSession {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  sessionNumber: number;
  type: 'INDIVIDUAL' | 'GROUP' | 'FAMILY';
  topics: string[];
  notes: string;
  moodBefore: number;
  moodAfter: number;
  nextSessionPlan: string;
  therapist: string;
  date: string;
  duration: number;
}

export interface CreateSessionDto {
  patientId: string;
  encounterId: string;
  type: PsychSession['type'];
  topics: string[];
  notes: string;
  moodBefore: number;
  moodAfter: number;
  nextSessionPlan?: string;
  duration: number;
}

export interface SuicideRiskAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  protectiveFactors: string[];
  plan: string;
  safetyPlan: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreateRiskAssessmentDto {
  patientId: string;
  encounterId: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  protectiveFactors: string[];
  plan: string;
  safetyPlan: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function usePsychAssessments(params?: { page?: number; limit?: number; scaleType?: ScaleType }) {
  return useQuery({
    queryKey: psychologyKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PsychologicalAssessment[]; total: number }>(
        '/psychology/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreatePsychAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePsychAssessmentDto) => {
      const { data } = await api.post<PsychologicalAssessment>('/psychology/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: psychologyKeys.assessments() });
    },
  });
}

export function usePsychSessions(params?: { page?: number; limit?: number; patientId?: string }) {
  return useQuery({
    queryKey: psychologyKeys.sessions(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PsychSession[]; total: number }>(
        '/psychology/sessions',
        { params },
      );
      return data;
    },
  });
}

export function useCreatePsychSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSessionDto) => {
      const { data } = await api.post<PsychSession>('/psychology/sessions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: psychologyKeys.sessions() });
    },
  });
}

export function useSuicideRiskAssessments(params?: { page?: number; limit?: number; riskLevel?: RiskLevel }) {
  return useQuery({
    queryKey: psychologyKeys.riskAssessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: SuicideRiskAssessment[]; total: number }>(
        '/psychology/risk-assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreateRiskAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRiskAssessmentDto) => {
      const { data } = await api.post<SuicideRiskAssessment>('/psychology/risk-assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: psychologyKeys.riskAssessments() });
    },
  });
}
