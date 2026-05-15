import { useEffect, useState, useCallback } from 'react';
import { Search, Star, MapPin, Heart, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Pro {
  id: string;
  name: string;
  bio?: string;
  address?: string;
  city?: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  services: { id: string; name: string; price: number; durationMinutes: number }[];
}

interface DiscoverResp {
  pros: Pro[];
  total: number;
}

interface FavoriteState {
  [barberId: string]: boolean;
}

export default function DiscoverPage() {
    const { t } = useTranslation('client');
  const toast = useToast();
  const [pros, setPros] = useState<Pro[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [favorites, setFavorites] = useState<FavoriteState>({});
  const [favLoading, setFavLoading] = useState<string | null>(null);

  const search = useCallback(async (query = q, cat = activeCategory) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sortBy: 'rating' };
      if (query) params.q = query;
      if (cat) params.category = cat;
      const { data } = await api.get<DiscoverResp>('/public/discover', { params });
      setPros(data.pros);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void search();
    api.get<{ categories: string[] }>('/public/categories')
      .then((r) => setCategories(r.data.categories))
      .catch(() => {});
    // Load existing favorites
    api.get<{ favorites: { barberId: string }[] }>('/client/favorites')
      .then((r) => {
        const map: FavoriteState = {};
        r.data.favorites.forEach((f) => { map[f.barberId] = true; });
        setFavorites(map);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFavorite = async (barberId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavLoading(barberId);
    try {
      const { data } = await api.post<{ favorited: boolean }>(`/client/favorites/${barberId}`);
      setFavorites((prev) => ({ ...prev, [barberId]: data.favorited }));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setFavLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
  };

  const selectCategory = (cat: string) => {
    const newCat = cat === activeCategory ? '' : cat;
    setActiveCategory(newCat);
    void search(q, newCat);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t('discover.title')}</h1>

      {/* Barra de pesquisa */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" strokeWidth={2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('discover.search_placeholder')}
          className="!pl-12 !rounded-pill"
        />
      </form>

      {/* Categorias */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => selectCategory('')}
            className={`shrink-0 h-9 px-4 rounded-pill text-sm font-medium transition-all ${
              !activeCategory
                ? 'bg-ink text-white'
                : 'bg-card border border-line text-ink'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`shrink-0 h-9 px-4 rounded-pill text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-ink text-white'
                  : 'bg-card border border-line text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      {loading ? (
        <div className="py-12 text-center"><Spinner /></div>
      ) : pros.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('discover.no_results')}
          description={t('discover.no_results_desc')}
        />
      ) : (
        <div className="space-y-3">
          {pros.map((pro) => (
            <div key={pro.id} className="card relative">
              {/* Botão favorito */}
              <button
                onClick={(e) => void toggleFavorite(pro.id, e)}
                disabled={favLoading === pro.id}
                className="absolute top-4 right-4 p-1 text-faint hover:text-danger transition-colors"
                aria-label={favorites[pro.id] ? t('discover.remove_favorite') : t('discover.add_favorite')}
              >
                <Heart
                  size={20}
                  className={favorites[pro.id] ? 'fill-danger text-danger' : ''}
                />
              </button>

              <div className="flex items-start gap-3 pr-8">
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-card bg-surface flex items-center justify-center shrink-0 text-lg font-bold text-muted">
                  {pro.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink">{pro.name}</h3>

                  <div className="flex items-center gap-3 mt-0.5">
                    {Number(pro.rating) > 0 && (
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <Star size={13} className="fill-ink" />
                        {Number(pro.rating).toFixed(1)}
                        <span className="text-faint font-normal">({pro.reviewCount})</span>
                      </span>
                    )}
                    {pro.city && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <MapPin size={12} /> {pro.city}
                      </span>
                    )}
                  </div>

                  {pro.categories.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {pro.categories.map((c) => (
                        <span key={c} className="badge-muted text-[10px]">{c}</span>
                      ))}
                    </div>
                  )}

                  {pro.bio && (
                    <p className="text-xs text-muted mt-2 line-clamp-2">{pro.bio}</p>
                  )}

                  {pro.services.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {pro.services.map((s) => (
                        <div key={s.id} className="shrink-0 bg-surface rounded-input px-3 py-1.5 text-xs">
                          <p className="font-semibold text-ink">{s.name}</p>
                          <p className="text-muted">{s.price}€ · {s.durationMinutes}min</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Link
                to={`/client/book/${pro.id}`}
                className="mt-4 btn-primary w-full text-sm flex items-center justify-center gap-2"
              >
                Marcar <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
