import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors,
  CalendarDays,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Phone,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  Appointment,
  Barber,
  Cut,
  Subscription,
} from '@/lib/types';
import { PLAN_LABEL, SERVICE_LABEL } from '@/lib/types';

export default function HomePage() {
  const toast = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [cuts, setCuts] = useState<Cut[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ subscription: Subscription | null }>('/client/subscription'),
      api.get<{ barber: Barber | null }>('/client/barber'),
      api.get<{ appointments: Appointment[] }>('/client/appointments', {
        params: { from: new Date().toISOString().slice(0, 10) },
      }),
      api.get<{ cuts: Cut[] }>('/client/cuts'),
    ])
      .then(([s, b, a, c]) => {
        setSubscription(s.data.subscription);
        setBarber(b.data.barber);
        setUpcoming(a.data.appointments.slice(0, 3));
        setCuts(c.data.cuts);
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const used = subscription?.cutsUsed ?? 0;
  const total = subscription?.cutsTotal ?? subscription?.plan?.cutsPerMonth ?? null;
  const remaining = total !== null && total !== undefined ? Math.max(0, total - used) : null;

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
        <p className="text-xs uppercase tracking-wide text-muted">A tua subscrição</p>
        {subscription ? (
          <>
            <div className="flex items-baseline gap-3 mt-2 flex-wrap">
              <h2 className="text-3xl font-bold text-ink">
                {subscription.plan?.name ?? PLAN_LABEL[subscription.planType]}
              </h2>
              <span className="text-muted">{formatCurrency(subscription.price)}/mês</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {subscription.status === 'active' ? (
                <>
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-success font-medium">Ativa</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-muted" />
                  <span className="text-muted font-medium">{subscription.status}</span>
                </>
              )}
              <span className="text-muted text-sm">
                · Renova {formatDate(subscription.renewalDate)}
              </span>
            </div>

            {remaining !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted">Cortes este mês</span>
                  <span className="text-ink font-medium">
                    {used}/{total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-brand-gradient transition-all"
                    style={{ width: `${total ? (used / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/client/calendar" className="btn-primary btn-sm">
                <CalendarDays size={14} /> Marcar
              </Link>
              <Link to="/client/subscription" className="btn-outline btn-sm">
                <CreditCard size={14} /> Detalhes
              </Link>
              <Link to="/client/chat" className="btn-outline btn-sm">
                <MessageSquare size={14} /> Falar com profissional
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-4 text-muted">Ainda não tens uma subscrição ativa.</p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <CalendarDays size={18} className="text-brand" /> Próximas marcações
            </h3>
            <Link to="/client/calendar" className="text-xs text-brand hover:underline">
              Ver todas
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Sem marcações futuras.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((a) => (
                <li key={a.id} className="py-2 flex items-center gap-3">
                  <div className="w-14 text-center">
                    <p className="text-base font-bold text-ink">{a.startTime}</p>
                    <p className="text-[10px] text-muted">{formatDate(a.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {SERVICE_LABEL[a.service]}
                    </p>
                    <p className="text-xs text-muted">{a.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <Scissors size={18} className="text-brand" /> Histórico de cortes
            </h3>
          </div>
          {cuts.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Sem cortes registados ainda.</p>
          ) : (
            <ul className="divide-y divide-line max-h-48 overflow-y-auto">
              {cuts.slice(0, 8).map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-ink">{formatDate(c.date)}</span>
                  <span className="text-muted truncate ml-2">{c.notes ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {barber && (
        <section className="card">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">Mon professionnel</p>
          <div className="flex items-start gap-4">
            <Avatar name={barber.name} size={60} />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-ink">{barber.name}</p>
              <div className="flex items-center gap-1 text-sm text-muted">
                <Star size={14} className="text-warning fill-warning" />
                <span>{Number(barber.rating ?? 0).toFixed(1)}/5</span>
              </div>
              {barber.address && (
                <p className="flex items-center gap-1.5 text-sm text-muted mt-1">
                  <MapPin size={14} /> {barber.address}
                </p>
              )}
              {barber.phone && (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <Phone size={14} /> {barber.phone}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
