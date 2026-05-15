import { useEffect, useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, ChevronDown, ExternalLink } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type ProStatus = 'active' | 'suspended' | 'pending_onboarding';

interface Pro {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  categories: string[];
  rating: number;
  proStatus: ProStatus;
  stripeConnected: boolean;
  stripeAccountId?: string;
  userStatus: 'active' | 'inactive';
  clientCount: number;
  appointmentCount: number;
  createdAt: string;
}

interface ProsResp {
  pros: Pro[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_LABELS: Record<ProStatus, string> = {
  active: 'Activo',
  suspended: 'Suspenso',
  pending_onboarding: 'Pendente',
};

const STATUS_BADGE: Record<ProStatus, string> = {
  active: 'badge-success',
  suspended: 'badge-danger',
  pending_onboarding: 'badge-warning',
};

export default function ProsPage() {
    const { t } = useTranslation('admin');
  const toast = useToast();
  const [pros, setPros] = useState<Pro[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [proStatus, setProStatus] = useState<ProStatus | ''>('');
  const [selected, setSelected] = useState<Pro | null>(null);
  const [changing, setChanging] = useState(false);

  const load = async (search = q, status = proStatus) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.q = search;
      if (status) params.proStatus = status;
      const { data } = await api.get<ProsResp>('/admin/pros', { params });
      setPros(data.pros);
      setTotal(data.total);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load();
  };

  const handleStatusChange = async (pro: Pro, newStatus: ProStatus) => {
    setChanging(true);
    try {
      await api.patch(`/admin/pros/${pro.id}/status`, {
        proStatus: newStatus,
        ...(newStatus === 'suspended' ? { userStatus: 'inactive' } : { userStatus: 'active' }),
      });
      toast.success(t('pros.status_updated'));
      setSelected(null);
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setChanging(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="page-title mr-auto">{t('pros.title')}</h1>
        <span className="text-sm text-muted">{t('pros.total', { count: total })}</span>
      </div>

      {/* Filtros */}
      <div className="card mb-5">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <div className="flex-1 relative min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('pros.search_placeholder')}
              className="!pl-9"
            />
          </div>
          <select
            value={proStatus}
            onChange={(e) => { setProStatus(e.target.value as ProStatus | ''); void load(q, e.target.value as ProStatus | ''); }}
            className="w-40"
          >
            <option value="">{t('pros.all_statuses')}</option>
            <option value="active">{t('pros.status_active')}</option>
            <option value="pending_onboarding">{t('pros.status_pending')}</option>
            <option value="suspended">{t('pros.status_suspended')}</option>
          </select>
          <button type="submit" className="btn-primary btn-sm">{t('common:search')}</button>
        </form>
      </div>

      {loading ? (
        <div className="card text-center py-10"><Spinner /></div>
      ) : pros.length === 0 ? (
        <div className="card">
          <EmptyState icon={Search} title={t('pros.no_pros')} description="Tenta ajustar os filtros." />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-lineSoft">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-muted">{t('common:nav.pros')}</th>
                <th className="px-4 py-3 font-semibold text-muted hidden md:table-cell">{t('pros.categories')}</th>
                <th className="px-4 py-3 font-semibold text-muted">{t('common:fields.status')}</th>
                <th className="px-4 py-3 font-semibold text-muted">{t('common:stripe.connected')}</th>
                <th className="px-4 py-3 font-semibold text-muted hidden lg:table-cell">{t('common:nav.clients')}</th>
                <th className="px-4 py-3 font-semibold text-muted hidden lg:table-cell">{t('pros.registered')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pros.map((pro) => (
                <tr key={pro.id} className="table-row hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{pro.name}</p>
                    <p className="text-xs text-muted">{pro.email}</p>
                    {pro.city && <p className="text-xs text-faint">{pro.city}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {pro.categories.slice(0, 2).map((c) => (
                        <span key={c} className="badge-muted text-xs">{c}</span>
                      ))}
                      {pro.categories.length > 2 && (
                        <span className="text-xs text-faint">+{pro.categories.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[pro.proStatus]}>{STATUS_LABELS[pro.proStatus]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {pro.stripeConnected ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <XCircle size={16} className="text-faint" />
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted">{pro.clientCount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted text-xs">{formatRelative(pro.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(pro)}
                      className="btn-ghost btn-sm flex items-center gap-1"
                    >
                      {t('pros.manage')} <ChevronDown size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={selected.name}
          footer={<button className="btn-ghost" onClick={() => setSelected(null)}>{t('common:close')}</button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted">Email</p><p className="font-medium">{selected.email}</p></div>
              <div><p className="text-muted">{t('pros.pro_status')}</p><span className={STATUS_BADGE[selected.proStatus]}>{STATUS_LABELS[selected.proStatus]}</span></div>
              <div><p className="text-muted">Stripe Connect</p><p className="font-medium">{selected.stripeConnected ? t('common:stripe.connected') : t('common:stripe.not_connected')}</p></div>
              <div><p className="text-muted">{t('common:nav.clients')}</p><p className="font-medium">{selected.clientCount}</p></div>
              <div><p className="text-muted">{t('common:fields.rating')}</p><p className="font-medium">{Number(selected.rating).toFixed(1)} ★</p></div>
              <div><p className="text-muted">{t('pros.registered')}</p><p className="font-medium text-xs">{formatRelative(selected.createdAt)}</p></div>
            </div>

            {selected.categories.length > 0 && (
              <div>
                <p className="text-sm text-muted mb-2">{t('pros.categories')}</p>
                <div className="flex flex-wrap gap-2">
                  {selected.categories.map((c) => <span key={c} className="badge-muted">{c}</span>)}
                </div>
              </div>
            )}

            <div className="border-t border-lineSoft pt-4">
              <p className="text-sm font-semibold mb-3">{t('common:actions')}</p>
              <div className="flex flex-wrap gap-2">
                {selected.proStatus !== 'active' && (
                  <button
                    className="btn-primary btn-sm"
                    disabled={changing}
                    onClick={() => void handleStatusChange(selected, 'active')}
                  >
                    <CheckCircle size={14} /> {t('pros.activate')}
                  </button>
                )}
                {selected.proStatus !== 'suspended' && (
                  <button
                    className="btn-danger btn-sm"
                    disabled={changing}
                    onClick={() => void handleStatusChange(selected, 'suspended')}
                  >
                    <XCircle size={14} /> {t('pros.suspend')}
                  </button>
                )}
                {selected.proStatus !== 'pending_onboarding' && (
                  <button
                    className="btn-ghost btn-sm"
                    disabled={changing}
                    onClick={() => void handleStatusChange(selected, 'pending_onboarding')}
                  >
                    <Clock size={14} /> {t('pros.set_pending')}
                  </button>
                )}
                {selected.stripeConnected && selected.stripeAccountId && (
                  <a
                    href={`https://dashboard.stripe.com/connect/accounts/${selected.stripeAccountId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost btn-sm"
                  >
                    <ExternalLink size={14} /> {t('pros.stripe_dashboard')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
