import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const cardiologyKeys = {
  all: ['cardiology'] as const,
  ecg: (patientId: string) => [...cardiologyKeys.all, 'ecg', patientId] as const,
  echo: (patientId: string) => [...cardiologyKeys.all, 'echo', patientId] as const,
  catheterization: (patientId: string) => [...cardiologyKeys.all, 'cath', patientId] as const,
  holter: (patientId: string) => [...cardiologyKeys.all, 'holter', patientId] as const,
  stressTest: (patientId: string) => [...cardiologyKeys.all, 'stress', patientId] as const,
  timeline: (patientId: string) => [...cardiologyKeys.all, 'timeline', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface ECGRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  heartRate: number;
  rhythm: string;
  axis: string;
  prInterval: number | null;
  qrsDuration: number | null;
  qtcInterval: number | null;
  interpretation: string;
  abnormalities: string[];
  performedBy: string;
  status: 'PENDENTE' | 'INTERPRETADO' | 'REVISADO';
}

export interface EchoReport {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  ejectionFraction: number;
  lvedd: number; // Left Ventricular End-Diastolic Diameter
  lvesd: number; // Left Ventricular End-Systolic Diameter
  leftAtrium: number;
  aorticRoot: number;
  mitralValve: string;
  aorticValve: string;
  tricuspidValve: string;
  pulmonaryValve: string;
  pericardium: string;
  conclusion: string;
  performedBy: string;
}

export interface CatheterizationReport {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  accessSite: string;
  coronaryFindings: string;
  leftVentriculography: string;
  hemodynamics: string;
  interventions: string[];
  complications: string[];
  conclusion: string;
  operator: string;
}

export interface HolterReport {
  id: string;
  patientId: string;
  patientName: string;
  startDate: string;
  endDate: string;
  duration: number; // hours
  minHR: number;
  maxHR: number;
  avgHR: number;
  totalBeats: number;
  svePremature: number;
  vePremature: number;
  pauses: number;
  events: string[];
  conclusion: string;
}

export interface StressTestReport {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  protocol: string;
  duration: number; // minutes
  maxHR: number;
  targetHR: number;
  percentTarget: number;
  maxBP: string;
  mets: number;
  stSegmentChanges: string;
  symptoms: string[];
  conclusion: 'NORMAL' | 'ALTERADO' | 'INCONCLUSIVO';
  performedBy: string;
}

export interface CardiologyEvent {
  id: string;
  type: 'ECG' | 'ECO' | 'CATETERISMO' | 'HOLTER' | 'ERGOMETRICO';
  date: string;
  summary: string;
  reportId: string;
}

export interface CreateECGPayload {
  patientId: string;
  heartRate: number;
  rhythm: string;
  axis: string;
  prInterval?: number;
  qrsDuration?: number;
  qtcInterval?: number;
  interpretation: string;
  abnormalities: string[];
}

// ============================================================================
// Hooks
// ============================================================================

export function useECGRecords(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.ecg(patientId),
    queryFn: async () => {
      const { data } = await api.get<ECGRecord[]>(`/cardiology/patients/${patientId}/ecg`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useEchoReports(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.echo(patientId),
    queryFn: async () => {
      const { data } = await api.get<EchoReport[]>(`/cardiology/patients/${patientId}/echo`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCatheterizations(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.catheterization(patientId),
    queryFn: async () => {
      const { data } = await api.get<CatheterizationReport[]>(`/cardiology/patients/${patientId}/catheterization`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useHolterReports(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.holter(patientId),
    queryFn: async () => {
      const { data } = await api.get<HolterReport[]>(`/cardiology/patients/${patientId}/holter`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useStressTests(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.stressTest(patientId),
    queryFn: async () => {
      const { data } = await api.get<StressTestReport[]>(`/cardiology/patients/${patientId}/stress-test`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCardiologyTimeline(patientId: string) {
  return useQuery({
    queryKey: cardiologyKeys.timeline(patientId),
    queryFn: async () => {
      const { data } = await api.get<CardiologyEvent[]>(`/cardiology/patients/${patientId}/timeline`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateECG() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateECGPayload) => {
      const { data } = await api.post('/cardiology/ecg', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cardiologyKeys.ecg(variables.patientId) });
      qc.invalidateQueries({ queryKey: cardiologyKeys.timeline(variables.patientId) });
    },
  });
}
