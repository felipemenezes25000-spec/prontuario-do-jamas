import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ── Audit Log ──────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
}

interface AuditLogFilters {
  search?: string;
  page?: number;
  limit?: number;
}

async function fetchAuditLog(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
  const { data } = await api.get<PaginatedResponse<AuditLogEntry>>('/admin/audit-log', { params: filters });
  return data;
}

export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => fetchAuditLog(filters),
  });
}

// ── LGPD Requests ──────────────────────────────────────────

export interface LgpdRequest {
  id: string;
  date: string;
  requester: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  description: string;
}

async function fetchLgpdRequests(): Promise<PaginatedResponse<LgpdRequest>> {
  const { data } = await api.get<PaginatedResponse<LgpdRequest>>('/admin/lgpd-requests');
  return data;
}

export function useLgpdRequests() {
  return useQuery({
    queryKey: ['lgpd-requests'],
    queryFn: fetchLgpdRequests,
  });
}
