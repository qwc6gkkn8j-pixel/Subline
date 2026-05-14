import { useEffect, useState } from 'react';
import { Save, Star } from 'lucide-react';
import { Banner } from '@/components/ui/Banner';
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
      <h1 className="text-2xl font-bold text-ink">O meu perfil</h1>

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Stripe Connect</p>
            <h2 className="font-semibold text-ink">Pagamentos</h2>
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

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Detalhes públicos</h2>
          <span className="inline-flex items-center gap-1 text-sm text-warning">
            <Star size={14} className="fill-warning" /> {Number(barber.rating ?? 0).toFixed(1)}
          </span>
        </div>
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email ?? ''} disabled />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Morada</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Spinner /> : <Save size={16} />} Guardar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
