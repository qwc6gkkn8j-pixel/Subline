import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import {
  C,
  FONT,
  I,
  Icon,
  PageHeader,
  ScrollBody,
  ImagePlaceholder,
  Chip,
  ChipRow,
} from '@/design-system';

interface Pro {
  id: string;
  name: string;
  bio?: string | null;
  address?: string | null;
  rating: number | string;
  reviewCount: number;
  services?: { id: string; name: string; price: number | string; durationMinutes: number }[];
}

interface DiscoverResp {
  pros: Pro[];
  total: number;
}

interface FavoriteState {
  [barberId: string]: boolean;
}

const CATEGORIES = ['Tudo', 'Premium', 'Perto de ti', 'Promoções', 'Barba', 'Corte'];

export default function DiscoverPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Tudo');
  const [favorites, setFavorites] = useState<FavoriteState>({});
  const [favLoading, setFavLoading] = useState<string | null>(null);

  const search = useCallback(
    async (query = '', category = 'Tudo') => {
      setLoading(true);
      try {
        const params: Record<string, string> = { sortBy: 'rating', limit: '24' };
        if (query) params.q = query;
        if (category && category !== 'Tudo') params.category = category;
        const { data } = await api.get<DiscoverResp>('/public/discover', { params });
        setPros(data.pros);
      } catch (err) {
        toast.error(apiErrorMessage(err));
        setPros([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void search();
    api
      .get<{ favorites: { barberId: string }[] }>('/client/favorites')
      .then((r) => {
        const map: FavoriteState = {};
        r.data.favorites.forEach((f) => {
          map[f.barberId] = true;
        });
        setFavorites(map);
      })
      .catch(() => {});
  }, [search]);

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

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(q, cat);
  };

  const onCategoryChange = (newCat: string) => {
    setCat(newCat);
    void search(q, newCat);
  };

  return (
    <>
      <PageHeader title="Descobrir" />
      <ScrollBody>
        <div style={{ padding: '0 20px 14px' }}>
          <form onSubmit={onSearchSubmit}>
            <div
              style={{
                height: 48,
                borderRadius: 999,
                background: C.surface,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 18px',
              }}
            >
              <Icon d={I.search} size={20} color={C.muted} stroke={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => void search(q, cat)}
                placeholder="Pesquisar barbeiros, serviços"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 15,
                  fontWeight: 500,
                  color: C.text,
                  fontFamily: FONT,
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    void search('', cat);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.muted,
                    fontSize: 18,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </form>
        </div>

        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={c === cat} onClick={() => onCategoryChange(c)} />
          ))}
        </ChipRow>

        <div style={{ height: 16 }} />

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 0',
            }}
          >
            <Spinner />
          </div>
        ) : pros.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: C.muted,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              Sem resultados
            </div>
            <div>Tenta outra pesquisa ou categoria.</div>
          </div>
        ) : (
          <div
            style={{
              padding: '0 20px 28px',
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
              gap: isDesktop ? 20 : 22,
            }}
          >
            {pros.map((pro) => (
              <ProCard
                key={pro.id}
                pro={pro}
                favorited={!!favorites[pro.id]}
                onToggleFav={(e) => void toggleFavorite(pro.id, e)}
                favBusy={favLoading === pro.id}
                onClick={() => navigate(`/client/book/${pro.id}`)}
              />
            ))}
          </div>
        )}
      </ScrollBody>
    </>
  );
}

function ProCard({
  pro,
  favorited,
  onToggleFav,
  favBusy,
  onClick,
}: {
  pro: Pro;
  favorited: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  favBusy: boolean;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
        <ImagePlaceholder ratio="16/9" />
        <button
          onClick={onToggleFav}
          disabled={favBusy}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            cursor: favBusy ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: favorited ? C.danger : '#000',
            opacity: favBusy ? 0.6 : 1,
          }}
          aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Icon
            d={I.heart}
            size={16}
            stroke={2}
            fill={favorited ? 'currentColor' : 'none'}
            color={favorited ? C.danger : '#000'}
          />
        </button>
      </div>
      <div style={{ paddingTop: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{pro.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
            <Icon d={I.star} size={12} fill="currentColor" color={C.text} stroke={0} />
            <span style={{ fontWeight: 700 }}>{Number(pro.rating).toFixed(1)}</span>
            <span style={{ color: C.muted }}>({pro.reviewCount ?? 0})</span>
          </div>
        </div>
        {pro.address && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{pro.address}</div>
        )}
        {pro.bio && (
          <div
            style={{
              fontSize: 13,
              color: C.muted,
              marginTop: 6,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {pro.bio}
          </div>
        )}
        {pro.services && pro.services.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 8,
              overflowX: 'auto',
              paddingBottom: 2,
              scrollbarWidth: 'none',
            }}
          >
            {pro.services.map((s) => (
              <div
                key={s.id}
                style={{
                  flexShrink: 0,
                  background: C.surface,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 700 }}>{s.name}</span>
                <span style={{ color: C.muted, marginLeft: 6 }}>
                  {Number(s.price)}€ · {s.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
