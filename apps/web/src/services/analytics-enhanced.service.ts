import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export const enhancedAnalyticsKeys = {
  all: ['analytics', 'enhanced'] as const,
  processCare: (opts?: Record<string, string>) => [...enhancedAnalyticsKeys.all, 'process-care', opts] as const,
  ccih: (opts?: Record<string, string>) => [...enhancedAnalyticsKeys.all, 'ccih', opts] as const,
  anomalies: () => [...enhancedAnalyticsKeys.all, 'anomalies'] as const,
  demand: (days?: number) => [...enhancedAnalyticsKeys.all, 'demand', days] as const,
  accreditation: (fw: string) => [...enhancedAnalyticsKeys.all, 'accreditation', fw] as const,
  regulatory: (type: string) => [...enhancedAnalyticsKeys.all, 'regulatory', type] as const,
};

export function useProcessCareIndicators(opts?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.processCare(opts as Record<string, string>),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/process-care', { params: opts }); return data; },
  });
}

export function useCcihDashboard(opts?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.ccih(opts as Record<string, string>),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/ccih', { params: opts }); return data; },
  });
}

export function useAnomalyDetection() {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.anomalies(),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/anomalies'); return data; },
  });
}

export function useDemandPrediction(days = 7) {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.demand(days),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/demand-prediction', { params: { days } }); return data; },
  });
}

export function useAccreditationIndicators(framework: string) {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.accreditation(framework),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/accreditation', { params: { framework } }); return data; },
    enabled: !!framework,
  });
}

export function useRegulatoryReport(reportType: string, opts?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: enhancedAnalyticsKeys.regulatory(reportType),
    queryFn: async () => { const { data } = await api.get('/analytics/enhanced/regulatory-report', { params: { type: reportType, ...opts } }); return data; },
    enabled: !!reportType,
  });
}
