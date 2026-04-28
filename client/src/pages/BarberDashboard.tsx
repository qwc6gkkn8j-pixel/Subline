import { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  DollarSign,
  Star,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Home,
  Calendar,
  User as UserIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Client, PlanType, Subscription, SubscriptionStatus } from '@/lib/types';
import { PLAN_LABEL, PLAN_PRICE } from '@/lib/types';

interface Stats {
  activeClients: number;
  monthlyRevenue: number;
  rating: number;
}

type ClientWithSub = Client & { subscriptions: Subscription[] };

export default function BarberDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<ClientWithSub[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientWithSub | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ClientWithSub | null>(null);

  const loadStats = async () => {
    try {
      const { data } = await api.get<Stats>('/barber/statistics');
      setStats(data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ clients: ClientWithSub[] }>('/barber/clients', {
        params: {
          q: q || undefined,
          status: statusFilter || undefined,
        },
      });
      setClients(data.clients);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadClients();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadClients, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  return (
    <AppShell
      title="My Clients"
      bottomNav={
        <BottomNav
          items={[
            { to: '/barber', icon: Home, label: 'Home' },
            { to: '/barber/clients', icon: UsersIcon, label: 'Clients' },
            { to: '/barber/new', icon: UserPlus, label: 'Add', primary: true },
            { to: '/barber/schedule', icon: Calendar, label: 'Schedule' },
            { to: '/barber/profile', icon: UserIcon, label: 'Profile' },
          ]}
        />
      }
    >
      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card bg-brand-gradient">
          <UsersIcon size={20} className="opacity-90" />
          <div>
            <p className="text-3xl font-bold">{stats?.activeClients ?? '—'}</p>
            <p className="text-xs opacity-90 mt-1">Active Clients</p>
          </div>
        </div>
        <div className="stat-card bg-accent">
          <DollarSign size={20} className="opacity-90" />
          <div>
            <p className="text-3xl font-bold">
              {stats ? formatCurrency(stats.monthlyRevenue) : '—'}
            </p>
            <p className="text-xs opacity-90 mt-1">Est. Monthly Revenue</p>
          </div>
        </div>
        <div className="card !bg-surface flex flex-col gap-2 !shadow-none">
          <Star size={20} className="text-warning fill-warning" />
          <div>
            <p className="text-3xl font-bold text-ink">
              {stats?.rating ? Number(stats.rating).toFixed(1) : '0.0'}
              <span className="text-base text-muted">/5</span>
            </p>
            <p className="text-xs text-muted mt-1">Client Rating</p>
          </div>
        </div>
      </section>

      {/* Header */}
      <section className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">My Clients</h2>
          <div className="flex flex-wrap gap-2 items-center flex-1 sm:justify-end">
            <div className="flex items-center gap-2 flex-1 sm:flex-none sm:w-64 px-3 h-9 border border-line rounded-button bg-white">
              <Search size={16} className="text-muted shrink-0" />
              <input
                placeholder="Search clients…"
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
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={() => setEditing('new')} className="btn-primary btn-sm">
              <UserPlus size={16} /> Add Client
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full py-10 text-center">
              <Spinner />
            </div>
          ) : clients.length === 0 ? (
            <div className="col-span-full py-10 text-center text-muted">
              <p className="text-base font-medium text-ink mb-1">No clients yet</p>
              <p className="text-sm">Add your first client to get started.</p>
            </div>
          ) : (
            clients.map((c) => <ClientCard key={c.id} client={c} onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />)
          )}
        </div>
      </section>

      <ClientFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          void loadClients();
          void loadStats();
        }}
      />
      <DeleteClientModal
        client={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          void loadClients();
          void loadStats();
        }}
      />
    </AppShell>
  );
}

