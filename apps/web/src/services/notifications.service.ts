import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useNotifications(page = 1) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', page],
    queryFn: () =>
      api
        .get('/notifications/me', { params: { page, pageSize: 10 } })
        .then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<{ unreadCount: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      api.get('/notifications/me/unread-count').then((r) => r.data),
    refetchInterval: 15_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({
        queryKey: ['notifications-unread-count'],
      });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({
        queryKey: ['notifications-unread-count'],
      });
    },
  });
}
