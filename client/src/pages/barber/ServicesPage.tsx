// ─────────────────────────────────────────────────────────────────────────────
// /barber/services — barber-side CRUD for the Service catalog (F4).
//
// Grid of cards (active + inactive). Each card has Edit / Toggle active.
// The "New service" button opens a modal with name, category, description,
// price, duration, isActive.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Plus, Pencil, Power, Scissors, Clock, Tag } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { SERVICE_DURATIONS } from '@/lib/types';
import type { Service } from '@/lib/types';

// Dynamic badge color based on category name
function getCategoryBadgeColor(category: string): string {
  const colors = ['badge-brand', 'badge-accent', 'badge-warning', 'badge-success', 'badge-muted'];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ services: Service[] }>('/pro/services/all');
      setServices(data.services);
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

  const toggleActive = async (s: Service) => {
    try {
      if (s.isActive) {
        await api.delete(`/pro/services/${s.id}`);
        toast.success('Serviço desativado');
      } else {
        await api.put(`/pro/services/${s.id}`, { isActive: true });
        toast.success('Serviço reativado');
      }
      void load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-ink mr-auto">Serviços</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo serviço
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : services.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Scissors}
            title="Sem serviços"
            description="Cria o primeiro serviço para começares a aceitar marcações."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <article
              key={s.id}
              className={`card flex flex-col gap-3 ${
                s.isActive ? '' : 'opacity-60'
              }`}
            >
              <header className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-ink truncate">{s.name}</h2>
                  {s.description && (
                    <p className="text-xs text-muted line-clamp-2 mt-1">{s.description}</p>
                  )}
                </div>
                {s.isActive ? (
                  <span className="badge-success">Ativo</span>
                ) : (
                  <span className="badge-muted">Inativo</span>
                )}
              </header>

              <div className="flex flex-wrap items-center gap-2">
                {s.category && (
                  <span className={getCategoryBadgeColor(s.category)}>
                    <Tag size={11} className="inline -mt-0.5 mr-1" />
                    {s.category}
                  </span>
                )}
                <span className="badge-muted">
                  <Clock size={11} className="inline -mt-0.5 mr-1" />
                  {s.durationMinutes} min
                </span>
              </div>

              <p className="text-2xl font-bold text-brand mt-auto">
                {formatCurrency(Number(s.price))}
              </p>

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  className="btn-outline btn-sm flex-1"
                  onClick={() => setEditing(s)}
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  className={`btn-sm flex-1 ${
                    s.isActive ? 'btn-ghost !text-danger' : 'btn-outline'
                  }`}
                  onClick={() => void toggleActive(s)}
                >
                  <Power size={14} /> {s.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <ServiceFormModal
          allServices={services}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      {editing && (
        <ServiceFormModal
          existing={editing}
          allServices={services}
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

interface ServiceFormModalProps {
  existing?: Service;
  onClose: () => void;
  onSaved: () => void;
  allServices?: Service[];
}

function ServiceFormModal({
  existing,
  onClose,
  onSaved,
  allServices = [],
}: ServiceFormModalProps) {
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [categoryInput, setCategoryInput] = useState(existing?.category ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState<string>(
    existing?.price !== undefined ? String(existing.price) : '',
  );
  const [duration, setDuration] = useState<number>(existing?.durationMinutes ?? 30);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  // Extract unique categories from all services
  const suggestedCategories = Array.from(
    new Set(allServices.filter(s => s.category).map(s => s.category!))
  ).filter(cat => cat.toLowerCase().includes(categoryInput.toLowerCase()));

  const handleCategorySelect = (cat: string) => {
    setCategoryInput(cat);
    setCategory(cat);
    setShowSuggestions(false);
  };

  const isEdit = Boolean(existing);

  const onSubmit = async () => {
    const priceNum = Number(price);
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error('Preço inválido');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name,
        category,
        description: description || null,
        price: priceNum,
        durationMinutes: duration,
        isActive,
      };
      if (isEdit) {
        await api.put(`/pro/services/${existing!.id}`, payload);
        toast.success('Serviço atualizado');
      } else {
        await api.post('/pro/services', payload);
        toast.success('Serviço criado');
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
      title={isEdit ? 'Editar serviço' : 'Novo serviço'}
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
            placeholder="Ex: Corte clássico"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <div className="relative">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value);
                  setCategory(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Ex: Corte, Barba, Coloração..."
              />
              {showSuggestions && suggestedCategories.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-line rounded-button mt-1 z-10 shadow-card">
                  {suggestedCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className="w-full text-left px-3 py-2 hover:bg-surface text-sm"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {SERVICE_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Preço (EUR) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex: 15.00"
            required
          />
        </div>

        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do serviço…"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="!w-auto !h-auto"
          />
          Serviço ativo
        </label>
      </div>
    </Modal>
  );
}