function ClientCard({
  client,
  onEdit,
  onDelete,
}: {
  client: ClientWithSub;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sub = client.subscriptions?.[0];
  return (
    <div className="border border-line rounded-card p-4 flex gap-3">
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
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {sub ? (
            <>
              <span className={cn('badge', planBadgeClass(sub.planType))}>
                {PLAN_LABEL[sub.planType]}
              </span>
              <span
                className={
                  sub.status === 'active'
                    ? 'badge-success'
                    : sub.status === 'cancelled'
                      ? 'badge-danger'
                      : 'badge-muted'
                }
              >
                {sub.status}
              </span>
              <span className="text-xs text-muted">
                Renews {formatDate(sub.renewalDate)}
              </span>
            </>
          ) : (
            <span className="badge-muted">No subscription</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={onEdit}
          className="p-2 rounded-button text-muted hover:text-brand hover:bg-brand/10"
          aria-label="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-button text-muted hover:text-danger hover:bg-danger/10"
          aria-label="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function planBadgeClass(plan: PlanType): string {
  if (plan === 'gold') return 'bg-warning/15 text-warning';
  if (plan === 'silver') return 'bg-muted/15 text-ink';
  return 'bg-brand/10 text-brand';
}

// ────────────────────────────────────────────────────────────────────────────
// Add/Edit Client Modal
// ────────────────────────────────────────────────────────────────────────────
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
      setForm(emptyClientForm);
    } else {
      const sub = editing.subscriptions?.[0];
      setForm({
        fullName: editing.name,
        email: editing.email,
        phone: editing.phone ?? '',
        password: '',
        planType: sub?.planType ?? 'bronze',
        status: (sub?.status === 'active' ? 'active' : 'inactive'),
      });
    }
    setError(null);
  }, [editing]);

  const set = <K extends keyof ClientFormState>(k: K, v: ClientFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.fullName.trim().length < 2) return setError('Full name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Invalid email');
    if (isNew && form.password && form.password.length < 8)
      return setError('Password must be at least 8 characters');

    setBusy(true);
    try {
      if (isNew) {
        await api.post('/barber/clients', {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password || undefined, // server has a default
          planType: form.planType,
        });
        toast.success('Client added');
      } else {
        const c = editing as ClientWithSub;
        await api.put(`/barber/clients/${c.id}`, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          planType: form.planType,
          status: form.status,
        });
        toast.success('Client updated');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const planOptions: PlanType[] = ['bronze', 'silver', 'gold'];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add New Client' : 'Edit Client'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button form="client-form" type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Save Client'}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
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
          <label className="label">Phone (optional)</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        {isNew && (
          <div>
            <label className="label">Initial password (optional)</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Leave blank to use TempPass123!"
            />
            <p className="text-xs text-muted mt-1">
              The client logs in with this password. They can change it later.
            </p>
          </div>
        )}
        <div>
          <label className="label">Subscription Plan</label>
          <div className="grid grid-cols-3 gap-2">
            {planOptions.map((p) => (
              <PlanRadio
                key={p}
                value={p}
                current={form.planType}
                onChange={(v) => set('planType', v)}
              />
            ))}
          </div>
        </div>
        {!isNew && (
          <div>
            <label className="label">Subscription Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

function PlanRadio({
  value,
  current,
  onChange,
}: {
  value: PlanType;
  current: PlanType;
  onChange: (p: PlanType) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'h-auto py-3 px-2 rounded-button border text-sm transition-all',
        active ? 'border-brand bg-brand/5' : 'border-line bg-white hover:border-muted',
      )}
      aria-pressed={active}
    >
      <p className={cn('font-semibold', active ? 'text-brand' : 'text-ink')}>
        {PLAN_LABEL[value]}
      </p>
      <p className="text-xs text-muted">${PLAN_PRICE[value]}/mo</p>
    </button>
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
      await api.delete(`/barber/clients/${client.id}`);
      toast.success('Client deleted');
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
      title="Delete Client?"
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onDelete} disabled={busy}>
            {busy ? <Spinner /> : 'Delete'}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">
        Delete <span className="font-semibold">{client?.name}</span>? All subscription data will be
        lost.
      </p>
    </Modal>
  );
}
