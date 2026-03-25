import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const palliativeKeys = {
  all: ['palliative-care'] as const,
  patients: (params?: Record<string, unknown>) => [...palliativeKeys.all, 'patients', params] as const,
  patient: (id: string) => [...palliativeKeys.all, 'patient', id] as const,
  scales: (patientId: string) => [...palliativeKeys.all, 'scales', patientId] as const,
  directives: (patientId: string) => [...palliativeKeys.all, 'directives', patientId] as const,
  carePlans: (params?: Record<string, unknown>) => [...palliativeKeys.all, 'carePlans', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface ESASScore {
  symptom: string;
  score: number;
}

export interface PalliativeAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  ppsScore: number;
  esasScores: ESASScore[];
  totalSymptomBurden: number;
  prognosis: string;
  goals: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreatePalliativeAssessmentDto {
  patientId: string;
  encounterId: string;
  ppsScore: number;
  esasScores: ESASScore[];
  prognosis: string;
  goals: string;
}

export interface AdvanceDirective {
  id: string;
  patientId: string;
  patientName: string;
  type: 'DNR' | 'LIVING_WILL' | 'HEALTHCARE_PROXY' | 'OTHER';
  content: string;
  witnessName: string;
  documentDate: string;
  status: 'ACTIVE' | 'REVOKED';
  createdBy: string;
  createdAt: string;
}

export interface CreateDirectiveDto {
  patientId: string;
  type: AdvanceDirective['type'];
  content: string;
  witnessName: string;
  documentDate: string;
}

export interface PalliativeCarePlan {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId: string;
  symptomManagement: string[];
  painControl: string;
  psychosocialSupport: string;
  spiritualCare: string;
  familyMeeting: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
}

export interface CreateCarePlanDto {
  patientId: string;
  assessmentId: string;
  symptomManagement: string[];
  painControl: string;
  psychosocialSupport: string;
  spiritualCare?: string;
  familyMeeting?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function usePalliativePatients(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: palliativeKeys.patients(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PalliativeAssessment[]; total: number }>(
        '/palliative-care/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreatePalliativeAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePalliativeAssessmentDto) => {
      const { data } = await api.post<PalliativeAssessment>('/palliative-care/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: palliativeKeys.patients() });
    },
  });
}

export function useAdvanceDirectives(patientId: string) {
  return useQuery({
    queryKey: palliativeKeys.directives(patientId),
    queryFn: async () => {
      const { data } = await api.get<AdvanceDirective[]>(
        `/palliative-care/patients/${patientId}/directives`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateDirective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDirectiveDto) => {
      const { data } = await api.post<AdvanceDirective>('/palliative-care/directives', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: palliativeKeys.directives(variables.patientId) });
    },
  });
}

export function usePalliativeCarePlans(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: palliativeKeys.carePlans(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PalliativeCarePlan[]; total: number }>(
        '/palliative-care/care-plans',
        { params },
      );
      return data;
    },
  });
}

export function useCreateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCarePlanDto) => {
      const { data } = await api.post<PalliativeCarePlan>('/palliative-care/care-plans', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: palliativeKeys.carePlans() });
    },
  });
}
