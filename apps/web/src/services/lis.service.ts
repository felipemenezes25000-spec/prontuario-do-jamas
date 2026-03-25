import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const lisKeys = {
  all: ['lis'] as const,
  worklist: () => [...lisKeys.all, 'worklist'] as const,
  samples: () => [...lisKeys.all, 'samples'] as const,
  sample: (id: string) => [...lisKeys.all, 'sample', id] as const,
  qcResults: () => [...lisKeys.all, 'qc'] as const,
  deltaChecks: () => [...lisKeys.all, 'delta-checks'] as const,
  autoReleaseRules: () => [...lisKeys.all, 'auto-release-rules'] as const,
  reflexRules: () => [...lisKeys.all, 'reflex-rules'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type SampleStatus = 'COLETADO' | 'RECEBIDO' | 'PROCESSANDO' | 'LIBERADO' | 'CANCELADO';

export interface WorklistItem {
  id: string;
  sampleBarcode: string;
  patientName: string;
  patientId: string;
  examName: string;
  examCode: string;
  status: SampleStatus;
  collectedAt: string;
  receivedAt: string | null;
  releasedAt: string | null;
  priority: 'ROTINA' | 'URGENTE';
  sector: string;
}

export interface Sample {
  id: string;
  barcode: string;
  patientName: string;
  patientId: string;
  collectedAt: string;
  collectedBy: string;
  material: string;
  exams: string[];
  status: SampleStatus;
  timeline: SampleEvent[];
}

export interface SampleEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

export interface QCResult {
  id: string;
  analyte: string;
  level: string;
  value: number;
  mean: number;
  sd: number;
  date: string;
  status: 'APROVADO' | 'ALERTA' | 'REPROVADO';
}

export interface DeltaCheckAlert {
  id: string;
  patientName: string;
  analyte: string;
  previousValue: number;
  currentValue: number;
  percentChange: number;
  flaggedAt: string;
  acknowledged: boolean;
}

export interface AutoReleaseRule {
  id: string;
  examCode: string;
  examName: string;
  minValue: number;
  maxValue: number;
  deltaPercent: number;
  enabled: boolean;
}

export interface ReflexRule {
  id: string;
  triggerAnalyte: string;
  condition: string;
  thresholdValue?: number;
  reflexTest: string;
  notes?: string;
  createdAt: string;
}

export interface AddOnRequest {
  id: string;
  barcode: string;
  testName: string;
  testCode: string;
  patientId: string;
  sampleAge: string;
  status: string;
  createdAt: string;
}

export interface PocResult {
  id: string;
  deviceType: string;
  deviceId: string;
  results: Array<{ analyte: string; value: string; unit?: string; flag?: string }>;
  criticalCount: number;
  criticalAnalytes: string[];
  createdAt: string;
}

export interface LabPanelInterpretation {
  documentId: string;
  patientId: string;
  totalResults: number;
  abnormalCount: number;
  abnormalAnalytes: string[];
  interpretations: string[];
  disclaimer: string;
}

export interface ResultPrediction {
  patientId: string;
  analyte: string;
  historicalValues: number[];
  predictedValue: number | null;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  confidence: number;
  message?: string;
  disclaimer: string;
}

export interface SwapDetectionResult {
  patientId: string;
  examResultId: string;
  swapSuspected: boolean;
  confidence: number;
  flags: string[];
  recommendation: string;
}

export interface RegisterSamplePayload {
  barcode: string;
  patientId: string;
  material: string;
  exams: string[];
  collectedBy: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useLisWorklist() {
  return useQuery({
    queryKey: lisKeys.worklist(),
    queryFn: async () => {
      const { data } = await api.get<WorklistItem[]>('/lis/worklist');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useLisSamples() {
  return useQuery({
    queryKey: lisKeys.samples(),
    queryFn: async () => {
      const { data } = await api.get<Sample[]>('/lis/samples');
      return data;
    },
  });
}

export function useLisSample(id: string) {
  return useQuery({
    queryKey: lisKeys.sample(id),
    queryFn: async () => {
      const { data } = await api.get<Sample>(`/lis/samples/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useQCResults() {
  return useQuery({
    queryKey: lisKeys.qcResults(),
    queryFn: async () => {
      const { data } = await api.get<QCResult[]>('/lis/qc/results');
      return data;
    },
  });
}

export function useDeltaChecks() {
  return useQuery({
    queryKey: lisKeys.deltaChecks(),
    queryFn: async () => {
      const { data } = await api.get<DeltaCheckAlert[]>('/lis/delta-checks');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAutoReleaseRules() {
  return useQuery({
    queryKey: lisKeys.autoReleaseRules(),
    queryFn: async () => {
      const { data } = await api.get<AutoReleaseRule[]>('/lis/auto-release-rules');
      return data;
    },
  });
}

export function useRegisterSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterSamplePayload) => {
      const { data } = await api.post('/lis/samples', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisKeys.all });
    },
  });
}

export function useUpdateSampleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SampleStatus }) => {
      const { data } = await api.patch(`/lis/samples/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisKeys.all });
    },
  });
}

export function useAcknowledgeDeltaCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/lis/delta-checks/${id}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisKeys.deltaChecks() });
    },
  });
}

