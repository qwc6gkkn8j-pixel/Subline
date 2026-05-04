import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Role, User, UserStatus } from '@/lib/types';

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function UsersPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>(((params.get('role') ?? '') as Role | ''));
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [sort, setSort] = useState<'createdAt' | 'name' | 'email' | 'role' | 'status'>('createdAt');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | 'new' | null>(params.get('new') ? 'new' : null);
  const [deleting, setDeleting] = useState<User | null>(null);

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
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter, sort]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void loadUsers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Utilizadores</h1>
        <button
          onClick={() => {
            setEditing('new');
            setParams({});
          }}
          className="btn-primary"
        >
          <UserPlus size={18} /> Novo utilizador
        </button>
      </div>

      <section className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search size={16} className="text-muted shrink-0" />
            <input
              placeholder="Pesquisar por nome ou email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!border-0 !ring-0 !p-0 !h-auto bg-transparent flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | '')}
              className="!h-9 !py-1 text-sm"
            >
              <option value="">Todos os papéis</option>
              <option value="admin">Admin</option>
              <option value="barber">Barbeiro</option>
              <option value="client">Cliente</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
              className="!h-9 !py-1 text-sm"
            >
              <option value="">Estado</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="!h-9 !py-1 text-sm"
            >
              <option value="createdAt">Mais recentes</option>
              <option value="name">Nome</option>
              <option value="email">Email</option>
              <option value="role">Papel</option>
              <option value="status">Estado</option>
            </select>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Papel</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-left px-5 py-3">Criado</th>
                <th className="text-right px-5 py-3">Ações</th>
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
                    Sem utilizadores
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
                          aria-label={`Editar ${u.fullName}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleting(u)}
                          className="p-2 rounded-button text-muted hover:text-danger hover:bg-danger/10"
                          aria-label={`Eliminar ${u.fullName}`}
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

        <div className="md:hidden divide-y divide-line">
          {loading ? (
            <div className="px-5 py-10 text-center">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted">Sem utilizadores</div>
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
                  <button onClick={() => setEditing(u)} className="p-2 text-muted hover:text-brand">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleting(u)} className="p-2 text-muted hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-line flex items-center justify-between text-sm">
          <p className="text-muted">
            {users.length} de {total} · Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-outline btn-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-outline btn-sm"
            >
              Seguinte
            </button>
          </div>
        </div>
      </section>

      <UserFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void loadUsers()}
      />
      <DeleteUserModal
        user={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => void loadUsers()}
      />
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: 'badge-accent',
    barber: 'badge-brand',
    client: 'badge-muted',
    staff: 'badge-warning',
  };
  return <span className={map[role]}>{role}</span>;
}

function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={status === 'active' ? 'badge-success' : 'badge-muted'}>{status}</span>;
}

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
    if (!form.email || !form.fullName) return setError('Nome e email são obrigatórios');
    if (isNew && form.password.length < 8) return setError('Password ≥ 8 caracteres');
    if (form.password && form.password !== form.confirm) return setError('Passwords não coincidem');

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
        toast.success('Utilizador criado');
      } else {
        const u = editing as User;
        await api.put(`/admin/users/${u.id}`, {
          email: form.email,
          fullName: form.fullName,
          status: form.status,
          phone: form.phone || null,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('Utilizador atualizado');
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
      title={isNew ? 'Novo utilizador' : 'Editar utilizador'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
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
            <label className="label">
              Password{!isNew && <span className="text-muted"> (opcional)</span>}
            </label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div>
            <label className="label">Confirmar</label>
            <input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Papel</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value as Role)}
              disabled={!isNew}
            >
              <option value="admin">Admin</option>
              <option value="barber">Barbeiro</option>
              <option value="client">Cliente</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as UserStatus)}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Telefone (opcional)</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        {form.role === 'barber' && (
          <>
            <div>
              <label className="label">Morada (opcional)</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label className="label">Bio (opcional)</label>
              <textarea rows={3} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
            </div>
          </>
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
      toast.success('Utilizador eliminado');
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
      title="Eliminar utilizador?"
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
        Tens a certeza que queres eliminar <span className="font-semibold">{user?.fullName}</span>? Esta
        ação não pode ser revertida.
      </p>
    </Modal>
  );
}
