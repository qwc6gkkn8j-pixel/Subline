import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, isoDate } from '@/lib/utils';
import type { Appointment } from '@/lib/types';
import { SERVICE_LABEL } from '@/lib/types';
import {
  C,
  I,
  Icon,
  Avatar,
  PageHeader,
  ScrollBody,
  SectionHeader,
  PlanBadge,
} from '@/design-system';

interface Stats {
  activeClients: number;
  monthlyRevenue: number;
  rating: number;
}

export default function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);

  useEffect(() => {
    const todayStr = isoDate(new Date());
    Promise.all([
      api.get<Stats>('/pro/statistics').catch(() => ({
        data: { activeClients: 0, monthlyRevenue: 0, rating: 0 } as Stats,
      })),
      api
        .get<{ appointments: Appointment[] }>('/pro/appointments', {
          params: { from: todayStr, to: todayStr },
        })
        .catch(() => ({ data: { appointments: [] } })),
    ])
      .then(([s, a]) => {
        setStats(s.data);
        setToday(a.data.appointments);
      })
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [toast]);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const initials = (firstName[0] ?? 'P').toUpperCase();
  const apptCount = today.length;

  const kpis = [
    {
      v: stats ? formatCurrency(stats.monthlyRevenue) : '—',
      l: 'Receita do mês',
      d: '',
    },
    { v: stats?.activeClients ?? 0, l: 'Clientes ativos', d: '' },
    { v: apptCount, l: 'Marcações hoje', d: '' },
    {
      v: stats?.rating ? Number(stats.rating).toFixed(1) : '0.0',
      l: 'Avaliação',
      d: '',
    },
  ];

  return (
    <>
      <PageHeader actions={<Avatar initials={initials} size={36} bg={C.surface} />} />
      <ScrollBody>
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4 }}>
            Olá{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 6 }}>
            {apptCount === 0
              ? 'Não tens marcações hoje'
              : `Tens ${apptCount} marcação${apptCount > 1 ? 'ões' : ''} hoje`}
          </div>
        </div>

        <div style={{ height: 22 }} />

        <div
          style={{
            padding: '0 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {kpis.map((k, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.3 }}>{k.v}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{k.l}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 28 }} />

        <SectionHeader
          title="Próximos clientes"
          action="Agenda"
          onAction={() => navigate('/barber/calendar')}
        />
        <div style={{ padding: '0 20px' }}>
          {today.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, padding: '20px 0' }}>
              Sem marcações para hoje
            </div>
          ) : (
            today.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}
              >
                <div style={{ minWidth: 52 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{a.startTime}</div>
                  <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>HOJE</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {a.client?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                    {SERVICE_LABEL[a.service]} · {a.durationMinutes} min
                  </div>
                </div>
                {a.status === 'confirmed' ? (
                  <PlanBadge>Confirmado</PlanBadge>
                ) : a.status === 'pending' ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: C.warning,
                      fontWeight: 600,
                    }}
                  >
                    Pendente
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                    {a.status}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ height: 28 }} />

        <SectionHeader title="Atalhos" />
        <div
          style={{
            padding: '0 20px 28px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <QuickAction icon={I.users} label="Clientes" onClick={() => navigate('/barber/clients')} />
          <QuickAction icon={I.cal} label="Agenda" onClick={() => navigate('/barber/calendar')} />
          <QuickAction icon={I.scissors} label="Serviços" onClick={() => navigate('/barber/services')} />
          <QuickAction icon={I.chat} label="Mensagens" onClick={() => navigate('/barber/chat')} />
        </div>
      </ScrollBody>
    </>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surface,
        borderRadius: 14,
        padding: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Icon d={icon} size={20} color={C.text} stroke={2} />
      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{label}</span>
    </button>
  );
}
