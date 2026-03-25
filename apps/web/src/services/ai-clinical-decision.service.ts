import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface DifferentialDiagnosisItem {
  rank: number;
  diagnosis: string;
  icdCode: string;
  probability: number;
  evidence: string[];
  citationUrls: string[];
  recommendedWorkup: string[];
  redFlags: string[];
}

export interface DifferentialDiagnosisResult {
  id: string;
  patientId: string | null;
  symptoms: string[];
  age: number | null;
  sex: string | null;
  comorbidities: string[];
  diagnoses: DifferentialDiagnosisItem[];
  generatedAt: string;
  modelVersion: string;
}

export type ClinicalCalculatorId =
  | 'CHADS2_VASC'
  | 'WELLS_DVT'
  | 'WELLS_PE'
  | 'CURB65'
  | 'MELD'
  | 'CHILD_PUGH'
  | 'APACHE_II'
  | 'GLASGOW'
  | 'NIHSS'
  | 'FRAMINGHAM';

export interface CalculatorField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select';
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
}

export interface ClinicalCalculatorDef {
  id: ClinicalCalculatorId;
  name: string;
  description: string;
  category: string;
  fields: CalculatorField[];
  references: string[];
}

export interface CalculatorResult {
  calculatorId: ClinicalCalculatorId;
  score: number;
  maxScore: number;
  interpretation: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recommendation: string;
}

export type RiskType = 'SEPSIS' | 'FALL' | 'READMISSION' | 'MORTALITY' | 'DETERIORATION';

export interface PredictiveAlert {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  riskType: RiskType;
  riskScore: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  lastUpdated: string;
  factors: string[];
  suggestedActions: string[];
}

export interface RiskTimelinePoint {
  timestamp: string;
  score: number;
}

export interface RiskTimeline {
  patientId: string;
  riskType: RiskType;
  points: RiskTimelinePoint[];
}

export interface ProtocolStep {
  order: number;
  title: string;
  description: string;
  isCompleted: boolean;
  timeframeMinutes: number | null;
  orderSetItems: string[];
}

export interface ProtocolRecommendation {
  id: string;
  protocolName: string;
  diagnosis: string;
  confidence: number;
  pathway: ProtocolStep[];
  expectedOutcomes: string[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  source: string;
  lastUpdated: string;
}

export type InteractionSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: InteractionSeverity;
  description: string;
  mechanism: string;
  clinicalEffect: string;
  management: string;
  alternatives: string[];
  references: string[];
}

export interface DrugInteractionCheckResult {
  id: string;
  medications: string[];
  interactions: DrugInteraction[];
  checkedAt: string;
  totalCritical: number;
  totalMajor: number;
  totalModerate: number;
  totalMinor: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const aiClinicalDecisionKeys = {
  all: ['ai-clinical-decision'] as const,
  ddx: (symptoms: string[]) =>
    [...aiClinicalDecisionKeys.all, 'ddx', symptoms] as const,
  calculators: () =>
    [...aiClinicalDecisionKeys.all, 'calculators'] as const,
  calculatorResult: (id: ClinicalCalculatorId) =>
    [...aiClinicalDecisionKeys.all, 'calculator-result', id] as const,
  predictiveAlerts: (filters?: Record<string, unknown>) =>
    [...aiClinicalDecisionKeys.all, 'predictive-alerts', filters] as const,
  riskTimeline: (patientId: string, riskType: RiskType) =>
    [...aiClinicalDecisionKeys.all, 'risk-timeline', patientId, riskType] as const,
  protocols: (diagnosis: string) =>
    [...aiClinicalDecisionKeys.all, 'protocols', diagnosis] as const,
  drugInteractions: (medications: string[]) =>
    [...aiClinicalDecisionKeys.all, 'drug-interactions', medications] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useDifferentialDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      symptoms: string[];
      age?: number;
      sex?: string;
      comorbidities?: string[];
      patientId?: string;
    }) => {
      const { data } = await api.post<DifferentialDiagnosisResult>(
        '/ai/clinical-decision/differential-diagnosis',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiClinicalDecisionKeys.all });
    },
  });
}

export function useClinicalCalculators() {
  return useQuery({
    queryKey: aiClinicalDecisionKeys.calculators(),
    queryFn: async () => {
      const { data } = await api.get<ClinicalCalculatorDef[]>(
        '/ai/clinical-decision/calculators',
      );
      return data;
    },
  });
}

export function useCalculateScore() {
  return useMutation({
    mutationFn: async (payload: {
      calculatorId: ClinicalCalculatorId;
      values: Record<string, unknown>;
      patientId?: string;
    }) => {
      const { data } = await api.post<CalculatorResult>(
        '/ai/clinical-decision/calculate',
        payload,
      );
      return data;
    },
  });
}

export function usePredictiveAlerts(filters?: { riskType?: RiskType; ward?: string }) {
  return useQuery({
    queryKey: aiClinicalDecisionKeys.predictiveAlerts(filters),
    queryFn: async () => {
      const { data } = await api.get<PredictiveAlert[]>(
        '/ai/clinical-decision/predictive-alerts',
        { params: filters },
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAiRiskTimeline(patientId: string, riskType: RiskType) {
  return useQuery({
    queryKey: aiClinicalDecisionKeys.riskTimeline(patientId, riskType),
    queryFn: async () => {
      const { data } = await api.get<RiskTimeline>(
        `/ai/clinical-decision/risk-timeline/${patientId}`,
        { params: { riskType } },
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useProtocolRecommendation() {
  return useMutation({
    mutationFn: async (payload: {
      diagnosis: string;
      patientId?: string;
      comorbidities?: string[];
    }) => {
      const { data } = await api.post<ProtocolRecommendation[]>(
        '/ai/clinical-decision/protocol-recommendation',
        payload,
      );
      return data;
    },
  });
}

export function useDrugInteractionCheck() {
  return useMutation({
    mutationFn: async (payload: { medications: string[] }) => {
      const { data } = await api.post<DrugInteractionCheckResult>(
        '/ai/clinical-decision/drug-interactions',
        payload,
      );
      return data;
    },
  });
}
