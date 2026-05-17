import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import type { Barber, StripeStatus } from '@/lib/types';
import { C, FONT, I, Icon, Avatar, ScrollBody, CTA } from '@/design-system';

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [stripe, setStripe] = useState<StripeStatus | null>(null);
  const [editing, setEditing] = useState<'profile' | 'password' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ barber: Barber }>('/pro/profile').catch(() => ({ data: { barber: null as unknown as Barber } })),
      api.get<StripeStatus>('/pro/stripe/status').catch(() => ({ data: null as unknown as StripeStatus })),
    ])
      .then(([p, s]) => {
        if (p.data.barber) {
          setBarber(p.data.barber);
          setName(p.data.barber.name);
          setPhone(p.data.barber.phone ?? '');
          setAddress(p.data.barber.address ?? '');
          setBio(p.data.barber.bio ?? '');
        }
        setStripe(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const onSaveProfile = async () => {
    setBusy(true);
    try {
      await api.put('/pro/profile', { name, phone: phone || null, address: address || null, bio: bio || null });
      toast.success('Perfil atualizado');
      setEditing(null);
      setBarber((b) => (b ? { ...b, name, phone, address, bio } : b));
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
      await api.put('/pro/password', { currentPassword, newPassword, confirmPassword: confirm });
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

  const fullName = barber?.name ?? user?.fullName ?? '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'P';

  const quick = [
    { icon: I.cog, label: 'Editar perfil', onClick: () => setEditing('profile') },
    { icon: I.lock, label: 'Password', onClick: () => setEditing('password') },
    { icon: I.scissors, label: 'Serviços', onClick: () => navigate('/barber/services') },
    { icon: I.users, label: 'Staff', onClick: () => navigate('/barber/staff') },
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
            {fullName || 'Perfil'}
          </h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{user?.email}</div>
          {barber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 13 }}>
              <Icon d={I.star} size={12} fill="currentColor" color={C.text} stroke={0} />
              <span style={{ fontWeight: 700 }}>{Number(barber.rating ?? 0).toFixed(1)}</span>
              <span style={{ color: C.muted }}>· Profissional</span>
            </div>
          )}
        </div>
        <Avatar initials={initials} size={56} bg={C.surface} />
      </div>

      {stripe && (
        <div
          style={{
            background: stripe.barberConnected ? 'rgba(43,200,160,0.10)' : 'rgba(240,184,43,0.10)',
            color: stripe.barberConnected ? C.success : C.warning,
            borderRadius: 14,
            padding: '14px 18px',
            fontSize: 13,
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          {stripe.barberConnected
            ? 'Stripe conectado'
            : 'Stripe não conectado — liga para receber pagamentos'}
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

      {barber && (
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Detalhes</div>
          {barber.address && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>📍 {barber.address}</div>
          )}
          {barber.phone && <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>📞 {barber.phone}</div>}
          {barber.bio && (
            <div style={{ fontSize: 13, color: C.text, marginTop: 8, lineHeight: 1.5 }}>{barber.bio}</div>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/barber/support')}
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
          <div style={{ fontSize: 15, fontWeight: 700 }}>Ajuda &amp; Suporte</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Tickets, FAQ, contacto</div>
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
          <FormField label="Morada">
            <FormInput value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
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
                resize: 'vertical',
              }}
            />
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
          maxHeight: '90vh',
          overflowY: 'auto',
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
