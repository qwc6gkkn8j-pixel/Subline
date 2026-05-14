import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

type Tab = 'login' | 'register';

interface BarberOption {
  id: string;
  name: string;
  address: string | null;
}

export default function Login() {
  const [tab, setTab] = useState<Tab>('login');

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size={84} showText />
          <p className="text-xs text-muted mt-3 tracking-widest uppercase">Everything you need</p>
        </div>

        <div className="bg-card rounded-card border border-line p-6 sm:p-8">
          <div className="grid grid-cols-2 bg-surface rounded-button border border-line p-1 mb-6">
            <TabButton active={tab === 'login'} onClick={() => setTab('login')}>
              Sign In
            </TabButton>
            <TabButton active={tab === 'register'} onClick={() => setTab('register')}>
              Create Account
            </TabButton>
          </div>

          {tab === 'login' ? (
            <SignInForm onSwitchTab={() => setTab('register')} />
          ) : (
            <SignUpForm onSwitchTab={() => setTab('login')} />
          )}
        </div>
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
      className={cn(
        'h-10 rounded-button text-sm font-semibold transition-all',
        active ? 'bg-brand text-white shadow-blue' : 'text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sign In
// ────────────────────────────────────────────────────────────────────────────
function SignInForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError('Please enter a valid email');
    if (!password) return setError('Password is required');
    setBusy(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.fullName}`);
      navigate(rolePath(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field icon={<Mail size={16} />} label="Email">
        <input
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field icon={<Lock size={16} />} label="Password">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => toast.show('Password reset is coming soon', 'info')}
          className="text-xs text-muted hover:text-ink"
        >
          Forgot password?
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-button px-3 py-2">{error}</div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner /> : 'Sign In'}
      </button>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onSwitchTab} className="text-brand font-medium">
          Create one
        </button>
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sign Up
// ────────────────────────────────────────────────────────────────────────────
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
  const [show, setShow] = useState(false);
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

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = !confirm || confirm === password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError('Full name is required');
    if (!isEmail(email)) return setError('Please enter a valid email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (!accepted) return setError('Please accept the terms to continue');

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
      toast.success(`Account created — welcome, ${user.fullName}!`);
      navigate(rolePath(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field icon={<User size={16} />} label="Full Name">
        <input
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </Field>

      <Field icon={<Mail size={16} />} label="Email">
        <input
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field icon={<Phone size={16} />} label="Phone (optional)">
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+1-555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      <Field icon={<Lock size={16} />} label="Password">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password && <PasswordStrength score={strength} />}
      </Field>

      <Field icon={<Lock size={16} />} label="Confirm password">
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {!passwordsMatch && <p className="input-error">Passwords do not match</p>}
      </Field>

      <div>
        <label className="label">I am a…</label>
        <div className="grid grid-cols-2 gap-2">
          <RoleRadio value="client" current={role} onChange={setRole} label="Client" />
          <RoleRadio value="barber" current={role} onChange={setRole} label="Professionnel" />
        </div>
      </div>

      {role === 'client' && barbers.length > 0 && (
        <div>
          <label className="label">Choose a professional (optional)</label>
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="">— Pick later —</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.address ? ` — ${b.address}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
        />
        <span className="text-sm text-muted">
          I agree to the <span className="text-brand">Terms &amp; Conditions</span>
        </span>
      </label>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-button px-3 py-2">{error}</div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner /> : 'Create Account'}
      </button>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchTab} className="text-brand font-medium">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label flex items-center gap-2">
        {icon && <span className="text-muted">{icon}</span>} {label}
      </label>
      {children}
    </div>
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
      className={cn(
        'h-12 rounded-button border text-sm font-medium transition-all',
        active
          ? 'border-brand bg-brand/15 text-brand'
          : 'border-line bg-card text-muted hover:text-ink',
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function PasswordStrength({ score }: { score: 0 | 1 | 2 | 3 }) {
  const labels: Record<number, string> = { 0: 'Too weak', 1: 'Weak', 2: 'Medium', 3: 'Strong' };
  const colors: Record<number, string> = {
    0: 'bg-danger',
    1: 'bg-warning',
    2: 'bg-brand',
    3: 'bg-success',
  };
  return (
    <div className="mt-2">
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', colors[score])}
          style={{ width: `${((score + 1) / 4) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted mt-1">{labels[score]}</p>
    </div>
  );
}

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 12) score++;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function rolePath(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'barber') return '/barber';
  return '/client';
}
