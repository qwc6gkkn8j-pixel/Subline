// ─────────────────────────────────────────────────────────────────────────────
// /barber/staff — barber-side management of StaffMember rows.
//
// Lists active + inactive staff. Lets the barber add a new member (with an
// optional sign-in account for the badge page), edit name/role, deactivate,
// and review the last 30 days of TimeEntries per staff.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, History, UserPlus, Power } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatTime } from '@/lib/dateUtils';
import type { StaffMember, TimeEntry } from '@/lib/types';
import { useTranslation } from 'react-i18next';

interface DaySummary {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: Array<{ start: string; end: string | null }>;
  workedMinutes: number;
}

/** Reduces a flat list of entries into per-day summaries. */
function summariseEntries(entries: TimeEntry[]): DaySummary[] {
  const byDay = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = e.timestamp.slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(e);
    byDay.set(key, arr);
  }

  const days: DaySummary[] = [];
  for (const [key, items] of byDay) {
    let clockIn: Date | null = null;
    let clockOut: Date | null = null;
    const breaks: Array<{ start: string; end: string | null }> = [];
    let workedMs = 0;
    let openWorkSince: Date | null = null;
    let openBreakSince: Date | null = null;

    for (const e of items) {
      const t = new Date(e.timestamp);
      if (e.type === 'clock_in') {
        clockIn ??= t;
        openWorkSince = t;
      } else if (e.type === 'break_start' && openWorkSince) {
        workedMs += t.getTime() - openWorkSince.getTime();
        openWorkSince = null;
        openBreakSince = t;
        breaks.push({ start: t.toISOString(), end: null });
      } else if (e.type === 'break_end' && openBreakSince) {
        if (breaks.length > 0) breaks[breaks.length - 1].end = t.toISOString();
        openBreakSince = null;
        openWorkSince = t;
      } else if (e.type === 'clock_out') {
        if (openBreakSince) {
          if (breaks.length > 0) breaks[breaks.length - 1].end = t.toISOString();
          openBreakSince = null;
        }
        if (openWorkSince) {
          workedMs += t.getTime() - openWorkSince.getTime();
          openWorkSince = null;
        }
        clockOut = t;
      }
    }

    days.push({
      date: key,
      clockIn: clockIn?.toISOString() ?? null,
      clockOut: clockOut?.toISOString() ?? null,
      breaks,
      workedMinutes: Math.floor(workedMs / 60000),
    });
  }

  return days.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default function StaffPage() {
    const { t } = useTranslation('pro');
  const toast = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [history, setHistory] = useState<StaffMember | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ staff: StaffMember[] }>('/pro/staff', {
        params: showInactive ? { includeInactive: true } : undefined,
      });
      setStaff(data.staff);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="page-title mr-auto">{t('staff.title')}</h1>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="!w-auto !h-auto"
          />
          Mostrar inativos
        </label>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Adicionar staff
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : staff.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={UserPlus}
            title={t('staff.no_staff')}
            description="Adiciona o primeiro funcionário da tua negócio."
          />
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <ul className="divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="px-4 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink truncate">{s.name}</p>
                    <span className="badge-muted">{s.role}</span>
                    {s.isActive ? (
                      <span className="badge-success">Ativo</span>
                    ) : (
                      <span className="badge-muted">Inativo</span>
                    )}
                    {s.user && <span className="badge-brand">Tem conta</span>}
                  </div>
                  {s.user && (
                    <p className="text-xs text-muted truncate mt-1">{s.user.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => setHistory(s)}
                    title="Ver histórico"
                    aria-label="Ver histórico"
                  >
                    <History size={16} />
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => setEditing(s)}
                    title="Editar"
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  {s.isActive && (
                    <button
                      className="btn-ghost btn-sm !text-danger"
                      onClick={() => {
                        if (!confirm(`Desativar ${s.name}?`)) return;
                        void api
                          .delete(`/pro/staff/${s.id}`)
                          .then(() => {
                            toast.success(t('staff.staff_deactivated'));
                            void load();
                          })
                          .catch((err) => toast.error(apiErrorMessage(err)));
                      }}
                      title="Desativar"
                      aria-label="Desativar"
                    >
                      <Power size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {creating && (
        <StaffFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      {editing && (
        <StaffFormModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      {history && <HistoryModal staff={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function StaffFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('pro');
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState(existing?.role ?? 'Professional');
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(existing);

  const onSubmit = async () => {
    const { t } = useTranslation('pro');
    if (!name.trim() || !role.trim()) {
      toast.error(t('staff.name_role_required'));
      return;
    }
    if (createAccount && (!email || password.length < 8)) {
      toast.error(t('staff.email_password_required'));
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await api.put(`/pro/staff/${existing!.id}`, { name, role });
        toast.success(t('staff.staff_updated'));
      } else {
        await api.post('/pro/staff', {
          name,
          role,
          createAccount,
          email: createAccount ? email : undefined,
          password: createAccount ? password : undefined,
        });
        toast.success(t('staff.staff_created'));
      }
      onSaved();
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
      title={isEdit ? 'Editar staff' : 'Adicionar staff'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Função</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t('staff.name_placeholder')}
            required
          />
        </div>

        {!isEdit && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
                className="!w-auto !h-auto"
              />
              Criar conta de acesso (para o /staff/badge)
            </label>
            {createAccount && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password (mínimo 8 caracteres)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function HistoryModal({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  const toast = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ entries: TimeEntry[] }>(
          `/pro/staff/${staff.id}/entries`,
          { params: { days: 30 } },
        );
        if (!cancelled) setEntries(data.entries);
      } catch (err) {
        if (!cancelled) toast.error(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staff.id, toast]);

  const days = useMemo(() => summariseEntries(entries), [entries]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Histórico — ${staff.name}`}
      size="lg"
      footer={
        <button className="btn-primary" onClick={onClose}>
          Fechar
        </button>
      }
    >
      {loading ? (
        <div className="text-center py-10">
          <Spinner />
        </div>
      ) : days.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">Sem registos nos últimos 30 dias.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="text-left py-2 pr-3">Data</th>
                <th className="text-left py-2 pr-3">Entrada</th>
                <th className="text-left py-2 pr-3">Pausas</th>
                <th className="text-left py-2 pr-3">Saída</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b border-line">
                  <td className="py-2 pr-3 text-ink">{formatDate(d.date)}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {d.clockIn ? formatTime(d.clockIn) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {d.breaks.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      d.breaks
                        .map(
                          (b) =>
                            `${formatTime(b.start)}–${b.end ? formatTime(b.end) : '...'}`,
                        )
                        .join(', ')
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {d.clockOut ? formatTime(d.clockOut) : '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-ink">
                    {formatHours(d.workedMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
