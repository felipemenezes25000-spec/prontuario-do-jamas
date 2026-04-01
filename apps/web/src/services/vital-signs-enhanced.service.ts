import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Query Keys ────────────────────────────────────────────────────────────

export const vitalSignsEnhancedKeys = {
  all: ['vital-signs-enhanced'] as const,
  rass: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'rass', patientId] as const,
  camIcu: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'cam-icu', patientId] as const,
  trends: (patientId: string, parameter?: string) =>
    [...vitalSignsEnhancedKeys.all, 'trends', patientId, parameter] as const,
  bis: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'bis', patientId] as const,
  icp: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'icp', patientId] as const,
  invasivePressures: (patientId: string) =>
    [...vitalSignsEnhancedKeys.all, 'invasive-pressures', patientId] as const,
  ventilator: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'ventilator', patientId] as const,
  growthCurves: (patientId: string) => [...vitalSignsEnhancedKeys.all, 'growth-curves', patientId] as const,
};

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface RassResult {
  id: string;
  patientId: string;
  score: number;
  description: string;
  interpretation: string;
  sedationTarget: number | null;
  alert: boolean;
  alertMessage: string | null;
  assessedAt: string;
  createdAt: string;
}

export interface CamIcuResult {
  id: string;
  patientId: string;
  feature1AcuteOnset: boolean;
  feature2Inattention: boolean;
  feature3AlteredLoc: boolean;
  feature4DisorganizedThinking: boolean;
  rassScore: number | null;
  deliriumPositive: boolean;
  reasoning: string;
  assessedAt: string;
  createdAt: string;
}

export interface VitalsTrendPoint {
  timestamp: string;
  value: number | null;
  parameter: string;
  unit: string;
  isAbnormal: boolean;
  newsComponent: number | null;
}

export interface VitalsTrendResponse {
  patientId: string;
  parameter: string;
  points: VitalsTrendPoint[];
  statistics: {
    min: number | null;
    max: number | null;
    mean: number | null;
    standardDeviation: number | null;
  };
  referenceRange: { low: number; high: number } | null;
  totalPoints: number;
}

export interface BisRecord {
  id: string;
  patientId: string;
  bisValue: number;
  emgValue: number | null;
  sqiValue: number | null;
  suppressionRatio: number | null;
  anestheticAgent: string | null;
  agentConcentration: number | null;
  interpretation: string;
  zone: 'AWAKE' | 'LIGHT_SEDATION' | 'GENERAL_ANESTHESIA' | 'DEEP_ANESTHESIA' | 'BURST_SUPPRESSION' | 'FLAT_LINE';
  alert: boolean;
  alertMessage: string | null;
  targetRange: { min: number; max: number };
  inTargetRange: boolean;
  recordedAt: string;
  createdAt: string;
}

export interface IcpRecord {
  id: string;
  patientId: string;
  icpMmHg: number;
  cppMmHg: number | null;
  mapMmHg: number | null;
  waveformMorphology: 'NORMAL' | 'P2_ELEVATED' | 'PLATEAU' | 'B_WAVES' | null;
  interpretation: string;
  alert: boolean;
  alertMessage: string | null;
  drainageOutput: number | null;
  drainageType: 'EVD' | 'LUMBAR' | null;
  recordedAt: string;
  createdAt: string;
}

