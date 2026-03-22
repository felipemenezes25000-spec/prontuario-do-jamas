import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ReportChartPoint {
  month: string;
  atendimentos: number;
  internacoes: number;
}

export interface ReportSummary {
  chartData: ReportChartPoint[];
}

async function fetchReportSummary(_reportId: string): Promise<ReportSummary> {
  // No /reports controller exists in the API. Use /dashboard/stats instead.
  const { data } = await api.get<ReportSummary>('/dashboard/stats');
  return data ?? { chartData: [] };
}

export function useReportSummary(reportId: string | null) {
  return useQuery({
    queryKey: ['report-summary', reportId],
    queryFn: () => fetchReportSummary(reportId!),
    enabled: !!reportId,
  });
}
