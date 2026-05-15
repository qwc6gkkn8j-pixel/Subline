import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink mr-auto">Pagamentos</h1>
        <button className="btn-ghost btn-sm" onClick={exportCsv}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* KPI rápido */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="stat-card">
          <TrendingUp size={18} className="text-success" />
          <div>
            <p className="text-2xl font-bold text-ink">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted">Receita confirmada</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="text-2xl font-bold text-ink">{total}</p>
            <p className="text-xs text-muted">Total de transacções</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="label">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | '')} className="w-36">
              <option value="">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhado</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="label">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
          <button className="btn-primary btn-sm" onClick={() => void load()}>Filtrar</button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-10"><Spinner /></div>
      ) : payments.length === 0 ? (
        <div className="card">
          <EmptyState icon={TrendingUp} title="Sem pagamentos" description="Nenhum pagamento encontrado para os filtros seleccionados." />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-lineSoft">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-muted">Data</th>
                <th className="px-4 py-3 font-semibold text-muted">Cliente</th>
                <th className="px-4 py-3 font-semibold text-muted hidden md:table-cell">Profissional</th>
                <th className="px-4 py-3 font-semibold text-muted text-right">Montante</th>
                <th className="px-4 py-3 font-semibold text-muted">Estado</th>
                <th className="px-4 py-3 font-semibold text-muted hidden lg:table-cell">Método</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(p.createdAt).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{p.subscription.client.name}</p>
                    <p className="text-xs text-muted">{p.subscription.client.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted">
                    {p.subscription.client.barber?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted capitalize">
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
