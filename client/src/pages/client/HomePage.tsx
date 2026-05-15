import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Star,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';
import type { Appointment, Barber, Cut, Subscription } from '@/lib/types';
import { PLAN_LABEL, SERVICE_LABEL } from '@/lib/types';

export default function HomePage() {
  const toast = useToast();
  const { t } = useTranslation('client');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? 'Olá';
  const used  = subscription?.cutsUsed ?? 0;
  const total = subscription?.cutsTotal ?? subscription?.plan?.cutsPerMonth ?? null;
  const pct   = total ? Math.min(100, (used / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="page-title">{t('home.greeting', { name: firstName })}</h1>
        <p className="text-[13px] text-muted mt-1">
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
      </div>

      {/* Subscription card */}
      {subscription ? (
        <div className="bg-surface rounded-card p-[18px]">
          <span className="pill-premium">
            {subscription.plan?.name ?? PLAN_LABEL[subscription.planType]}
          </span>
          <p className="section-title mt-3">
            {total !== null
              ? t('home.cuts_used', { used, total })
              : t('home.subscription_card')}
          </p>
          {subscription.renewalDate && (
            <p className="text-[13px] text-muted mt-1">
              {t('home.renews_on', { date: formatDate(subscription.renewalDate) })}
            </p>
          )}
          {total !== null && (
            <div className="sub-track mt-4">
              <div className="sub-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="flex gap-3 mt-5 flex-wrap">
            <Link to="/client/calendar" className="btn-primary btn-sm">
              <CalendarDays size={14} /> {t('home.book_btn')}
            </Link>
            <Link to="/client/subscription" className="btn-ghost btn-sm">
              <CreditCard size={14} /> {t('home.details_btn')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-card p-[18px]">
          <p className="section-title">{t('home.no_subscription')}</p>
          <p className="text-[13px] text-muted mt-1">{t('home.no_subscription_desc')}</p>
          <Link to="/client/subscription" className="btn-primary btn-sm mt-4 inline-flex">
            {t('subscription.subscribe_btn')}
          </Link>
        </div>
      )}

      {/* Upcoming appointments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{t('home.upcoming')}</h2>
          <Link to="/client/calendar" className="text-[13px] font-semibold text-brand flex items-center gap-0.5">
            {t('home.view_all')} <ChevronRight size={14} />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-[13px] text-muted">{t('home.no_upcoming')}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="bg-surface rounded-card p-4 flex items-center gap-4">
                <div className="text-center shrink-0 w-14">
                  <p className="text-[22px] font-bold text-brand leading-none">{a.startTime}</p>
                  <p className="text-[11px] text-muted mt-0.5 uppercase">{formatDate(a.date).split(',')[0]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="card-title truncate">{SERVICE_LABEL[a.service]}</p>
                  <p className="text-[13px] text-muted mt-0.5">{a.durationMinutes} min</p>
                </div>
                <ChevronRight size={16} className="text-faint shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent cuts */}
      {cuts.length > 0 && (
        <section>
          <h2 className="section-title mb-4">{t('home.recent_cuts')}</h2>
          <ul className="space-y-2">
            {cuts.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 border-b border-lineSoft last:border-0">
                <Scissors size={16} className="text-faint shrink-0" />
                <span className="text-[14px] text-ink flex-1">{formatDate(c.date)}</span>
                {c.notes && <span className="text-[13px] text-muted truncate max-w-[120px]">{c.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* My professional */}
      {barber && (
        <section>
          <h2 className="section-title mb-4">{t('home.my_professional')}</h2>
          <div className="bg-surface rounded-card p-4 flex items-center gap-4">
            <Avatar name={barber.name} size={56} />
            <div className="flex-1 min-w-0">
              <p className="card-title">{barber.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={13} className="fill-ink text-ink" />
                <span className="text-[13px] font-bold">{Number(barber.rating ?? 0).toFixed(1)}</span>
              </div>
              {barber.address && (
                <p className="flex items-center gap-1 text-[13px] text-muted mt-0.5">
                  <MapPin size={12} /> {barber.address}
                </p>
              )}
            </div>
            <Link to="/client/chat" className="btn-ghost btn-sm shrink-0">
              <MessageSquare size={14} /> {t('home.chat_btn')}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
