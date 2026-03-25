import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type RelationshipType =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'GUARDIAN'
  | 'CAREGIVER'
  | 'OTHER';

export interface ProxiedPatient {
  id: string;
  patientId: string;
  patientName: string;
  relationship: RelationshipType;
  grantedAt: string;
  expiresAt: string | null;
  active: boolean;
}

export interface GrantProxyPayload {
  patientId: string;
  relationship: RelationshipType;
  expiresAt?: string;
}

export interface ProxyFilters {
  active?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const proxyKeys = {
  all: ['portal-proxy'] as const,
  dependents: (filters?: ProxyFilters) => [...proxyKeys.all, 'dependents', filters] as const,
  currentProxy: () => [...proxyKeys.all, 'current'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useMyDependents(filters?: ProxyFilters) {
  return useQuery({
    queryKey: proxyKeys.dependents(filters),
    queryFn: async () => {
      const { data } = await api.get<ProxiedPatient[]>(
        '/patient-portal/proxy/dependents',
        { params: filters },
      );
      return data;
    },
  });
}

export function useCurrentProxy() {
  return useQuery({
    queryKey: proxyKeys.currentProxy(),
    queryFn: async () => {
      const { data } = await api.get<ProxiedPatient | null>(
        '/patient-portal/proxy/current',
      );
      return data;
    },
  });
}

export function useGrantProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GrantProxyPayload) => {
      const { data } = await api.post<ProxiedPatient>(
        '/patient-portal/proxy/grant',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proxyKeys.all });
    },
  });
}

export function useRevokeProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proxyId: string) => {
      await api.post(`/patient-portal/proxy/${proxyId}/revoke`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proxyKeys.all });
    },
  });
}

export function useSwitchProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string | null) => {
      const { data } = await api.post<{ success: boolean }>(
        '/patient-portal/proxy/switch',
        { patientId },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proxyKeys.all });
    },
  });
}
