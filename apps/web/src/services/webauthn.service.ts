import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, AuthTokens } from '@/types';
import { useAuthStore } from '@/stores/auth.store';

// ============================================================================
// Types
// ============================================================================

interface LoginResponse extends AuthTokens {
  user: User;
}

interface WebAuthnCredential {
  credentialID: string;
  registeredAt: string;
  deviceName?: string;
}

interface RegistrationVerifyResponse {
  verified: boolean;
  credentialID: string;
}

// ============================================================================
// Raw API functions (for use outside of React components)
// ============================================================================

export async function webauthnRegisterOptionsApi(): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>('/auth/webauthn/register/options');
  return data;
}

export async function webauthnRegisterVerifyApi(
  credential: Record<string, unknown>,
): Promise<RegistrationVerifyResponse> {
  const { data } = await api.post<RegistrationVerifyResponse>(
    '/auth/webauthn/register/verify',
    { credential },
  );
  return data;
}

export async function webauthnLoginOptionsApi(
  email: string,
): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(
    '/auth/webauthn/login/options',
    { email },
  );
  return data;
}

export async function webauthnLoginVerifyApi(
  email: string,
  credential: Record<string, unknown>,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(
    '/auth/webauthn/login/verify',
    { email, credential },
  );
  return data;
}

export async function webauthnCredentialsApi(): Promise<WebAuthnCredential[]> {
  const { data } = await api.get<WebAuthnCredential[]>('/auth/webauthn/credentials');
  return data;
}

export async function webauthnRemoveCredentialApi(
  credentialId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`,
  );
  return data;
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export function useWebAuthnRegisterOptions() {
  return useMutation({
    mutationFn: webauthnRegisterOptionsApi,
  });
}

export function useWebAuthnRegisterVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credential: Record<string, unknown>) =>
      webauthnRegisterVerifyApi(credential),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webauthn', 'credentials'] });
    },
  });
}

export function useWebAuthnLoginOptions() {
  return useMutation({
    mutationFn: (email: string) => webauthnLoginOptionsApi(email),
  });
}

export function useWebAuthnLoginVerify() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: ({ email, credential }: { email: string; credential: Record<string, unknown> }) =>
      webauthnLoginVerifyApi(email, credential),
    onSuccess: (result) => {
      authStore.login(result.user, result.accessToken, result.refreshToken);
    },
  });
}

export function useWebAuthnCredentials() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['webauthn', 'credentials'],
    queryFn: webauthnCredentialsApi,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useRemoveWebAuthnCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credentialId: string) => webauthnRemoveCredentialApi(credentialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webauthn', 'credentials'] });
    },
  });
}
