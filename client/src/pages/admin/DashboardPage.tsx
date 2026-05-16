import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users as UsersIcon,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  LifeBuoy,
  Tag,
  Scissors,
  CalendarDays,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { StripeBanner } from '@/components/ui/StripeBanner';
import { formatCurrency } from '@/lib/utils';

interface KpiData {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  growthPercent: number;
}

interface ExtrasData {
  openTickets: number;
  plansCount: number;
  barbersCount: number;
  appointmentsToday: number;
}

export default function DashboardPage() {
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [extras, setExtras] = useState<ExtrasData | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<KpiData>('/admin/dashboard'),
      api.get<ExtrasData>('/admin/dashboard/extras'),
    ])
      .then(([k, x]) => {
        setKpi(k.data);
        setExtras(x.data);
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <StripeBanner variant="platform" />

      {/* Primary KPI tiles — 2×2 grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<UsersIcon size={20} />}
          label={t('dashboard.total_users')}
          value={kpi?.totalUsers ?? '—'}
          delta="+12.5%"
        />
        <KpiCard
          icon={<CheckCircle2 size={20} />}
          label={t('dashboard.active_subscriptions')}
          value={kpi?.activeSubscriptions ?? '—'}
          delta="+8.2%"
        />
        <KpiCard
          icon={<DollarSign size={20} />}
          label={t('dashboard.monthly_revenue')}
          value={kpi ? formatCurrency(kpi.monthlyRevenue) : '—'}
          delta="+15.3%"
        />
        <KpiCard
          icon={<TrendingUp size={20} />}
          label={t('dashboard.user_growth')}
          value={kpi ? `${kpi.growthPercent >= 0 ? '+' : ''}${kpi.growthPercent}%` : '—'}
        />
      </section>

      {/* Secondary quick-nav tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickCard
          to="/admin/tickets"
          icon={<LifeBuoy size={18} />}
          label="Tickets em aberto"
          value={extras?.openTickets ?? '—'}
        />
        <QuickCard
          to="/admin/plans"
          icon={<Tag size={18} />}
          label="Planos ativos"
          value={extras?.plansCount ?? '—'}
        />
        <QuickCard
          to="/admin/users?role=barber"
          icon={<Scissors size={18} />}
          label="Profissionais"
          value={extras?.barbersCount ?? '—'}
        />
        <QuickCard
          to="/admin/logs"
          icon={<CalendarDays size={18} />}
          label={t('dashboard_ext.appointments_today')}
          value={extras?.appointmentsToday ?? '—'}
        />
      </section>

      {/* Shortcuts card */}
      <section className="card">
        <h2 className="section-title mb-4">{t('dashboard.shortcuts')}</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/users" className="btn-primary">{t('dashboard.manage_users')}</Link>
          <Link to="/admin/plans" className="btn-outline">{t('dashboard.manage_plans')}</Link>
          <Link to="/admin/tickets" className="btn-outline">{t('dashboard.view_tickets')}</Link>
          <Link to="/admin/logs" className="btn-outline">{t('dashboard.audit')}</Link>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  color?: string;
  label: string;
  value: number | string;
  delta?: string;
}) {
  return (
    <div className="bg-surface rounded-tile p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-brand">{icon}</span>
        {delta && (
          <span className="text-[12px] font-semibold text-success">{delta}</span>
        )}
      </div>
      <div>
        <p className="text-[30px] font-bold leading-tight text-ink">{value}</p>
        <p className="text-xs text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

function QuickCard({
  to,
  icon,
  label,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Link
      to={to}
      className="bg-surface rounded-tile p-5 flex items-center gap-3 hover:brightness-95 transition-all border border-lineSoft"
    >
      <span className="w-10 h-10 rounded-button bg-brand/10 text-brand flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-bold text-ink leading-tight">{value}</p>
        <p className="text-xs text-muted truncate">{label}</p>
      </div>
    </Link>
  );
}
