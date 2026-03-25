import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const smartKeys = {
  all: ['smart-on-fhir'] as const,
  apps: () => [...smartKeys.all, 'apps'] as const,
  app: (id: string) => [...smartKeys.all, 'app', id] as const,
};

// ============================================================================
// Types
// ============================================================================

export type AppStatus = 'ATIVO' | 'INATIVO' | 'PENDENTE';

export interface SMARTApp {
  id: string;
  name: string;
  description: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  iconUrl: string | null;
  vendor: string;
  launchUrl: string;
  status: AppStatus;
  registeredAt: string;
  lastLaunchedAt: string | null;
}

export interface RegisterAppPayload {
  name: string;
  description: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  iconUrl?: string;
  vendor: string;
  launchUrl: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useSMARTApps() {
  return useQuery({
    queryKey: smartKeys.apps(),
    queryFn: async () => {
      const { data } = await api.get<SMARTApp[]>('/smart-on-fhir/apps');
      return data;
    },
  });
}

export function useSMARTApp(id: string) {
  return useQuery({
    queryKey: smartKeys.app(id),
    queryFn: async () => {
      const { data } = await api.get<SMARTApp>(`/smart-on-fhir/apps/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRegisterSMARTApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterAppPayload) => {
      const { data } = await api.post('/smart-on-fhir/apps', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartKeys.apps() });
    },
  });
}

export function useLaunchSMARTApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appId: string) => {
      const { data } = await api.post<{ launchUrl: string }>(`/smart-on-fhir/apps/${appId}/launch`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartKeys.apps() });
    },
  });
}

export function useToggleSMARTApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: AppStatus }) => {
      const { data } = await api.patch(`/smart-on-fhir/apps/${appId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: smartKeys.apps() });
    },
  });
}
