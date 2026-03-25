import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DiaryEntry {
  entryId: string;
  entryType: string;
  date: string;
  data: Record<string, unknown>;
  notes?: string;
  createdAt: string;
}

export interface DiaryTrendPoint {
  date: string;
  value: number;
}

export interface AddDiaryEntryPayload {
  entryType: string;
  date?: string;
  systolicBP?: number;
  diastolicBP?: number;
  glucose?: number;
  glucoseMealContext?: string;
  symptoms?: string[];
  mood?: string;
  exerciseType?: string;
  exerciseDuration?: number;
  weight?: number;
  temperature?: number;
  painScale?: number;
  notes?: string;
}

export const diaryKeys = {
  all: ['health-diary'] as const,
  list: (filters?: Record<string, unknown>) => [...diaryKeys.all, 'list', filters] as const,
  trend: (entryType: string, field: string) => [...diaryKeys.all, 'trend', entryType, field] as const,
  detail: (id: string) => [...diaryKeys.all, 'detail', id] as const,
};

export function useDiaryEntries(filters?: { entryType?: string; dateFrom?: string; dateTo?: string; page?: number }) {
  return useQuery({
    queryKey: diaryKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/patient-portal/health-diary', { params: filters });
      return data as { data: DiaryEntry[]; total: number; page: number; pageSize: number; totalPages: number };
    },
  });
}

export function useDiaryTrend(entryType: string, field: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: diaryKeys.trend(entryType, field),
    queryFn: async () => {
      const { data } = await api.get('/patient-portal/health-diary/trend', {
        params: { entryType, field, dateFrom, dateTo },
      });
      return data as { entryType: string; field: string; dataPoints: number; trend: DiaryTrendPoint[] };
    },
    enabled: !!entryType && !!field,
  });
}

export function useAddDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddDiaryEntryPayload) => {
      const { data } = await api.post('/patient-portal/health-diary', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.all });
    },
  });
}

export function useDeleteDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data } = await api.delete(`/patient-portal/health-diary/${entryId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.all });
    },
  });
}
