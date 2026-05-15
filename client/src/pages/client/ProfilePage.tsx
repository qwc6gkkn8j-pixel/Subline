import { useEffect, useRef, useState } from 'react';
import { Save, Camera, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Client } from '@/lib/types';

interface FavoriteEntry {
  id: string;
  barberId: string;
  barber: { id: string; name: string; city?: string; rating: number };
}

export default function ProfilePage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  const load = async () => {
    try {
      const [{ data: pd }, { data: fd }] = await Promise.all([
        api.get<{ client: Client & { user: { email: string; createdAt: string } } }>('/client/profile'),
        api.get<{ favorites: FavoriteEntry[] }>('/client/favorites'),
      ]);
      setClient(pd.client);
      setName(pd.client.name);
      setEmail(pd.client.email);
      setPhone(pd.client.phone ?? '');
      setFavorites(fd.favorites);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/client/profile', { name, email, phone: phone || null });
      if (newPassword) {
        if (newPassword !== confirm) throw new Error('Passwords não coincidem');
        if (!currentPassword) throw new Error('Password atual obrigatória');
        await api.put('/client/password', { currentPassword, newPassword, confirmPassword: confirm });
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

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande (máx. 2 MB)');
      return;
    }
    setAvatarUploading(true);
    try {
      // Encode as data URL — in production this should go to S3/Cloudinary
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.patch('/client/avatar', { avatarUrl: dataUrl });
      toast.success('Foto actualizada');
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const removeFavorite = async (barberId: string) => {
    try {
      await api.post(`/client/favorites/${barberId}`);
      setFavorites((prev) => prev.filter((f) => f.barberId !== barberId));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (!client) {
    return <div className="card text-center py-10"><Spinner /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">O meu perfil</h1>

      {/* Avatar */}
      <div className="card flex items-center gap-4">
        <div className="relative">
          <Avatar name={client.name} size={64} imageUrl={user?.avatarUrl} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center shadow-btn"
            aria-label="Alterar foto"
          >
            {avatarUploading ? <Spinner className="w-3 h-3" /> : <Camera size={13} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold text-ink">{client.name}</p>
          <p className="text-xs text-muted">{user?.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-brand mt-1"
          >
            Alterar foto
          </button>
        </div>
      </div>

      {/* Formulário */}
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
        <div className="border-t border-lineSoft pt-4">
          <p className="text-xs font-semibold text-muted mb-3">Mudar password (opcional)</p>
          <div className="space-y-3">
            <input type="password" placeholder="Password atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            <input type="password" placeholder="Nova password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <input type="password" placeholder="Confirmar nova password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : <Save size={16} />} Guardar
          </button>
        </div>
      </form>

      {/* Favoritos */}
      {favorites.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} className="text-danger fill-danger" />
            <h2 className="font-semibold text-ink">Os meus favoritos</h2>
          </div>
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div key={fav.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink text-sm">{fav.barber.name}</p>
                  {fav.barber.city && <p className="text-xs text-muted">{fav.barber.city}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{Number(fav.barber.rating).toFixed(1)} ★</span>
                  <Link to={`/client/calendar`} className="btn-ghost btn-sm text-xs">Marcar</Link>
                  <button
                    onClick={() => void removeFavorite(fav.barberId)}
                    className="p-1 text-faint hover:text-danger"
                    aria-label="Remover favorito"
                  >
                    <Heart size={14} className="fill-danger text-danger" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
