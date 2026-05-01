import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users as UsersIcon,
  DollarSign,
  Star,
  CalendarDays,
  Scissors,
  MessageSquare,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { StripeBanner } from '@/components/ui/StripeBanner';
import { formatCurrency, isoDate } from '@/lib/utils';
import { formatToday } from '@/lib/dateUtils';
import type { Appointment } from '@/lib/types';
import { SERVICE_LABEL } from '@/lib/types';

interface Stats {
  activeClients: number;
  monthlyRevenue: number;
  rating: number;
}

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);

  useEffect(() => {
    const todayStr = isoDate(new Date());
    Promise.all([
      api.get<Stats>('/barber/statistics'),
      api.get<{ appointments: Appointment[] }>('/barber/appointments', {
        params: { from: todayStr, to: todayStr },
      }),
    ])
      .then(([s, a]) => {
        setStats(s.data);
        setToday(a.data.appointments);
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <StripeBanner variant="barber" />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card bg-brand-gradient">
          <UsersIcon size={20} className="opacity-90" />
          <div>
            <p className="text-3xl font-bold">{stats?.activeClients ?? '—'}</p>
            <p className="text-xs opacity-90 mt-1">Clientes ativos</p>
          </div>
        </div>
        <div className="stat-card bg-accent">
          <DollarSign size={20} className="opacity-90" />
          <div>
            <p className="text-3xl font-bold">
              {stats ? formatCurrency(stats.monthlyRevenue) : '—'}
            </p>
            <p className="text-xs opacity-90 mt-1">Receita estimada (mês)</p>
          </div>
        </div>
        <div className="card !bg-surface flex flex-col gap-2 !shadow-none">
          <Star size={20} className="text-warning fill-warning" />
          <div>
            <p className="text-3xl font-bold text-ink">
              {stats?.rating ? Number(stats.rating).toFixed(1) : '0.0'}
              <span className="text-base text-muted">/5</span>
            </p>
            <p className="text-xs text-muted mt-1">Avaliação</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <CalendarDays size={18} className="text-brand" /> {formatToday()}
          </h2>
          <Link to="/barber/calendar" className="btn-outline btn-sm">
            Ver agenda
          </Link>
        </div>
        {today.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Sem marcações para hoje.</p>
        ) : (
          <ul className="divide-y divide-line">
            {today.map((a) => (
              <li key={a.id} className="py-3 flex items-center gap-3">
                <div className="w-14 text-center">
                  <p className="text-lg font-semibold text-ink">{a.startTime}</p>
                  <p className="text-[10px] text-muted">{a.durationMinutes}m</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{a.client?.name ?? 'Cliente'}</p>
                  <p className="text-xs text-muted">{SERVICE_LABEL[a.service]}</p>
                </div>
                <span
                  className={
                    a.status === 'confirmed'
                      ? 'badge-success'
                      : a.status === 'pending'
                        ? 'badge-warning'
                        : 'badge-muted'
                  }
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/barber/clients" className="card hover:shadow-card-lg flex flex-col items-start gap-2">
          <UsersIcon className="text-brand" size={20} />
          <p className="font-medium text-ink">Clientes</p>
        </Link>
        <Link to="/barber/calendar" className="card hover:shadow-card-lg flex flex-col items-start gap-2">
          <CalendarDays className="text-brand" size={20} />
          <p className="font-medium text-ink">Agenda</p>
        </Link>
        <Link to="/barber/plans" className="card hover:shadow-card-lg flex flex-col items-start gap-2">
          <Scissors className="text-brand" size={20} />
          <p className="font-medium text-ink">Planos</p>
        </Link>
        <Link to="/barber/chat" className="card hover:shadow-card-lg flex flex-col items-start gap-2">
          <MessageSquare className="text-brand" size={20} />
          <p className="font-medium text-ink">Chat</p>
        </Link>
      </section>
    </div>
  );
}
