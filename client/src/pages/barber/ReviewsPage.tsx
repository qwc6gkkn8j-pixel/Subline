import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  client: { name: string };
  createdAt: string;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: { skip: number; take: number; total: number };
  stats: { averageRating: number; totalReviews: number };
}

export default function ReviewsPage() {
    const { t } = useTranslation('pro');
  const toast = useToast();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const take = 10;

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<ReviewsResponse>('/pro/reviews', {
        params: { skip, take },
      });
      setData(response.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t('reviews.title')}</h1>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : data?.reviews.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Star}
            title={t('reviews.no_reviews')}
            description="Quando clientes deixarem avaliações, aparecerão aqui."
          />
        </div>
      ) : (
        <>
          {/* Stats Card */}
          {data && (
            <div className="card grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted mb-1">Classificação média</p>
                <p className="text-3xl font-bold text-ink">{data.stats.averageRating.toFixed(1)}</p>
                {renderStars(Math.round(data.stats.averageRating))}
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Total de avaliações</p>
                <p className="text-3xl font-bold text-ink">{data.stats.totalReviews}</p>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-3">
            {data?.reviews.map((review) => (
              <div key={review.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{review.client.name}</p>
                    <p className="text-xs text-muted">{formatRelative(review.createdAt)}</p>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.comment && <p className="text-sm text-ink">{review.comment}</p>}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.pagination.total > take && (
            <div className="flex gap-2 justify-center">
              <button
                className="btn-outline btn-sm"
                onClick={() => setSkip(Math.max(0, skip - take))}
                disabled={skip === 0}
              >
                Anterior
              </button>
              <span className="text-sm text-muted py-2">
                {skip + 1}-{Math.min(skip + take, data.pagination.total)} de {data.pagination.total}
              </span>
              <button
                className="btn-outline btn-sm"
                onClick={() => setSkip(skip + take)}
                disabled={skip + take >= data.pagination.total}
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
