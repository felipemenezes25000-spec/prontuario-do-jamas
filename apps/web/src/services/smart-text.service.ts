import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const smartTextKeys = {
  all: ['smart-text'] as const,
  smartPhrases: () => [...smartTextKeys.all, 'smart-phrases'] as const,
  smartLinks: () => [...smartTextKeys.all, 'smart-links'] as const,
  examMacros: () => [...smartTextKeys.all, 'exam-macros'] as const,
  specialtyTemplates: (params?: SpecialtyTemplatesParams) =>
    [...smartTextKeys.all, 'specialty-templates', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface SmartPhrase {
  id: string;
  abbreviation: string;
  expansion: string;
  description?: string;
  specialty?: string;
  createdBy: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmartPhrasePayload {
  abbreviation: string;
  expansion: string;
  description?: string;
  specialty?: string;
  isShared?: boolean;
}

export interface UpdateSmartPhrasePayload {
  abbreviation?: string;
  expansion?: string;
  description?: string;
  specialty?: string;
  isShared?: boolean;
}

export interface ExpandSmartPhraseResult {
  abbreviation: string;
  expansion: string;
  resolvedVariables: Record<string, string>;
}

export interface SmartLink {
  id: string;
  name: string;
  linkType: 'VITALS' | 'LABS' | 'MEDICATIONS' | 'PROBLEMS' | 'ALLERGIES' | 'DEMOGRAPHICS';
  template: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateSmartLinkPayload {
  name: string;
  linkType: SmartLink['linkType'];
  template: string;
  description?: string;
}

export interface ResolveSmartLinkPayload {
  smartLinkId: string;
  patientId: string;
  encounterId?: string;
  contextDate?: string;
}

export interface ResolveSmartLinkResult {
  smartLinkId: string;
  resolvedText: string;
  dataSource: string;
  resolvedAt: string;
}

export interface ExamMacro {
  id: string;
  name: string;
  specialty: string;
  bodySystem: string;
  normalTemplate: string;
  abnormalTemplates: string[];
  createdBy: string;
  isShared: boolean;
  createdAt: string;
}

export interface CreateExamMacroPayload {
  name: string;
  specialty: string;
  bodySystem: string;
  normalTemplate: string;
  abnormalTemplates?: string[];
  isShared?: boolean;
}

export interface ApplyExamMacroPayload {
  macroId: string;
  variant: 'NORMAL' | 'ABNORMAL';
  abnormalIndex?: number;
  contextPatientId?: string;
}

export interface ApplyExamMacroResult {
  macroId: string;
  appliedText: string;
}

export interface CompareNotesPayload {
  baseNoteId: string;
  compareNoteId: string;
}

export interface CompareNotesResult {
  baseNoteId: string;
  compareNoteId: string;
  additions: string[];
  removals: string[];
  unifiedDiff: string;
}

export interface InterconsultationPayload {
  fromEncounterId: string;
  fromDoctorId: string;
  toSpecialty: string;
  toDoctorId?: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENT';
  clinicalQuestion: string;
  relevantHistory: string;
  currentMedications?: string[];
  attachedNoteId?: string;
}

export interface InterconsultationRecord {
  id: string;
  fromEncounterId: string;
  fromDoctorId: string;
  toSpecialty: string;
  toDoctorId?: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENT';
  status: 'PENDING' | 'ACCEPTED' | 'RESPONDED' | 'COMPLETED';
  clinicalQuestion: string;
  requestedAt: string;
  respondedAt: string | null;
}

export interface RespondInterconsultationPayload {
  responderId: string;
  assessment: string;
  recommendations: string;
  followUpRequired: boolean;
  followUpNotes?: string;
}

export interface CopyForwardPayload {
  sourceNoteId: string;
  targetEncounterId: string;
  authorId: string;
  sectionsToInclude?: string[];
  addAttestation: boolean;
}

export interface CopyForwardResult {
  newNoteId: string;
  sourceNoteId: string;
  targetEncounterId: string;
  createdAt: string;
}

export interface SignNotePayload {
  noteId: string;
  signerId: string;
  signerRole: string;
  attestation: string;
  pin?: string;
}

export interface SignNoteResult {
  noteId: string;
  signedAt: string;
  signedBy: string;
  digitalSignature: string;
}

export interface AttachMediaPayload {
  noteId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  fileName: string;
  base64Content: string;
  description?: string;
}

export interface AttachedMedia {
  id: string;
  noteId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  fileName: string;
  url: string;
  description?: string;
  createdAt: string;
}

export interface AnatomicalDrawingPayload {
  noteId: string;
  bodyRegion: string;
  imageDataUrl: string;
  annotations?: Array<{ x: number; y: number; label: string; color?: string }>;
  notes?: string;
}

export interface AnatomicalDrawingRecord {
  id: string;
  noteId: string;
  bodyRegion: string;
  imageUrl: string;
  annotations: Array<{ x: number; y: number; label: string; color?: string }>;
  savedAt: string;
}

export interface SpecialtyTemplatesParams {
  specialty?: string;
  category?: string;
}

export interface SpecialtyTemplate {
  id: string;
  name: string;
  specialty: string;
  category: string;
  sections: Array<{ title: string; content: string; required: boolean }>;
  createdAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

// ─── Smart Phrases ───────────────────────────────────────────────────────────

export function useSmartPhrases() {
  return useQuery({
    queryKey: smartTextKeys.smartPhrases(),
    queryFn: async () => {
      const { data } = await api.get<SmartPhrase[]>('/clinical-notes/smart-phrases');
      return data;
    },
  });
}

export function useCreateSmartPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSmartPhrasePayload) => {
      const { data } = await api.post<SmartPhrase>('/clinical-notes/smart-phrases', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.smartPhrases() });
    },
  });
}

