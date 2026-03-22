import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Response types ──────────────────────────────────────────────────

export interface HospitalMovementDay {
  date: string;
  admissions: number;
  discharges: number;
  encounters: number;
}

export interface HospitalMovementData {
  summary: {
    totalAdmissions: number;
    totalDischarges: number;
    totalEncounters: number;
  };
  daily: HospitalMovementDay[];
}

export interface CensusPatient {
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string;
  admissionDate: string;
  daysAdmitted: number;
}

export interface DailyCensusData {
  totalOccupied: number;
  patients: CensusPatient[];
}

export interface DoctorProductivityRow {
  doctorId: string | null;
  doctorName: string;
  encounterCount: number;
}

export interface QualityIndicatorsData {
  totalEncounters: number;
  totalTriages: number;
  triageRate: number;
  totalAlerts: number;
}

export interface FinancialData {
  totalBilled: number;
  totalGlosed: number;
  totalApproved: number;
  totalEntries: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byInsurer: Record<string, { count: number; amount: number }>;
}

export interface EncounterStatsData {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byDay: Record<string, number>;
}

// ── Hooks ───────────────────────────────────────────────────────────

export function useHospitalMovement(startDate: string, endDate: string) {
  return useQuery<HospitalMovementData>({
    queryKey: ['reports', 'hospital-movement', startDate, endDate],
    queryFn: () =>
      api
        .get<HospitalMovementData>('/reports/hospital-movement', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useDailyCensus(date: string) {
  return useQuery<DailyCensusData>({
    queryKey: ['reports', 'daily-census', date],
    queryFn: () =>
      api
        .get<DailyCensusData>('/reports/daily-census', {
          params: { date },
        })
        .then((r) => r.data),
    enabled: !!date,
  });
}

export function useDoctorProductivity(startDate: string, endDate: string) {
  return useQuery<DoctorProductivityRow[]>({
    queryKey: ['reports', 'doctor-productivity', startDate, endDate],
    queryFn: () =>
      api
        .get<DoctorProductivityRow[]>('/reports/doctor-productivity', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useQualityIndicators(startDate: string, endDate: string) {
  return useQuery<QualityIndicatorsData>({
    queryKey: ['reports', 'quality-indicators', startDate, endDate],
    queryFn: () =>
      api
        .get<QualityIndicatorsData>('/reports/quality-indicators', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useFinancialReport(startDate: string, endDate: string) {
  return useQuery<FinancialData>({
    queryKey: ['reports', 'financial', startDate, endDate],
    queryFn: () =>
      api
        .get<FinancialData>('/reports/financial', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useEncounterStats(startDate: string, endDate: string) {
  return useQuery<EncounterStatsData>({
    queryKey: ['reports', 'encounter-stats', startDate, endDate],
    queryFn: () =>
      api
        .get<EncounterStatsData>('/reports/encounter-stats', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}
