import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'REPLIED';

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  specialty: string | null;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'PATIENT' | 'DOCTOR' | 'NURSE' | 'STAFF';
  content: string;
  status: MessageStatus;
  createdAt: string;
  readAt: string | null;
}

export interface Conversation {
  id: string;
  subject: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface SendMessagePayload {
  conversationId?: string;
  recipientId: string;
  subject?: string;
  content: string;
}

export interface MessagingFilters {
  status?: 'OPEN' | 'CLOSED';
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const messagingKeys = {
  all: ['portal-messaging'] as const,
  conversations: (filters?: MessagingFilters) =>
    [...messagingKeys.all, 'conversations', filters] as const,
  messages: (conversationId: string) =>
    [...messagingKeys.all, 'messages', conversationId] as const,
  careTeam: () => [...messagingKeys.all, 'care-team'] as const,
  unreadCount: () => [...messagingKeys.all, 'unread-count'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useConversations(filters?: MessagingFilters) {
  return useQuery({
    queryKey: messagingKeys.conversations(filters),
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>(
        '/patient-portal/messaging/conversations',
        { params: filters },
      );
      return data;
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messagingKeys.messages(conversationId),
    queryFn: async () => {
      const { data } = await api.get<Message[]>(
        `/patient-portal/messaging/conversations/${conversationId}/messages`,
      );
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 10000,
  });
}

export function useCareTeam() {
  return useQuery({
    queryKey: messagingKeys.careTeam(),
    queryFn: async () => {
      const { data } = await api.get<CareTeamMember[]>(
        '/patient-portal/messaging/care-team',
      );
      return data;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: messagingKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>(
        '/patient-portal/messaging/unread-count',
      );
      return data.count;
    },
    refetchInterval: 30000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const { data } = await api.post<Message>(
        '/patient-portal/messaging/send',
        payload,
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: messagingKeys.conversations() });
      if (result.conversationId) {
        qc.invalidateQueries({
          queryKey: messagingKeys.messages(result.conversationId),
        });
      }
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await api.post(
        `/patient-portal/messaging/conversations/${conversationId}/read`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}
