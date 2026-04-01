import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const lisSampleTrackingKeys = {
  all: ['lis-sample-tracking'] as const,
  phlebotomyWorklist: (params?: PhlebotomyWorklistParams) =>
    [...lisSampleTrackingKeys.all, 'phlebotomy-worklist', params] as const,
  referenceRanges: (params?: ReferenceRangesParams) =>
    [...lisSampleTrackingKeys.all, 'reference-ranges', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface CollectSamplePayload {
  patientId: string;
  encounterId?: string;
  material: string;
  exams: string[];
  collectedBy: string;
  collectionSite?: string;
  notes?: string;
}

export interface CollectedSample {
  id: string;
  barcode: string;
  patientId: string;
  material: string;
  exams: string[];
  collectedBy: string;
  collectedAt: string;
  status: 'COLLECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'PROCESSING' | 'RELEASED' | 'CANCELLED';
}

export interface PhlebotomyWorklistParams {
  sector?: string;
  priority?: 'ROTINA' | 'URGENTE';
  date?: string;
}

export interface PhlebotomyWorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  patientRoom: string;
  exams: string[];
  priority: 'ROTINA' | 'URGENTE';
  scheduledTime: string;
  notes?: string;
}

export interface AcknowledgePanicValuePayload {
  resultId: string;
  acknowledgedBy: string;
  actionTaken: string;
  physicianNotified: string;
  notifiedAt: string;
}

export interface AcknowledgePanicValueResponse {
  id: string;
  resultId: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
}

export interface ReferenceRangesParams {
  analyte?: string;
  ageGroup?: string;
  sex?: 'M' | 'F';
}

export interface ReferenceRange {
  analyte: string;
  unit: string;
  minValue: number | null;
  maxValue: number | null;
  criticalMin: number | null;
  criticalMax: number | null;
  ageGroup: string;
  sex: 'M' | 'F' | 'ALL';
}

export interface DeltaCheckPayload {
  patientId: string;
  analyte: string;
  currentValue: number;
  previousResultId?: string;
}

export interface DeltaCheckResult {
  patientId: string;
  analyte: string;
  previousValue: number | null;
  currentValue: number;
  percentChange: number | null;
  flagged: boolean;
  threshold: number;
  message: string;
}

export interface ReflexTestingPayload {
  sampleId: string;
  analyteResults: Array<{ analyte: string; value: number; unit: string }>;
}

export interface ReflexTestingResult {
  sampleId: string;
  triggeredTests: Array<{ testCode: string; testName: string; triggerReason: string }>;
  noReflexNeeded: boolean;
}

export interface AutoVerifyPayload {
  resultId: string;
  analyteResults: Array<{ analyte: string; value: number; unit: string; flag?: string }>;
}

export interface AutoVerifyResult {
  resultId: string;
  autoVerified: boolean;
  blockers: string[];
  verifiedAt: string | null;
}

export interface AddOnTestPayload {
  sampleBarcode: string;
  patientId: string;
  testCode: string;
  testName: string;
  encounterId?: string;
  justification?: string;
}

export interface AddOnTestResponse {
  id: string;
  sampleBarcode: string;
  testCode: string;
  testName: string;
  status: string;
  createdAt: string;
}

export interface GasometryPayload {
  patientId: string;
  encounterId?: string;
  collectedBy: string;
  collectionSite: string;
  fio2?: number;
  ph: number;
  pco2: number;
  po2: number;
  hco3: number;
  be: number;
  spo2: number;
  lactate?: number;
  notes?: string;
}

export interface GasometryRecord {
  id: string;
  patientId: string;
  ph: number;
  pco2: number;
  po2: number;
  hco3: number;
  be: number;
  spo2: number;
  lactate?: number;
  interpretation: string;
  recordedAt: string;
}

export interface MicrobiologyPayload {
  patientId: string;
  encounterId?: string;
  sampleType: string;
  collectionSite: string;
  collectedBy: string;
  requestedTests: string[];
  clinicalInfo?: string;
  antibioticsInUse?: string[];
}

export interface MicrobiologyRecord {
  id: string;
  patientId: string;
  sampleType: string;
  status: 'PENDING' | 'PROCESSING' | 'RELEASED';
  requestedTests: string[];
  createdAt: string;
}

export interface PocTestPayload {
  patientId: string;
  encounterId?: string;
  deviceType: string;
  deviceId: string;
  operatorId: string;
  results: Array<{
    analyte: string;
    value: string;
    unit?: string;
    flag?: string;
    referenceMin?: number;
    referenceMax?: number;
  }>;
  notes?: string;
}

export interface PocTestRecord {
  id: string;
  patientId: string;
  deviceType: string;
  deviceId: string;
  results: Array<{ analyte: string; value: string; unit?: string; flag?: string }>;
  criticalCount: number;
  criticalAnalytes: string[];
  createdAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useCollectSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CollectSamplePayload) => {
      const { data } = await api.post<CollectedSample>('/lis/samples/collect', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function usePhlebotomyWorklist(params?: PhlebotomyWorklistParams) {
  return useQuery({
    queryKey: lisSampleTrackingKeys.phlebotomyWorklist(params),
    queryFn: async () => {
      const { data } = await api.get<PhlebotomyWorklistItem[]>('/lis/samples/phlebotomy-worklist', { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAcknowledgePanicValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AcknowledgePanicValuePayload) => {
      const { data } = await api.post<AcknowledgePanicValueResponse>(
        '/lis/samples/panic-value/acknowledge',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useReferenceRanges(params?: ReferenceRangesParams) {
  return useQuery({
    queryKey: lisSampleTrackingKeys.referenceRanges(params),
    queryFn: async () => {
      const { data } = await api.get<ReferenceRange[]>('/lis/reference-ranges', { params });
      return data;
    },
  });
}

export function useEvaluateDeltaCheck() {
  return useMutation({
    mutationFn: async (payload: DeltaCheckPayload) => {
      const { data } = await api.post<DeltaCheckResult>('/lis/delta-check', payload);
      return data;
    },
  });
}

export function useEvaluateReflexTesting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReflexTestingPayload) => {
      const { data } = await api.post<ReflexTestingResult>('/lis/reflex-testing', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useAutoVerifyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AutoVerifyPayload) => {
      const { data } = await api.post<AutoVerifyResult>('/lis/auto-verification', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useRequestAddOnTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddOnTestPayload) => {
      const { data } = await api.post<AddOnTestResponse>('/lis/add-on-test', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useRecordGasometry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GasometryPayload) => {
      const { data } = await api.post<GasometryRecord>('/lis/gasometry', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useRecordMicrobiology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MicrobiologyPayload) => {
      const { data } = await api.post<MicrobiologyRecord>('/lis/microbiology', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}

export function useRecordPocTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PocTestPayload) => {
      const { data } = await api.post<PocTestRecord>('/lis/poc-testing', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lisSampleTrackingKeys.all });
    },
  });
}
