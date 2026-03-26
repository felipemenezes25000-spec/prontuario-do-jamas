import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  patientId: string | null;
  patientName: string | null;
  resource: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: string;
}

export interface AuditFilters {
  action?: string;
  userId?: string;
  patientId?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters?: AuditFilters) => [...auditKeys.lists(), filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAuditLogs(filters?: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit', {
        params: filters,
      });
      return data;
    },
  });
}

export function useExportAuditCsv(filters?: AuditFilters) {
  return useQuery({
    queryKey: [...auditKeys.list(filters), 'csv'] as const,
    queryFn: async () => {
      const { data } = await api.get<Blob>('/audit/export', {
        params: filters,
        responseType: 'blob',
      });
      return data;
    },
    enabled: false, // triggered manually via refetch
  });
}
