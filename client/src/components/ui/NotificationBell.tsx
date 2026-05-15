import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelative } from '@/lib/utils';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, unread, markRead, markAllRead } = useNotifications();

  const handleNotificationClick = async (n: typeof items[0]) => {
    // Mark as read if unread
    if (!n.isRead) {
      await markRead(n.id);
    }
    // Navigate to deepLink if available
    const deepLink = (n.data as Record<string, unknown>)?.deepLink as string | undefined;
    if (deepLink) {
      setOpen(false);
      navigate(deepLink);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-button hover:bg-surface flex items-center justify-center text-ink"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 max-w-[92vw] bg-card border border-line rounded-card shadow-card-lg overflow-hidden z-40 animate-fade-in">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Notificações</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs text-brand inline-flex items-center gap-1 hover:underline"
                >
                  <CheckCheck size={12} /> Marcar lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">Sem notificações.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((n) => (
                    <li key={n.id} className={n.isRead ? 'bg-card' : 'bg-brand/10'}>
                      <button
                        type="button"
                        onClick={() => void handleNotificationClick(n)}
                        className="w-full text-left px-4 py-3 hover:bg-surface"
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{n.title}</p>
                            {n.body && <p className="text-xs text-muted line-clamp-2">{n.body}</p>}
                            <p className="text-[11px] text-muted mt-1">{formatRelative(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
