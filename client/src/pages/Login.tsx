import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import type { Role } from '@/lib/types';
import { C, FONT, I, Icon, ScrollBody, SublineMark, CTA } from '@/design-system';

type Tab = 'login' | 'register';

interface BarberOption {
  id: string;
  name: string;
  address: string | null;
}

export default function Login() {
  const [tab, setTab] = useState<Tab>('login');

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: C.surface,
        color: C.text,
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: C.bg,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
        }}
      >
      <ScrollBody style={{ padding: '90px 28px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SublineMark size={96} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4, marginTop: 18 }}>
            {tab === 'login' ? 'Bem-vindo' : 'Criar conta'}
          </div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 6 }}>
            O teu barbeiro, à distância de um toque.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            background: C.surface,
            borderRadius: 999,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <TabButton active={tab === 'login'} onClick={() => setTab('login')}>
            Entrar
          </TabButton>
          <TabButton active={tab === 'register'} onClick={() => setTab('register')}>
            Criar conta
          </TabButton>
        </div>

        {tab === 'login' ? (
          <SignInForm onSwitchTab={() => setTab('register')} />
        ) : (
          <SignUpForm onSwitchTab={() => setTab('login')} />
        )}

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: C.muted }}>
          © 2026 SUBLINE
        </div>
      </ScrollBody>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 40,
        borderRadius: 999,
        border: 'none',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT,
        background: active ? C.ctaSurface : 'transparent',
        color: active ? C.ctaInk : C.muted,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>
      {children}
    </label>
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

function SignInForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError('Email inválido');
    if (!password) return setError('Password obrigatória');
    setBusy(true);
    try {
      const user = await login(email, password);
      toast.success(t('welcome_back', { name: user.fullName }));
      navigate(rolePath(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={{ marginBottom: 14 }}>
        <FormLabel>Email</FormLabel>
        <FormInput
          type="email"
          autoComplete="email"
          placeholder="jean.dupont@subline.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FormLabel>Password</FormLabel>
        <div style={{ position: 'relative' }}>
          <FormInput
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 48 }}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: C.muted,
            }}
            aria-label={show ? 'Ocultar password' : 'Mostrar password'}
          >
            <Icon d={I.lock} size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => toast.show('Recuperação em breve.', 'info')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: C.muted,
            fontFamily: FONT,
            padding: 0,
          }}
        >
          Esqueceste-te da password?
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(226,75,74,0.10)',
            color: C.danger,
            fontSize: 13,
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <CTA variant="brand" type="submit" disabled={busy}>
        {busy ? 'A entrar…' : 'Entrar'}
      </CTA>

      <div style={{ marginTop: 12 }}>
        <CTA variant="ghost" onClick={onSwitchTab}>
          Criar conta
        </CTA>
      </div>
    </form>
  );
}

function SignUpForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [barberId, setBarberId] = useState<string>('');

  useEffect(() => {
    if (role !== 'client') return;
    api
      .get<{ barbers: BarberOption[] }>('/public/barbers')
      .then((r) => setBarbers(r.data.barbers))
      .catch(() => setBarbers([]));
  }, [role]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError('Nome obrigatório');
    if (!isEmail(email)) return setError('Email inválido');
    if (password.length < 8) return setError('Password com pelo menos 8 caracteres');
    if (password !== confirm) return setError('Passwords não coincidem');
    if (!accepted) return setError('Aceita os termos');

    setBusy(true);
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword: confirm,
        role,
        phone: phone.trim() || undefined,
        barberId: role === 'client' && barberId ? barberId : undefined,
      });
      toast.success(`Bem-vindo, ${user.fullName}`);
      navigate(rolePath(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={{ marginBottom: 14 }}>
        <FormLabel>Nome completo</FormLabel>
        <FormInput
          type="text"
          autoComplete="name"
          placeholder="Jean Dupont"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FormLabel>Email</FormLabel>
        <FormInput
          type="email"
          autoComplete="email"
          placeholder="jean.dupont@subline.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FormLabel>Telefone (opcional)</FormLabel>
        <FormInput
          type="tel"
          autoComplete="tel"
          placeholder="+33 6 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FormLabel>Password</FormLabel>
        <FormInput
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <FormLabel>Confirmar password</FormLabel>
        <FormInput
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <FormLabel>Sou…</FormLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <RoleRadio value="client" current={role} onChange={setRole} label="Cliente" />
          <RoleRadio value="barber" current={role} onChange={setRole} label="Profissional" />
        </div>
      </div>

      {role === 'client' && barbers.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <FormLabel>Escolhe o profissional</FormLabel>
          <select
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
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
            }}
          >
            <option value="">Escolher mais tarde</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.address ? ` — ${b.address}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 18,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: C.blue }}
        />
        <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>
          Aceito os <span style={{ color: C.blue, fontWeight: 600 }}>termos de uso</span> e a política de privacidade.
        </span>
      </label>

      {error && (
        <div
          style={{
            background: 'rgba(226,75,74,0.10)',
            color: C.danger,
            fontSize: 13,
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <CTA variant="brand" type="submit" disabled={busy}>
        {busy ? 'A criar conta…' : 'Criar conta'}
      </CTA>

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: C.muted }}>
        Já tens conta?{' '}
        <button
          type="button"
          onClick={onSwitchTab}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.blue,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: FONT,
            fontSize: 13,
          }}
        >
          Entrar
        </button>
      </div>
    </form>
  );
}

function RoleRadio({
  value,
  current,
  onChange,
  label,
}: {
  value: Role;
  current: Role;
  onChange: (v: Role) => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        height: 48,
        borderRadius: 12,
        border: active ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
        background: active ? C.blueDim : C.bg,
        color: active ? C.blue : C.text,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function rolePath(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'barber') return '/barber';
  return '/client';
}
