import { useEffect, useState } from 'react';
import { MessageSquare, Plus, LifeBuoy } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { api, apiErrorMessage } from '@/lib/api';
import type { Client, Conversation, SupportTicket, TicketCategory, TicketPriority } from '@/lib/types';
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL } from '@/lib/types';
import { useTranslation } from 'react-i18next';

export default function ChatPage() {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [tab, setTab] = useState<'clients' | 'support'>('clients');
  const [loading, setLoading] = useState(true);
  const [newConv, setNewConv] = useState(false);
  const [newTicket, setNewTicket] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api.get<{ conversations: Conversation[] }>('/pro/conversations'),
        api.get<{ tickets: SupportTicket[] }>('/pro/tickets'),
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
    api
      .get<{ clients: Client[] }>('/pro/clients')
      .then((r) => setClients(r.data.clients))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = tab === 'clients' ? conversations : tickets.map((t) => t.conversation!).filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="page-title">Chat</h1>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setNewTicket(true)}>
            <LifeBuoy size={16} /> Suporte
          </button>
          <button className="btn-primary" onClick={() => setNewConv(true)}>
            <Plus size={16} /> Nova conversa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="card !p-0 overflow-hidden">
          <div className="grid grid-cols-2 border-b border-line">
            <button
              className={`py-3 text-sm font-medium ${
                tab === 'clients' ? 'border-b-2 border-brand text-brand' : 'text-muted'
              }`}
              onClick={() => {
                setTab('clients');
                setActive(null);
              }}
            >
              Clientes
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
              title={tab === 'clients' ? 'Sem conversas' : 'Sem tickets'}
              description={
                tab === 'clients' ? 'Inicia uma conversa com um cliente.' : 'Abre um ticket de suporte se precisares.'
              }
            />
          ) : (
            <ConversationList
              conversations={items}
              activeId={active?.id ?? null}
              onSelect={setActive}
              view="barber"
            />
          )}
        </div>

        <div>
          {active ? (
            <ChatWindow
              conversation={active}
              endpointBase="/pro/conversations"
              title={active.client?.name ?? active.ticket?.subject ?? 'Conversa'}
              subtitle={active.type === 'support' ? 'Suporte' : active.client?.email ?? ''}
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

      {newConv && (
        <NewConversationModal
          clients={clients}
          onClose={() => setNewConv(false)}
          onCreated={(c) => {
            setActive(c);
            void load();
          }}
        />
      )}
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

function NewConversationModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: Client[];
  onClose: () => void;
  onCreated: (c: Conversation) => void;
}) {
  const toast = useToast();
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    const { t } = useTranslation('pro');
    if (!clientId) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ conversation: Conversation }>('/pro/conversations', {
        clientId,
      });
      toast.success(t('common:notifications.created'));
      onCreated(data.conversation);
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
      title="Nova conversa"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onCreate()} disabled={busy}>
            {busy ? <Spinner /> : 'Iniciar'}
          </button>
        </>
      }
    >
      <div>
        <label className="label">Cliente</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </Modal>
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
    const { t } = useTranslation('pro');
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    try {
      await api.post('/pro/tickets', { subject, message, category, priority });
      toast.success(t('client:support.ticket_created'));
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
          <label className="label">Mensagem inicial</label>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
      </div>
    </Modal>
  );
}