// ─── Advanced LIS Hooks ──────────────────────────────────────────────────────

export function useReflexRules() {
  return useQuery({
    queryKey: lisKeys.reflexRules(),
    queryFn: async () => {
      const { data } = await api.get<ReflexRule[]>('/lis/reflex-rules');
      return data;
    },
  });
}

export function useCreateReflexRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { triggerAnalyte: string; condition: string; thresholdValue?: number; reflexTest: string; notes?: string }) => {
      const { data } = await api.post<ReflexRule>('/lis/reflex-rules', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisKeys.reflexRules() });
    },
  });
}

export function useRequestAddOn() {
  return useMutation({
    mutationFn: async (payload: { barcode: string; testName: string; testCode: string; patientId: string; encounterId?: string; justification?: string }) => {
      const { data } = await api.post<AddOnRequest>('/lis/add-on', payload);
      return data;
    },
  });
}

export function useRecordPocResult() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; encounterId?: string; deviceType: string; deviceId: string; operatorId: string; results: Array<{ analyte: string; value: string; unit?: string; flag?: string; referenceMin?: number; referenceMax?: number }>; notes?: string }) => {
      const { data } = await api.post<PocResult>('/lis/poc-results', payload);
      return data;
    },
  });
}

export function useInterpretLabPanel() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; encounterId?: string; results: Array<{ analyte: string; value: string; unit?: string; referenceMin?: number; referenceMax?: number; flag?: string }>; clinicalContext?: string }) => {
      const { data } = await api.post<LabPanelInterpretation>('/lis/ai/interpret-panel', payload);
      return data;
    },
  });
}

export function usePredictResult() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; analyte: string; clinicalContext?: string }) => {
      const { data } = await api.post<ResultPrediction>('/lis/ai/predict-result', payload);
      return data;
    },
  });
}

export function useDetectSampleSwap() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; examResultId: string; includeDemographicCheck?: boolean }) => {
      const { data } = await api.post<SwapDetectionResult>('/lis/ai/detect-swap', payload);
      return data;
    },
  });
}

// ─── AI Critical Value Prediction ─────────────────────────────────────────────

export interface CriticalValuePrediction {
  patientId: string;
  analyte: string;
  currentValue: number;
  predictedCritical: boolean;
  probability: number;
  timeToThresholdHours: number | null;
  recommendation: string;
  disclaimer: string;
}

export function usePredictCriticalValue() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; analyte: string; currentValue: number; clinicalContext?: string }) => {
      const { data } = await api.post<CriticalValuePrediction>('/lis/ai/predict-critical', payload);
      return data;
    },
  });
}

// ─── AI Sample Rejection Prediction ───────────────────────────────────────────

export interface SampleRejectionPrediction {
  sampleId: string;
  rejectionProbability: number;
  likelyReasons: string[];
  recommendation: string;
  disclaimer: string;
}

export function usePredictSampleRejection() {
  return useMutation({
    mutationFn: async (payload: { sampleId: string; material: string; collectionMethod?: string; transportTimeMinutes?: number; temperature?: number }) => {
      const { data } = await api.post<SampleRejectionPrediction>('/lis/ai/predict-rejection', payload);
      return data;
    },
  });
}

// ─── AI TAT (Turnaround Time) Prediction ──────────────────────────────────────

export interface TatPrediction {
  examCode: string;
  estimatedMinutes: number;
  percentile90Minutes: number;
  bottleneck: string | null;
  recommendation: string;
  disclaimer: string;
}

export function usePredictTat() {
  return useMutation({
    mutationFn: async (payload: { examCode: string; priority: 'ROTINA' | 'URGENTE'; currentQueueSize?: number }) => {
      const { data } = await api.post<TatPrediction>('/lis/ai/predict-tat', payload);
      return data;
    },
  });
}
