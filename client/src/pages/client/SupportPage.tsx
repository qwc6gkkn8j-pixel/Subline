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
}

const CATEGORY_OPTIONS: TicketCategory[] = ['payment', 'account', 'booking', 'other'];

export default function SupportPage() {
    const { t } = useTranslation('client');
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [newForm, setNewForm] = useState({ subject: '', category: 'other' as TicketCategory, message: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<TicketsResp>('/support/tickets');
      setTickets(data.tickets);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreateTicket = async () => {
    if (!newForm.subject.trim() || !newForm.message.trim()) {
      toast.error(t('support.subject_placeholder'));
      return;
    }
    try {
      await api.post('/support/tickets', {
        subject: newForm.subject,
        category: newForm.category,
        priority: 'medium',
        message: newForm.message,
      });
      toast.success(t('support.ticket_created'));
      setNewForm({ subject: '', category: 'other', message: '' });
      setCreating(false);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink mr-auto">{t('support.title')}</h1>
        <button className="btn-primary text-sm" onClick={() => setCreating(true)}>
          <MessageSquare size={14} /> Novo ticket
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LifeBuoy}
            title={t('support.no_tickets')}
            description={t('support.no_tickets_desc')}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className="w-full card hover:shadow-lg transition text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink truncate">{t.subject}</h3>
                  <p className="text-xs text-muted">{TICKET_CATEGORY_LABEL[t.category]}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={t.status === 'resolved' ? 'badge-success' : t.status === 'in_progress' ? 'badge-accent' : 'badge-muted'}>
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted mt-2">{formatRelative(t.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <Modal
          open
          onClose={() => setCreating(false)}
          title="Novo ticket de suporte"
          footer={
            <>
              <button className="btn-ghost" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={() => void handleCreateTicket()}>
                Criar
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">{t('common:fields.subject')} *</label>
              <input
                value={newForm.subject}
                onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
                placeholder={t('support.subject_placeholder')}
                required
              />
            </div>
            <div>
              <label className="label">{t('support.category_label')}</label>
              <select
                value={newForm.category}
                onChange={(e) => setNewForm({ ...newForm, category: e.target.value as TicketCategory })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {TICKET_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('common:fields.message')} *</label>
              <textarea
                rows={4}
                value={newForm.message}
                onChange={(e) => setNewForm({ ...newForm, message: e.target.value })}
                placeholder={t('support.message_placeholder')}
                required
              />
            </div>
          </div>
        </Modal>
      )}

      {active && (
        <Modal
          open
          onClose={() => setActive(null)}
          title={`Ticket: ${active.subject}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted">Categoria</p>
                <p className="font-medium">{TICKET_CATEGORY_LABEL[active.category]}</p>
              </div>
              <div>
                <p className="text-muted">Status</p>
                <p className="font-medium">{TICKET_STATUS_LABEL[active.status]}</p>
              </div>
              <div>
                <p className="text-muted">Prioridade</p>
                <p className="font-medium">{TICKET_PRIORITY_LABEL[active.priority]}</p>
              </div>
            </div>
            <ChatWindow
              conversation={{
                id: active.id,
                type: 'support' as const,
                barberId: null,
                clientId: null,
                adminId: null,
                lastMessageAt: null,
                createdAt: active.createdAt,
                updatedAt: active.updatedAt,
              }}
              endpointBase="/support/tickets"
              messagesUrl={(id) => `/support/tickets/${id}/messages`}
              title={active.subject}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
