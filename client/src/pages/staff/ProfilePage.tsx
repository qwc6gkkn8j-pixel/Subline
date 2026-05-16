import { useEffect, useState } from 'react';
import { Save, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  category: string | null;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    language: string;
  } | null;
  barber: { id: string; name: string };
}

export default function StaffProfilePage() {
  const { t } = useTranslation('staff');
  const toast = useToast();
  const [member, setMember] = useState<StaffProfile | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  const load = async () => {
    try {
      const [{ data: pd }, { data: cd }] = await Promise.all([
        api.get<{ member: StaffProfile }>('/staff/me/profile'),
        api.get<{ categories: string[] }>('/public/categories'),
      ]);
      setMember(pd.member);
      setName(pd.member.name);
      setRole(pd.member.role);
      setCategory(pd.member.category ?? '');
      setCategories(cd.categories);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch('/staff/me/profile', {
        name,
        role: role || undefined,
        category: category || null,
      });
      toast.success(t('profile.profile_updated'));
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error('Passwords ne correspondent pas');
      return;
    }
    setPwdBusy(true);
    try {
      await api.patch('/staff/me/password', { currentPassword: currentPwd, newPassword: newPwd });
      toast.success(t('profile.password_updated'));
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  };

  if (!member) {
    return <div className="card text-center py-10"><Spinner /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="page-title">{t('profile.title')}</h1>

      {/* Employeur */}
      <div className="bg-surface rounded-card p-[18px]">
        <p className="text-[13px] text-muted">{t('profile.employer')}</p>
        <p className="card-title mt-0.5">{member.barber.name}</p>
      </div>

      {/* Données personnelles */}
      <form onSubmit={onSaveProfile} className="card space-y-4">
        <div>
          <label className="label">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input value={member.user?.email ?? ''} disabled />
        </div>
        <div>
          <label className="label">{t('profile.role_label')}</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Barbier, Coiffeur…" />
        </div>
        <div>
          <label className="label">{t('profile.category_label')}</label>
          {categories.length > 0 ? (
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">— {t('profile.category_placeholder', 'Choisir une catégorie')} —</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('profile.category_placeholder')}
            />
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : <Save size={16} />} Enregistrer
          </button>
        </div>
      </form>

      {/* Changer le mot de passe */}
      <form onSubmit={onChangePassword} className="card space-y-4">
        <h2 className="section-title mb-4">Changer le mot de passe</h2>
        <input type="password" placeholder="Mot de passe actuel" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} autoComplete="current-password" required />
        <input type="password" placeholder="Nouveau mot de passe" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" required />
        <input type="password" placeholder="Confirmer le mot de passe" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" required />
        <div className="flex justify-end">
          <button type="submit" className="btn-ghost" disabled={pwdBusy}>
            {pwdBusy ? <Spinner /> : <Save size={16} />} Modifier
          </button>
        </div>
      </form>

      {/* Langue */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-muted" />
          <h2 className="section-title">Langue / Language</h2>
        </div>
        <LanguageSelector variant="list" />
      </div>
    </div>
  );
}
