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

// ── BLOCO B5: New Analytics Hooks ────────────────────────────────

export interface OccupancySector {
  ward: string;
  occupied: number;
  totalBeds: number;
  rate: number;
}

export interface OccupancyData {
  overallRate: number;
  totalOccupied: number;
  totalBeds: number;
  sectors: OccupancySector[];
}

export interface LengthOfStayRow {
  cid: string;
  avgDays: number;
  count: number;
}

export interface TopDiagnosisRow {
  cid: string;
  description: string;
  count: number;
}

export interface ProductionRow {
  doctorId: string | null;
  doctorName: string;
  encounterCount: number;
}

export interface CustomQueryRow {
  period: string;
  dimensions: Record<string, number>;
  total: number;
}

export interface CustomQueryData {
  dimension: string;
  metric: string;
  groupBy: string;
  rows: CustomQueryRow[];
  totalRecords: number;
}

export function useOccupancyRate(startDate: string, endDate: string) {
  return useQuery<OccupancyData>({
    queryKey: ['reports', 'occupancy', startDate, endDate],
    queryFn: () =>
      api
        .get<OccupancyData>('/reports/occupancy', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useLengthOfStay(startDate: string, endDate: string) {
  return useQuery<LengthOfStayRow[]>({
    queryKey: ['reports', 'length-of-stay', startDate, endDate],
    queryFn: () =>
      api
        .get<LengthOfStayRow[]>('/reports/length-of-stay', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useTopDiagnoses(startDate: string, endDate: string) {
  return useQuery<TopDiagnosisRow[]>({
    queryKey: ['reports', 'top-diagnoses', startDate, endDate],
    queryFn: () =>
      api
        .get<TopDiagnosisRow[]>('/reports/top-diagnoses', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useProduction(startDate: string, endDate: string) {
  return useQuery<ProductionRow[]>({
    queryKey: ['reports', 'production', startDate, endDate],
    queryFn: () =>
      api
        .get<ProductionRow[]>('/reports/production', {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useCustomQuery(
  startDate: string,
  endDate: string,
  dimension: string,
  metric: string,
  groupBy: string,
  enabled: boolean,
) {
  return useQuery<CustomQueryData>({
    queryKey: ['reports', 'custom-query', startDate, endDate, dimension, metric, groupBy],
    queryFn: () =>
      api
        .get<CustomQueryData>('/reports/custom-query', {
          params: { startDate, endDate, dimension, metric, groupBy },
        })
        .then((r) => r.data),
    enabled: enabled && !!startDate && !!endDate,
  });
}
