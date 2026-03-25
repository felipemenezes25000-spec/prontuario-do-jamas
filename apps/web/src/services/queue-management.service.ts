import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type TicketStatus = 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW';
export type TicketCategory = 'GENERAL' | 'PRIORITY' | 'EMERGENCY' | 'RETURN' | 'EXAM';

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  patientName?: string;
  status: TicketStatus;
  counter?: string;
  calledAt?: string;
  issuedAt: string;
  completedAt?: string;
  estimatedWaitMinutes?: number;
}

export interface QueueDisplay {
  currentTicket?: QueueTicket;
  nextTickets: QueueTicket[];
  counters: Array<{
    name: string;
    currentTicket?: string;
    status: 'OPEN' | 'CLOSED' | 'BREAK';
  }>;
}

export interface QueueMetrics {
  averageWaitMinutes: number;
  servicesPerHour: number;
  totalWaiting: number;
  totalServedToday: number;
  noShowCount: number;
  waitTimeByCategory: Record<string, number>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const queueKeys = {
  all: ['queue'] as const,
  tickets: () => [...queueKeys.all, 'tickets'] as const,
  display: () => [...queueKeys.all, 'display'] as const,
  metrics: () => [...queueKeys.all, 'metrics'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useQueueTickets() {
  return useQuery({
    queryKey: queueKeys.tickets(),
    queryFn: async () => {
      const { data } = await api.get<{ data: QueueTicket[]; total: number }>('/queue/tickets');
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useQueueDisplay() {
  return useQuery({
    queryKey: queueKeys.display(),
    queryFn: async () => {
      const { data } = await api.get<QueueDisplay>('/queue/display');
      return data;
    },
    refetchInterval: 3000,
  });
}

export function useQueueMetrics() {
  return useQuery({
    queryKey: queueKeys.metrics(),
    queryFn: async () => {
      const { data } = await api.get<QueueMetrics>('/queue/metrics');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useIssueTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { category: TicketCategory; patientName?: string }) => {
      const { data } = await api.post<QueueTicket>('/queue/tickets', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

export function useCallNext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { counter: string; category?: TicketCategory }) => {
      const { data } = await api.post<QueueTicket>('/queue/call-next', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

export function useCompleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data } = await api.post<QueueTicket>(`/queue/tickets/${ticketId}/complete`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}
