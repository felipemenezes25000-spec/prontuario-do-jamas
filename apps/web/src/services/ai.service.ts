import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  AISOAPResponse,
  AIPrescriptionParseResponse,
  AITriageSuggestion,
  AICopilotResponse,
  AIPatientSummaryResponse,
  AICodingSuggestion,
  TranscriptionContext,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const aiKeys = {
  all: ['ai'] as const,
  patientSummary: (patientId: string) => [...aiKeys.all, 'patient-summary', patientId] as const,
  codingSuggestions: (encounterId: string) =>
    [...aiKeys.all, 'coding-suggestions', encounterId] as const,
};

// ============================================================================
// SOAP Generation
// ============================================================================

export function useGenerateSOAP() {
  return useMutation({
    mutationFn: async ({
      encounterId,
      transcription,
      context,
    }: {
      encounterId: string;
      transcription: string;
      context?: TranscriptionContext;
    }) => {
      const { data } = await api.post<AISOAPResponse>('/ai/soap/generate', {
        encounterId,
        transcription,
        context,
      });
      return data;
    },
  });
}

// TODO: Backend needs POST /ai/soap/refine endpoint
export function useRefineSOAP() {
  return useMutation({
    mutationFn: async ({
      encounterId,
      currentNote,
      instruction,
    }: {
      encounterId: string;
      currentNote: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
      };
      instruction: string;
    }) => {
      const { data } = await api.post<AISOAPResponse>('/ai/soap/refine', {
        encounterId,
        currentNote,
        instruction,
      });
      return data;
    },
  });
}

// ============================================================================
// Prescription Parsing
// ============================================================================

export function useParsePrescription() {
  return useMutation({
    mutationFn: async ({
      transcription,
      patientId,
    }: {
      transcription: string;
      patientId: string;
    }) => {
      const { data } = await api.post<AIPrescriptionParseResponse>('/ai/prescription/parse-voice', {
        transcription,
        patientId,
      });
      return data;
    },
  });
}

export function useCheckPrescriptionSafety() {
  return useMutation({
    mutationFn: async ({
      patientId,
      items,
    }: {
      patientId: string;
      items: Array<{ medicationName?: string; dose?: string; route?: string; frequency?: string }>;
    }) => {
      const { data } = await api.post<{
        alerts: string[];
        interactions: unknown[];
        allergyConflicts: unknown[];
      }>('/ai/prescription/check-safety', { patientId, items });
      return data;
    },
  });
}

// ============================================================================
// Triage AI
// ============================================================================

export function useSuggestTriage() {
  return useMutation({
    mutationFn: async ({
      chiefComplaint,
      vitalSigns,
      symptoms,
    }: {
      chiefComplaint: string;
      vitalSigns?: Record<string, number>;
      symptoms?: string[];
    }) => {
      const { data } = await api.post<AITriageSuggestion>('/ai/triage/classify', {
        chiefComplaint,
        vitalSigns,
        symptoms,
      });
      return data;
    },
  });
}

// ============================================================================
// Copilot (inline suggestions)
// ============================================================================

export function useCopilotSuggestion() {
  return useMutation({
    mutationFn: async ({
      encounterId,
      context,
      currentText,
      field,
    }: {
      encounterId: string;
      context: TranscriptionContext;
      currentText: string;
      field: string;
    }) => {
      const { data } = await api.post<AICopilotResponse>('/ai/copilot/suggestions', {
        encounterId,
        context,
        currentText,
        field,
      });
      return data;
    },
  });
}

// TODO: Backend needs POST /ai/copilot/autocomplete endpoint
export function useCopilotAutoComplete() {
  return useMutation({
    mutationFn: async ({
      text,
      context,
    }: {
      text: string;
      context: TranscriptionContext;
    }) => {
      const { data } = await api.post<{ completion: string; confidence: number }>(
        '/ai/copilot/autocomplete',
        { text, context },
      );
      return data;
    },
  });
}

// ============================================================================
// Exam Request Parsing (BLOCO 4)
// ============================================================================

export function useParseExamRequest() {
  return useMutation({
    mutationFn: async ({
      text,
      encounterId,
      patientId,
      clinicalIndication,
    }: {
      text: string;
      encounterId?: string;
      patientId?: string;
      clinicalIndication?: string;
    }) => {
      const { data } = await api.post<{
        items: Array<{
          examName: string;
          examType: string;
          tussCode?: string;
          urgency: string;
          clinicalIndication?: string;
          confidence: number;
        }>;
        suggestedIndication: string;
      }>('/ai/exam/parse-voice', { text, encounterId, patientId, clinicalIndication });
      return data;
    },
  });
}

// ============================================================================
// Certificate Parsing (BLOCO 5)
// ============================================================================

export function useParseCertificate() {
  return useMutation({
    mutationFn: async ({
      text,
      encounterId,
      patientId,
    }: {
      text: string;
      encounterId?: string;
      patientId?: string;
    }) => {
      const { data } = await api.post<{
        days: number;
        cidCode?: string;
        cidDescription?: string;
        justification: string;
        certificateType: string;
        restrictions?: string;
        confidence: number;
      }>('/ai/certificate/parse-voice', { text, encounterId, patientId });
      return data;
    },
  });
}

