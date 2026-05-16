import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method?: string;
  createdAt: string;
  subscription: {
    id: string;
    client: {
      id: string;
      name: string;
      email: string;
      barber?: { id: string; name: string } | null;
    };
  };
}

interface PaymentsResp {
  payments: Payment[];
  total: number;
  page: number;
  pages: number;
  totalRevenue: number;
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  paid: 'badge-success',
  pending: 'badge-warning',
  failed: 'badge-danger',
  refunded: 'badge-muted',
};
const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhado',
  refunded: 'Reembolsado',
};

export default function PaymentsPage() {
    const { t } = useTranslation('admin');
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get<PaymentsResp>('/admin/payments', { params });
      setPayments(data.payments);
      setTotal(data.total);
      setTotalRevenue(Number(data.totalRevenue));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    const rows = [
      ['Data', 'Cliente', 'Profissional', 'Montante', 'Estado', 'Método'],
      ...payments.map((p) => [
        new Date(p.createdAt).toLocaleDateString('pt-PT'),
        p.subscription.client.name,
        p.subscription.client.barber?.name ?? '—',
        formatCurrency(p.amount),
        STATUS_LABELS[p.status],
        p.method ?? '—',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="page-title mr-auto">{t('payments.title')}</h1>
        <button className="btn-ghost btn-sm" onClick={exportCsv}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-tile p-5 flex flex-col gap-3">
          <TrendingUp size={18} className="text-success" />
          <div>
            <p className="text-[30px] font-bold text-ink leading-tight">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-muted mt-1">{t('payments.revenue_confirmed')}</p>
          </div>
        </div>
        <div className="bg-surface rounded-tile p-5 flex flex-col gap-3">
          <div className="h-[18px]" />
          <div>
            <p className="text-[30px] font-bold text-ink leading-tight">{total}</p>
            <p className="text-xs text-muted mt-1">{t('payments.total_transactions')}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card border border-lineSoft">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="label">{t('payments.status_col')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | '')} className="w-36">
              <option value="">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhado</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="label">{t('payments.from_date')}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="label">{t('payments.to_date')}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
          <button className="btn-primary btn-sm" onClick={() => void load()}>{t('common:filter')}</button>
        </div>
      </div>

      {/* Table / empty / loading */}
      {loading ? (
        <div className="card border border-lineSoft text-center py-10">
          <Spinner />
        </div>
      ) : payments.length === 0 ? (
        <div className="card border border-lineSoft">
          <EmptyState
            icon={TrendingUp}
            title={t('payments.no_payments')}
            description="Nenhum pagamento encontrado para os filtros seleccionados."
          />
        </div>
      ) : (
        <div className="card border border-lineSoft overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-lineSoft">
              <tr className="text-left">
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide">{t('payments.client_col')}</th>
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide hidden md:table-cell">{t('payments.professional_col')}</th>
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide text-right">{t('payments.amount_col')}</th>
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 font-semibold text-muted text-xs uppercase tracking-wide hidden lg:table-cell">{t('payments.method_col')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-lineSoft hover:bg-surface transition-colors">
                  <td className="px-5 py-3 text-muted text-xs">
                    {new Date(p.createdAt).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{p.subscription.client.name}</p>
                    <p className="text-xs text-muted">{p.subscription.client.email}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted">
                    {p.subscription.client.barber?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-ink">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-muted capitalize">
                    {p.method ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
