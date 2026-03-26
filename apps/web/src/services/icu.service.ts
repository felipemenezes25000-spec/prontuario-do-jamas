import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface IcuScore {
  id: string;
  scoreType: string;
  totalScore: number;
  estimatedMortality?: number;
  components?: Record<string, number>;
  createdAt: string;
}

export interface VasoactiveCalculation {
  drug: string;
  weightKg: number;
  targetDoseMcgKgMin: number;
  concentrationMgMl: number;
  dosePerMinuteMcg: number;
  dosePerHourMcg: number;
  pumpRateMlH: number;
}

export interface IcuDevice {
  id: string;
  deviceType: string;
  site: string;
  insertedAt: string;
  daysInserted: number;
  removed: boolean;
  bundleChecklist: Record<string, boolean>;
  createdAt: string;
}

export interface IcuFlowsheet {
  patientId: string;
  period: { from: string; to: string };
  vitals: Array<Record<string, unknown>>;
  ventilation: Array<Record<string, unknown>>;
  sedation: Array<Record<string, unknown>>;
  devices: IcuDevice[];
  scores: IcuScore[];
  bundles: Array<Record<string, unknown>>;
  nutrition: Array<Record<string, unknown>>;
  ecmo: Array<Record<string, unknown>>;
}

export interface BundleRecord {
  id: string;
  bundleType: string;
  items: Record<string, boolean>;
  compliance: number;
  checkedAt: string;
  createdAt: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const icuKeys = {
  all: ['icu'] as const,
  flowsheet: (patientId: string) => [...icuKeys.all, 'flowsheet', patientId] as const,
  scores: (patientId: string) => [...icuKeys.all, 'scores', patientId] as const,
  devices: (patientId: string) => [...icuKeys.all, 'devices', patientId] as const,
  bundles: (patientId: string) => [...icuKeys.all, 'bundles', patientId] as const,
  rass: (patientId: string) => [...icuKeys.all, 'rass', patientId] as const,
  camIcu: (patientId: string) => [...icuKeys.all, 'cam-icu', patientId] as const,
  bis: (patientId: string) => [...icuKeys.all, 'bis', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useIcuFlowsheet(patientId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...icuKeys.flowsheet(patientId), dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const { data } = await api.get<IcuFlowsheet>(`/icu/flowsheet/${patientId}?${params.toString()}`);
      return data;
    },
    enabled: !!patientId,
    refetchInterval: 60000,
  });
}

