import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const pediatricsKeys = {
  all: ['pediatrics'] as const,
  growthData: (patientId: string) => [...pediatricsKeys.all, 'growth', patientId] as const,
  vaccinations: (patientId: string) => [...pediatricsKeys.all, 'vaccinations', patientId] as const,
  milestones: (patientId: string) => [...pediatricsKeys.all, 'milestones', patientId] as const,
  patients: (params?: Record<string, unknown>) => [...pediatricsKeys.all, 'patients', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface GrowthMeasurement {
  id: string;
  patientId: string;
  date: string;
  ageMonths: number;
  weight: number;
  height: number;
  headCircumference?: number;
  bmi: number;
  weightPercentile: number;
  heightPercentile: number;
  bmiPercentile: number;
}

export interface CreateGrowthDto {
  patientId: string;
  date: string;
  weight: number;
  height: number;
  headCircumference?: number;
}

export interface Vaccination {
  id: string;
  patientId: string;
  vaccineName: string;
  dose: string;
  scheduledDate: string;
  administeredDate?: string;
  lot?: string;
  site?: string;
  status: 'SCHEDULED' | 'ADMINISTERED' | 'DELAYED' | 'CONTRAINDICATED';
  notes?: string;
}

export interface AdministerVaccineDto {
  vaccinationId: string;
  administeredDate: string;
  lot: string;
  site: string;
  notes?: string;
}

export interface DevelopmentalMilestone {
  id: string;
  patientId: string;
  category: 'MOTOR' | 'LANGUAGE' | 'SOCIAL' | 'COGNITIVE';
  milestone: string;
  expectedAgeMonths: number;
  achievedDate?: string;
  status: 'PENDING' | 'ACHIEVED' | 'DELAYED' | 'NOT_ASSESSED';
  notes?: string;
}

export interface DoseCalculation {
  medication: string;
  weight: number;
  dosePerKg: number;
  calculatedDose: number;
  unit: string;
  frequency: string;
  maxDose?: number;
}

export interface PediatricPatient {
  id: string;
  patientId: string;
  patientName: string;
  birthDate: string;
  ageMonths: number;
  weight: number;
  height: number;
  vaccinesPending: number;
  nextAppointment?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function usePediatricPatients(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: pediatricsKeys.patients(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: PediatricPatient[]; total: number }>(
        '/pediatrics/patients',
        { params },
      );
      return data;
    },
  });
}

export function useGrowthData(patientId: string) {
  return useQuery({
    queryKey: pediatricsKeys.growthData(patientId),
    queryFn: async () => {
      const { data } = await api.get<GrowthMeasurement[]>(
        `/pediatrics/patients/${patientId}/growth`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateGrowthMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateGrowthDto) => {
      const { data } = await api.post<GrowthMeasurement>('/pediatrics/growth', dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: pediatricsKeys.growthData(variables.patientId) });
    },
  });
}

export function useVaccinations(patientId: string) {
  return useQuery({
    queryKey: pediatricsKeys.vaccinations(patientId),
    queryFn: async () => {
      const { data } = await api.get<Vaccination[]>(
        `/pediatrics/patients/${patientId}/vaccinations`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useAdministerVaccine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AdministerVaccineDto) => {
      const { data } = await api.post<Vaccination>('/pediatrics/vaccinations/administer', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pediatricsKeys.all });
    },
  });
}

export function useMilestones(patientId: string) {
  return useQuery({
    queryKey: pediatricsKeys.milestones(patientId),
    queryFn: async () => {
      const { data } = await api.get<DevelopmentalMilestone[]>(
        `/pediatrics/patients/${patientId}/milestones`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCalculateDose() {
  return useMutation({
    mutationFn: async (params: { medication: string; weight: number }) => {
      const { data } = await api.post<DoseCalculation>('/pediatrics/calculate-dose', params);
      return data;
    },
  });
}