export interface InvasivePressureRecord {
  id: string;
  patientId: string;
  lineType: 'ARTERIAL' | 'CVP' | 'PAP' | 'PCWP' | 'SVV';
  lineSite: string;
  systolic: number | null;
  diastolic: number | null;
  mean: number;
  waveformQuality: 'GOOD' | 'DAMPED' | 'OVER_DAMPED' | 'ARTIFACT';
  zeroed: boolean;
  leveled: boolean;
  interpretation: string;
  alert: boolean;
  alertMessage: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface VentilatorSettings {
  id: string;
  patientId: string;
  encounterId: string | null;
  mode: 'VCV' | 'PCV' | 'PSV' | 'SIMV' | 'CPAP' | 'BIPAP' | 'APRV' | 'HFOV' | 'NAVA';
  fio2: number;
  peep: number;
  tidalVolume: number | null;
  tidalVolumePerKg: number | null;
  respiratoryRate: number | null;
  inspiratoryPressure: number | null;
  pressureSupport: number | null;
  peakPressure: number | null;
  plateauPressure: number | null;
  meanAirwayPressure: number | null;
  drivingPressure: number | null;
  compliance: number | null;
  resistance: number | null;
  minuteVentilation: number | null;
  ieRatio: string | null;
  pao2: number | null;
  paco2: number | null;
  spo2: number | null;
  etco2: number | null;
  pfRatio: number | null;
  oxygenationIndex: number | null;
  autoRecorded: boolean;
  recordedAt: string;
  createdAt: string;
}

export interface PediatricGrowthPoint {
  date: string;
  ageMonths: number;
  weight: number | null;
  height: number | null;
  headCircumference: number | null;
  bmi: number | null;
}

export interface GrowthCurveData {
  patientId: string;
  sex: 'M' | 'F';
  gestationalAgeWeeks: number | null;
  curveType: 'WHO' | 'CDC' | 'INTERGROWTH' | 'FENTON';
  measurements: PediatricGrowthPoint[];
  percentiles: {
    weight: { p3: number[]; p15: number[]; p50: number[]; p85: number[]; p97: number[] } | null;
    height: { p3: number[]; p15: number[]; p50: number[]; p85: number[]; p97: number[] } | null;
    headCircumference: { p3: number[]; p15: number[]; p50: number[]; p85: number[]; p97: number[] } | null;
    bmi: { p3: number[]; p15: number[]; p50: number[]; p85: number[]; p97: number[] } | null;
  };
  zScores: {
    weightForAge: number | null;
    heightForAge: number | null;
    weightForHeight: number | null;
    bmiForAge: number | null;
    headCircumferenceForAge: number | null;
  } | null;
  alerts: string[];
}

// ─── Payload Types ─────────────────────────────────────────────────────────

export interface CalculateRassPayload {
  patientId: string;
  encounterId?: string;
  score: number;
  description?: string;
  sedationTarget?: number;
}

export interface CalculateCamIcuPayload {
  patientId: string;
  encounterId?: string;
  feature1AcuteOnset: boolean;
  feature2Inattention: boolean;
  feature3AlteredLoc: boolean;
  feature4DisorganizedThinking: boolean;
  rassScore?: number;
}

export interface RecordBisPayload {
  patientId: string;
  encounterId?: string;
  bisValue: number;
  emgValue?: number;
  sqiValue?: number;
  suppressionRatio?: number;
  anestheticAgent?: string;
  agentConcentration?: number;
}

export interface RecordIcpPayload {
  patientId: string;
  encounterId?: string;
  icpMmHg: number;
  mapMmHg?: number;
  waveformMorphology?: IcpRecord['waveformMorphology'];
  drainageOutput?: number;
  drainageType?: IcpRecord['drainageType'];
}

export interface RecordInvasivePressurePayload {
  patientId: string;
  encounterId?: string;
  lineType: InvasivePressureRecord['lineType'];
  lineSite: string;
  systolic?: number;
  diastolic?: number;
  mean: number;
  waveformQuality?: InvasivePressureRecord['waveformQuality'];
  zeroed?: boolean;
  leveled?: boolean;
}

export interface RecordVentilatorPayload {
  patientId: string;
  encounterId?: string;
  mode: VentilatorSettings['mode'];
  fio2: number;
  peep: number;
  tidalVolume?: number;
  tidalVolumePerKg?: number;
  respiratoryRate?: number;
  inspiratoryPressure?: number;
  pressureSupport?: number;
  peakPressure?: number;
  plateauPressure?: number;
  meanAirwayPressure?: number;
  drivingPressure?: number;
  compliance?: number;
  resistance?: number;
  minuteVentilation?: number;
  ieRatio?: string;
  pao2?: number;
  paco2?: number;
  spo2?: number;
  etco2?: number;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

// RASS (Richmond Agitation-Sedation Scale)
export function useCalculateRASS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CalculateRassPayload) => {
      const { data } = await api.post<RassResult>('/vital-signs-enhanced/rass', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.rass(variables.patientId) });
    },
  });
}