export function useUpdateSmartPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSmartPhrasePayload & { id: string }) => {
      const { data } = await api.patch<SmartPhrase>(
        `/clinical-notes/smart-phrases/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.smartPhrases() });
    },
  });
}

export function useDeleteSmartPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clinical-notes/smart-phrases/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.smartPhrases() });
    },
  });
}

export function useExpandSmartPhrase() {
  return useMutation({
    mutationFn: async (abbreviation: string) => {
      const { data } = await api.post<ExpandSmartPhraseResult>(
        '/clinical-notes/smart-phrases/expand',
        { abbreviation },
      );
      return data;
    },
  });
}

// ─── Smart Links ─────────────────────────────────────────────────────────────

export function useSmartLinks() {
  return useQuery({
    queryKey: smartTextKeys.smartLinks(),
    queryFn: async () => {
      const { data } = await api.get<SmartLink[]>('/clinical-notes/smart-links');
      return data;
    },
  });
}

export function useCreateSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSmartLinkPayload) => {
      const { data } = await api.post<SmartLink>('/clinical-notes/smart-links', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.smartLinks() });
    },
  });
}

export function useResolveSmartLink() {
  return useMutation({
    mutationFn: async (payload: ResolveSmartLinkPayload) => {
      const { data } = await api.post<ResolveSmartLinkResult>(
        '/clinical-notes/smart-links/resolve',
        payload,
      );
      return data;
    },
  });
}

// ─── Exam Macros ─────────────────────────────────────────────────────────────

export function useExamMacros() {
  return useQuery({
    queryKey: smartTextKeys.examMacros(),
    queryFn: async () => {
      const { data } = await api.get<ExamMacro[]>('/clinical-notes/exam-macros');
      return data;
    },
  });
}

export function useCreateExamMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExamMacroPayload) => {
      const { data } = await api.post<ExamMacro>('/clinical-notes/exam-macros', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.examMacros() });
    },
  });
}

export function useApplyExamMacro() {
  return useMutation({
    mutationFn: async (payload: ApplyExamMacroPayload) => {
      const { data } = await api.post<ApplyExamMacroResult>(
        '/clinical-notes/exam-macros/apply',
        payload,
      );
      return data;
    },
  });
}

// ─── Notes Utilities ─────────────────────────────────────────────────────────

export function useCompareNotes() {
  return useMutation({
    mutationFn: async (payload: CompareNotesPayload) => {
      const { data } = await api.post<CompareNotesResult>('/clinical-notes/diff', payload);
      return data;
    },
  });
}

export function useRequestInterconsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InterconsultationPayload) => {
      const { data } = await api.post<InterconsultationRecord>(
        '/clinical-notes/interconsultation',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.all });
    },
  });
}

export function useRespondInterconsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: RespondInterconsultationPayload & { id: string }) => {
      const { data } = await api.post<InterconsultationRecord>(
        `/clinical-notes/interconsultation/${id}/respond`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.all });
    },
  });
}

export function useCopyForwardNote() {
  return useMutation({
    mutationFn: async (payload: CopyForwardPayload) => {
      const { data } = await api.post<CopyForwardResult>('/clinical-notes/copy-forward', payload);
      return data;
    },
  });
}

export function useSignNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SignNotePayload) => {
      const { data } = await api.post<SignNoteResult>('/clinical-notes/signature', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartTextKeys.all });
    },
  });
}

export function useAttachMedia() {
  return useMutation({
    mutationFn: async (payload: AttachMediaPayload) => {
      const { data } = await api.post<AttachedMedia>('/clinical-notes/media', payload);
      return data;
    },
  });
}

export function useSaveAnatomicalDrawing() {
  return useMutation({
    mutationFn: async (payload: AnatomicalDrawingPayload) => {
      const { data } = await api.post<AnatomicalDrawingRecord>(
        '/clinical-notes/anatomical-drawing',
        payload,
      );
      return data;
    },
  });
}

export function useSpecialtyTemplates(params?: SpecialtyTemplatesParams) {
  return useQuery({
    queryKey: smartTextKeys.specialtyTemplates(params),
    queryFn: async () => {
      const { data } = await api.get<SpecialtyTemplate[]>('/clinical-notes/specialty-templates', {
        params,
      });
      return data;
    },
  });
}
