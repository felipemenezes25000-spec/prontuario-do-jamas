import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface InterConsult {
  id: string;
  title: string;
  content: string;
  status: string;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export interface CaseDiscussion {
  id: string;
  title: string;
  content: string;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export interface SmartPhrase {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface NoteComparison {
  documentA: { id: string; title: string; date: string };
  documentB: { id: string; title: string; date: string };
  differences: Array<{ field: string; valueA: unknown; valueB: unknown; changed: boolean }>;
  totalChanges: number;
}

export interface DifferentialDiagnosis {
  patientId: string;
  differentials: Array<{
    diagnosis: string;
    probability: number;
    icd: string;
    justification: string;
  }>;
  disclaimer: string;
  generatedAt: string;
}

export interface SpecialtyTemplateInfo {
  specialty: string;
  fields: string[];
}

export interface PhysicalExamDefault {
  system: string;
  normalText: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const clinDocKeys = {
  all: ['clinical-documentation'] as const,
  interconsults: (patientId?: string) =>
    [...clinDocKeys.all, 'interconsults', patientId] as const,
  caseDiscussions: (patientId?: string) =>
    [...clinDocKeys.all, 'case-discussions', patientId] as const,
  smartPhrases: () =>
    [...clinDocKeys.all, 'smart-phrases'] as const,
  templates: () =>
    [...clinDocKeys.all, 'templates'] as const,
  examDefaults: () =>
    [...clinDocKeys.all, 'exam-defaults'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useInterConsults(patientId?: string) {
  return useQuery({
    queryKey: clinDocKeys.interconsults(patientId),
    queryFn: async () => {
      const { data } = await api.get<InterConsult[]>('/clinical-documentation/interconsult', {
        params: patientId ? { patientId } : {},
      });
      return data;
    },
  });
}

export function useCreateInterConsult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      encounterId: string;
      patientId: string;
      requestingSpecialty: string;
      targetSpecialty: string;
      clinicalQuestion: string;
      urgency: string;
    }) => {
      const { data } = await api.post('/clinical-documentation/interconsult', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinDocKeys.interconsults() });
    },
  });
}

export function useCaseDiscussions(patientId?: string) {
  return useQuery({
    queryKey: clinDocKeys.caseDiscussions(patientId),
    queryFn: async () => {
      const { data } = await api.get<CaseDiscussion[]>('/clinical-documentation/case-discussion', {
        params: patientId ? { patientId } : {},
      });
      return data;
    },
  });
}

export function useCreateCaseDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      title: string;
      clinicalSummary: string;
      participants: Array<{ name: string; specialty: string }>;
      conclusions?: string;
      agreedPlan?: string;
    }) => {
      const { data } = await api.post('/clinical-documentation/case-discussion', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinDocKeys.caseDiscussions() });
    },
  });
}

export function useSmartPhrases() {
  return useQuery({
    queryKey: clinDocKeys.smartPhrases(),
    queryFn: async () => {
      const { data } = await api.get<SmartPhrase[]>('/clinical-documentation/smart-phrases');
      return data;
    },
  });
}

export function useCreateSmartPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { shortcut: string; expansion: string; category?: string }) => {
      const { data } = await api.post('/clinical-documentation/smart-phrases', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinDocKeys.smartPhrases() });
    },
  });
}

export function useDeleteSmartPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clinical-documentation/smart-phrases/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinDocKeys.smartPhrases() });
    },
  });
}

export function useSignNote() {
  return useMutation({
    mutationFn: async (dto: { documentId: string }) => {
      const { data } = await api.post('/clinical-documentation/sign', dto);
      return data;
    },
  });
}

export function useCreateAddendum() {
  return useMutation({
    mutationFn: async (dto: { originalDocumentId: string; addendumContent: string; reason?: string }) => {
      const { data } = await api.post('/clinical-documentation/addendum', dto);
      return data;
    },
  });
}

export function useSpecialtyTemplates() {
  return useQuery({
    queryKey: clinDocKeys.templates(),
    queryFn: async () => {
      const { data } = await api.get<SpecialtyTemplateInfo[]>('/clinical-documentation/templates');
      return data;
    },
  });
}

export function usePhysicalExamDefaults() {
  return useQuery({
    queryKey: clinDocKeys.examDefaults(),
    queryFn: async () => {
      const { data } = await api.get<PhysicalExamDefault[]>('/clinical-documentation/exam-macro/defaults');
      return data;
    },
  });
}

export function useCompareNotes() {
  return useMutation({
    mutationFn: async (dto: { documentIdA: string; documentIdB: string }) => {
      const { data } = await api.post<NoteComparison>('/clinical-documentation/compare', dto);
      return data;
    },
  });
}

export function useAiDifferentialDiagnosis() {
  return useMutation({
    mutationFn: async (dto: { patientId: string; symptoms: string; examFindings?: string }) => {
      const { data } = await api.post<DifferentialDiagnosis>('/clinical-documentation/ai/differential-diagnosis', dto);
      return data;
    },
  });
}

export function useAiAutoComplete() {
  return useMutation({
    mutationFn: async (dto: { encounterId: string; partialText: string; section: string }) => {
      const { data } = await api.post('/clinical-documentation/ai/auto-complete', dto);
      return data;
    },
  });
}

export function useAiTranslateNote() {
  return useMutation({
    mutationFn: async (dto: { documentId: string; targetLanguage: string }) => {
      const { data } = await api.post('/clinical-documentation/ai/translate', dto);
      return data;
    },
  });
}

export function useAiPatientSummary() {
  return useMutation({
    mutationFn: async (dto: { patientId: string }) => {
      const { data } = await api.post('/clinical-documentation/ai/patient-summary', dto);
      return data;
    },
  });
}

export function useCreateAttendanceDeclaration() {
  return useMutation({
    mutationFn: async (dto: { patientId: string; purpose: string; notes?: string }) => {
      const { data } = await api.post('/clinical-documentation/attendance-declaration', dto);
      return data;
    },
  });
}

export function useResolveSmartLink() {
  return useMutation({
    mutationFn: async (dto: { patientId: string; linkCode: string }) => {
      const { data } = await api.post('/clinical-documentation/smart-links/resolve', dto);
      return data;
    },
  });
}
