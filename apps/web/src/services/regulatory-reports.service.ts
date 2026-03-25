import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type ReportType = 'SINAN' | 'NOTIVISA' | 'ANS_INDICATORS' | 'COMPULSORY_NOTIFICATION';
export type ReportStatus = 'DRAFT' | 'GENERATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

export interface RegulatoryReport {
  id: string;
  type: ReportType;
  period: string;
  status: ReportStatus;
  generatedAt: string | null;
  submittedAt: string | null;
  data: Record<string, unknown>;
}

export interface SINANNotification {
  notificationId: string;
  diseaseCode: string;
  diseaseName: string;
  patientName: string | null;
  notificationDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'DISCARDED';
}

export interface NOTIVISAReport {
  id: string;
  eventType: string;
  productName: string;
  description: string;
  severity?: string;
  eventDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'INVESTIGATING' | 'CLOSED';
  submittedAt?: string;
}

export interface ANSIndicator {
  code: string;
  name: string;
  value: number;
  unit: string;
  benchmark?: number;
}

export interface ANSIndicatorsResponse {
  indicators: ANSIndicator[];
  period: { startDate: string; endDate: string };
}

export interface RegulatoryDashboard {
  sinanNotifications: number;
  notivisaReports: number;
  totalRegulatorySubmissions: number;
  recentNotifications: Array<{ id: string; title: string; date: string }>;
  complianceStatus: {
    sinan: 'ACTIVE' | 'NO_SUBMISSIONS';
    notivisa: 'ACTIVE' | 'NO_SUBMISSIONS';
  };
}

export interface CreateSINANDto {
  patientId: string;
  diseaseCode: string;
  diseaseName: string;
  notificationDate: string;
  symptomsOnsetDate?: string;
  encounterId?: string;
  formData?: Record<string, unknown>;
}

export interface CreateNOTIVISADto {
  patientId: string;
  eventType: string;
  productName: string;
  description: string;
  severity?: string;
  eventDate?: string;
  formData?: Record<string, unknown>;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const regulatoryKeys = {
  all: ['regulatory'] as const,
  sinan: (params?: ListParams) => [...regulatoryKeys.all, 'sinan', params] as const,
  notivisa: (params?: ListParams) => [...regulatoryKeys.all, 'notivisa', params] as const,
  ansIndicators: (period?: string) => [...regulatoryKeys.all, 'ans', period] as const,
  dashboard: () => [...regulatoryKeys.all, 'dashboard'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSINANNotifications(params?: ListParams) {
  return useQuery({
    queryKey: regulatoryKeys.sinan(params),
    queryFn: async () => {
      const { data } = await api.get<{
        data: SINANNotification[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/analytics/regulatory/sinan', { params });
      return data;
    },
  });
}

export function useCreateSINANNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSINANDto) => {
      const { data } = await api.post('/analytics/regulatory/sinan', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: regulatoryKeys.sinan() });
      qc.invalidateQueries({ queryKey: regulatoryKeys.dashboard() });
    },
  });
}

export function useNOTIVISAReports(params?: ListParams) {
  return useQuery({
    queryKey: regulatoryKeys.notivisa(params),
    queryFn: async () => {
      // NOTIVISA reports are stored similarly; reuse SINAN list logic with different type filter
      const { data } = await api.get<{
        data: SINANNotification[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/analytics/regulatory/sinan', { params: { ...params, type: 'NOTIVISA' } });
      return data;
    },
  });
}

export function useCreateNOTIVISAReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateNOTIVISADto) => {
      const { data } = await api.post('/analytics/regulatory/notivisa', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: regulatoryKeys.notivisa() });
      qc.invalidateQueries({ queryKey: regulatoryKeys.dashboard() });
    },
  });
}

export function useANSIndicators(period?: string) {
  return useQuery({
    queryKey: regulatoryKeys.ansIndicators(period),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (period) {
        const [startDate, endDate] = period.split('/');
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const { data } = await api.get<ANSIndicatorsResponse>('/analytics/regulatory/ans-indicators', { params });
      return data;
    },
  });
}

export function useRegulatoryDashboard() {
  return useQuery({
    queryKey: regulatoryKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<RegulatoryDashboard>('/analytics/regulatory/dashboard');
      return data;
    },
  });
}
