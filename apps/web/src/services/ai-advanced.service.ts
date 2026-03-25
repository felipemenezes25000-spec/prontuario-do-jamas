import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface OrganSystemHealth {
  system: string;
  label: string;
  status: 'green' | 'yellow' | 'red';
  score: number;
  details: string;
}

export interface DigitalTwinModel {
  patientId: string;
  patientName: string;
  age: number;
  organSystems: OrganSystemHealth[];
  riskFactors: string[];
  predictedOutcomes: Array<{
    condition: string;
    probability: number;
    timeframe: string;
  }>;
  lastUpdated: string;
}

export interface TreatmentSimulationRequest {
  patientId: string;
  drugName: string;
  dose: string;
  duration: string;
}

export interface TreatmentSimulationResult {
  drugName: string;
  projectedEfficacy: number;
  sideEffectRisk: number;
  interactions: string[];
  organImpact: Array<{
    system: string;
    effect: 'positive' | 'neutral' | 'negative';
    magnitude: number;
    description: string;
  }>;
  recommendation: string;
}

export interface MetabolizerProfile {
  gene: string;
  genotype: string;
  phenotype: 'poor' | 'intermediate' | 'extensive' | 'ultra-rapid';
  affectedDrugs: Array<{
    drug: string;
    recommendation: string;
    adjustedDose: string;
    evidenceLevel: string;
  }>;
}

export interface PharmacogenomicsPanel {
  patientId: string;
  testDate: string;
  profiles: MetabolizerProfile[];
  summary: string;
}

export interface TumorMutation {
  gene: string;
  variant: string;
  type: string;
  vaf: number;
  actionable: boolean;
  evidenceLevel: 'I' | 'II' | 'III' | 'IV';
  targetedTherapies: Array<{
    drug: string;
    approvalStatus: string;
    evidenceLevel: string;
    trialId?: string;
  }>;
}

export interface OncogenomicsProfile {
  patientId: string;
  tumorType: string;
  sampleDate: string;
  tmb: number;
  msi: string;
  mutations: TumorMutation[];
  clinicalTrials: Array<{
    id: string;
    title: string;
    phase: string;
    status: string;
    eligibilityMatch: number;
  }>;
}

export interface BIQueryRequest {
  question: string;
}

export interface BIQueryResponse {
  id: string;
  question: string;
  sql: string;
  answer: string;
  chartType: 'bar' | 'line' | 'pie' | 'table' | 'number';
  chartData: Array<Record<string, string | number>>;
  executedAt: string;
}

export interface BIQueryHistory {
  id: string;
  question: string;
  chartType: string;
  executedAt: string;
  isFavorite: boolean;
}

export interface MultimodalAnalysisRequest {
  clinicalText?: string;
  labResults?: string;
  imagingNotes?: string;
  additionalContext?: string;
}

export interface MultimodalAnalysisResult {
  id: string;
  interpretation: string;
  keyFindings: Array<{
    category: string;
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
  }>;
  suggestedActions: string[];
  confidenceScore: number;
  createdAt: string;
}

export interface HealthCoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HealthCoachGoal {
  id: string;
  title: string;
  description: string;
  category: 'medication' | 'lifestyle' | 'nutrition' | 'exercise' | 'monitoring';
  progress: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
}

export interface HealthCoachProfile {
  patientId: string;
  goals: HealthCoachGoal[];
  reminders: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    active: boolean;
  }>;
  recentMessages: HealthCoachMessage[];
  recommendations: string[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const aiAdvancedKeys = {
  all: ['ai-advanced'] as const,
  digitalTwin: (patientId: string) => [...aiAdvancedKeys.all, 'digital-twin', patientId] as const,
  pharmacogenomics: (patientId: string) => [...aiAdvancedKeys.all, 'pharmacogenomics', patientId] as const,
  oncogenomics: (patientId: string) => [...aiAdvancedKeys.all, 'oncogenomics', patientId] as const,
  biHistory: () => [...aiAdvancedKeys.all, 'bi-history'] as const,
  multimodalHistory: () => [...aiAdvancedKeys.all, 'multimodal-history'] as const,
  healthCoach: (patientId: string) => [...aiAdvancedKeys.all, 'health-coach', patientId] as const,
};

// ============================================================================
// Hooks — Digital Twin
// ============================================================================

export function useDigitalTwin(patientId: string) {
  return useQuery({
    queryKey: aiAdvancedKeys.digitalTwin(patientId),
    queryFn: async () => {
      const { data } = await api.get<DigitalTwinModel>(
        `/ai/digital-twin/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useTreatmentSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TreatmentSimulationRequest) => {
      const { data } = await api.post<TreatmentSimulationResult>(
        '/ai/digital-twin/simulate',
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: aiAdvancedKeys.digitalTwin(variables.patientId) });
    },
  });
}

// ============================================================================
// Hooks — Pharmacogenomics
// ============================================================================

export function usePharmacogenomics(patientId: string) {
  return useQuery({
    queryKey: aiAdvancedKeys.pharmacogenomics(patientId),
    queryFn: async () => {
      const { data } = await api.get<PharmacogenomicsPanel>(
        `/ai/pharmacogenomics/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

// ============================================================================
// Hooks — Oncogenomics
// ============================================================================

export function useOncogenomics(patientId: string) {
  return useQuery({
    queryKey: aiAdvancedKeys.oncogenomics(patientId),
    queryFn: async () => {
      const { data } = await api.get<OncogenomicsProfile>(
        `/ai/oncogenomics/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

// ============================================================================
// Hooks — Conversational BI
// ============================================================================

export function useConversationalBI() {
  return useQuery({
    queryKey: aiAdvancedKeys.biHistory(),
    queryFn: async () => {
      const { data } = await api.get<BIQueryHistory[]>('/ai/bi/history');
      return data;
    },
  });
}

export function useBIQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BIQueryRequest) => {
      const { data } = await api.post<BIQueryResponse>('/ai/bi/query', payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiAdvancedKeys.biHistory() });
    },
  });
}

export function useToggleBIFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (queryId: string) => {
      const { data } = await api.patch<BIQueryHistory>(`/ai/bi/history/${queryId}/favorite`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiAdvancedKeys.biHistory() });
    },
  });
}

// ============================================================================
// Hooks — Multimodal Analysis
// ============================================================================

export function useMultimodalAnalysis() {
  return useMutation({
    mutationFn: async (payload: MultimodalAnalysisRequest) => {
      const { data } = await api.post<MultimodalAnalysisResult>(
        '/ai/multimodal/analyze',
        payload,
      );
      return data;
    },
  });
}

// ============================================================================
// Hooks — Health Coach
// ============================================================================

export function useHealthCoach(patientId: string) {
  return useQuery({
    queryKey: aiAdvancedKeys.healthCoach(patientId),
    queryFn: async () => {
      const { data } = await api.get<HealthCoachProfile>(
        `/ai/health-coach/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useHealthCoachChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; message: string }) => {
      const { data } = await api.post<HealthCoachMessage>(
        `/ai/health-coach/${payload.patientId}/chat`,
        { message: payload.message },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: aiAdvancedKeys.healthCoach(variables.patientId) });
    },
  });
}
