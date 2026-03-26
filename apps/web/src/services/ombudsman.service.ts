import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface OmbudsmanTicket {
  id: string;
  ticketNumber: string;
  type: string;
  subject: string;
  description: string;
  contactName: string | null;
  department: string | null;
  isAnonymous: boolean;
  status: string;
  slaDeadline: string;
  responses: Array<{ response: string; respondedBy: string; respondedAt: string; newStatus: string }>;
  createdAt: string;
}

export interface OmbudsmanDashboard {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  slaCompliancePct: number;
  byType: Array<{ type: string; count: number }>;
  byDepartment: Array<{ department: string; count: number }>;
  avgResolutionDays: number;
  monthlyTrend: Array<{ month: string; count: number }>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const ombudsmanKeys = {
  all: ['ombudsman'] as const,
  tickets: (filters?: Record<string, unknown>) => [...ombudsmanKeys.all, 'tickets', filters] as const,
  dashboard: () => [...ombudsmanKeys.all, 'dashboard'] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useOmbudsmanTickets(filters?: {
  type?: string;
  status?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ombudsmanKeys.tickets(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<OmbudsmanTicket>>('/ombudsman/tickets', { params: filters });
      return data;
    },
  });
}

export function useOmbudsmanDashboard() {
  return useQuery({
    queryKey: ombudsmanKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<OmbudsmanDashboard>('/ombudsman/dashboard');
      return data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      type: string;
      subject: string;
      description: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      department?: string;
      isAnonymous: boolean;
    }) => {
      const { data } = await api.post('/ombudsman/tickets', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ombudsmanKeys.all });
    },
  });
}

export function useRespondTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: {
      id: string;
      response: string;
      status: string;
    }) => {
      const { data } = await api.patch(`/ombudsman/tickets/${id}/respond`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ombudsmanKeys.all });
    },
  });
}
