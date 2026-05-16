import { useEffect, useState } from 'react';
import { Save, Star } from 'lucide-react';
import { Banner } from '@/components/ui/Banner';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StripeConnect } from '@/components/stripe/StripeConnect';
import type { Barber, StripeStatus } from '@/lib/types';

export default function ProfilePage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripe, setStripe] = useState<StripeStatus | null>(null);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get<{ barber: Barber }>('/pro/profile'),
        api.get<StripeStatus>('/pro/stripe/status'),
      ]);
      setBarber(p.data.barber);
      setName(p.data.barber.name);
      setPhone(p.data.barber.phone ?? '');
      setAddress(p.data.barber.address ?? '');
      setBio(p.data.barber.bio ?? '');
      setStripe(s.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/pro/profile', {
        name,
        phone: phone || null,
        address: address || null,
        bio: bio || null,
      });
      toast.success('Perfil atualizado');
      await refresh();
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleStripeConnected = () => {
    void load();
  };

  if (!barber) {
    return (
      <div className="card text-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="page-title">O meu perfil</h1>

      {/* Avatar / identity strip */}
      <div className="bg-surface rounded-tile p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xl font-bold shrink-0">
          {barber.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-[18px] truncate">{barber.name}</p>
          <p className="text-[13px] text-muted truncate">{user?.email}</p>
        </div>
        <div className="flex items-center gap-1 text-[13px] font-semibold text-warning shrink-0">
          <Star size={14} className="fill-warning" />
          {Number(barber.rating ?? 0).toFixed(1)}
        </div>
      </div>

      {/* Stripe Connect */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] text-muted uppercase tracking-wide">Stripe Connect</p>
            <h2 className="section-title mb-4">Pagamentos</h2>
          </div>
          {stripe?.barberConnected ? (
            <span className="badge-success">Ligado</span>
          ) : (
            <span className="badge-muted">Por ligar</span>
          )}
        </div>

        {!stripe?.configured && (
          <Banner tone="warning" title="Stripe ainda não configurado pela plataforma">
            O administrador ainda não ativou Stripe. Ligas a tua conta assim que estiver disponível.
          </Banner>
        )}
        {stripe?.configured && stripe.publishableKey && (
          <StripeConnect
            publishableKey={stripe.publishableKey}
            accountId={stripe.stripeAccountId ?? null}
            connected={stripe.barberConnected ?? false}
            onConnected={handleStripeConnected}
          />
        )}
      </section>

      {/* Public details form */}
      <section className="card">
        <h2 className="section-title mb-4">Detalhes públicos</h2>
        <form onSubmit={onSave} className="space-y-0">
          {/* menu-item style rows */}
          <div className="py-3 border-b border-lineSoft">
            <label className="label">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="py-3 border-b border-lineSoft">
            <label className="label">Email</label>
            <input value={user?.email ?? ''} disabled />
          </div>
          <div className="py-3 border-b border-lineSoft">
            <label className="label">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="py-3 border-b border-lineSoft">
            <label className="label">Morada</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="py-3">
            <label className="label">Bio</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Spinner /> : <Save size={16} />} Guardar
            </button>
          </div>
        </form>
      </section>

      {/* Language */}
      <section className="card">
        <h2 className="section-title mb-4">Langue / Language</h2>
        <LanguageSelector variant="list" />
      </section>
    </div>
  );
}
