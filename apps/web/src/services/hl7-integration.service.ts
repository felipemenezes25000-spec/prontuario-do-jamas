import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type HL7Direction = 'INBOUND' | 'OUTBOUND';
export type HL7MessageType = 'ADT' | 'ORM' | 'ORU' | 'DFT';
export type HL7ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type HL7MessageStatus = 'RECEIVED' | 'PROCESSED' | 'ERROR';

export interface HL7Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  direction: HL7Direction;
  messageType: HL7MessageType;
  status: HL7ConnectionStatus;
  lastMessageAt: string | null;
  messagesProcessed: number;
}

export interface HL7Message {
  id: string;
  connectionId: string;
  messageType: HL7MessageType;
  triggerEvent: string;
  rawMessage: string;
  parsed: Record<string, unknown> | null;
  status: HL7MessageStatus;
  processedAt: string | null;
}

export interface HL7Stats {
  totalConnections: number;
  activeConnections: number;
  totalMessagesProcessed: number;
  messagesLast24h: number;
  errorRate: number;
}

export interface CreateConnectionDto {
  name: string;
  host: string;
  port: number;
  direction: HL7Direction;
  messageType: HL7MessageType;
}

export interface ListMessagesParams {
  page?: number;
  pageSize?: number;
  status?: HL7MessageStatus;
}

// ============================================================================
// Query Keys
// ============================================================================

export const hl7Keys = {
  all: ['hl7'] as const,
  connections: () => [...hl7Keys.all, 'connections'] as const,
  messages: (connectionId: string, params?: ListMessagesParams) =>
    [...hl7Keys.all, 'messages', connectionId, params] as const,
  stats: () => [...hl7Keys.all, 'stats'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useHL7Connections() {
  return useQuery({
    queryKey: hl7Keys.connections(),
    queryFn: async () => {
      const { data } = await api.get<{ data: HL7Connection[]; total: number }>(
        '/integrations/hl7/connections',
      );
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useHL7Messages(connectionId: string, params?: ListMessagesParams) {
  return useQuery({
    queryKey: hl7Keys.messages(connectionId, params),
    queryFn: async () => {
      const { data } = await api.get<{ data: HL7Message[]; total: number }>(
        `/integrations/hl7/connections/${connectionId}/messages`,
        { params },
      );
      return data;
    },
    enabled: !!connectionId,
  });
}

export function useHL7Stats() {
  return useQuery({
    queryKey: hl7Keys.stats(),
    queryFn: async () => {
      const { data } = await api.get<HL7Stats>('/integrations/hl7/stats');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateConnectionDto) => {
      const { data } = await api.post<HL7Connection>('/integrations/hl7/connections', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hl7Keys.connections() });
      qc.invalidateQueries({ queryKey: hl7Keys.stats() });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ success: boolean; latencyMs: number; error?: string }>(
        `/integrations/hl7/connections/${id}/test`,
      );
      return data;
    },
  });
}
