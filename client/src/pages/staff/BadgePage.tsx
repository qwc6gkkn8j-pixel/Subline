// ─────────────────────────────────────────────────────────────────────────────
// /staff/badge — clock-in / break / clock-out dashboard for staff role.
//
// Mobile-first — optimised for a phone screen the employee taps when arriving
// at the shop. The big primary button reflects the current state and posts to
// /api/staff/badge. The day's history list refreshes on each action.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Play, Pause, Square, LogOut, Clock } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Logo } from '@/components/ui/Logo';
import { formatTime } from '@/lib/dateUtils';
import type { EntryType, StaffDaySummary, StaffMember } from '@/lib/types';

const ENTRY_LABEL: Record<EntryType, string> = {
  clock_in: 'Entrada',
  break_start: 'Início pausa',
  break_end: 'Fim pausa',
  clock_out: 'Saída',
};

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function BadgePage() {
  const toast = useToast();
  const { logout, user } = useAuth();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [summary, setSummary] = useState<StaffDaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live clock — updates every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load staff identity + today's summary.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [me, today] = await Promise.all([
          api.get<{ staff: StaffMember }>('/staff/me'),
          api.get<StaffDaySummary>('/staff/today'),
        ]);
        if (cancelled) return;
        setStaff(me.data.staff);
        setSummary(today.data);
      } catch (err) {
        if (!cancelled) toast.error(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const onBadge = async (type: EntryType) => {
    setBusy(true);
    try {
      const { data } = await api.post<StaffDaySummary>('/staff/badge', { type });
      setSummary(data);
      toast.success(`${ENTRY_LABEL[type]} registada`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="card max-w-sm w-full text-center">
          <p className="text-ink mb-3">Conta sem staff associado.</p>
          <button className="btn-outline" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  const state = summary?.state ?? 'out';
  const stateLabel: Record<typeof state, { text: string; cls: string }> = {
    out: { text: 'Fora', cls: 'badge-muted' },
    working: { text: 'Em serviço', cls: 'badge-success' },
    on_break: { text: 'Em pausa', cls: 'badge-warning' },
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-line px-4 py-3 flex items-center gap-3">
        <Logo className="h-7 w-auto" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {staff.user?.fullName ?? staff.name}
          </p>
          <p className="text-xs text-muted truncate">{staff.barber?.name ?? '—'}</p>
        </div>
        <button
          className="btn-ghost btn-sm"
          onClick={() => void logout()}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md w-full mx-auto space-y-6">
        {/* Live clock + state */}
        <section className="card text-center">
          <p className="text-xs text-muted">{user?.email}</p>
          <p className="text-5xl font-bold text-ink mt-2 tabular-nums">
            {now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-muted mt-1">
            {now.toLocaleDateString('pt-PT', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
          <div className="mt-4">
            <span className={stateLabel[state].cls}>{stateLabel[state].text}</span>
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="rounded-button bg-surface p-2">
                <p className="text-muted">Tempo de trabalho</p>
                <p className="font-semibold text-ink mt-0.5">
                  {formatHM(summary.totalMinutesWorked)}
                </p>
              </div>
              <div className="rounded-button bg-surface p-2">
                <p className="text-muted">Tempo em pausa</p>
                <p className="font-semibold text-ink mt-0.5">
                  {formatHM(summary.totalMinutesOnBreak)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Action buttons */}
        <section className="space-y-3">
          {state === 'out' && (
            <BigButton
              icon={<Play size={22} />}
              label="Marcar Entrada"
              variant="success"
              busy={busy}
              onClick={() => void onBadge('clock_in')}
            />
          )}
          {state === 'working' && (
            <>
              <BigButton
                icon={<Pause size={22} />}
                label="Início Pausa"
                variant="warning"
                busy={busy}
                onClick={() => void onBadge('break_start')}
              />
              <BigButton
                icon={<Square size={22} />}
                label="Marcar Saída"
                variant="danger"
                busy={busy}
                onClick={() => void onBadge('clock_out')}
              />
            </>
          )}
          {state === 'on_break' && (
            <>
              <BigButton
                icon={<Play size={22} />}
                label="Retomar"
                variant="success"
                busy={busy}
                onClick={() => void onBadge('break_end')}
              />
              <BigButton
                icon={<Square size={22} />}
                label="Marcar Saída"
                variant="danger"
                busy={busy}
                onClick={() => void onBadge('clock_out')}
              />
            </>
          )}
        </section>

        {/* Today's history */}
        <section className="card">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
            <Clock size={16} /> Histórico de hoje
          </h2>
          {summary && summary.entries.length > 0 ? (
            <ul className="divide-y divide-line">
              {summary.entries.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-ink">{ENTRY_LABEL[e.type]}</span>
                  <span className="text-muted tabular-nums">{formatTime(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted text-center py-3">Sem registos hoje.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function BigButton({
  icon,
  label,
  variant,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'success' | 'warning' | 'danger';
  busy: boolean;
  onClick: () => void;
}) {
  const cls = {
    success: 'bg-success text-white hover:bg-success/90',
    warning: 'bg-warning text-white hover:bg-warning/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`w-full rounded-card py-5 flex items-center justify-center gap-3 font-semibold text-lg shadow-card transition disabled:opacity-50 ${cls}`}
    >
      {busy ? <Spinner /> : icon}
      {label}
    </button>
  );
}
