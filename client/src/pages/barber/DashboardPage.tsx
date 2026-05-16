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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['pro', 'common']);
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);

  useEffect(() => {
    const todayStr = isoDate(new Date());
    Promise.all([
      api.get<Stats>('/pro/statistics'),
      api.get<{ appointments: Appointment[] }>('/pro/appointments', {
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

      {/* KPI tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-tile p-5 flex flex-col gap-2">
          <UsersIcon size={18} className="text-brand" />
          <p className="text-[30px] font-bold text-ink leading-none">
            {stats?.activeClients ?? '—'}
          </p>
          <p className="text-[13px] text-muted mt-1">{t('dashboard.active_clients')}</p>
        </div>

        <div className="bg-surface rounded-tile p-5 flex flex-col gap-2">
          <DollarSign size={18} className="text-success" />
          <p className="text-[30px] font-bold text-ink leading-none">
            {stats ? formatCurrency(stats.monthlyRevenue) : '—'}
          </p>
          <p className="text-[13px] text-muted mt-1">{t('dashboard.monthly_revenue')}</p>
        </div>

        <div className="bg-surface rounded-tile p-5 flex flex-col gap-2">
          <Star size={18} className="text-warning fill-warning" />
          <p className="text-[30px] font-bold text-ink leading-none">
            {stats?.rating ? Number(stats.rating).toFixed(1) : '0.0'}
            <span className="text-[16px] font-normal text-muted">/5</span>
          </p>
          <p className="text-[13px] text-muted mt-1">{t('dashboard.rating')}</p>
        </div>
      </section>

      {/* Today's appointments */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-brand" /> {formatToday()}
          </h2>
          <Link to="/barber/calendar" className="text-[13px] font-semibold text-brand">
            {t('dashboard.view_calendar')} →
          </Link>
        </div>
        {today.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-6">{t('dashboard.no_appointments')}</p>
        ) : (
          <ul>
            {today.map((a) => (
              <li key={a.id} className="py-3 flex items-center gap-3 border-b border-lineSoft last:border-0">
                <div className="w-14 text-center shrink-0">
                  <p className="text-[22px] font-bold text-ink leading-none">{a.startTime}</p>
                  <p className="text-[13px] text-muted mt-0.5">{a.durationMinutes}m</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{a.client?.name ?? t('common:nav.clients')}</p>
                  <p className="text-[13px] text-muted">{SERVICE_LABEL[a.service]}</p>
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

      {/* Quick nav */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/barber/clients"
          className="bg-surface rounded-card p-[18px] hover:shadow-card-lg flex flex-col items-start gap-2"
        >
          <UsersIcon className="text-brand" size={20} />
          <p className="font-medium text-ink">{t('common:nav.clients')}</p>
        </Link>
        <Link
          to="/barber/calendar"
          className="bg-surface rounded-card p-[18px] hover:shadow-card-lg flex flex-col items-start gap-2"
        >
          <CalendarDays className="text-brand" size={20} />
          <p className="font-medium text-ink">{t('common:nav.calendar')}</p>
        </Link>
        <Link
          to="/barber/plans"
          className="bg-surface rounded-card p-[18px] hover:shadow-card-lg flex flex-col items-start gap-2"
        >
          <Scissors className="text-brand" size={20} />
          <p className="font-medium text-ink">{t('common:nav.plans')}</p>
        </Link>
        <Link
          to="/barber/chat"
          className="bg-surface rounded-card p-[18px] hover:shadow-card-lg flex flex-col items-start gap-2"
        >
          <MessageSquare className="text-brand" size={20} />
          <p className="font-medium text-ink">{t('common:nav.chat')}</p>
        </Link>
      </section>
    </div>
  );
}
