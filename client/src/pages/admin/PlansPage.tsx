import { useEffect, useState } from 'react';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Barber, Plan } from '@/lib/types';

export default function PlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberFilter, setBarberFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        api.get<{ plans: Plan[] }>('/admin/plans', {
          params: barberFilter ? { barberId: barberFilter } : undefined,
        }),
        api.get<{ users: (Barber & { id: string; fullName?: string })[] }>('/admin/users', {
          params: { role: 'barber', limit: 100 },
        }),
      ]);
      setPlans(p.data.plans);
      // Map admin /users (returning users) to a name list. We'll fetch barber rows separately.
      const userIds = (b.data.users as unknown as { id: string; fullName: string }[]).map((u) => u.id);
      // Fall-back: just use users payload as a barber-name map.
      setBarbers(
        (b.data.users as unknown as { id: string; fullName: string }[]).map((u) => ({
          id: u.id,
          userId: u.id,
          name: u.fullName,
          phone: null,
          address: null,
          bio: null,
          rating: 0,
        })),
      );
      void userIds; // not used directly
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberFilter]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink">Planos</h1>
        <div className="flex items-center gap-2">
          <select
            value={barberFilter}
            onChange={(e) => setBarberFilter(e.target.value)}
            className="!h-9 !py-1 text-sm"
          >
            <option value="">Todos os barbeiros</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setEditing('new')}>
            <Plus size={18} /> Novo plano
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Tag}
            title="Sem planos"
            description="Cria o primeiro plano de subscrição para começares."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Plano</p>
                  <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                </div>
                <span className={p.isActive ? 'badge-success' : 'badge-muted'}>
                  {p.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-2xl font-bold text-ink">
                {formatCurrency(p.price)}
                <span className="text-sm font-normal text-muted">/mês</span>
              </p>
              {p.description && <p className="text-sm text-muted">{p.description}</p>}
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{p.cutsPerMonth ? `${p.cutsPerMonth} cortes/mês` : 'Cortes ilimitados'}</span>
                <span>{p._count?.subscriptions ?? 0} subscritos</span>
              </div>
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-line">
                <button
                  onClick={() => setEditing(p)}
                  className="p-2 rounded-button text-muted hover:text-brand hover:bg-brand/10"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleting(p)}
                  className="p-2 rounded-button text-muted hover:text-danger hover:bg-danger/10"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanFormModal
        editing={editing}
        barbers={barbers}
        onClose={() => setEditing(null)}
        onSaved={() => void load()}
      />
      <DeletePlanModal
        plan={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => void load()}
      />
    </div>
  );
}

interface PlanFormState {
  barberId: string;
  name: string;
  description: string;
  price: string;
  cutsPerMonth: string;
  isActive: boolean;
}

function PlanFormModal({
  editing,
  barbers,
  onClose,
  onSaved,
}: {
  editing: Plan | 'new' | null;
  barbers: Barber[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editing === 'new';
  const open = editing !== null;
  const [form, setForm] = useState<PlanFormState>({
    barberId: '',
    name: '',
    description: '',
    price: '',
    cutsPerMonth: '',
    isActive: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    if (editing === 'new') {
      setForm({
        barberId: barbers[0]?.id ?? '',
        name: '',
        description: '',
        price: '',
        cutsPerMonth: '',
        isActive: true,
      });
    } else {
      setForm({
        barberId: editing.barberId,
        name: editing.name,
        description: editing.description ?? '',
        price: String(editing.price),
        cutsPerMonth: editing.cutsPerMonth?.toString() ?? '',
        isActive: editing.isActive,
      });
    }
    setError(null);
  }, [editing, barbers]);

  const set = <K extends keyof PlanFormState>(k: K, v: PlanFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.price) return setError('Nome e preço são obrigatórios');
    setBusy(true);
    try {
      const payload = {
        barberId: form.barberId || undefined,
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        cutsPerMonth: form.cutsPerMonth ? Number(form.cutsPerMonth) : null,
        isActive: form.isActive,
      };
      if (isNew) {
        await api.post('/admin/plans', payload);
        toast.success('Plano criado');
      } else {
        const p = editing as Plan;
        await api.put(`/admin/plans/${p.id}`, payload);
        toast.success('Plano atualizado');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Novo plano' : 'Editar plano'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button form="plan-form" type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="plan-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Barbeiro</label>
          <select
            value={form.barberId}
            onChange={(e) => set('barberId', e.target.value)}
            disabled={!isNew}
            required
          >
            <option value="" disabled>
              Seleciona um barbeiro
            </option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nome do plano</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço (€/mês)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Cortes/mês</label>
            <input
              type="number"
              min={0}
              value={form.cutsPerMonth}
              onChange={(e) => set('cutsPerMonth', e.target.value)}
              placeholder="ilimitado"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="!w-auto !h-auto"
          />
          Plano ativo
        </label>
        {error && (
          <div className="bg-danger/10 text-danger text-sm rounded-button px-3 py-2">{error}</div>
        )}
      </form>
    </Modal>
  );
}

function DeletePlanModal({
  plan,
  onClose,
  onDeleted,
}: {
  plan: Plan | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await api.delete(`/admin/plans/${plan.id}`);
      toast.success('Plano desativado');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title="Desativar plano?"
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Manter
          </button>
          <button className="btn-danger" onClick={onDelete} disabled={busy}>
            {busy ? <Spinner /> : 'Desativar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">
        O plano <span className="font-semibold">{plan?.name}</span> ficará inativo. Subscrições atuais
        continuam, mas novos clientes não podem subscrevê-lo.
      </p>
    </Modal>
  );
}
