import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';

interface NotificationsResp {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

export function useNotifications(pollMs = 30_000) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        api.get<NotificationsResp>('/notifications', { params: { limit: 20 } }),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setItems(list.data.notifications);
      setUnread(count.data.count);
    } catch {
      // ignore — banner will show stale state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await api.patch(`/notifications/${id}/read`);
        await refresh();
      } catch {
        // ignore
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      await refresh();
    } catch {
      // ignore
    }
  }, [refresh]);

  return { items, unread, loading, refresh, markRead, markAllRead };
}