export function useIcuScores(patientId: string, scoreType?: string) {
  return useQuery({
    queryKey: [...icuKeys.scores(patientId), scoreType],
    queryFn: async () => {
      const params = scoreType ? `?scoreType=${scoreType}` : '';
      const { data } = await api.get<IcuScore[]>(`/icu/scores/patient/${patientId}${params}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useIcuDevices(patientId: string) {
  return useQuery({
    queryKey: icuKeys.devices(patientId),
    queryFn: async () => {
      const { data } = await api.get<IcuDevice[]>(`/icu/devices/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useIcuBundles(patientId: string, bundleType?: string) {
  return useQuery({
    queryKey: [...icuKeys.bundles(patientId), bundleType],
    queryFn: async () => {
      const params = bundleType ? `?bundleType=${bundleType}` : '';
      const { data } = await api.get<BundleRecord[]>(`/icu/bundles/patient/${patientId}${params}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCalculateApacheII() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/scores/apache-ii', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.scores(variables.patientId as string) });
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCalculateSofa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/scores/sofa', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.scores(variables.patientId as string) });
    },
  });
}

export function useCalculateVasoactive() {
  return useMutation({
    mutationFn: async (dto: {
      drug: string;
      weightKg: number;
      targetDoseMcgKgMin: number;
      concentrationMgMl: number;
    }) => {
      const { data } = await api.post<VasoactiveCalculation>('/icu/vasoactive-calculator', dto);
      return data;
    },
  });
}

export function useCreateSedationAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/sedation', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateVentilationRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/ventilation', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateInvasiveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/devices', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.devices(variables.patientId as string) });
    },
  });
}

export function useCreateBundleChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/bundles', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.bundles(variables.patientId as string) });
    },
  });
}

export function useCreateProneSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/prone', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateDailyGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/daily-goals', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateEcmoRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/ecmo', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateEnteralNutrition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/enteral-nutrition', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

export function useCreateDialysisPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Record<string, unknown>) => {
      const { data } = await api.post('/icu/dialysis', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId as string) });
    },
  });
}

// ─── Therapeutic Hypothermia ──────────────────────────────────────────────────

export interface HypothermiaSession {
  id: string;
  patientId: string;
  phase: 'INDUCTION' | 'MAINTENANCE' | 'REWARMING' | 'NORMOTHERMIA';
  targetTemp: number;
  currentTemp: number;
  startedAt: string;
  endedAt: string | null;
  readings: Array<{ temp: number; time: string }>;
  complications: string[];
}

export function useCreateHypothermiaSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; encounterId?: string; targetTemp: number; indication: string; method: string }) => {
      const { data } = await api.post<HypothermiaSession>('/icu/hypothermia', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId) });
    },
  });
}

export function useUpdateHypothermiaPhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { sessionId: string; phase: HypothermiaSession['phase']; currentTemp: number; patientId: string }) => {
      const { data } = await api.patch<HypothermiaSession>(`/icu/hypothermia/${dto.sessionId}/phase`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId) });
    },
  });
}

// ─── AI Sepsis Early Detection ────────────────────────────────────────────────

export interface SepsisDetectionResult {
  patientId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  sepsisLikely: boolean;
  contributingFactors: string[];
  recommendedActions: string[];
  sofaEstimate: number | null;
  qSofaScore: number;
  disclaimer: string;
}

export function useDetectSepsis() {
  return useMutation({
    mutationFn: async (payload: {
      patientId: string;
      heartRate?: number;
      respiratoryRate?: number;
      systolicBP?: number;
      temperature?: number;
      wbc?: number;
      lactate?: number;
      gcs?: number;
      creatinine?: number;
      bilirubin?: number;
      platelets?: number;
      pao2fio2?: number;
    }) => {
      const { data } = await api.post<SepsisDetectionResult>('/icu/ai/detect-sepsis', payload);
      return data;
    },
  });
}

// ─── AI Extubation Readiness ──────────────────────────────────────────────────

export interface ExtubationReadinessResult {
  patientId: string;
  readyForExtubation: boolean;
  readinessScore: number;
  factors: Array<{ factor: string; status: 'MET' | 'NOT_MET' | 'BORDERLINE'; value?: string }>;
  recommendation: string;
  sbtRecommended: boolean;
  disclaimer: string;
}

export function useAssessExtubation() {
  return useMutation({
    mutationFn: async (payload: {
      patientId: string;
      fio2?: number;
      peep?: number;
      pao2?: number;
      rsbi?: number;
      gcs?: number;
      coughStrength?: string;
      secretions?: string;
      hemodynamicStable?: boolean;
    }) => {
      const { data } = await api.post<ExtubationReadinessResult>('/icu/ai/extubation-readiness', payload);
      return data;
    },
  });
}

// ─── AI Vasopressor Optimization ──────────────────────────────────────────────

export interface VasopressorOptimizationResult {
  patientId: string;
  currentRegimen: Array<{ drug: string; dose: string }>;
  suggestedChanges: Array<{ drug: string; action: 'INCREASE' | 'DECREASE' | 'ADD' | 'REMOVE'; suggestedDose?: string; reason: string }>;
  mapTarget: { min: number; max: number };
  currentMap: number;
  fluidResponsive: boolean | null;
  recommendation: string;
  disclaimer: string;
}

export function useOptimizeVasopressors() {
  return useMutation({
    mutationFn: async (payload: {
      patientId: string;
      currentMap: number;
      targetMapMin?: number;
      targetMapMax?: number;
      currentDrugs: Array<{ drug: string; doseMcgKgMin: number }>;
      lactate?: number;
      urinOutput?: number;
      fluidBalanceMl?: number;
    }) => {
      const { data } = await api.post<VasopressorOptimizationResult>('/icu/ai/optimize-vasopressors', payload);
      return data;
    },
  });
}

// ─── ICU Assessments: RASS, CAM-ICU, BIS ─────────────────────────────────────

export interface RassAssessment {
  id: string;
  assessmentType: 'RASS';
  score: number;
  description: string;
  interpretation: string;
  alert: boolean;
  alertMessage: string | null;
  userDescription?: string;
  assessedAt: string;
  createdAt: string;
}

export interface RassHistory {
  assessments: RassAssessment[];
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING' | 'INSUFFICIENT_DATA';
  total: number;
}

export interface CamIcuAssessment {
  id: string;
  assessmentType: 'CAM_ICU';
  feature1_acuteOnset: boolean;
  feature2_inattention: boolean;
  feature3_alteredLoc: boolean;
  feature4_disorganizedThinking: boolean;
  rassScore?: number;
  deliriumPositive: boolean;
  reasoning: string;
  assessedAt: string;
  createdAt: string;
}

export interface CamIcuHistory {
  assessments: CamIcuAssessment[];
  total: number;
  deliriumStats: {
    positiveCount: number;
    negativeCount: number;
    positiveRate: number;
  };
}

export interface BisRecord {
  id: string;
  assessmentType: 'BIS';
  bisValue: number;
  emgValue?: number;
  sqiValue?: number;
  anestheticAgent?: string;
  notes?: string;
  interpretation: string;
  zone: string;
  alert: boolean;
  alertMessage: string | null;
  targetRange: { min: number; max: number };
  inTargetRange: boolean;
  recordedAt: string;
  createdAt: string;
}

export interface BisHistory {
  records: BisRecord[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA';
  total: number;
}

export interface BisTarget {
  id: string;
  currentBis: number;
  targetRange: { min: number; max: number };
  inTargetRange: boolean;
  interpretation: string;
  zone: string;
  deviation: number;
  recordedAt: string;
  createdAt: string;
}

// ─── RASS Hooks ──────────────────────────────────────────────────────────────

export function useRecordRass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; encounterId?: string; score: number; description?: string }) => {
      const { data } = await api.post<RassAssessment>('/icu/rass', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.rass(variables.patientId) });
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId) });
    },
  });
}

export function useRassHistory(patientId: string) {
  return useQuery({
    queryKey: icuKeys.rass(patientId),
    queryFn: async () => {
      const { data } = await api.get<RassHistory>(`/icu/rass/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useLatestRass(patientId: string) {
  return useQuery({
    queryKey: [...icuKeys.rass(patientId), 'latest'],
    queryFn: async () => {
      const { data } = await api.get<RassAssessment>(`/icu/rass/${patientId}/latest`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ─── CAM-ICU Hooks ──────────────────────────────────────────────────────────

export function useRecordCamIcu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      encounterId?: string;
      feature1_acuteOnset: boolean;
      feature2_inattention: boolean;
      feature3_alteredLoc: boolean;
      feature4_disorganizedThinking: boolean;
      rassScore?: number;
    }) => {
      const { data } = await api.post<CamIcuAssessment>('/icu/cam-icu', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.camIcu(variables.patientId) });
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId) });
    },
  });
}

export function useCamIcuHistory(patientId: string) {
  return useQuery({
    queryKey: icuKeys.camIcu(patientId),
    queryFn: async () => {
      const { data } = await api.get<CamIcuHistory>(`/icu/cam-icu/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useDeliriumStatus(patientId: string) {
  return useQuery({
    queryKey: [...icuKeys.camIcu(patientId), 'status'],
    queryFn: async () => {
      const { data } = await api.get<{ deliriumPositive: boolean; reasoning: string; rassScore?: number; assessedAt: string }>(`/icu/cam-icu/${patientId}/status`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ─── BIS Hooks ──────────────────────────────────────────────────────────────

export function useRecordBis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      encounterId?: string;
      bisValue: number;
      emgValue?: number;
      sqiValue?: number;
      anestheticAgent?: string;
      notes?: string;
    }) => {
      const { data } = await api.post<BisRecord>('/icu/bis', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: icuKeys.bis(variables.patientId) });
      qc.invalidateQueries({ queryKey: icuKeys.flowsheet(variables.patientId) });
    },
  });
}

export function useBisHistory(patientId: string) {
  return useQuery({
    queryKey: icuKeys.bis(patientId),
    queryFn: async () => {
      const { data } = await api.get<BisHistory>(`/icu/bis/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useBisTarget(patientId: string) {
  return useQuery({
    queryKey: [...icuKeys.bis(patientId), 'target'],
    queryFn: async () => {
      const { data } = await api.get<BisTarget>(`/icu/bis/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}
