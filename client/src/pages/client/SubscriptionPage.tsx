import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Banner } from '@/components/ui/Banner';
import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  Payment,
  PaymentStatus,
  Plan,
  Subscription,
} from '@/lib/types';
import { PLAN_LABEL } from '@/lib/types';

const PAGE_SIZE = 8;

export default function SubscriptionPage() {
  const toast = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, pl, py] = await Promise.all([
        api.get<{ subscription: Subscription | null }>('/client/subscription'),
        api.get<{ plans: Plan[] }>('/client/plans'),
        api.get<{ payments: Payment[]; totalPages: number }>('/client/payments', {
          params: { page, limit: PAGE_SIZE },
        }),
      ]);
      setSubscription(s.data.subscription);
      setPlans(pl.data.plans);
      setPayments(py.data.payments);
      setTotalPages(py.data.totalPages);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const used = subscription?.cutsUsed ?? 0;
  const total = subscription?.cutsTotal ?? subscription?.plan?.cutsPerMonth ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">A minha subscrição</h1>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : subscription ? (
        <section className="card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Plano</p>
              <h2 className="text-2xl font-bold text-ink mt-1">
                {subscription.plan?.name ?? PLAN_LABEL[subscription.planType]}
              </h2>
              <p className="text-muted">{formatCurrency(subscription.price)} / mês</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Estado</p>
              <p
                className={
                  subscription.status === 'active' ? 'text-success font-semibold mt-1' : 'text-muted mt-1'
                }
              >
                {subscription.status}
              </p>
              <p className="text-xs text-muted mt-1">
                Renova {formatDate(subscription.renewalDate)}
              </p>
            </div>
            {total !== null && (
              <div className="sm:col-span-2 mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted">Cortes utilizados</span>
                  <span className="text-ink font-medium">
                    {used}/{total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-brand-gradient transition-all"
                    style={{ width: `${total ? (used / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => setShowCancel(true)}
              className="btn-outline btn-sm"
              disabled={subscription.status !== 'active'}
            >
              Cancelar subscrição
            </button>
          </div>
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={CreditCard}
            title="Sem subscrição ativa"
            description="Escolhe um plano abaixo para começares."
          />
        </div>
      )}

      {plans.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-ink mb-3">Planos disponíveis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="card">
                <h3 className="font-semibold text-ink">{p.name}</h3>
                <p className="text-3xl font-bold text-ink mt-2">
                  {formatCurrency(p.price)}
                  <span className="text-sm font-normal text-muted">/mês</span>
                </p>
                {p.description && <p className="text-sm text-muted mt-2">{p.description}</p>}
                <p className="text-xs text-muted mt-3">
                  {p.cutsPerMonth ? `${p.cutsPerMonth} cortes/mês` : 'Cortes ilimitados'}
                </p>
              </div>
            ))}
          </div>
          <Banner tone="info" className="mt-4">
            Para mudar de plano, contacte o seu profissional pelo chat. Pagamentos via Stripe ativam
            automaticamente quando o profissional tem a conta ligada.
          </Banner>
        </section>
      )}

      <section className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-line">
          <h2 className="font-semibold text-ink">Histórico de pagamentos</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-5 text-sm text-muted">Sem pagamentos.</p>
        ) : (
          <div className="divide-y divide-line">
            <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-2 text-xs uppercase text-muted bg-surface">
              <span>Data</span>
              <span>Plano</span>
              <span>Valor</span>
              <span>Estado</span>
            </div>
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 px-5 py-3 text-sm"
              >
                <span className="text-ink">{formatDate(p.paymentDate)}</span>
                <span className="text-muted">
                  {p.subscription?.plan?.name ??
                    (p.subscription?.planType ? PLAN_LABEL[p.subscription.planType] : '—')}
                </span>
                <span className="font-medium text-ink">{formatCurrency(Number(p.amount))}</span>
                <PaymentBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2 text-sm">
            <button
              className="btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span className="text-muted">
              {page} / {totalPages}
            </span>
            <button
              className="btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Seguinte
            </button>
          </div>
        )}
      </section>

      <CancelSubscriptionModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onCancelled={() => void load()}
      />
    </div>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid')
    return (
      <span className="badge-success inline-flex items-center gap-1">
        <CheckCircle2 size={12} /> Pago
      </span>
    );
  if (status === 'pending')
    return (
      <span className="badge-warning inline-flex items-center gap-1">
        <Clock size={12} /> Pendente
      </span>
    );
  if (status === 'refunded')
    return <span className="badge-muted inline-flex items-center gap-1">Reembolso</span>;
  return (
    <span className="badge-danger inline-flex items-center gap-1">
      <XCircle size={12} /> Falhou
    </span>
  );
}

function CancelSubscriptionModal({
  open,
  onClose,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await api.post('/client/subscription/cancel', { reason });
      toast.success('Cancelamento solicitado');
      setReason('');
      onCancelled();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar subscrição?"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Manter plano
          </button>
          <button className="btn-danger" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? <Spinner /> : 'Cancelar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink mb-3">
        A tua subscrição mantém-se ativa até ao final do período atual.
      </p>
      <label className="label">Motivo (opcional)</label>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ajuda-nos a melhorar…"
      />
    </Modal>
  );
}
