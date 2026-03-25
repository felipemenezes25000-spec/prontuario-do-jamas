import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const obstetricsKeys = {
  all: ['obstetrics'] as const,
  patients: (params?: Record<string, unknown>) => [...obstetricsKeys.all, 'patients', params] as const,
  prenatalCard: (patientId: string) => [...obstetricsKeys.all, 'prenatal', patientId] as const,
  partogram: (encounterId: string) => [...obstetricsKeys.all, 'partogram', encounterId] as const,
  ultrasounds: (patientId: string) => [...obstetricsKeys.all, 'ultrasounds', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type RiskClassification = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PrenatalCard {
  id: string;
  patientId: string;
  patientName: string;
  dum: string;
  dpp: string;
  gestationalWeeks: number;
  gestationalDays: number;
  riskClassification: RiskClassification;
  bloodType: string;
  rh: string;
  previousPregnancies: number;
  previousDeliveries: number;
  previousCesareans: number;
  previousAbortions: number;
  consultations: PrenatalConsultation[];
  exams: PrenatalExam[];
}

export interface PrenatalConsultation {
  id: string;
  date: string;
  gestationalWeeks: number;
  weight: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  uterineHeight: number;
  fetalHeartRate: number;
  presentation: string;
  edema: string;
  notes: string;
  doctor: string;
}

export interface PrenatalExam {
  id: string;
  examType: string;
  date: string;
  result: string;
  status: 'PENDING' | 'COMPLETED' | 'ABNORMAL';
}

export interface CreatePrenatalCardDto {
  patientId: string;
  dum: string;
  bloodType: string;
  rh: string;
  previousPregnancies: number;
  previousDeliveries: number;
  previousCesareans: number;
  previousAbortions: number;
}

export interface PartogramEntry {
  id: string;
  encounterId: string;
  time: string;
  dilation: number;
  descent: number;
  contractionFrequency: number;
  contractionDuration: number;
  fetalHeartRate: number;
  amnioticFluid: string;
  oxytocin?: number;
  notes?: string;
}

export interface CreatePartogramEntryDto {
  encounterId: string;
  dilation: number;
  descent: number;
  contractionFrequency: number;
  contractionDuration: number;
  fetalHeartRate: number;
  amnioticFluid: string;
  oxytocin?: number;
  notes?: string;
}

export interface UltrasoundRecord {
  id: string;
  patientId: string;
  date: string;
  gestationalWeeks: number;
  estimatedWeight: number;
  amnioticFluidIndex: number;
  placentaPosition: string;
  fetalPresentation: string;
  observations: string;
  images?: string[];
}

export interface CreateUltrasoundDto {
  patientId: string;
  gestationalWeeks: number;
  estimatedWeight: number;
  amnioticFluidIndex: number;
  placentaPosition: string;
  fetalPresentation: string;
  observations: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useObstetricPatients(params?: { page?: number; limit?: number; risk?: RiskClassification }) {
  return useQuery({
    queryKey: obstetricsKeys.patients(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PrenatalCard[]; total: number }>(
        '/obstetrics/patients',
        { params },
      );
      return data;
    },
  });
}

export function usePrenatalCard(patientId: string) {
  return useQuery({
    queryKey: obstetricsKeys.prenatalCard(patientId),
    queryFn: async () => {
      const { data } = await api.get<PrenatalCard>(
        `/obstetrics/patients/${patientId}/prenatal-card`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreatePrenatalCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePrenatalCardDto) => {
      const { data } = await api.post<PrenatalCard>('/obstetrics/prenatal-cards', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: obstetricsKeys.patients() });
    },
  });
}

export function usePartogram(encounterId: string) {
  return useQuery({
    queryKey: obstetricsKeys.partogram(encounterId),
    queryFn: async () => {
      const { data } = await api.get<PartogramEntry[]>(
        `/obstetrics/partogram/${encounterId}`,
      );
      return data;
    },
    enabled: !!encounterId,
    refetchInterval: 60_000,
  });
}

export function useCreatePartogramEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePartogramEntryDto) => {
      const { data } = await api.post<PartogramEntry>('/obstetrics/partogram', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: obstetricsKeys.partogram(variables.encounterId) });
    },
  });
}

export function useUltrasounds(patientId: string) {
  return useQuery({
    queryKey: obstetricsKeys.ultrasounds(patientId),
    queryFn: async () => {
      const { data } = await api.get<UltrasoundRecord[]>(
        `/obstetrics/patients/${patientId}/ultrasounds`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateUltrasound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateUltrasoundDto) => {
      const { data } = await api.post<UltrasoundRecord>('/obstetrics/ultrasounds', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: obstetricsKeys.all });
    },
  });
}