// ============================================================================
// Referral Parsing (BLOCO 6)
// ============================================================================

export function useParseReferral() {
  return useMutation({
    mutationFn: async ({
      text,
      encounterId,
      patientId,
    }: {
      text: string;
      encounterId?: string;
      patientId?: string;
    }) => {
      const { data } = await api.post<{
        specialty: string;
        reason: string;
        urgency: string;
        cidCode?: string;
        clinicalSummary?: string;
        questionsForSpecialist?: string;
        confidence: number;
      }>('/ai/referral/parse-voice', { text, encounterId, patientId });
      return data;
    },
  });
}

// ============================================================================
// Vitals Parsing (BLOCO 10)
// ============================================================================

export function useParseVitals() {
  return useMutation({
    mutationFn: async ({
      text,
      encounterId,
      patientId,
    }: {
      text: string;
      encounterId?: string;
      patientId?: string;
    }) => {
      const { data } = await api.post<{
        systolicBP?: number;
        diastolicBP?: number;
        heartRate?: number;
        respiratoryRate?: number;
        temperature?: number;
        oxygenSaturation?: number;
        gcs?: number;
        painScale?: number;
        painLocation?: string;
        weight?: number;
        height?: number;
        glucoseLevel?: number;
        confidence: number;
        summary: string;
      }>('/ai/vitals/parse-voice', { text, encounterId, patientId });
      return data;
    },
  });
}

// ============================================================================
// Discharge Parsing (BLOCO 11)
// ============================================================================

export function useParseDischarge() {
  return useMutation({
    mutationFn: async ({
      text,
      encounterId,
      patientId,
    }: {
      text: string;
      encounterId?: string;
      patientId?: string;
    }) => {
      const { data } = await api.post<{
        dischargeType: string;
        condition: string;
        followUpDays?: number;
        instructions: string;
        followUpSpecialty?: string;
        warningSignals?: string[];
        homeMedications?: string[];
        restrictions?: string[];
        confidence: number;
      }>('/ai/discharge/parse-voice', { text, encounterId, patientId });
      return data;
    },
  });
}

// ============================================================================
// Patient Summary
// ============================================================================

export function usePatientAISummary(patientId: string) {
  return useQuery({
    queryKey: aiKeys.patientSummary(patientId),
    queryFn: async () => {
      const { data } = await api.post<AIPatientSummaryResponse>(
        '/ai/patient/summary',
        { patientId },
      );
      return data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useGeneratePatientSummary() {
  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data } = await api.post<AIPatientSummaryResponse>(
        '/ai/patient/summary',
        { patientId },
      );
      return data;
    },
  });
}

// ============================================================================
// Coding Suggestions (ICD / procedure codes)
// TODO: Backend needs GET /ai/encounters/:id/coding-suggestions endpoint
// ============================================================================

export function useCodingSuggestions(encounterId: string) {
  return useQuery({
    queryKey: aiKeys.codingSuggestions(encounterId),
    queryFn: async () => {
      const { data } = await api.get<AICodingSuggestion[]>(
        `/ai/encounters/${encounterId}/coding-suggestions`,
      );
      return data;
    },
    enabled: !!encounterId,
    staleTime: 10 * 60 * 1000,
  });
}

// TODO: Backend needs POST /ai/encounters/:id/coding-suggestions/generate endpoint
export function useGenerateCodingSuggestions() {
  return useMutation({
    mutationFn: async ({
      encounterId,
      clinicalText,
    }: {
      encounterId: string;
      clinicalText: string;
    }) => {
      const { data } = await api.post<AICodingSuggestion[]>(
        `/ai/encounters/${encounterId}/coding-suggestions/generate`,
        { clinicalText },
      );
      return data;
    },
  });
}

// ============================================================================
// Encounter Summary (AI-generated summary)
// TODO: Backend needs POST /ai/encounters/:id/summary/generate endpoint
// ============================================================================

export function useGenerateEncounterSummary() {
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post<{ summary: string; confidence: number }>(
        `/ai/encounters/${encounterId}/summary/generate`,
      );
      return data;
    },
  });
}

// ============================================================================
// Nursing AI Suggestions
// TODO: Backend needs POST /ai/nursing/suggest-diagnoses endpoint
// ============================================================================

export function useSuggestNursingDiagnoses() {
  return useMutation({
    mutationFn: async ({
      patientId,
      dataCollectionNotes,
    }: {
      patientId: string;
      dataCollectionNotes: string;
    }) => {
      const { data } = await api.post<{
        diagnoses: Array<{
          nandaCode: string;
          nandaTitle: string;
          confidence: number;
          relatedFactors: string[];
        }>;
      }>('/ai/nursing/suggest-diagnoses', { patientId, dataCollectionNotes });
      return data;
    },
  });
}

// ============================================================================
// Discharge Planning AI
// TODO: Backend needs POST /ai/admissions/:id/discharge-plan endpoint
// ============================================================================

export function useSuggestDischargePlan() {
  return useMutation({
    mutationFn: async (admissionId: string) => {
      const { data } = await api.post<{
        plan: string;
        instructions: string[];
        medications: string[];
        followUpRecommendations: string[];
      }>(`/ai/admissions/${admissionId}/discharge-plan`);
      return data;
    },
  });
}
