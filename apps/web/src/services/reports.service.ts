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

async function fetchReportSummary(reportId: string): Promise<ReportSummary> {
  const { data } = await api.get<ReportSummary>(`/reports/${reportId}/summary`);
  return data;
}

export function useReportSummary(reportId: string | null) {
  return useQuery({
    queryKey: ['report-summary', reportId],
    queryFn: () => fetchReportSummary(reportId!),
    enabled: !!reportId,
  });
}
