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
    <div>
      <div className="flex items-center gap-3 mb-5">
        <ShoppingBag size={24} className="text-brand" />
        <h1 className="text-2xl font-bold text-ink">{t('shop.title')}</h1>
      </div>

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
            <article key={p.id} className="card flex flex-col gap-3 hover:shadow-lg transition">
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}

              <div className="flex-1">
                <h2 className="font-semibold text-ink">{p.name}</h2>
                {p.description && (
                  <p className="text-xs text-muted line-clamp-2 mt-1">{p.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-brand">
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
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            {selectedProduct.description && (
              <p className="text-sm text-muted">{selectedProduct.description}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Preço:</span>
              <span className="text-2xl font-bold text-brand">
                {formatCurrency(Number(selectedProduct.price))}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Tipo:</span>
              <span className="badge-muted">
                {selectedProduct.type === 'physical' ? '📦 Físico' : '📱 Digital'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm font-semibold">Quantidade:</span>
              <div className="flex items-center gap-3">
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span>{t('shop.total')}:</span>
                <span className="font-bold text-brand">
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
