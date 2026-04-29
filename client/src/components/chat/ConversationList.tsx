import { Avatar } from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import type { Conversation } from '@/lib/types';

interface Props {
  conversations: Conversation[];
  activeId?: string | null;
  onSelect: (c: Conversation) => void;
  /** Choose which side ("the other party") to show as the title for the current viewer */
  view?: 'barber' | 'client' | 'admin';
}

export function ConversationList({ conversations, activeId, onSelect, view = 'barber' }: Props) {
  if (conversations.length === 0) {
    return <p className="p-6 text-sm text-muted text-center">Sem conversas ainda.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {conversations.map((c) => {
        const title =
          view === 'barber'
            ? c.client?.name ?? 'Cliente'
            : view === 'client'
              ? c.barber?.name ?? 'Barbeiro'
              : c.ticket?.subject ?? c.requester?.fullName ?? 'Conversa';
        const subtitle =
          c.lastMessage?.content ??
          (c.type === 'support' ? 'Pedido de suporte' : 'Sem mensagens');
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-surface flex items-start gap-3',
                activeId === c.id && 'bg-brand/5',
              )}
            >
              <Avatar name={title} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink truncate">{title}</p>
                  {c.lastMessageAt && (
                    <span className="text-[11px] text-muted shrink-0">
                      {formatRelative(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted truncate">{subtitle}</p>
              </div>
              {(c.unreadCount ?? 0) > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {c.unreadCount}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

