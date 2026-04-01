import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface DataPortabilityDto {
  patientId: string;
  requestedBy: string;
  dataCategories: string[];
  format: 'JSON' | 'PDF' | 'FHIR';
  justification?: string;
}

export interface DataPortabilityRequest {
  requestId: string;
  patientId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: string;
  dataCategories: string[];
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface SessionTimeoutConfig {
  inactivityTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  warningBeforeTimeoutSeconds: number;
  applyToRoles: string[];
  updatedAt?: string;
}

export interface SetSessionTimeoutDto {
  inactivityTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  warningBeforeTimeoutSeconds: number;
  applyToRoles: string[];
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
  historyCount: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt?: string;
}

export interface SetPasswordPolicyDto {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
  historyCount: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface BackupStatus {
  lastBackupAt: string;
  nextScheduledAt: string;
  storageUsedGB: number;
  storageLimitGB: number;
  retentionDays: number;
  lastVerifiedAt?: string;
  status: 'HEALTHY' | 'WARNING' | 'ERROR';
  recentBackups: Array<{
    id: string;
    startedAt: string;
    completedAt?: string;
    sizeGB: number;
    status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  }>;
}

export interface TestRestoreDto {
  backupId: string;
  targetEnvironment: 'STAGING' | 'SANDBOX';
  notifyEmail?: string;
}

export interface TestRestoreResult {
  jobId: string;
  status: 'STARTED' | 'QUEUED';
  estimatedMinutes: number;
  startedAt: string;
}

export interface DpoDashboard {
  totalDataSubjects: number;
  portabilityRequests: { pending: number; completed: number; avgResponseHours: number };
  consentRecords: { total: number; active: number; revoked: number };
  dataBreaches: { total: number; reported: number; open: number };
  dpias: { total: number; approved: number; pending: number };
  sensitiveAccessEvents: { last30Days: number; flagged: number };
  updatedAt: string;
}

export interface CreateDpiaDto {
  title: string;
  description: string;
  dataController: string;
  processingPurpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  retentionPeriod: string;
  technicalMeasures: string[];
  organizationalMeasures: string[];
  risks: Array<{ description: string; likelihood: 'LOW' | 'MEDIUM' | 'HIGH'; impact: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}

export interface Dpia {
  id: string;
  title: string;
  description: string;
  dataController: string;
  processingPurpose: string;
  dataCategories: string[];
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface DpiaFilters {
  status?: Dpia['status'];
  riskLevel?: Dpia['riskLevel'];
  page?: number;
  limit?: number;
}

export interface SensitiveAccessCheckDto {
  userId: string;
  patientId: string;
  accessType: 'READ' | 'WRITE' | 'EXPORT';
  dataCategory: string;
  justification?: string;
}

export interface SensitiveAccessCheckResult {
  allowed: boolean;
  requiresJustification: boolean;
  flagged: boolean;
  reason?: string;
  auditEventId: string;
  checkedAt: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const governanceAdvancedKeys = {
  all: ['governance-advanced'] as const,
  portabilityStatus: (requestId: string) => [...governanceAdvancedKeys.all, 'portability', requestId] as const,
  timeoutConfig: () => [...governanceAdvancedKeys.all, 'session-timeout'] as const,
  passwordPolicy: () => [...governanceAdvancedKeys.all, 'password-policy'] as const,
  backupStatus: () => [...governanceAdvancedKeys.all, 'backup-recovery'] as const,
  dpoDashboard: () => [...governanceAdvancedKeys.all, 'dpo-dashboard'] as const,
  dpias: (filters?: DpiaFilters) => [...governanceAdvancedKeys.all, 'dpias', filters] as const,
};

// ============================================================================
// Data Portability
// ============================================================================

export function useRequestPortability() {
  return useMutation({
    mutationFn: async (data: DataPortabilityDto) => {
      const { data: res } = await api.post<DataPortabilityRequest>('/governance/data-portability', data);
      return res;
    },
  });
}

export function useGetPortabilityStatus(requestId: string) {
  return useQuery({
    queryKey: governanceAdvancedKeys.portabilityStatus(requestId),
    queryFn: async () => {
      const { data } = await api.get<DataPortabilityRequest>(`/governance/data-portability/${requestId}`);
      return data;
    },
    enabled: !!requestId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'PROCESSING' ? 5_000 : false;
    },
  });
}

// ============================================================================
// Session Timeout
// ============================================================================

export function useGetTimeoutConfig() {
  return useQuery({
    queryKey: governanceAdvancedKeys.timeoutConfig(),
    queryFn: async () => {
      const { data } = await api.get<SessionTimeoutConfig>('/governance/session-timeout');
      return data;
    },
  });
}

export function useSetTimeoutConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SetSessionTimeoutDto) => {
      const { data } = await api.put<SessionTimeoutConfig>('/governance/session-timeout', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: governanceAdvancedKeys.timeoutConfig() });
    },
  });
}

// ============================================================================
// Password Policy
// ============================================================================

export function useGetPasswordPolicy() {
  return useQuery({
    queryKey: governanceAdvancedKeys.passwordPolicy(),
    queryFn: async () => {
      const { data } = await api.get<PasswordPolicy>('/governance/password-policy');
      return data;
    },
  });
}

export function useSetPasswordPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SetPasswordPolicyDto) => {
      const { data } = await api.put<PasswordPolicy>('/governance/password-policy', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: governanceAdvancedKeys.passwordPolicy() });
    },
  });
}

// ============================================================================
// Backup & Recovery
// ============================================================================

export function useGetBackupStatus() {
  return useQuery({
    queryKey: governanceAdvancedKeys.backupStatus(),
    queryFn: async () => {
      const { data } = await api.get<BackupStatus>('/governance/backup-recovery');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useTestRestore() {
  return useMutation({
    mutationFn: async (dto: TestRestoreDto) => {
      const { data } = await api.post<TestRestoreResult>('/governance/backup-recovery/test-restore', dto);
      return data;
    },
  });
}

// ============================================================================
// DPO Dashboard
// ============================================================================

export function useGetDpoDashboard() {
  return useQuery({
    queryKey: governanceAdvancedKeys.dpoDashboard(),
    queryFn: async () => {
      const { data } = await api.get<DpoDashboard>('/governance/dpo-dashboard');
      return data;
    },
    refetchInterval: 120_000,
  });
}

// ============================================================================
// DPIA
// ============================================================================

export function useCreateDpia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDpiaDto) => {
      const { data } = await api.post<Dpia>('/governance/dpia', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: governanceAdvancedKeys.dpias() });
    },
  });
}

export function useListDpias(filters?: DpiaFilters) {
  return useQuery({
    queryKey: governanceAdvancedKeys.dpias(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Dpia[]; total: number }>('/governance/dpia', { params: filters });
      return data;
    },
  });
}

// ============================================================================
// Sensitive Data Check
// ============================================================================

export function useCheckSensitiveAccess() {
  return useMutation({
    mutationFn: async (dto: SensitiveAccessCheckDto) => {
      const { data } = await api.post<SensitiveAccessCheckResult>('/governance/sensitive-data/check', dto);
      return data;
    },
  });
}
