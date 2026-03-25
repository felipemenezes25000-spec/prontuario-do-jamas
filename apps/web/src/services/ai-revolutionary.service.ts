import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface DifferentialDiagnosis {
  diagnosis: string;
  icdCode: string;
  probability: number;
  reasoning: string;
  supportingEvidence?: string[];
  suggestedWorkup?: string[];
}

export interface DifferentialResponse {
  differentials: DifferentialDiagnosis[];
  redFlags?: string[];
  cannotExclude?: string[];
  aiModel: string;
}

export interface PathwayStep {
  order: number;
  phase: string;
  action: string;
  timeframe?: string;
  responsible?: string;
  evidenceLevel?: string;
}

export interface ClinicalPathwayResponse {
  diagnosisCode: string;
  diagnosisName: string;
  steps: PathwayStep[];
  guidelineSource?: string;
  expectedOutcomes?: string[];
  aiModel: string;
}

export interface EcgInterpretation {
  rhythm: string;
  heartRate: number;
  axis?: string;
  findings: string[];
  impression: string;
  isNormal: boolean;
  urgency?: string;
  confidence?: number;
}

export interface MortalityPrediction {
  patientId: string;
  riskScore: number;
  riskLevel: string;
  contributingFactors: string[];
  suggestedInterventions?: string[];
  palliativeCareRecommended?: boolean;
}

export interface ConversationalBiResponse {
  question: string;
  answer: string;
  chartType?: string;
  chartData?: Record<string, unknown>[];
  summary?: string;
}

export interface InboxManagement {
  totalMessages: number;
  triaged: number;
  urgent?: Array<{ messageId: string; patientName: string; subject: string; urgencyReason: string; suggestedResponse: string }>;
  routine?: Array<{ messageId: string; patientName: string; subject: string; suggestedResponse: string }>;
  informational?: Array<{ messageId: string; patientName: string; subject: string }>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useDiagnosisDifferential() {
  return useMutation({
    mutationFn: async (payload: { clinicalText: string; age?: number; gender?: string; comorbidities?: string[] }) => {
      const { data } = await api.post<DifferentialResponse>('/ai/revolutionary/diagnosis-differential', payload);
      return data;
    },
  });
}

export function useClinicalPathway() {
  return useMutation({
    mutationFn: async (payload: { diagnosisCode: string; severity?: string }) => {
      const { data } = await api.post<ClinicalPathwayResponse>('/ai/revolutionary/clinical-pathway', payload);
      return data;
    },
  });
}

export function useEcgInterpretation() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; ecgData?: string; clinicalIndication?: string }) => {
      const { data } = await api.post<EcgInterpretation>('/ai/revolutionary/ecg-interpretation', payload);
      return data;
    },
  });
}

export function useMortalityPrediction() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; admissionId?: string }) => {
      const { data } = await api.post<MortalityPrediction>('/ai/revolutionary/mortality-prediction', payload);
      return data;
    },
  });
}

export function useConversationalBi() {
  return useMutation({
    mutationFn: async (payload: { question: string; startDate?: string; endDate?: string }) => {
      const { data } = await api.post<ConversationalBiResponse>('/ai/revolutionary/conversational-bi', payload);
      return data;
    },
  });
}

export function useDigitalTwin() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; scenario?: string; treatmentOptions?: string[] }) => {
      const { data } = await api.post('/ai/revolutionary/digital-twin', payload);
      return data;
    },
  });
}

export function useMultimodalAnalysis() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; clinicalText?: string; imageUrls?: string[]; labSummary?: string; voiceTranscript?: string }) => {
      const { data } = await api.post('/ai/revolutionary/multimodal-analysis', payload);
      return data;
    },
  });
}

export function useAutonomousCoding() {
  return useMutation({
    mutationFn: async (payload: { encounterId: string; autoSubmit?: boolean }) => {
      const { data } = await api.post('/ai/revolutionary/autonomous-coding', payload);
      return data;
    },
  });
}

export function useInboxManagement() {
  return useMutation({
    mutationFn: async (payload?: { userId?: string; limit?: number }) => {
      const { data } = await api.post<InboxManagement>('/ai/revolutionary/inbox-management', payload ?? {});
      return data;
    },
  });
}

export function usePriorAuthorization() {
  return useMutation({
    mutationFn: async (payload: { encounterId: string; procedureCodes: string[]; insurancePlanId?: string }) => {
      const { data } = await api.post('/ai/revolutionary/prior-authorization', payload);
      return data;
    },
  });
}

export function useIntelligentReferral() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; specialty?: string; clinicalReason?: string }) => {
      const { data } = await api.post('/ai/revolutionary/intelligent-referral', payload);
      return data;
    },
  });
}

export function usePostVisitFollowup() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; encounterId: string; questions?: string[] }) => {
      const { data } = await api.post('/ai/revolutionary/post-visit-followup', payload);
      return data;
    },
  });
}

export function useGenomicsTreatment() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; variants?: string[]; diagnosis?: string }) => {
      const { data } = await api.post('/ai/revolutionary/genomics-treatment', payload);
      return data;
    },
  });
}

export function useDigitalPathology() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; slideUrl?: string; tissueType?: string }) => {
      const { data } = await api.post('/ai/revolutionary/digital-pathology', payload);
      return data;
    },
  });
}
