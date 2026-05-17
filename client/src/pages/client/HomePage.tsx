import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { Appointment, Barber, Subscription } from '@/lib/types';
import { SERVICE_LABEL } from '@/lib/types';
import {
  C,
  I,
  Icon,
  ScrollBody,
  PageHeader,
  SectionHeader,
  SearchBar,
  Chip,
  ChipRow,
  Card,
  PlanBadge,
  ImagePlaceholder,
} from '@/design-system';

interface DiscoverBarber {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  address?: string | null;
}

const CATEGORIES = ['Tudo', 'Premium', 'Perto de ti', 'Promoções', 'Barba', 'Corte'];

export default function HomePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [myBarber, setMyBarber] = useState<Barber | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [pros, setPros] = useState<DiscoverBarber[]>([]);
  const [cat, setCat] = useState('Tudo');

  useEffect(() => {
    Promise.all([
      api.get<{ subscription: Subscription | null }>('/client/subscription').catch(() => ({ data: { subscription: null } })),
      api.get<{ barber: Barber | null }>('/client/barber').catch(() => ({ data: { barber: null } })),
      api
        .get<{ appointments: Appointment[] }>('/client/appointments', {
          params: { from: new Date().toISOString().slice(0, 10) },
        })
        .catch(() => ({ data: { appointments: [] } })),
      api
        .get<{ pros: DiscoverBarber[] }>('/public/discover', { params: { limit: 5 } })
        .catch(() => ({ data: { pros: [] } })),
    ])
      .then(([s, b, a, d]) => {
        setSubscription(s.data.subscription);
        setMyBarber(b.data.barber);
        setUpcoming(a.data.appointments.slice(0, 3));
        setPros(d.data.pros);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const used = subscription?.cutsUsed ?? 0;
  const total = subscription?.cutsTotal ?? subscription?.plan?.cutsPerMonth ?? null;
  const pct = total ? Math.min(100, (used / total) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <button
              onClick={() => navigate('/client/discover')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Icon d={I.heart} size={22} color={C.text} stroke={2} />
            </button>
            <button
              onClick={() => navigate('/client/chat')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Icon d={I.bell} size={22} color={C.text} stroke={2} />
            </button>
          </>
        }
      />
      <ScrollBody>
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4 }}>
            Olá{firstName ? `, ${firstName}` : ''}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 6,
              color: C.muted,
            }}
          >
            <Icon d={I.pin} size={14} stroke={2} />
            <span style={{ fontSize: 13 }}>
              {new Date().toLocaleDateString('pt-PT', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </span>
            <Icon d={I.chev} size={14} stroke={2} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <SearchBar
            placeholder="Pesquisar barbeiros, serviços"
            onClick={() => navigate('/client/discover')}
          />
        </div>

        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={c === cat} onClick={() => setCat(c)} />
          ))}
        </ChipRow>

        <div style={{ height: 22 }} />

        {pros.length > 0 && (
          <>
            <SectionHeader title="Para ti" action="Ver tudo" onAction={() => navigate('/client/discover')} />
            <div
              style={{
                padding: '0 20px',
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
                gap: isDesktop ? 20 : 22,
              }}
            >
              {pros.slice(0, isDesktop ? 6 : 3).map((p) => (
                <BarberCard
                  key={p.id}
                  barber={p}
                  onClick={() => navigate('/client/discover')}
                />
              ))}
            </div>
            <div style={{ height: 28 }} />
          </>
        )}

        {subscription ? (
          <>
            <SectionHeader title="A tua subscrição" />
            <div style={{ padding: '0 20px' }}>
              <SubscriptionCard
                planName={subscription.plan?.name ?? 'Premium'}
                used={used}
                total={total}
                pct={pct}
                renewal={subscription.renewalDate}
              />
            </div>
            <div style={{ height: 28 }} />
          </>
        ) : null}

        {upcoming.length > 0 && (
          <>
            <SectionHeader
              title="Próximas marcações"
              action="Ver tudo"
              onAction={() => navigate('/client/calendar')}
            />
            <div style={{ padding: '0 20px' }}>
              {upcoming.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 0',
                    borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ minWidth: 56 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{a.startTime}</div>
                    <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, marginTop: 2 }}>
                      {new Date(a.date)
                        .toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
                        .toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{SERVICE_LABEL[a.service]}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                      {a.durationMinutes} min
                    </div>
                  </div>
                  <Icon d={I.chev} size={16} color={C.faint} stroke={2} />
                </div>
              ))}
            </div>
            <div style={{ height: 28 }} />
          </>
        )}

        {myBarber && (
          <>
            <SectionHeader title="O meu profissional" />
            <div style={{ padding: '0 20px 28px' }}>
              <Card soft style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: C.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {myBarber.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{myBarber.name}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 2,
                      fontSize: 13,
                    }}
                  >
                    <Icon d={I.star} size={12} fill="currentColor" color={C.text} stroke={0} />
                    <span style={{ fontWeight: 700 }}>{Number(myBarber.rating ?? 0).toFixed(1)}</span>
                  </div>
                  {myBarber.address && (
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{myBarber.address}</div>
                  )}
                </div>
                <button
                  onClick={() => navigate('/client/chat')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: C.bg,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon d={I.chat} size={18} stroke={2} />
                </button>
              </Card>
            </div>
          </>
        )}
      </ScrollBody>
    </>
  );
}

function BarberCard({ barber, onClick }: { barber: DiscoverBarber; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          aspectRatio: '16/9',
        }}
      >
        <ImagePlaceholder ratio="16/9" />
        <button
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
          }}
        >
          <Icon d={I.heart} size={16} stroke={2} />
        </button>
      </div>
      <div style={{ paddingTop: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{barber.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
            <Icon d={I.star} size={12} fill="currentColor" color={C.text} stroke={0} />
            <span style={{ fontWeight: 700 }}>{Number(barber.rating ?? 0).toFixed(1)}</span>
            <span style={{ color: C.muted }}>({barber.reviewCount ?? 0})</span>
          </div>
        </div>
        {barber.address && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{barber.address}</div>
        )}
      </div>
    </div>
  );
}

function SubscriptionCard({
  planName,
  used,
  total,
  pct,
  renewal,
}: {
  planName: string;
  used: number;
  total: number | null;
  pct: number;
  renewal?: string | null;
}) {
  return (
    <Card soft style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <style>{`
        @keyframes subline-shimmer {
          0%   { background-position: 220% 0; }
          100% { background-position: -220% 0; }
        }
      `}</style>
      <div style={{ flex: 1 }}>
        <PlanBadge>{planName}</PlanBadge>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 10 }}>
          {total ? `${used} de ${total} cortes este mês` : 'Subscrição activa'}
        </div>
        {renewal && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            Renova a {new Date(renewal).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })}
          </div>
        )}
        {total && (
          <div
            style={{
              height: 8,
              background: '#F0F0F0',
              borderRadius: 999,
              marginTop: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  'linear-gradient(90deg, #1A5FA8 0%, #2B8EF0 25%, #5BAEF7 50%, #2B8EF0 75%, #1A5FA8 100%)',
                backgroundSize: '220% 100%',
                animation: 'subline-shimmer 2.4s linear infinite',
                boxShadow: '0 0 14px rgba(43, 142, 240, 0.45)',
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
