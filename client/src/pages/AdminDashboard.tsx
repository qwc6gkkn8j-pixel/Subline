import { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Home,
  BarChart3,
  Settings,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Role, User, UserStatus } from '@/lib/types';

interface KpiData {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  growthPercent: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const toast = useToast();
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [sort, setSort] = useState<'createdAt' | 'name' | 'email' | 'role' | 'status'>('createdAt');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const loadKpi = async () => {
    try {
      const { data } = await api.get<KpiData>('/admin/dashboard');
      setKpi(data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<UsersResponse>('/admin/users', {
        params: {
          page,
          limit: PAGE_SIZE,
          q: q || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          sort,
        },
      });
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKpi();
  }, []);

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter, sort]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void loadUsers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <AppShell
      title="Admin Dashboard"
      bottomNav={
        <BottomNav
          items={[
            { to: '/admin', icon: Home, label: 'Home' },
            { to: '/admin/users', icon: UsersIcon, label: 'Users' },
            { to: '/admin/new', icon: UserPlus, label: 'Add', primary: true },
            { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
            { to: '/admin/settings', icon: Settings, label: 'Settings' },
          ]}
        />
      }
    >
      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={<UsersIcon size={20} />}
          color="bg-accent"
          label="Total Users"
          value={kpi?.totalUsers ?? '—'}
          delta="+12.5%"
        />
        <KpiCard
          icon={<CheckCircle2 size={20} />}
          color="bg-success"
          label="Active Subscriptions"
          value={kpi?.activeSubscriptions ?? '—'}
          delta="+8.2%"
        />
        <KpiCard
          icon={<DollarSign size={20} />}
          color="bg-brand"
          label="Monthly Revenue"
          value={kpi ? formatCurrency(kpi.monthlyRevenue) : '—'}
          delta="+15.3%"
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          color="bg-muted"
          label="User Growth"
          value={kpi ? `${kpi.growthPercent >= 0 ? '+' : ''}${kpi.growthPercent}%` : '—'}
        />
      </section>

      {/* Quick Actions */}
      <section className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setEditing('new')} className="btn-primary">
          <UserPlus size={18} /> Add User
        </button>
        <button onClick={() => toast.show('Reports coming soon', 'info')} className="btn-outline">
          View Reports
        </button>
        <button onClick={() => toast.show('Settings coming soon', 'info')} className="btn-outline">
          System Settings
        </button>
      </section>

      {/* Users Table */}
      <section className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search size={16} className="text-muted shrink-0" />
            <input
              placeholder="Search by name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!border-0 !ring-0 !p-0 !h-auto bg-transparent flex-1"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | '')}
              className="!h-9 !py-1 text-sm"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="barber">Barber</option>
              <option value="client">Client</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
              className="!h-9 !py-1 text-sm"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="!h-9 !py-1 text-sm"
            >
              <option value="createdAt">Newest</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Created</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="table-row hover:bg-surface/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size={32} />
                        <span className="font-medium text-ink">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {u.createdAt ? formatDate(u.createdAt) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditing(u)}
                          className="p-2 rounded-button text-muted hover:text-brand hover:bg-brand/10"
                          aria-label={`Edit ${u.fullName}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleting(u)}
                          className="p-2 rounded-button text-muted hover:text-danger hover:bg-danger/10"
                          aria-label={`Delete ${u.fullName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-line">
          {loading ? (
            <div className="px-5 py-10 text-center">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted">No users found</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-3">
                <Avatar name={u.fullName} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{u.fullName}</p>
                  <p className="text-xs text-muted truncate">{u.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setEditing(u)}
                    className="p-2 text-muted hover:text-brand"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleting(u)}
                    className="p-2 text-muted hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex items-center justify-between text-sm">
          <p className="text-muted">
            Showing {users.length} of {total} · Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-outline btn-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      <UserFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          void loadUsers();
          void loadKpi();
        }}
      />
      <DeleteUserModal
        user={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          void loadUsers();
          void loadKpi();
        }}
      />
    </AppShell>
  );
}

function KpiCard({
  icon,
  color,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number | string;
  delta?: string;
}) {
  return (
    <div className={cn('stat-card', color)}>
      <div className="flex items-center justify-between">
        <span className="opacity-90">{icon}</span>
        {delta && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{delta}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold leading-tight">{value}</p>
        <p className="text-xs opacity-90 mt-1">{label}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: 'badge-accent',
    barber: 'badge-brand',
    client: 'badge-muted',
  };
  return <span className={map[role]}>{role}</span>;
}

function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={status === 'active' ? 'badge-success' : 'badge-muted'}>{status}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Add/Edit User Modal
// ────────────────────────────────────────────────────────────────────────────
interface UserFormState {
  email: string;
  fullName: string;
  password: string;
  confirm: string;
  role: Role;
  status: UserStatus;
  phone: string;
  address: string;
  bio: string;
}

const emptyForm: UserFormState = {
  email: '',
  fullName: '',
  password: '',
  confirm: '',
  role: 'client',
  status: 'active',
  phone: '',
  address: '',
  bio: '',
};

function UserFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: User | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editing === 'new';
  const open = editing !== null;

  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    if (editing === 'new') {
      setForm(emptyForm);
    } else {
      setForm({
        email: editing.email,
        fullName: editing.fullName,
        password: '',
        confirm: '',
        role: editing.role,
        status: editing.status,
        phone: editing.phone ?? '',
        address: '',
        bio: '',
      });
    }
    setError(null);
  }, [editing]);

  const set = <K extends keyof UserFormState>(k: K, v: UserFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.fullName) return setError('Name and email are required');
    if (isNew && form.password.length < 8) return setError('Password must be at least 8 characters');
    if (form.password && form.password !== form.confirm) return setError('Passwords do not match');

    setBusy(true);
    try {
      if (isNew) {
        await api.post('/admin/users', {
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          role: form.role,
          status: form.status,
          phone: form.phone || undefined,
          address: form.address || undefined,
          bio: form.bio || undefined,
        });
        toast.success('User created');
      } else {
        const u = editing as User;
        await api.put(`/admin/users/${u.id}`, {
          email: form.email,
          fullName: form.fullName,
          status: form.status,
          phone: form.phone || null,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('User updated');
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
      title={isNew ? 'Add New User' : 'Edit User'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Save User'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="space-y-4">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password{!isNew && <span className="text-muted"> (optional)</span>}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value as Role)}
              disabled={!isNew}
            >
              <option value="admin">Admin</option>
              <option value="barber">Barber</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as UserStatus)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        {form.role !== 'admin' && (
          <div>
            <label className="label">Address (optional)</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        )}
        {form.role === 'barber' && (
          <div>
            <label className="label">Bio (optional)</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
            />
          </div>
        )}
        {error && (
          <div className="bg-danger/10 text-danger text-sm rounded-button px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}

function DeleteUserModal({
  user,
  onClose,
  onDeleted,
}: {
  user: User | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success('User deleted');
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
      open={!!user}
      onClose={onClose}
      title="Delete User?"
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
        Are you sure you want to delete <span className="font-semibold">{user?.fullName}</span>?
        This action cannot be undone.
      </p>
    </Modal>
  );
}
