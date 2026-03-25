import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export type RuleCategory = 'MEDICATION' | 'LAB' | 'CLINICAL' | 'PREVENTIVE';
export type RuleSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CdsRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  active: boolean;
  conditionExpression: string;
  actionType: 'ALERT' | 'BLOCK' | 'SUGGEST' | 'AUTO_ORDER';
  actionMessage: string;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CdsAlertPreview {
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  affectedPatients: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const cdsEngineKeys = {
  all: ['cds-engine'] as const,
  rules: (filters?: Record<string, unknown>) =>
    [...cdsEngineKeys.all, 'rules', filters] as const,
  rule: (id: string) =>
    [...cdsEngineKeys.all, 'rule', id] as const,
  preview: (ruleId: string) =>
    [...cdsEngineKeys.all, 'preview', ruleId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useCdsRules(filters?: { category?: string; active?: boolean }) {
  return useQuery({
    queryKey: cdsEngineKeys.rules(filters),
    queryFn: async () => {
      const { data } = await api.get<CdsRule[]>('/cds-engine/rules', { params: filters });
      return data;
    },
  });
}

export function useCdsRule(id: string) {
  return useQuery({
    queryKey: cdsEngineKeys.rule(id),
    queryFn: async () => {
      const { data } = await api.get<CdsRule>(`/cds-engine/rules/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCdsAlertPreview(ruleId: string) {
  return useQuery({
    queryKey: cdsEngineKeys.preview(ruleId),
    queryFn: async () => {
      const { data } = await api.get<CdsAlertPreview>(`/cds-engine/rules/${ruleId}/preview`);
      return data;
    },
    enabled: !!ruleId,
  });
}

export function useCreateCdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      description: string;
      category: RuleCategory;
      severity: RuleSeverity;
      conditionExpression: string;
      actionType: string;
      actionMessage: string;
    }) => {
      const { data } = await api.post<CdsRule>('/cds-engine/rules', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cdsEngineKeys.rules() });
    },
  });
}

export function useToggleCdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { id: string; active: boolean }) => {
      const { data } = await api.patch(`/cds-engine/rules/${dto.id}/toggle`, { active: dto.active });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cdsEngineKeys.rules() });
    },
  });
}

export function useDeleteCdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cds-engine/rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cdsEngineKeys.rules() });
    },
  });
}
