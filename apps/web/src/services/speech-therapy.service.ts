import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const speechKeys = {
  all: ['speech-therapy'] as const,
  assessments: (params?: Record<string, unknown>) => [...speechKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...speechKeys.all, 'assessment', id] as const,
  sessions: (params?: Record<string, unknown>) => [...speechKeys.all, 'sessions', params] as const,
  patientHistory: (patientId: string) => [...speechKeys.all, 'history', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type AssessmentType = 'SWALLOWING' | 'SPEECH' | 'AUDIOMETRY' | 'LANGUAGE' | 'VOICE';

export interface SpeechAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  assessmentType: AssessmentType;
  findings: string;
  oralMotorExam: string;
  swallowingLevel?: string;
  speechIntelligibility?: string;
  audiometryResults?: string;
  recommendation: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreateSpeechAssessmentDto {
  patientId: string;
  encounterId: string;
  assessmentType: AssessmentType;
  findings: string;
  oralMotorExam: string;
  swallowingLevel?: string;
  speechIntelligibility?: string;
  audiometryResults?: string;
  recommendation: string;
}

export interface SpeechSession {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  assessmentId: string;
  sessionNumber: number;
  type: AssessmentType;
  activitiesPerformed: string[];
  evolution: string;
  patientResponse: string;
  nextPlan: string;
  therapist: string;
  date: string;
  duration: number;
}

export interface CreateSpeechSessionDto {
  patientId: string;
  encounterId: string;
  assessmentId: string;
  type: AssessmentType;
  activitiesPerformed: string[];
  evolution: string;
  patientResponse: string;
  nextPlan?: string;
  duration: number;
}

// ============================================================================
// Hooks
// ============================================================================

export function useSpeechAssessments(params?: { page?: number; limit?: number; type?: AssessmentType }) {
  return useQuery({
    queryKey: speechKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: SpeechAssessment[]; total: number }>(
        '/speech-therapy/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreateSpeechAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSpeechAssessmentDto) => {
      const { data } = await api.post<SpeechAssessment>('/speech-therapy/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: speechKeys.assessments() });
    },
  });
}

export function useSpeechSessions(params?: { page?: number; limit?: number; patientId?: string }) {
  return useQuery({
    queryKey: speechKeys.sessions(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: SpeechSession[]; total: number }>(
        '/speech-therapy/sessions',
        { params },
      );
      return data;
    },
  });
}

export function useCreateSpeechSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSpeechSessionDto) => {
      const { data } = await api.post<SpeechSession>('/speech-therapy/sessions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: speechKeys.sessions() });
      qc.invalidateQueries({ queryKey: speechKeys.assessments() });
    },
  });
}

export function useSpeechPatientHistory(patientId: string) {
  return useQuery({
    queryKey: speechKeys.patientHistory(patientId),
    queryFn: async () => {
      const { data } = await api.get<{ assessments: SpeechAssessment[]; sessions: SpeechSession[] }>(
        `/speech-therapy/patients/${patientId}/history`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}
