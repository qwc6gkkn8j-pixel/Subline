import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { C, Avatar, PageHeader, ScrollBody, SectionHeader } from '@/design-system';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [extras, setExtras] = useState<ExtrasData | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<KpiData>('/admin/dashboard').catch(() => ({
        data: { totalUsers: 0, activeSubscriptions: 0, monthlyRevenue: 0, growthPercent: 0 },
      })),
      api.get<ExtrasData>('/admin/dashboard/extras').catch(() => ({
        data: { openTickets: 0, plansCount: 0, barbersCount: 0, appointmentsToday: 0 },
      })),
    ])
      .then(([k, x]) => {
        setKpi(k.data);
        setExtras(x.data);
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [toast]);

  const initials = (user?.fullName?.[0] ?? 'A').toUpperCase();

  const tiles = [
    {
      v: kpi?.activeSubscriptions ?? '—',
      l: 'Subs ativas',
      d: '',
    },
    { v: extras?.barbersCount ?? '—', l: 'Profissionais', d: '' },
    { v: kpi?.totalUsers ?? '—', l: 'Utilizadores', d: '' },
    {
      v: kpi ? formatCurrency(kpi.monthlyRevenue) : '—',
      l: 'MRR',
      d: '',
    },
  ];

  return (
    <>
      <PageHeader actions={<Avatar initials={initials} size={36} bg={C.surface} />} />
      <ScrollBody>
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4 }}>Visão geral</div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Receita este mês</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
                {kpi ? formatCurrency(kpi.monthlyRevenue) : '—'}
              </div>
              {kpi && (
                <div
                  style={{
                    fontSize: 14,
                    color: kpi.growthPercent >= 0 ? C.success : C.danger,
                    fontWeight: 700,
                  }}
                >
                  {kpi.growthPercent >= 0 ? '+' : ''}
                  {kpi.growthPercent.toFixed(1)}%
                </div>
              )}
            </div>
            <svg width="100%" height="48" viewBox="0 0 280 48" style={{ marginTop: 12 }}>
              <defs>
                <linearGradient id="spkUE" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#2B8EF0" stopOpacity="0.20" />
                  <stop offset="1" stopColor="#2B8EF0" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 38 L20 32 L40 35 L60 28 L80 30 L100 22 L120 25 L140 18 L160 20 L180 12 L200 16 L220 8 L240 12 L260 6 L280 10 L280 48 L0 48 Z"
                fill="url(#spkUE)"
              />
              <path
                d="M0 38 L20 32 L40 35 L60 28 L80 30 L100 22 L120 25 L140 18 L160 20 L180 12 L200 16 L220 8 L240 12 L260 6 L280 10"
                stroke="#2B8EF0"
                strokeWidth={2}
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div
          style={{
            padding: '0 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {tiles.map((t, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{t.v}</div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 4, fontWeight: 600 }}>{t.l}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 28 }} />

        <SectionHeader title="Acessos rápidos" />
        <div
          style={{
            padding: '0 20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <ActionRow
            label="Profissionais"
            sub={`${extras?.barbersCount ?? 0} ativos`}
            onClick={() => navigate('/admin/pros')}
          />
          <ActionRow
            label="Utilizadores"
            sub={`${kpi?.totalUsers ?? 0} contas`}
            onClick={() => navigate('/admin/users')}
          />
          <ActionRow
            label="Pagamentos"
            sub={`${kpi ? formatCurrency(kpi.monthlyRevenue) : '—'} este mês`}
            onClick={() => navigate('/admin/payments')}
          />
          <ActionRow
            label="Tickets de suporte"
            sub={`${extras?.openTickets ?? 0} abertos`}
            onClick={() => navigate('/admin/tickets')}
          />
          <ActionRow
            label="Auditoria"
            sub="Logs de atividade"
            onClick={() => navigate('/admin/logs')}
          />
        </div>
      </ScrollBody>
    </>
  );
}

function ActionRow({
  label,
  sub,
  onClick,
}: {
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surface,
        borderRadius: 16,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{label}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ color: C.faint, fontSize: 20 }}>›</div>
    </button>
  );
}
