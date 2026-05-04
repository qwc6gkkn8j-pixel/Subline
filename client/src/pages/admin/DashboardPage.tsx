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
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { StripeBanner } from '@/components/ui/StripeBanner';
import { cn, formatCurrency } from '@/lib/utils';

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

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Marcações hoje"
          value={extras?.appointmentsToday ?? '—'}
        />
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-ink mb-4">Atalhos</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/users" className="btn-primary">
            Gerir utilizadores
          </Link>
          <Link to="/admin/plans" className="btn-outline">
            Gerir planos
          </Link>
          <Link to="/admin/tickets" className="btn-outline">
            Ver tickets
          </Link>
          <Link to="/admin/logs" className="btn-outline">
            Auditoria
          </Link>
        </div>
      </section>
    </div>
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
    <Link to={to} className="card flex items-center gap-3 hover:shadow-card-lg transition-shadow">
      <span className="w-10 h-10 rounded-button bg-brand/10 text-brand flex items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-ink leading-tight">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Link>
  );
}
