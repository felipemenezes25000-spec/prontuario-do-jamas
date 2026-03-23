import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface ClinicalAlertRule {
  id: string;
  name: string;
  description: string | null;
  field: string;
  operator: string;
  value: number;
  value2: number | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  message: string;
  action: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleDto {
  name: string;
  description?: string;
  field: string;
  operator: string;
  value: number;
  value2?: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  message: string;
  action?: string;
  isActive?: boolean;
}

export interface UpdateAlertRuleDto extends Partial<CreateAlertRuleDto> {
  id?: never; // id is passed separately
}

// ============================================================================
// Query Keys
// ============================================================================

export const alertRuleKeys = {
  all: ['alert-rules'] as const,
  list: () => [...alertRuleKeys.all, 'list'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAlertRules() {
  return useQuery({
    queryKey: alertRuleKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<ClinicalAlertRule[]>('/alerts/rules');
      return data;
    },
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAlertRuleDto) => {
      const { data } = await api.post<ClinicalAlertRule>('/alerts/rules', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateAlertRuleDto & { id: string }) => {
      const { data } = await api.patch<ClinicalAlertRule>(
        `/alerts/rules/${id}`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/alerts/rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}
