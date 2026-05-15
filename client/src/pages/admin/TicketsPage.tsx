import { useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { api, apiErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@/lib/types';
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
} from '@/lib/types';
import { useTranslation } from 'react-i18next';

interface TicketsResp {
  tickets: SupportTicket[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'medium', 'high'];
const CATEGORY_OPTIONS: TicketCategory[] = ['payment', 'account', 'booking', 'other'];

export default function TicketsPage() {
    const { t } = useTranslation('admin');
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [active, setActive] = useState<SupportTicket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<TicketsResp>('/admin/tickets', {
        params: {
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          priority: priorityFilter || undefined,
          limit: 50,
        },
      });
      setTickets(data.tickets);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, priorityFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="page-title mr-auto">{t('tickets.title')}</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
          className="!h-9 !py-1 text-sm"
        >
          <option value="">{t('common:fields.status')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | '')}
          className="!h-9 !py-1 text-sm"
        >
          <option value="">{t('common:fields.category')}</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {TICKET_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
          className="!h-9 !py-1 text-sm"
        >
          <option value="">{t('common:fields.priority')}</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LifeBuoy}
            title={t('tickets.no_tickets')}
            description="Pedidos de suporte aparecem aqui assim que utilizadores os abrirem."
          />
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActive(t)}
                  className="w-full text-left px-4 py-4 hover:bg-surface flex items-start gap-3"
                >
                  <span className="w-9 h-9 rounded-button bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <MessageSquare size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink truncate">{t.subject}</p>
                      <PriorityBadge p={t.priority} />
                      <StatusBadge s={t.status} />
                      <span className="badge-muted">{TICKET_CATEGORY_LABEL[t.category]}</span>
                    </div>
                    <p className="text-xs text-muted truncate mt-1">
                      {t.requester ? `${t.requester.fullName} (${t.requester.role})` : 'Anónimo'} ·{' '}
                      {formatRelative(t.createdAt)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {active && (
        <TicketDetailModal
          ticket={active}
          onClose={() => setActive(null)}
          onUpdated={() => void load()}
        />
      )}
    </div>
  );
}

function PriorityBadge({ p }: { p: TicketPriority }) {
  if (p === 'high') return <span className="badge-danger">Alta</span>;
  if (p === 'low') return <span className="badge-muted">Baixa</span>;
  return <span className="badge-warning">Média</span>;
}

function StatusBadge({ s }: { s: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    open: 'badge-brand',
    in_progress: 'badge-accent',
    resolved: 'badge-success',
    closed: 'badge-muted',
  };
  return <span className={map[s]}>{TICKET_STATUS_LABEL[s]}</span>;
}

function TicketDetailModal({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/tickets/${ticket.id}`, {
        status,
        priority,
        assignToMe: true,
      });
      toast.success(t('common:notifications.updated'));
      onUpdated();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Build a synthetic conversation object for ChatWindow.
  // Admin has dedicated /admin/conversations/:id/{messages,read} endpoints.
  const conversation = ticket.conversation ?? {
    id: ticket.conversationId,
    type: 'support' as const,
    barberId: null,
    clientId: null,
    adminId: null,
    lastMessageAt: null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.subject}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Fechar
          </button>
          <button className="btn-primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? <Spinner /> : t('common:save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-muted">
          Pedido por: <span className="text-ink font-medium">{ticket.requester?.fullName}</span> (
          {ticket.requester?.email}) · {ticket.requester?.role}
        </div>

        <ChatWindow
          conversation={conversation}
          endpointBase="/admin/conversations"
          title={ticket.subject}
          subtitle={`${ticket.requester?.fullName ?? 'Requerente'} · ${TICKET_CATEGORY_LABEL[ticket.category]}`}
        />
      </div>
    </Modal>
  );
}
