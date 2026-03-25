import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type AgentTaskType = 'PREPARE_CONSULTATION' | 'PREFILL_FORM' | 'SUMMARIZE_PATIENT';
export type AgentTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  patientId: string;
  patientName?: string;
  encounterId?: string;
  result?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentTaskFilters {
  status?: AgentTaskStatus;
  type?: AgentTaskType;
  patientId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const agentKeys = {
  all: ['ai', 'agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: AgentTaskFilters) => [...agentKeys.lists(), filters] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useAgentTasks(filters?: AgentTaskFilters) {
  return useQuery({
    queryKey: agentKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: AgentTask[]; total: number }>('/ai/agents/tasks', {
        params: filters,
      });
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useAgentTask(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<AgentTask>(`/ai/agents/tasks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useExecuteAgentTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: AgentTaskType; patientId: string; encounterId?: string }) => {
      const { data } = await api.post<AgentTask>('/ai/agents/tasks', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}
