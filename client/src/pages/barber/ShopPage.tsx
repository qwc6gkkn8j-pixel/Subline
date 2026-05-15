// ─────────────────────────────────────────────────────────────────────────────
// /barber/shop — professional-side product shop management
//
// Grid of product cards (active + inactive). Each card has Edit / Toggle active.
// The "New product" button opens a modal with name, description, price, type, isActive.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Plus, Pencil, Power, Package } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useTranslation } from 'react-i18next';

export default function ShopPage() {
    const { t } = useTranslation('pro');
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ products: Product[] }>('/pro/shop/products');
      setProducts(data.products);
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

  const toggleActive = async (p: Product) => {
    try {
      if (p.isActive) {
        await api.delete(`/pro/shop/products/${p.id}`);
        toast.success(t('shop.product_deactivated'));
      } else {
        await api.put(`/pro/shop/products/${p.id}`, { isActive: true });
        toast.success(t('shop.product_activated'));
      }
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="page-title mr-auto">{t('shop.title')}</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title={t('shop.no_products')}
            description="Cria o primeiro produto para começares a vender na tua loja."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <article
              key={p.id}
              className={`card flex flex-col gap-3 ${
                p.isActive ? '' : 'opacity-60'
              }`}
            >
              <header className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-ink truncate">{p.name}</h2>
                  {p.description && (
                    <p className="text-xs text-muted line-clamp-2 mt-1">{p.description}</p>
                  )}
                </div>
                {p.isActive ? (
                  <span className="badge-success">Ativo</span>
                ) : (
                  <span className="badge-muted">Inativo</span>
                )}
              </header>

              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-muted">
                  {p.type === 'physical' ? '📦 Físico' : '📱 Digital'}
                </span>
              </div>

              <p className="text-2xl font-bold text-brand mt-auto">
                {formatCurrency(Number(p.price))}
              </p>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  className="btn-outline btn-sm flex-1"
                  onClick={() => setEditing(p)}
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  className={`btn-sm flex-1 ${
                    p.isActive ? 'btn-ghost !text-danger' : 'btn-outline'
                  }`}
                  onClick={() => void toggleActive(p)}
                >
                  <Power size={14} /> {p.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <ProductFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      {editing && (
        <ProductFormModal
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

interface ProductFormModalProps {
  existing?: Product;
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({
  existing,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const { t } = useTranslation('pro');
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState<string>(
    existing?.price !== undefined ? String(existing.price) : '',
  );
  const [type, setType] = useState<'physical' | 'digital'>(existing?.type as any ?? 'physical');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const isEdit = Boolean(existing);

  const onSubmit = async () => {
    const { t } = useTranslation('pro');
    const priceNum = Number(price);
    if (!name.trim()) {
      toast.error(t('shop.name_required'));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error(t('shop.price_invalid'));
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name,
        description: description || null,
        price: priceNum,
        type,
        isActive,
      };
      if (isEdit) {
        await api.put(`/pro/shop/products/${existing!.id}`, payload);
        toast.success(t('shop.product_updated'));
      } else {
        await api.post('/pro/shop/products', payload);
        toast.success(t('shop.product_created'));
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
      title={isEdit ? 'Editar produto' : 'Novo produto'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('shop.name_placeholder')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço (EUR) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('shop.price_placeholder')}
              required
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'physical' | 'digital')}>
              <option value="physical">{t('shop.physical_type')}</option>
              <option value="digital">{t('shop.digital_type')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('shop.description_placeholder')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="!w-auto !h-auto"
          />
          Produto ativo
        </label>
      </div>
    </Modal>
  );
}
