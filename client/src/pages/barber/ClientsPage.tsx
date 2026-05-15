import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Phone as PhoneIcon,
  Mail as MailIcon,
  Scissors,
  CreditCard,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type {
  Client,
  Cut,
  Plan,
  PlanType,
  Subscription,
  SubscriptionStatus,
} from '@/lib/types';
import { PLAN_LABEL, PLAN_PRICE, CLIENT_SEGMENT_LABEL, CLIENT_SEGMENT_BADGE } from '@/lib/types';

type ClientWithSub = Client & { subscriptions: Subscription[] };

export default function ClientsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [clients, setClients] = useState<ClientWithSub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientWithSub | 'new' | null>(
    params.get('new') ? 'new' : null,
  );
  const [deleting, setDeleting] = useState<ClientWithSub | null>(null);
  const [registering, setRegistering] = useState<ClientWithSub | null>(null);
  const [paymentLink, setPaymentLink] = useState<ClientWithSub | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        api.get<{ clients: ClientWithSub[] }>('/pro/clients', {
          params: { q: q || undefined, status: statusFilter || undefined },
        }),
        api.get<{ plans: Plan[] }>('/pro/plans'),
      ]);
      setClients(c.data.clients);
      setPlans(p.data.plans);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink">Os meus clientes</h1>
        <button
          onClick={() => {
            setEditing('new');
            setParams({});
          }}
          className="btn-primary"
        >
          <UserPlus size={18} /> Novo cliente
        </button>
      </div>

      <section className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 h-9 border border-line rounded-button bg-white">
            <Search size={16} className="text-muted shrink-0" />
            <input
              placeholder="Pesquisar clientes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!border-0 !ring-0 !p-0 !h-auto bg-transparent flex-1"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | '')}
            className="!h-9 !py-1 text-sm"
          >
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="cancelled">Cancelados</option>
            <option value="payment_failed">Pagamento falhou</option>
          </select>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center py-10">
              <Spinner />
            </div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Sem clientes"
              description="Adiciona o teu primeiro cliente para começar."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clients.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  onEdit={() => setEditing(c)}
                  onDelete={() => setDeleting(c)}
                  onRegisterCut={() => setRegistering(c)}
                  onPaymentLink={() => setPaymentLink(c)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <ClientFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void load()}
      />
      <DeleteClientModal
        client={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => void load()}
      />
      <RegisterCutModal
        client={registering}
        onClose={() => setRegistering(null)}
        onDone={() => void load()}
      />
      <PaymentLinkModal
        client={paymentLink}
        plans={plans}
        onClose={() => setPaymentLink(null)}
      />
    </div>
  );
}

function ClientCard({
  client,
  onEdit,
  onDelete,
  onRegisterCut,
  onPaymentLink,
}: {
  client: ClientWithSub;
  onEdit: () => void;
  onDelete: () => void;
  onRegisterCut: () => void;
  onPaymentLink: () => void;
}) {
  const sub = client.subscriptions?.[0];
  const used = sub?.cutsUsed ?? 0;
  const total = sub?.cutsTotal ?? sub?.plan?.cutsPerMonth ?? null;
  const remaining = total !== null && total !== undefined ? Math.max(0, total - used) : null;

  return (
    <div className="border border-line rounded-card p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <Avatar name={client.name} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">{client.name}</p>
          <p className="text-xs text-muted truncate flex items-center gap-1">
            <MailIcon size={12} /> {client.email}
          </p>
          {client.phone && (
            <p className="text-xs text-muted truncate flex items-center gap-1">
              <PhoneIcon size={12} /> {client.phone}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={onEdit}
            className="p-2 rounded-button text-muted hover:text-brand hover:bg-brand/10"
            aria-label="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-button text-muted hover:text-danger hover:bg-danger/10"
            aria-label="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {client.segment && (
          <span className={CLIENT_SEGMENT_BADGE[client.segment]}>
            {CLIENT_SEGMENT_LABEL[client.segment]}
          </span>
        )}
        {sub ? (
          <>
            <span className="badge-brand">{sub.plan?.name ?? sub.planType}</span>
            <span
              className={cn(
                'badge',
                sub.status === 'active'
                  ? 'badge-success'
                  : sub.status === 'cancelled'
                    ? 'badge-danger'
                    : 'badge-muted',
              )}
            >
              {sub.status}
            </span>
            {remaining !== null && (
              <span className="text-muted">
                {used}/{total} cortes este mês
              </span>
            )}
            <span className="text-muted">Renova {formatDate(sub.renewalDate)}</span>
          </>
        ) : (
          <span className="badge-muted">Sem subscrição</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRegisterCut}
          className="btn-outline btn-sm"
          disabled={!sub || sub.status !== 'active'}
        >
          <Scissors size={14} /> Registar corte
        </button>
        <button onClick={onPaymentLink} className="btn-outline btn-sm">
          <CreditCard size={14} /> Link de pagamento
        </button>
      </div>
    </div>
  );
}

interface ClientFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  planType: PlanType;
  status: 'active' | 'inactive';
}

const emptyClientForm: ClientFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  planType: 'bronze',
  status: 'active',
};

function ClientFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: ClientWithSub | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editing === 'new';
  const open = editing !== null;
  const [form, setForm] = useState<ClientFormState>(emptyClientForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    if (editing === 'new') {
      setForm({ ...emptyClientForm });
    } else {
      const sub = editing.subscriptions?.[0];
      setForm({
        fullName: editing.name,
        email: editing.email,
        phone: editing.phone ?? '',
        password: '',
        planType: sub?.planType ?? 'bronze',
        status: sub?.status === 'active' ? 'active' : 'inactive',
      });
    }
    setError(null);
  }, [editing]);

  const set = <K extends keyof ClientFormState>(k: K, v: ClientFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.fullName.trim().length < 2) return setError('Nome obrigatório');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Email inválido');
    if (isNew && form.password && form.password.length < 8)
      return setError('Password ≥ 8 caracteres');

    setBusy(true);
    try {
      if (isNew) {
        await api.post('/pro/clients', {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password || undefined,
          planType: form.planType,
        });
        toast.success('Cliente criado');
      } else {
        const c = editing as ClientWithSub;
        await api.put(`/pro/clients/${c.id}`, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          planType: form.planType,
          status: form.status,
        });
        toast.success('Cliente atualizado');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Novo cliente' : 'Editar cliente'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button form="client-form" type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Telefone (opcional)</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        {isNew && (
          <div>
            <label className="label">Password inicial (opcional)</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="ChangeMe123! por defeito"
            />
          </div>
        )}
        <div>
          <label className="label">Plano</label>
          <select value={form.planType} onChange={(e) => set('planType', e.target.value as PlanType)}>
            {(['bronze', 'silver', 'gold'] as PlanType[]).map((p) => (
              <option key={p} value={p}>
                {PLAN_LABEL[p]} · {formatCurrency(PLAN_PRICE[p])}
              </option>
            ))}
          </select>
        </div>
        {!isNew && (
          <div>
            <label className="label">Estado</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        )}
        {error && (
          <div className="bg-danger/10 text-danger text-sm rounded-button px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}

function DeleteClientModal({
  client,
  onClose,
  onDeleted,
}: {
  client: ClientWithSub | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!client) return;
    setBusy(true);
    try {
      await api.delete(`/pro/clients/${client.id}`);
      toast.success('Cliente eliminado');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title="Eliminar cliente?"
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={onDelete} disabled={busy}>
            {busy ? <Spinner /> : 'Eliminar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">
        Eliminar <span className="font-semibold">{client?.name}</span>? Todos os dados de subscrição
        serão perdidos.
      </p>
    </Modal>
  );
}

function RegisterCutModal({
  client,
  onClose,
  onDone,
}: {
  client: ClientWithSub | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<Cut[]>([]);

  useEffect(() => {
    if (!client) return;
    setNotes('');
    api
      .get<{ cuts: Cut[] }>(`/pro/clients/${client.id}/cuts`)
      .then((r) => setHistory(r.data.cuts))
      .catch(() => setHistory([]));
  }, [client]);

  const onSubmit = async () => {
    if (!client) return;
    setBusy(true);
    try {
      await api.post(`/pro/clients/${client.id}/register-cut`, {
        notes: notes || undefined,
      });
      toast.success('Corte registado');
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title="Registar corte"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? <Spinner /> : 'Registar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Vais registar um corte para <span className="font-semibold text-ink">{client?.name}</span>.
        </p>
        <div>
          <label className="label">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes do corte…"
          />
        </div>
        {history.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Histórico recente</p>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {history.slice(0, 5).map((h) => (
                <li key={h.id} className="flex justify-between border-b border-line py-1">
                  <span className="text-ink">{formatDate(h.date)}</span>
                  <span className="text-muted truncate ml-2">{h.notes ?? '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentLinkModal({
  client,
  plans,
  onClose,
}: {
  client: ClientWithSub | null;
  plans: Plan[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState<string>('');
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    const sub = client.subscriptions?.[0];
    setPlanId(sub?.planId ?? plans[0]?.id ?? '');
    setLink(null);
    setError(null);
  }, [client, plans]);

  const onGenerate = async () => {
    if (!client || !planId) return;
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      const { data } = await api.post<{ url: string }>(
        `/pro/clients/${client.id}/payment-link`,
        { planId },
      );
      setLink(data.url);
      toast.success('Link gerado');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title="Link de pagamento"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Fechar
          </button>
          <button className="btn-primary" onClick={() => void onGenerate()} disabled={busy || !planId}>
            {busy ? <Spinner /> : 'Gerar link'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Gera um link Stripe para <span className="text-ink font-semibold">{client?.name}</span>{' '}
          pagar a subscrição.
        </p>
        <div>
          <label className="label">Plano</label>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">—</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatCurrency(p.price)}
              </option>
            ))}
          </select>
        </div>
        {link && (
          <div className="bg-success/10 text-success rounded-button px-3 py-2 text-sm break-all">
            {link}
          </div>
        )}
        {error && (
          <div className="bg-warning/10 text-warning rounded-button px-3 py-2 text-sm">
            {error}{' '}
            {error.toLowerCase().includes('stripe') && (
              <span className="block text-xs text-muted mt-1">
                Stripe ainda não configurado — esta função vai funcionar quando ligares a tua conta na
                página de Perfil.
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
