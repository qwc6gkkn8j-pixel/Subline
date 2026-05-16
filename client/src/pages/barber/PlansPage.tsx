// ─────────────────────────────────────────────────────────────────────────────
// /barber/plans — barber-side CRUD for subscription plans (F3 revised).
//
// Grid of cards (active + inactive). Each card has Edit / Toggle active.
// The "New plan" button opens a modal with name, description, price, cutsPerMonth, isActive.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { Plan } from '@/lib/types';

export default function PlansPage() {
  const toast = useToast();
  const { t } = useTranslation(['pro', 'common']);
  const [plans, setPlans] = useState<(Plan & { _count?: { subscriptions: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ plans: (Plan & { _count?: { subscriptions: number } })[] }>('/pro/plans');
      setPlans(data.plans);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (p: Plan) => {
    try {
      if (p.isActive) {
        await api.delete(`/pro/plans/${p.id}`);
        toast.success(t('plans.plan_disabled'));
      } else {
        await api.put(`/pro/plans/${p.id}`, { isActive: true });
        toast.success(t('plans.plan_reactivated'));
      }
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="page-title mr-auto">{t('plans.title')}</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> {t('plans.new_plan')}
        </button>
      </div>

      {loading ? (
        <div className="bg-surface rounded-card p-[18px] text-center py-10">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Plus}
            title={t('plans.no_plans')}
            description={t('plans.no_plans_desc')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <article
              key={p.id}
              className={`bg-surface rounded-card p-[18px] flex flex-col gap-3 ${
                p.isActive ? '' : 'opacity-60'
              }`}
            >
              <header className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="card-title truncate">{p.name}</h2>
                  {p.description && (
                    <p className="text-[13px] text-muted line-clamp-2 mt-1">{p.description}</p>
                  )}
                </div>
                {p.isActive ? (
                  <span className="badge-success">{t('common:status.active')}</span>
                ) : (
                  <span className="badge-muted">{t('common:status.inactive')}</span>
                )}
              </header>

              <div className="flex flex-wrap items-center gap-2">
                {p.cutsPerMonth && (
                  <span className="badge-muted">
                    {t('plans.services_per_month', { count: p.cutsPerMonth })}
                  </span>
                )}
              </div>

              <div className="mt-auto">
                <p className="text-[30px] font-bold text-ink leading-none">
                  {formatCurrency(Number(p.price))}
                  <span className="text-[13px] font-normal text-muted ml-1">{t('plans.per_month_short')}</span>
                </p>
              </div>

              {p._count?.subscriptions !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="badge-accent">{t('plans.subscribers_count', { count: p._count.subscriptions })}</span>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-lineSoft">
                <button
                  className="btn-outline btn-sm flex-1"
                  onClick={() => setEditing(p)}
                >
                  <Pencil size={14} /> {t('common:edit')}
                </button>
                <button
                  className={`btn-sm flex-1 ${
                    p.isActive ? 'btn-ghost !text-danger' : 'btn-outline'
                  }`}
                  onClick={() => void toggleActive(p)}
                >
                  <Power size={14} /> {p.isActive ? t('plans.deactivate') : t('plans.activate')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <PlanFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      {editing && (
        <PlanFormModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

interface PlanFormModalProps {
  existing?: Plan;
  onClose: () => void;
  onSaved: () => void;
}

function PlanFormModal({
  existing,
  onClose,
  onSaved,
}: PlanFormModalProps) {
  const toast = useToast();
  const { t } = useTranslation(['pro', 'common']);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState<string>(
    existing?.price !== undefined ? String(existing.price) : '',
  );
  const [cutsPerMonth, setCutsPerMonth] = useState<string>(
    existing?.cutsPerMonth !== undefined && existing.cutsPerMonth !== null
      ? String(existing.cutsPerMonth)
      : '',
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const isEdit = Boolean(existing);

  const onSubmit = async () => {
    const priceNum = Number(price);
    if (!name.trim()) {
      toast.error(t('plans.errors.name_required'));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error(t('plans.errors.price_invalid'));
      return;
    }

    let cutsNum: number | null = null;
    if (cutsPerMonth.trim()) {
      cutsNum = Number(cutsPerMonth);
      if (!Number.isInteger(cutsNum) || cutsNum < 1 || cutsNum > 100) {
        toast.error(t('plans.errors.cuts_range'));
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        name,
        description: description || null,
        price: priceNum,
        cutsPerMonth: cutsNum,
        isActive,
      };
      if (isEdit) {
        await api.put(`/pro/plans/${existing!.id}`, payload);
        toast.success(t('plans.plan_updated'));
      } else {
        await api.post('/pro/plans', payload);
        toast.success(t('plans.plan_created'));
      }
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? t('plans.edit_plan') : t('plans.new_plan')}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {t('common:cancel')}
          </button>
          <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? <Spinner /> : t('common:save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">{t('plans.name_required')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('plans.name_placeholder')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('plans.price_required')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('plans.price_placeholder')}
              required
            />
          </div>
          <div>
            <label className="label">{t('plans.services_optional')}</label>
            <input
              type="number"
              min="1"
              max="100"
              value={cutsPerMonth}
              onChange={(e) => setCutsPerMonth(e.target.value)}
              placeholder={t('plans.services_placeholder')}
            />
          </div>
        </div>

        <div>
          <label className="label">{t('plans.description_optional')}</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('plans.description_placeholder')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="!w-auto !h-auto"
          />
          {t('plans.plan_active')}
        </label>
      </div>
    </Modal>
  );
}
