import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const cdsHooksKeys = {
  all: ['cds-hooks'] as const,
  services: () => [...cdsHooksKeys.all, 'services'] as const,
  service: (id: string) => [...cdsHooksKeys.all, 'service', id] as const,
};

// ============================================================================
// Types
// ============================================================================

export type HookType = 'patient-view' | 'order-select' | 'order-sign' | 'medication-prescribe';

export interface CDSService {
  id: string;
  name: string;
  hookType: HookType;
  description: string;
  endpointUrl: string;
  enabled: boolean;
  vendor: string;
  registeredAt: string;
  lastTriggeredAt: string | null;
  totalCalls: number;
  avgResponseMs: number;
}

export interface CDSCard {
  summary: string;
  detail: string;
  indicator: 'info' | 'warning' | 'critical';
  source: { label: string; url?: string };
  suggestions?: Array<{
    label: string;
    actions: Array<{ type: string; description: string }>;
  }>;
}

export interface CDSEvaluation {
  serviceId: string;
  cards: CDSCard[];
  evaluatedAt: string;
  durationMs: number;
}

export interface RegisterServicePayload {
  name: string;
  hookType: HookType;
  description: string;
  endpointUrl: string;
  vendor: string;
}

export interface EvaluateServicePayload {
  serviceId: string;
  context: Record<string, unknown>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useCDSServices() {
  return useQuery({
    queryKey: cdsHooksKeys.services(),
    queryFn: async () => {
      const { data } = await api.get<CDSService[]>('/cds-hooks/services');
      return data;
    },
  });
}

export function useCDSService(id: string) {
  return useQuery({
    queryKey: cdsHooksKeys.service(id),
    queryFn: async () => {
      const { data } = await api.get<CDSService>(`/cds-hooks/services/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRegisterCDSService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterServicePayload) => {
      const { data } = await api.post('/cds-hooks/services', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cdsHooksKeys.services() });
    },
  });
}

export function useEvaluateCDSService() {
  return useMutation({
    mutationFn: async (payload: EvaluateServicePayload) => {
      const { data } = await api.post<CDSEvaluation>(`/cds-hooks/services/${payload.serviceId}/evaluate`, {
        context: payload.context,
      });
      return data;
    },
  });
}

export function useToggleCDSService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, enabled }: { serviceId: string; enabled: boolean }) => {
      const { data } = await api.patch(`/cds-hooks/services/${serviceId}`, { enabled });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cdsHooksKeys.services() });
    },
  });
}
