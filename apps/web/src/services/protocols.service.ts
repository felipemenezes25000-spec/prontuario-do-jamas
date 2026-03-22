import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface TriggerCriterion {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: string | number | boolean | string[];
}

export interface ProtocolAction {
  type: string;
  params: Record<string, unknown>;
}

export interface ClinicalProtocol {
  id: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  description: string;
  category: string;
  triggerCriteria: TriggerCriterion[];
  actions: ProtocolAction[];
  priority: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProtocolDto {
  name: string;
  nameEn?: string;
  description: string;
  category: string;
  triggerCriteria: TriggerCriterion[];
  actions: ProtocolAction[];
  priority?: number;
  isActive?: boolean;
}

export type UpdateProtocolDto = Partial<CreateProtocolDto>;

export interface ProtocolFilters {
  category?: string;
  isActive?: boolean;
}

export interface MatchedProtocol {
  protocol: {
    id: string;
    name: string;
    category: string;
    priority: number;
    description: string;
  };
  matchedCriteria: TriggerCriterion[];
  recommendedActions: ProtocolAction[];
}

export interface EvaluateTriggersResponse {
  matchedProtocols: MatchedProtocol[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const protocolKeys = {
  all: ['protocols'] as const,
  lists: () => [...protocolKeys.all, 'list'] as const,
  list: (filters?: ProtocolFilters) => [...protocolKeys.lists(), filters] as const,
  details: () => [...protocolKeys.all, 'detail'] as const,
  detail: (id: string) => [...protocolKeys.details(), id] as const,
  evaluate: () => [...protocolKeys.all, 'evaluate'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useProtocols(filters?: ProtocolFilters) {
  return useQuery({
    queryKey: protocolKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<ClinicalProtocol[]>('/protocols', {
        params: filters,
      });
      return data;
    },
  });
}

export function useProtocol(id: string) {
  return useQuery({
    queryKey: protocolKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ClinicalProtocol>(`/protocols/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateProtocolDto) => {
      const { data } = await api.post<ClinicalProtocol>('/protocols', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: protocolKeys.lists() });
    },
  });
}

export function useUpdateProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateProtocolDto & { id: string }) => {
      const { data } = await api.patch<ClinicalProtocol>(`/protocols/${id}`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: protocolKeys.lists() });
    },
  });
}

export function useToggleProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ClinicalProtocol>(`/protocols/${id}/toggle`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(id) });
      qc.invalidateQueries({ queryKey: protocolKeys.lists() });
    },
  });
}

export function useEvaluateTriggers() {
  return useMutation({
    mutationFn: async (encounterData: Record<string, unknown>) => {
      const { data } = await api.post<EvaluateTriggersResponse>(
        '/protocols/evaluate',
        { data: encounterData },
      );
      return data;
    },
  });
}
