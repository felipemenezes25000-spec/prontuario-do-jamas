import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type IntegrationProtocol = 'FHIR' | 'HL7V2' | 'DICOM' | 'LIS' | 'PACS' | 'REST' | 'SOAP';
export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CONFIGURING';

export interface Integration {
  id: string;
  name: string;
  protocol: IntegrationProtocol;
  endpointUrl: string;
  status: IntegrationStatus;
  description: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  messagesProcessed: number;
  createdAt: string;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SUCCESS' | 'ERROR';
  message: string;
  payload: string | null;
  timestamp: string;
}

export interface CreateIntegrationDto {
  name: string;
  protocol: IntegrationProtocol;
  endpointUrl: string;
  description?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const integrationKeys = {
  all: ['integrations'] as const,
  lists: () => [...integrationKeys.all, 'list'] as const,
  detail: (id: string) => [...integrationKeys.all, 'detail', id] as const,
  logs: (id: string) => [...integrationKeys.all, 'logs', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useIntegrations() {
  return useQuery({
    queryKey: integrationKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Integration[]>('/integrations');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useIntegrationLogs(integrationId: string) {
  return useQuery({
    queryKey: integrationKeys.logs(integrationId),
    queryFn: async () => {
      const { data } = await api.get<IntegrationLog[]>(
        `/integrations/${integrationId}/logs`,
      );
      return data;
    },
    enabled: !!integrationId,
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateIntegrationDto) => {
      const { data } = await api.post<Integration>('/integrations', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.lists() });
    },
  });
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ success: boolean; latencyMs: number; error?: string }>(
        `/integrations/${id}/test`,
      );
      return data;
    },
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/integrations/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.lists() });
    },
  });
}
