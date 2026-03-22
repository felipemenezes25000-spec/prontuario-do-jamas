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

interface MfaChallengeResponse {
  requiresMfa: true;
  mfaToken: string;
}

export type LoginResult = LoginResponse | MfaChallengeResponse;

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface MfaSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
  backupCodes: string[];
}

interface SSODetectResult {
  ssoEnabled: boolean;
  provider: string | null;
  tenantId: string | null;
  tenantName: string | null;
}

interface SSOConfigResult {
  ssoEnabled: boolean;
  ssoProvider: string | null;
  ssoDomain: string | null;
  ssoAutoProvision: boolean;
  ssoConfig: Record<string, unknown> | null;
}

interface SSOConfigurePayload {
  ssoEnabled: boolean;
  ssoProvider?: string;
  ssoConfig?: Record<string, unknown>;
  ssoDomain?: string;
  ssoAutoProvision?: boolean;
}

// ============================================================================
// Type guards
// ============================================================================

export function isMfaChallenge(result: LoginResult): result is MfaChallengeResponse {
  return 'requiresMfa' in result && result.requiresMfa === true;
}

// ============================================================================
// Raw API functions (for use outside of React components)
// ============================================================================

export async function loginApi(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>('/auth/login', { email, password });
  return data;
}

export async function registerApi(data: RegisterData): Promise<LoginResponse> {
  const { data: response } = await api.post<LoginResponse>('/auth/register', data);
  return response;
}

export async function refreshApi(refreshToken: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
  return data;
}

export async function meApi(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: meApi,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: (result) => {
      if (!isMfaChallenge(result)) {
        authStore.login(result.user, result.accessToken, result.refreshToken);
      } else {
        authStore.setMfaPending(result.mfaToken);
      }
    },
  });
}

export function useRegister() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: (data: RegisterData) => registerApi(data),
    onSuccess: (result) => {
      authStore.login(result.user, result.accessToken, result.refreshToken);
    },
  });
}

export function useLogout() {
  const authStore = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // Logout even if API call fails
      }
    },
    onSettled: () => {
      authStore.logout();
      qc.clear();
    },
  });
}

export function useRefreshToken() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: (refreshToken: string) => refreshApi(refreshToken),
    onSuccess: (tokens) => {
      authStore.refreshTokens(tokens.accessToken, tokens.refreshToken);
    },
  });
}

// ===== MFA Hooks =====

export function useMfaSetup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<MfaSetupResponse>('/auth/mfa/setup');
      return data;
    },
  });
}

export function useMfaVerifySetup() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{ message: string }>('/auth/mfa/verify-setup', { code });
      return data;
    },
  });
}

export function useMfaValidate() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: async ({ mfaToken, code }: { mfaToken: string; code: string }) => {
      const { data } = await api.post<LoginResponse>('/auth/mfa/validate', { code }, {
        headers: { 'x-mfa-token': mfaToken },
      });
      return data;
    },
    onSuccess: (result) => {
      authStore.login(result.user, result.accessToken, result.refreshToken);
      authStore.clearMfaPending();
    },
  });
}

export function useMfaBackup() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: async ({ mfaToken, backupCode }: { mfaToken: string; backupCode: string }) => {
      const { data } = await api.post<LoginResponse>('/auth/mfa/backup', { backupCode }, {
        headers: { 'x-mfa-token': mfaToken },
      });
      return data;
    },
    onSuccess: (result) => {
      authStore.login(result.user, result.accessToken, result.refreshToken);
      authStore.clearMfaPending();
    },
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{ message: string }>('/auth/mfa/disable', { code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useMfaRegenerateBackup() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{ backupCodes: string[] }>('/auth/mfa/regenerate-backup', { code });
      return data;
    },
  });
}

// ===== SSO Hooks =====

export function useDetectSSO() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.get<SSODetectResult>('/auth/sso/detect', { params: { email } });
      return data;
    },
  });
}

export function useSSOTokenExchange() {
  const authStore = useAuthStore();
  return useMutation({
    mutationFn: async ({ provider, token }: { provider: string; token: string }) => {
      const { data } = await api.post<LoginResponse>('/auth/sso/token', { provider, token });
      return data;
    },
    onSuccess: (result) => {
      authStore.login(result.user, result.accessToken, result.refreshToken);
    },
  });
}

export function useSSOConfig() {
  return useQuery({
    queryKey: ['auth', 'sso-config'],
    queryFn: async () => {
      const { data } = await api.get<SSOConfigResult>('/auth/sso/config');
      return data;
    },
  });
}

export function useConfigureSSO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SSOConfigurePayload) => {
      const { data } = await api.post<{ message: string }>('/auth/sso/configure', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'sso-config'] });
    },
  });
}

// ============================================================================
// Raw API functions (backward-compatible exports for non-hook consumers)
// ============================================================================

export async function mfaSetupApi(): Promise<MfaSetupResponse> {
  const { data } = await api.post<MfaSetupResponse>('/auth/mfa/setup');
  return data;
}

export async function mfaVerifySetupApi(code: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/mfa/verify-setup', { code });
  return data;
}

export async function mfaValidateApi(mfaToken: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/mfa/validate', { code }, {
    headers: { 'x-mfa-token': mfaToken },
  });
  return data;
}

export async function mfaBackupApi(mfaToken: string, backupCode: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/mfa/backup', { backupCode }, {
    headers: { 'x-mfa-token': mfaToken },
  });
  return data;
}

export async function mfaDisableApi(code: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/mfa/disable', { code });
  return data;
}

export async function mfaRegenerateBackupApi(code: string): Promise<{ backupCodes: string[] }> {
  const { data } = await api.post<{ backupCodes: string[] }>('/auth/mfa/regenerate-backup', { code });
  return data;
}

export async function detectSSOApi(email: string): Promise<SSODetectResult> {
  const { data } = await api.get<SSODetectResult>('/auth/sso/detect', { params: { email } });
  return data;
}

export async function ssoTokenExchangeApi(
  provider: string,
  token: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/sso/token', { provider, token });
  return data;
}

export async function getSSOConfigApi(): Promise<SSOConfigResult> {
  const { data } = await api.get<SSOConfigResult>('/auth/sso/config');
  return data;
}

export async function configureSSOApi(
  payload: SSOConfigurePayload,
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/sso/configure', payload);
  return data;
}
