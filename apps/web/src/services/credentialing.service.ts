import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type CredentialStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'PENDING_REVIEW';

export interface Credential {
  id: string;
  physicianId: string;
  physicianName: string;
  crm: string;
  crmState: string;
  specialty: string;
  hospitalPrivileges: string[];
  status: CredentialStatus;
  documents: CredentialDocument[];
  verifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CredentialDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  expiresAt?: string;
  uploadedAt: string;
}

export interface CredentialFilters {
  status?: CredentialStatus;
  specialty?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const credentialKeys = {
  all: ['credentialing'] as const,
  lists: () => [...credentialKeys.all, 'list'] as const,
  list: (filters?: CredentialFilters) => [...credentialKeys.lists(), filters] as const,
  detail: (id: string) => [...credentialKeys.all, 'detail', id] as const,
  expiring: () => [...credentialKeys.all, 'expiring'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useCredentials(filters?: CredentialFilters) {
  return useQuery({
    queryKey: credentialKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Credential[]; total: number }>('/compliance/credentialing', {
        params: filters,
      });
      return data;
    },
  });
}

export function useCredential(id: string) {
  return useQuery({
    queryKey: credentialKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Credential>(`/compliance/credentialing/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useExpiringCredentials() {
  return useQuery({
    queryKey: credentialKeys.expiring(),
    queryFn: async () => {
      const { data } = await api.get<{ data: Credential[]; total: number }>('/compliance/credentialing/expiring');
      return data;
    },
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Pick<Credential, 'physicianId' | 'crm' | 'crmState' | 'specialty' | 'hospitalPrivileges'> & {
        expiresAt?: string;
      },
    ) => {
      const { data } = await api.post<Credential>('/compliance/credentialing', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: credentialKeys.lists() });
    },
  });
}

export function useVerifyCRM() {
  return useMutation({
    mutationFn: async ({ crm, state }: { crm: string; state: string }) => {
      const { data } = await api.post<{ valid: boolean; name?: string; specialty?: string; status?: string }>(
        '/compliance/credentialing/verify-crm',
        { crm, state },
      );
      return data;
    },
  });
}

export function useUploadCredentialDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ credentialId, file, name }: { credentialId: string; file: File; name: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      const { data } = await api.post<CredentialDocument>(
        `/compliance/credentialing/${credentialId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: credentialKeys.all });
    },
  });
}