export function useRassHistory(patientId: string) {
  return useQuery({
    queryKey: vitalSignsEnhancedKeys.rass(patientId),
    queryFn: async () => {
      const { data } = await api.get<RassResult[]>(`/vital-signs-enhanced/rass/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// CAM-ICU (Confusion Assessment Method for ICU)
export function useCalculateCAMICU() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CalculateCamIcuPayload) => {
      const { data } = await api.post<CamIcuResult>('/vital-signs-enhanced/cam-icu', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.camIcu(variables.patientId) });
    },
  });
}

export function useCamIcuHistory(patientId: string) {
  return useQuery({
    queryKey: vitalSignsEnhancedKeys.camIcu(patientId),
    queryFn: async () => {
      const { data } = await api.get<CamIcuResult[]>(`/vital-signs-enhanced/cam-icu/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// Vitals Trends
export function useVitalsTrend(patientId: string, parameter?: string, hours = 24) {
  return useQuery({
    queryKey: [...vitalSignsEnhancedKeys.trends(patientId, parameter), hours],
    queryFn: async () => {
      const { data } = await api.get<VitalsTrendResponse>(`/vital-signs-enhanced/trends/${patientId}`, {
        params: { parameter, hours },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useGetVitalsTrendMutation() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; parameter: string; hours?: number; startDate?: string; endDate?: string }) => {
      const { data } = await api.post<VitalsTrendResponse>('/vital-signs-enhanced/trends', payload);
      return data;
    },
  });
}

// BIS (Bispectral Index)
export function useRecordBIS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordBisPayload) => {
      const { data } = await api.post<BisRecord>('/vital-signs-enhanced/bis', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.bis(variables.patientId) });
    },
  });
}

export function useBisHistory(patientId: string) {
  return useQuery({
    queryKey: vitalSignsEnhancedKeys.bis(patientId),
    queryFn: async () => {
      const { data } = await api.get<BisRecord[]>(`/vital-signs-enhanced/bis/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ICP (Intracranial Pressure)
export function useRecordICP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordIcpPayload) => {
      const { data } = await api.post<IcpRecord>('/vital-signs-enhanced/icp', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.icp(variables.patientId) });
    },
  });
}

export function useIcpHistory(patientId: string) {
  return useQuery({
    queryKey: vitalSignsEnhancedKeys.icp(patientId),
    queryFn: async () => {
      const { data } = await api.get<IcpRecord[]>(`/vital-signs-enhanced/icp/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// Invasive Pressures (Arterial, CVP, PAP, PCWP, SVV)
export function useRecordInvasivePressures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordInvasivePressurePayload) => {
      const { data } = await api.post<InvasivePressureRecord>('/vital-signs-enhanced/invasive-pressures', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.invasivePressures(variables.patientId) });
    },
  });
}

export function useInvasivePressures(patientId: string, lineType?: InvasivePressureRecord['lineType']) {
  return useQuery({
    queryKey: [...vitalSignsEnhancedKeys.invasivePressures(patientId), lineType],
    queryFn: async () => {
      const { data } = await api.get<InvasivePressureRecord[]>(`/vital-signs-enhanced/invasive-pressures/${patientId}`, {
        params: lineType ? { lineType } : {},
      });
      return data;
    },
    enabled: !!patientId,
  });
}

// Ventilator Settings
export function useRecordVentilatorSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordVentilatorPayload) => {
      const { data } = await api.post<VentilatorSettings>('/vital-signs-enhanced/ventilator', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.ventilator(variables.patientId) });
    },
  });
}

export function useVentilatorHistory(patientId: string) {
  return useQuery({
    queryKey: vitalSignsEnhancedKeys.ventilator(patientId),
    queryFn: async () => {
      const { data } = await api.get<VentilatorSettings[]>(`/vital-signs-enhanced/ventilator/${patientId}`);
      return data;
    },
    enabled: !!patientId,
    refetchInterval: 60_000,
  });
}

export function useLatestVentilatorSettings(patientId: string) {
  return useQuery({
    queryKey: [...vitalSignsEnhancedKeys.ventilator(patientId), 'latest'],
    queryFn: async () => {
      const { data } = await api.get<VentilatorSettings>(`/vital-signs-enhanced/ventilator/${patientId}/latest`);
      return data;
    },
    enabled: !!patientId,
  });
}

// Pediatric Growth Curves
export function usePediatricGrowthCurves(patientId: string, curveType?: GrowthCurveData['curveType']) {
  return useQuery({
    queryKey: [...vitalSignsEnhancedKeys.growthCurves(patientId), curveType],
    queryFn: async () => {
      const { data } = await api.get<GrowthCurveData>(`/vital-signs-enhanced/growth-curves/${patientId}`, {
        params: curveType ? { curveType } : {},
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordGrowthMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      patientId: string;
      weight?: number;
      height?: number;
      headCircumference?: number;
      date?: string;
    }) => {
      const { data } = await api.post<PediatricGrowthPoint>('/vital-signs-enhanced/growth-curves', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: vitalSignsEnhancedKeys.growthCurves(variables.patientId) });
    },
  });
}
