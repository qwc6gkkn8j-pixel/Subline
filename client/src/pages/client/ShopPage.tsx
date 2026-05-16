// ─────────────────────────────────────────────────────────────────────────────
// /client/shop — client-side product shop browsing
//
// Browse and purchase products from your professional.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Minus, ShoppingCart } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useTranslation } from 'react-i18next';

export default function ShopPage() {
    const { t } = useTranslation('client');
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [barberId, setBarberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // Fetch client's barberId from profile
    api
      .get<{ client: { barberId: string | null } }>('/client/profile')
      .then(({ data }) => {
        if (data.client.barberId) {
          setBarberId(data.client.barberId);
        }
      })
      .catch(() => {
        // Ignore error
      });
  }, []);

  const load = async () => {
    if (!barberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<{ products: Product[] }>(`/client/shop/products/${barberId}`);
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
  }, [barberId]);

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    try {
      await api.post('/client/shop/orders', {
        productId: selectedProduct.id,
        quantity,
      });
      toast.success(t('shop.added_to_cart'));
      setSelectedProduct(null);
      setQuantity(1);
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">{t('shop.title')}</h1>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum produto disponível"
            description="O seu profissional ainda não tem produtos para venda na loja."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <article key={p.id} className="bg-surface rounded-card p-[18px] flex flex-col gap-3">
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded-card"
                />
              )}

              <div className="flex-1">
                <h2 className="card-title">{p.name}</h2>
                {p.description && (
                  <p className="text-[13px] text-muted line-clamp-2 mt-1">{p.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[26px] font-bold text-ink">
                  {formatCurrency(Number(p.price))}
                </p>
                <span className="text-xs badge-muted">
                  {p.type === 'physical' ? '📦' : '📱'}
                </span>
              </div>

              <button
                className="btn-primary btn-sm w-full"
                onClick={() => {
                  setSelectedProduct(p);
                  setQuantity(1);
                }}
              >
                <ShoppingCart size={14} /> Adicionar
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedProduct && (
        <Modal
          open
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.name}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setSelectedProduct(null)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={() => void handleAddToCart()}>
                <ShoppingCart size={14} /> Comprar
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedProduct.imageUrl && (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-48 object-cover rounded-card"
              />
            )}

            {selectedProduct.description && (
              <p className="text-[13px] text-muted">{selectedProduct.description}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Preço:</span>
              <span className="text-[26px] font-bold text-ink">
                {formatCurrency(Number(selectedProduct.price))}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">Tipo:</span>
              <span className="badge-muted">
                {selectedProduct.type === 'physical' ? '📦 Físico' : '📱 Digital'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-lineSoft pt-4">
              <span className="text-sm font-semibold text-ink">Quantidade:</span>
              <div className="flex items-center gap-3">
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-semibold text-ink">{quantity}</span>
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-card p-[18px]">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t('shop.total')}:</span>
                <span className="font-bold text-ink">
                  {formatCurrency(Number(selectedProduct.price) * quantity)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
