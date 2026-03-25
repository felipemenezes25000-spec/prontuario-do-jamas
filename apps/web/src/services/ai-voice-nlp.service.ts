import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  id: string;
  text: string;
  language: string;
  confidence: number;
  duration: number;
  segments: TranscriptionSegment[];
  createdAt: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface SOAPNote {
  id: string;
  encounterId: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  highlightedTerms: HighlightedTerm[];
  createdAt: string;
}

export interface HighlightedTerm {
  term: string;
  category: 'medication' | 'diagnosis' | 'procedure' | 'anatomy' | 'lab';
  startIndex: number;
  endIndex: number;
}

export interface AmbientSession {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  duration: number;
  segments: AmbientSegment[];
  generatedNote: string | null;
}

export interface AmbientSegment {
  id: string;
  speaker: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
  text: string;
  timestamp: number;
}

export interface ExtractedEntity {
  type: 'medication' | 'diagnosis' | 'allergy' | 'procedure' | 'vital';
  text: string;
  normalized: string;
  code: string | null;
  details: Record<string, string>;
  startIndex: number;
  endIndex: number;
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  originalText: string;
}

export interface PatientSummary {
  patientId: string;
  patientName: string;
  activeProblems: string[];
  medications: SummaryMedication[];
  allergies: string[];
  recentResults: SummaryResult[];
  upcomingAppointments: SummaryAppointment[];
  professionalVersion: string;
  patientVersion: string;
  generatedAt: string;
}

export interface SummaryMedication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
}

export interface SummaryResult {
  name: string;
  value: string;
  date: string;
  status: 'normal' | 'abnormal' | 'critical';
}

export interface SummaryAppointment {
  specialty: string;
  date: string;
  provider: string;
}

export interface AutocompleteResult {
  suggestions: string[];
  context: string;
}

export interface TranslationResult {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  terminology: TranslationTerm[];
  createdAt: string;
}

export interface TranslationTerm {
  source: string;
  translated: string;
  category: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const aiVoiceNlpKeys = {
  all: ['ai-voice-nlp'] as const,
  transcriptions: () => [...aiVoiceNlpKeys.all, 'transcriptions'] as const,
  soapNotes: () => [...aiVoiceNlpKeys.all, 'soap-notes'] as const,
  ambientSessions: () => [...aiVoiceNlpKeys.all, 'ambient-sessions'] as const,
  ambientSession: (id: string) => [...aiVoiceNlpKeys.all, 'ambient-session', id] as const,
  patientSummary: (patientId: string) => [...aiVoiceNlpKeys.all, 'patient-summary', patientId] as const,
  translations: () => [...aiVoiceNlpKeys.all, 'translations'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useVoiceTranscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      audioBlob: Blob;
      language: string;
      specialty: string;
    }) => {
      const formData = new FormData();
      formData.append('audio', dto.audioBlob, 'recording.webm');
      formData.append('language', dto.language);
      formData.append('specialty', dto.specialty);
      const { data } = await api.post<TranscriptionResult>('/ai/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.transcriptions() });
    },
  });
}

export function useSOAPGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      transcriptionText: string;
      specialty: string;
      encounterId?: string;
    }) => {
      const { data } = await api.post<SOAPNote>('/ai/nlp/soap-generate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.soapNotes() });
    },
  });
}

export function useAmbientSession() {
  const qc = useQueryClient();

  const start = useMutation({
    mutationFn: async (dto: { encounterId?: string }) => {
      const { data } = await api.post<AmbientSession>('/ai/ambient/start', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.ambientSessions() });
    },
  });

  const pause = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.patch<AmbientSession>(`/ai/ambient/${sessionId}/pause`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.ambientSessions() });
    },
  });

  const resume = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.patch<AmbientSession>(`/ai/ambient/${sessionId}/resume`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.ambientSessions() });
    },
  });

  const stop = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.patch<AmbientSession>(`/ai/ambient/${sessionId}/stop`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.ambientSessions() });
    },
  });

  const generateNote = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<{ note: string }>(`/ai/ambient/${sessionId}/generate-note`);
      return data;
    },
  });

  return { start, pause, resume, stop, generateNote };
}

export function useAmbientSessionData(sessionId: string) {
  return useQuery({
    queryKey: aiVoiceNlpKeys.ambientSession(sessionId),
    queryFn: async () => {
      const { data } = await api.get<AmbientSession>(`/ai/ambient/${sessionId}`);
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });
}

export function useEntityExtraction() {
  return useMutation({
    mutationFn: async (dto: { text: string; language?: string }) => {
      const { data } = await api.post<EntityExtractionResult>('/ai/nlp/extract-entities', dto);
      return data;
    },
  });
}

export function usePatientSummary(patientId: string) {
  return useQuery({
    queryKey: aiVoiceNlpKeys.patientSummary(patientId),
    queryFn: async () => {
      const { data } = await api.get<PatientSummary>(`/ai/nlp/patient-summary/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useGeneratePatientSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data } = await api.post<PatientSummary>(`/ai/nlp/patient-summary/${patientId}/generate`);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.patientSummary(data.patientId) });
    },
  });
}

export function useClinicalAutocomplete() {
  return useMutation({
    mutationFn: async (dto: {
      text: string;
      cursorPosition: number;
      specialty: string;
      verbosity: 'concise' | 'standard' | 'detailed';
      language: string;
    }) => {
      const { data } = await api.post<AutocompleteResult>('/ai/nlp/autocomplete', dto);
      return data;
    },
  });
}

export function useMedicalTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
    }) => {
      const { data } = await api.post<TranslationResult>('/ai/nlp/translate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiVoiceNlpKeys.translations() });
    },
  });
}
