import { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatRelative } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { Conversation, Message, Role } from '@/lib/types';

type MessagesEndpoint = (id: string) => string;

interface Props {
  conversation: Conversation;
  /** /barber/conversations or /client/conversations */
  endpointBase: string;
  /** Optional override of the GET messages url (defaults to `${endpointBase}/${id}/messages`) */
  messagesUrl?: MessagesEndpoint;
  /** Title for the header (other party name) */
  title: string;
  subtitle?: string;
  /** Polling interval in ms (default 5s) */
  pollMs?: number;
  /** Show a back button (mobile master/detail) */
  onBack?: () => void;
}

export function ChatWindow({
  conversation,
  endpointBase,
  messagesUrl,
  title,
  subtitle,
  pollMs = 5000,
  onBack,
}: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const url = messagesUrl
    ? messagesUrl(conversation.id)
    : `${endpointBase}/${conversation.id}/messages`;

  const refresh = async () => {
    try {
      const { data } = await api.get<{ messages: Message[] }>(url);
      setMessages(data.messages);
    } catch {
      // ignore polling errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void refresh();
    // mark read silently
    void api.post(`${endpointBase}/${conversation.id}/read`).catch(() => undefined);
    if (!pollMs) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, endpointBase, pollMs]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ message: Message }>(url, { content });
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[640px] bg-white rounded-card border border-line overflow-hidden">
      <header className="px-4 py-3 border-b border-line flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-1.5 -ml-1 rounded-button hover:bg-surface"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar name={title} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-surface/50 px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted py-10">Envia a primeira mensagem.</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} myRole={user?.role} />)
        )}
      </div>

      <form onSubmit={onSend} className="p-3 border-t border-line flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreve uma mensagem…"
          className="flex-1 !h-10"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="btn-primary !h-10 !px-3"
          aria-label="Enviar"
        >
          {busy ? <Spinner /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function Bubble({ message, myRole }: { message: Message; myRole?: Role }) {
  const mine = myRole === message.senderRole;
  const isSystem = message.type === 'system';
  if (isSystem) {
    return (
      <p className="text-center text-[11px] text-muted py-1">{message.content}</p>
    );
  }
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-card px-3 py-2 shadow-card text-sm leading-relaxed',
          mine ? 'bg-brand text-white rounded-br-sm' : 'bg-white text-ink rounded-bl-sm',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn('text-[10px] mt-1', mine ? 'text-white/70' : 'text-muted')}>
          {formatRelative(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
