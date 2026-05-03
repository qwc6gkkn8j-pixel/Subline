import { useEffect, useState } from 'react';
import { MessageSquare, Plus, LifeBuoy } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { api, apiErrorMessage } from '@/lib/api';
import type {
  Conversation,
  SupportTicket,
  TicketCategory,
  TicketPriority,
} from '@/lib/types';
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL } from '@/lib/types';

export default function ChatPage() {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [tab, setTab] = useState<'barber' | 'support'>('barber');
  const [loading, setLoading] = useState(true);
  const [newTicket, setNewTicket] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api.get<{ conversations: Conversation[] }>('/client/conversations'),
        api.get<{ tickets: SupportTicket[] }>('/client/tickets'),
      ]);
      setConversations(c.data.conversations);
      setTickets(t.data.tickets);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startBarberConv = async () => {
    try {
      const { data } = await api.post<{ conversation: Conversation }>(
        '/client/conversations/with-barber',
      );
      setActive(data.conversation);
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const items = tab === 'barber' ? conversations : tickets.map((t) => t.conversation!).filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink">Chat</h1>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setNewTicket(true)}>
            <LifeBuoy size={16} /> Suporte
          </button>
          <button className="btn-primary" onClick={() => void startBarberConv()}>
            <Plus size={16} /> Falar com barbeiro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="card !p-0 overflow-hidden">
          <div className="grid grid-cols-2 border-b border-line">
            <button
              className={`py-3 text-sm font-medium ${
                tab === 'barber' ? 'border-b-2 border-brand text-brand' : 'text-muted'
              }`}
              onClick={() => {
                setTab('barber');
                setActive(null);
              }}
            >
              Barbeiro
            </button>
            <button
              className={`py-3 text-sm font-medium ${
                tab === 'support' ? 'border-b-2 border-brand text-brand' : 'text-muted'
              }`}
              onClick={() => {
                setTab('support');
                setActive(null);
              }}
            >
              Suporte
            </button>
          </div>
          {loading ? (
            <div className="text-center py-10">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={tab === 'barber' ? 'Sem conversas' : 'Sem tickets'}
              description={
                tab === 'barber'
                  ? 'Inicia uma conversa com o teu barbeiro.'
                  : 'Abre um ticket de suporte se precisares de ajuda.'
              }
            />
          ) : (
            <ConversationList
              conversations={items}
              activeId={active?.id ?? null}
              onSelect={setActive}
              view="client"
            />
          )}
        </div>

        <div>
          {active ? (
            <ChatWindow
              conversation={active}
              endpointBase="/client/conversations"
              title={active.barber?.name ?? active.ticket?.subject ?? 'Conversa'}
              subtitle={active.type === 'support' ? 'Suporte' : ''}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="card text-center py-12 text-muted">
              <MessageSquare size={28} className="mx-auto mb-3 text-muted/60" />
              Seleciona uma conversa para começares.
            </div>
          )}
        </div>
      </div>

      {newTicket && (
        <NewTicketModal
          onClose={() => setNewTicket(false)}
          onCreated={() => {
            setTab('support');
            void load();
          }}
        />
      )}
    </div>
  );
}

function NewTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    try {
      await api.post('/client/tickets', { subject, message, category, priority });
      toast.success('Ticket aberto');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Abrir ticket de suporte"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onCreate()} disabled={busy}>
            {busy ? <Spinner /> : 'Abrir'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Assunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
            >
              {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {TICKET_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              {(['low', 'medium', 'high'] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Mensagem</label>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
      </div>
    </Modal>
  );
}
