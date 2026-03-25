import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type AgentTaskType =
  | 'PREPARE_CONSULTATION'
  | 'PREFILL_FORM'
  | 'SUMMARIZE_PATIENT'
  | 'INBOX_TRIAGE'
  | 'PRIOR_AUTH'
  | 'REFERRAL'
  | 'FOLLOW_UP';

export type AgentTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
export type AgentTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  priority: AgentTaskPriority;
  patientId: string;
  patientName?: string;
  encounterId?: string;
  result?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentConfig {
  id: string;
  agentType: AgentTaskType;
  enabled: boolean;
  schedule?: string;
  parameters: Record<string, unknown>;
  lastRunAt?: string;
  successRate: number;
  totalRuns: number;
  tasksCompleted: number;
}

export interface AgentTaskFilters {
  status?: AgentTaskStatus;
  type?: AgentTaskType;
  priority?: AgentTaskPriority;
  patientId?: string;
  page?: number;
  limit?: number;
}

export interface AgentStats {
  totalTasks: number;
  completedToday: number;
  runningNow: number;
  errorRate: number;
  avgCompletionTimeMs: number;
  tasksByType: Record<string, number>;
}

export interface AgentExecutionLog {
  id: string;
  agentType: AgentTaskType;
  action: string;
  details: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const agentKeys = {
  all: ['ai', 'agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: AgentTaskFilters) => [...agentKeys.lists(), filters] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
  configs: () => [...agentKeys.all, 'configs'] as const,
  stats: () => [...agentKeys.all, 'stats'] as const,
  logs: () => [...agentKeys.all, 'logs'] as const,
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

export function useAgentConfigs() {
  return useQuery({
    queryKey: agentKeys.configs(),
    queryFn: async () => {
      const { data } = await api.get<AgentConfig[]>('/ai/agents/configs');
      return data;
    },
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: agentKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<AgentStats>('/ai/agents/stats');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useAgentExecutionLogs() {
  return useQuery({
    queryKey: agentKeys.logs(),
    queryFn: async () => {
      const { data } = await api.get<{ data: AgentExecutionLog[]; total: number }>('/ai/agents/logs');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useExecuteAgentTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: AgentTaskType;
      patientId: string;
      encounterId?: string;
      priority?: AgentTaskPriority;
    }) => {
      const { data } = await api.post<AgentTask>('/ai/agents/tasks', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
      qc.invalidateQueries({ queryKey: agentKeys.stats() });
    },
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { agentType: AgentTaskType; enabled: boolean; schedule?: string; parameters?: Record<string, unknown> }) => {
      const { data } = await api.patch<AgentConfig>(`/ai/agents/configs/${payload.agentType}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.configs() });
    },
  });
}

export function useCancelAgentTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await api.post<AgentTask>(`/ai/agents/tasks/${taskId}/cancel`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
      qc.invalidateQueries({ queryKey: agentKeys.stats() });
    },
  });
}
