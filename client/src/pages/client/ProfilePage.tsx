import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Client, Subscription } from '@/lib/types';
import {
  C,
  FONT,
  I,
  Icon,
  Avatar,
  ScrollBody,
  CTA,
  PlanBadge,
} from '@/design-system';

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<(Client & { user: { email: string } }) | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [editing, setEditing] = useState<'profile' | 'password' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api
        .get<{ client: Client & { user: { email: string; createdAt: string } } }>('/client/profile')
        .catch(() => ({ data: { client: null as unknown as Client & { user: { email: string; createdAt: string } } } })),
      api
        .get<{ subscription: Subscription | null }>('/client/subscription')
        .catch(() => ({ data: { subscription: null } })),
    ])
      .then(([p, s]) => {
        if (p.data.client) {
          setClient(p.data.client);
          setName(p.data.client.name);
          setPhone(p.data.client.phone ?? '');
        }
        setSubscription(s.data.subscription);
      })
      .finally(() => setLoading(false));
  }, []);

  const onSaveProfile = async () => {
    setBusy(true);
    try {
      await api.put('/client/profile', { name, phone: phone || null });
      toast.success('Perfil atualizado');
      setEditing(null);
      setClient((c) => (c ? { ...c, name, phone } : c));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onChangePassword = async () => {
    if (newPassword !== confirm) {
      toast.error('Passwords não coincidem');
      return;
    }
    setBusy(true);
    try {
      await api.put('/client/password', {
        currentPassword,
        newPassword,
        confirmPassword: confirm,
      });
      toast.success('Password alterada');
      setEditing(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <Spinner />
      </div>
    );
  }

  const fullName = client?.name ?? user?.fullName ?? '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';

  const quick = [
    { icon: I.cog, label: 'Editar perfil', onClick: () => setEditing('profile') },
    { icon: I.lock, label: 'Password', onClick: () => setEditing('password') },
    { icon: I.heart, label: 'Favoritos', onClick: () => navigate('/client/discover') },
    { icon: I.chat, label: 'Mensagens', onClick: () => navigate('/client/chat') },
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
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4, margin: 0 }}>
            {fullName || 'Conta'}
          </h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{client?.user.email ?? user?.email}</div>
          {subscription && (
            <div style={{ marginTop: 10 }}>
              <PlanBadge>{(subscription.plan?.name ?? 'Premium') + ' · Ativo'}</PlanBadge>
            </div>
          )}
        </div>
        <Avatar initials={initials} size={56} bg={C.surface} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
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

      {subscription && (
        <button
          onClick={() => navigate('/client/subscription')}
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
            <div style={{ fontSize: 15, fontWeight: 700 }}>A tua subscrição</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
              {subscription.cutsTotal
                ? `${subscription.cutsUsed} de ${subscription.cutsTotal} cortes este mês`
                : 'Subscrição activa'}
            </div>
          </div>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: C.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon d={I.scissors} size={26} color={C.text} stroke={1.6} />
          </div>
        </button>
      )}

      <button
        onClick={() => navigate('/client/support')}
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
          <div style={{ fontSize: 15, fontWeight: 700 }}>Ajuda &amp; Suporte</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Tickets, FAQ, contacto
          </div>
        </div>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            background: C.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon d={I.help} size={26} color={C.text} stroke={1.6} />
        </div>
      </button>

      <CTA variant="ghost" icon={<Icon d={I.logout} size={16} stroke={2} />} onClick={onLogout}>
        Sair / Mudar conta
      </CTA>

      {editing === 'profile' && (
        <EditDialog title="Editar perfil" onClose={() => setEditing(null)}>
          <FormField label="Nome">
            <FormInput value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Telefone">
            <FormInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <CTA variant="brand" onClick={onSaveProfile} disabled={busy}>
            {busy ? 'A guardar…' : 'Guardar'}
          </CTA>
        </EditDialog>
      )}

      {editing === 'password' && (
        <EditDialog title="Alterar password" onClose={() => setEditing(null)}>
          <FormField label="Password atual">
            <FormInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormField>
          <FormField label="Nova password">
            <FormInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
          <FormField label="Confirmar">
            <FormInput
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </FormField>
          <CTA variant="brand" onClick={onChangePassword} disabled={busy}>
            {busy ? 'A guardar…' : 'Alterar password'}
          </CTA>
        </EditDialog>
      )}
    </ScrollBody>
  );
}

function EditDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 430,
          fontFamily: FONT,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              color: C.muted,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: C.surface,
        borderRadius: 12,
        padding: '14px 18px',
        fontSize: 15,
        border: 'none',
        outline: 'none',
        fontFamily: FONT,
        color: C.text,
        ...(props.style || {}),
      }}
    />
  );
}
