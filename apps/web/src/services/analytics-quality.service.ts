import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface QualityIndicatorParams {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  category?: string;
}

export interface QualityIndicator {
  id: string;
  name: string;
  description: string;
  category: string;
  value: number;
  unit: string;
  target: number;
  benchmark?: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  status: 'ABOVE_TARGET' | 'ON_TARGET' | 'BELOW_TARGET' | 'CRITICAL';
  period: string;
  departmentId?: string;
  departmentName?: string;
  history: Array<{ period: string; value: number }>;
}

export interface QualityIndicatorsResult {
  indicators: QualityIndicator[];
  overallScore: number;
  period: string;
  updatedAt: string;
}

export interface ProcessIndicatorParams {
  startDate?: string;
  endDate?: string;
  processType?: string;
  departmentId?: string;
}

export interface ProcessIndicator {
  id: string;
  name: string;
  processType: string;
  compliance: number;
  totalCases: number;
  compliantCases: number;
  nonCompliantCases: number;
  target: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  trend: 'UP' | 'DOWN' | 'STABLE';
  period: string;
  history: Array<{ period: string; compliance: number }>;
}

export interface ProcessIndicatorsResult {
  indicators: ProcessIndicator[];
  overallCompliance: number;
  period: string;
  updatedAt: string;
}

export interface InfectionDashboardParams {
  startDate?: string;
  endDate?: string;
  infectionType?: string;
}

export interface InfectionRate {
  type: string;
  rate: number;
  cases: number;
  denominatorDays: number;
  benchmark: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface InfectionDashboard {
  totalCases: number;
  period: string;
  rates: InfectionRate[];
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    cases: number;
    rate: number;
  }>;
  trend: Array<{ month: string; cases: number; rate: number }>;
  openInvestigations: number;
  updatedAt: string;
}

export interface GenerateRegulatoryReportDto {
  reportType: string;
  period: string;
  departmentIds?: string[];
  format: 'PDF' | 'EXCEL' | 'JSON';
  recipientEmail?: string;
}

export interface RegulatoryReport {
  id: string;
  reportType: string;
  period: string;
  format: string;
  status: 'GENERATING' | 'READY' | 'ERROR';
  downloadUrl?: string;
  generatedAt?: string;
  requestedAt: string;
  requestedBy: string;
  expiresAt?: string;
}

export interface RegulatoryReportParams {
  reportType?: string;
  status?: RegulatoryReport['status'];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const analyticsQualityKeys = {
  all: ['analytics-quality'] as const,
  qualityIndicators: (params?: QualityIndicatorParams) => [...analyticsQualityKeys.all, 'quality-indicators', params] as const,
  processIndicators: (params?: ProcessIndicatorParams) => [...analyticsQualityKeys.all, 'process-indicators', params] as const,
  infectionDashboard: (params?: InfectionDashboardParams) => [...analyticsQualityKeys.all, 'infection-dashboard', params] as const,
  regulatoryReports: (params?: RegulatoryReportParams) => [...analyticsQualityKeys.all, 'regulatory-reports', params] as const,
};

// ============================================================================
// Quality Indicators
// ============================================================================

export function useGetQualityIndicators(params?: QualityIndicatorParams) {
  return useQuery({
    queryKey: analyticsQualityKeys.qualityIndicators(params),
    queryFn: async () => {
      const { data } = await api.get<QualityIndicatorsResult>('/analytics/quality-indicators', { params });
      return data;
    },
    staleTime: 5 * 60 * 1_000,
  });
}

// ============================================================================
// Process Indicators
// ============================================================================

export function useGetProcessIndicators(params?: ProcessIndicatorParams) {
  return useQuery({
    queryKey: analyticsQualityKeys.processIndicators(params),
    queryFn: async () => {
      const { data } = await api.get<ProcessIndicatorsResult>('/analytics/process-indicators', { params });
      return data;
    },
    staleTime: 5 * 60 * 1_000,
  });
}

// ============================================================================
// Infection Dashboard
// ============================================================================

export function useGetInfectionDashboard(params?: InfectionDashboardParams) {
  return useQuery({
    queryKey: analyticsQualityKeys.infectionDashboard(params),
    queryFn: async () => {
      const { data } = await api.get<InfectionDashboard>('/analytics/infection-dashboard', { params });
      return data;
    },
    refetchInterval: 5 * 60 * 1_000,
  });
}

// ============================================================================
// Regulatory Reports
// ============================================================================

export function useGenerateRegulatoryReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: GenerateRegulatoryReportDto) => {
      const { data } = await api.post<RegulatoryReport>('/analytics/regulatory-reports/generate', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analyticsQualityKeys.regulatoryReports() });
    },
  });
}

export function useListRegulatoryReports(params?: RegulatoryReportParams) {
  return useQuery({
    queryKey: analyticsQualityKeys.regulatoryReports(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: RegulatoryReport[]; total: number }>('/analytics/regulatory-reports', { params });
      return data;
    },
  });
}
