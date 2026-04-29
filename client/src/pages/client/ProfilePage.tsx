import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Client } from '@/lib/types';

export default function ProfilePage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get<{
        client: Client & { user: { email: string; createdAt: string } };
      }>('/client/profile');
      setClient(data.client);
      setName(data.client.name);
      setEmail(data.client.email);
      setPhone(data.client.phone ?? '');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/client/profile', { name, email, phone: phone || null });
      if (newPassword) {
        if (newPassword !== confirm) throw new Error('Passwords não coincidem');
        if (!currentPassword) throw new Error('Password atual obrigatória');
        await api.put('/client/password', {
          currentPassword,
          newPassword,
          confirmPassword: confirm,
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');
      }
      toast.success('Perfil atualizado');
      await refresh();
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!client) {
    return (
      <div className="card text-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">O meu perfil</h1>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">Mudar password (opcional)</p>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="Nova password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirmar nova password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : <Save size={16} />} Guardar
          </button>
        </div>
      </form>

      <div className="card text-sm">
        <p className="text-muted">
          Sessão: <span className="text-ink font-medium">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
