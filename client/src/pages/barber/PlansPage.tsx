import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Banner } from '@/components/ui/Banner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Plan } from '@/lib/types';

export default function PlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ plans: Plan[] }>('/barber/plans')
      .then((r) => setPlans(r.data.plans))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Os meus planos</h1>

      <Banner tone="info" title="Gestão de planos">
        Os planos são configurados pelo administrador da plataforma. Contacta-nos via{' '}
        <a href="/barber/chat" className="underline">
          suporte
        </a>{' '}
        para alterações.
      </Banner>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState icon={Tag} title="Sem planos definidos" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                <span className={p.isActive ? 'badge-success' : 'badge-muted'}>
                  {p.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-3xl font-bold text-ink">
                {formatCurrency(p.price)}
                <span className="text-sm font-normal text-muted">/mês</span>
              </p>
              {p.description && <p className="text-sm text-muted mt-2">{p.description}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-muted">Cortes/mês</dt>
                <dd className="text-right font-medium">{p.cutsPerMonth ?? 'Ilimitado'}</dd>
                <dt className="text-muted">Subscritos</dt>
                <dd className="text-right font-medium">{p._count?.subscriptions ?? 0}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
