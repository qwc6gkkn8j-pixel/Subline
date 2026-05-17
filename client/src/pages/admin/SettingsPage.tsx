import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { StripeStatus } from '@/lib/types';
import { C, FONT, I, Icon, Avatar, ScrollBody, CTA } from '@/design-system';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [status, setStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    api
      .get<StripeStatus>('/public/stripe/status')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null));
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const fullName = user?.fullName ?? '';
  const initials = (fullName.split(' ')[0]?.[0] ?? 'A').toUpperCase();

  const quick = [
    { icon: I.users, label: 'Profissionais', onClick: () => navigate('/admin/pros') },
    { icon: I.user, label: 'Utilizadores', onClick: () => navigate('/admin/users') },
    { icon: I.card, label: 'Pagamentos', onClick: () => navigate('/admin/payments') },
    { icon: I.help, label: 'Tickets', onClick: () => navigate('/admin/tickets') },
  ];

  return (
    <ScrollBody style={{ padding: '50px 20px 24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4, margin: 0 }}>Definições</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{user?.email}</div>
          <div
            style={{
              fontSize: 11,
              color: C.danger,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Administrador
          </div>
        </div>
        <Avatar initials={initials} size={56} bg={C.surface} />
      </div>

      {status && (
        <div
          style={{
            background: status.configured ? 'rgba(43,200,160,0.10)' : 'rgba(240,184,43,0.10)',
            color: status.configured ? C.success : C.warning,
            borderRadius: 14,
            padding: '14px 18px',
            fontSize: 13,
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          {status.configured
            ? `Stripe configurado · Connect ${status.connectConfigured ? 'ativo' : 'inativo'}`
            : 'Stripe ainda não configurado'}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {quick.map((q, i) => (
          <button
            key={i}
            onClick={q.onClick}
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
              fontFamily: FONT,
            }}
          >
            <Icon d={q.icon} size={20} color={C.text} stroke={2} />
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{q.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/admin/logs')}
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          padding: 18,
          background: C.surface,
          borderRadius: 16,
          marginBottom: 12,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          fontFamily: FONT,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Auditoria</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Logs de atividade na plataforma</div>
        </div>
        <Icon d={I.chev} size={18} color={C.faint} stroke={2} />
      </button>

      <button
        onClick={() => navigate('/admin/plans')}
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          padding: 18,
          background: C.surface,
          borderRadius: 16,
          marginBottom: 24,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          fontFamily: FONT,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Planos</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Gestão de planos das profissionais</div>
        </div>
        <Icon d={I.chev} size={18} color={C.faint} stroke={2} />
      </button>

      <CTA variant="ghost" icon={<Icon d={I.logout} size={16} stroke={2} />} onClick={onLogout}>
        Sair / Mudar conta
      </CTA>
    </ScrollBody>
  );
}
