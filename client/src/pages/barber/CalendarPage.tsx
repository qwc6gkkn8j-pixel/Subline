import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, CalendarOff, Check, X } from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { useToast } from '@/components/ui/Toast';
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge';
import { api, apiErrorMessage } from '@/lib/api';
import { addDays, cn, isoDate, startOfWeek } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';
import {
  DAY_OF_WEEK_LABEL,
  SERVICE_DURATION,
  SERVICE_LABEL,
} from '@/lib/types';
import type {
  Appointment,
  AppointmentService,
  AppointmentStatus,
  BarberAvailability,
  BarberUnavailable,
  Client,
  Slot,
  Subscription,
} from '@/lib/types';

type ClientLite = Client & { subscriptions: Subscription[] };

const SLOT_DURATIONS = [15, 30, 45, 60];

export default function CalendarPage() {
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<BarberAvailability[]>([]);
  const [unavailable, setUnavailable] = useState<BarberUnavailable[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<{ date: string; time: string } | null>(null);
  const [editingAvailability, setEditingAvailability] = useState(false);

  const loadAppointments = async () => {
    const from = isoDate(weekStart);
    const to = isoDate(addDays(weekStart, 6));
    try {
      const { data } = await api.get<{ appointments: Appointment[] }>('/barber/appointments', {
        params: { from, to },
      });
      setAppointments(data.appointments ?? []);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const loadOnce = async () => {
    try {
      const [av, cl] = await Promise.all([
        // Server returns `{ rules, unavailable }`.
        api.get<{ rules: BarberAvailability[]; unavailable: BarberUnavailable[] }>(
          '/barber/availability',
        ),
        api.get<{ clients: ClientLite[] }>('/barber/clients'),
      ]);
      setAvailability(av.data.rules ?? []);
      setUnavailable(av.data.unavailable ?? []);
      setClients(cl.data.clients ?? []);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAppointments(), loadOnce()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const upcomingByDay = useMemo(() => {
    return appointments.filter((a) => a.status !== 'cancelled');
  }, [appointments]);

  if (loading) {
    return (
      <div className="card text-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-ink mr-auto">Calendário</h1>
        <button className="btn-outline" onClick={() => setEditingAvailability(true)}>
          <Pencil size={16} /> Disponibilidade
        </button>
        <button
          className="btn-primary"
          onClick={() => setCreating({ date: isoDate(new Date()), time: '10:00' })}
        >
          <Plus size={16} /> Nova marcação
        </button>
      </div>

      {availability.length === 0 && (
        <Banner tone="info" title="Sem horário definido">
          Define o teu horário semanal para que aparições recebam slots automaticamente.{' '}
          <button className="underline" onClick={() => setEditingAvailability(true)}>
            Configurar agora
          </button>
        </Banner>
      )}

      <CalendarView
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        appointments={upcomingByDay}
        unavailable={unavailable}
        onSlotClick={(date, time) => setCreating({ date, time })}
        onAppointmentClick={(a) => setCreating({ date: isoDate(a.date), time: a.startTime })}
      />

      {creating && (
        <AppointmentModal
          slot={creating}
          clients={clients}
          existing={appointments.find(
            (a) => isoDate(a.date) === creating.date && a.startTime === creating.time,
          )}
          onClose={() => setCreating(null)}
          onSaved={() => void loadAppointments()}
        />
      )}

      {editingAvailability && (
        <AvailabilityModal
          rules={availability}
          unavailable={unavailable}
          onClose={() => setEditingAvailability(false)}
          onSaved={async () => {
            await loadOnce();
            await loadAppointments();
          }}
        />
      )}
    </div>
  );
}

function AppointmentModal({
  slot,
  existing,
  clients,
  onClose,
  onSaved,
}: {
  slot: { date: string; time: string };
  existing?: Appointment;
  clients: ClientLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEditing = Boolean(existing);
  const [clientId, setClientId] = useState(existing?.clientId ?? clients[0]?.id ?? '');
  const [service, setService] = useState<AppointmentService>(existing?.service ?? 'haircut');
  const [date, setDate] = useState(slot.date);
  const [time, setTime] = useState(existing?.startTime ?? slot.time);
  const [duration, setDuration] = useState<number>(
    existing?.durationMinutes ?? SERVICE_DURATION[existing?.service ?? 'haircut'],
  );
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? 'pending');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reload available slots whenever the selected date changes.
  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    api
      .get<{ date: string; slots: Slot[] }>('/barber/calendar/slots', { params: { date } })
      .then((r) => {
        if (!cancelled) setSlots(r.data.slots ?? []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Determine if the appointment is in the past (only relevant when editing).
  const isPast = useMemo(() => {
    if (!isEditing || !existing) return false;
    const apptDate = new Date(`${isoDate(existing.date)}T${existing.startTime}:00`);
    return apptDate.getTime() < Date.now();
  }, [isEditing, existing]);

  const canMarkPresence = isEditing && isPast && (status === 'confirmed' || status === 'pending');

  const onSubmit = async () => {
    setBusy(true);
    try {
      const base = {
        clientId,
        service,
        date,
        startTime: time,
        durationMinutes: duration,
        notes: notes || undefined,
      };
      if (existing) {
        await api.put(`/barber/appointments/${existing.id}`, { ...base, status });
        toast.success('Marcação atualizada');
      } else {
        // Don't send status on create — server defaults to 'pending'.
        await api.post('/barber/appointments', base);
        toast.success('Marcação criada');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onMarkPresence = async (newStatus: 'completed' | 'no_show') => {
    if (!existing) return;
    setBusy(true);
    try {
      await api.put(`/barber/appointments/${existing.id}`, { status: newStatus });
      toast.success(
        newStatus === 'completed'
          ? 'Marcado como presente'
          : 'Marcado como não compareceu',
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await api.delete(`/barber/appointments/${existing.id}`);
      toast.success('Marcação removida');
      onSaved();
      onClose();
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
      title={isEditing ? 'Editar marcação' : 'Nova marcação'}
      size="lg"
      footer={
        <div className="flex w-full justify-between">
          {isEditing ? (
            <button className="btn-danger btn-sm" onClick={() => void onDelete()} disabled={busy}>
              <Trash2 size={14} /> Remover
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
              {busy ? <Spinner /> : 'Guardar'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status header (edit only) */}
        {isEditing && existing && (
          <div className="flex items-center justify-between -mt-1">
            <AppointmentStatusBadge status={status} />
            <span className="text-xs text-muted">
              {formatDate(existing.date)} · {existing.startTime}
            </span>
          </div>
        )}

        {/* Presence buttons — only when appointment is past + still pending/confirmed */}
        {canMarkPresence && (
          <div className="flex gap-2 p-3 bg-brand/5 rounded-button border border-brand/10">
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button bg-success text-white hover:bg-success/90 disabled:opacity-50 transition-colors text-sm font-medium"
              onClick={() => void onMarkPresence('completed')}
              disabled={busy}
            >
              <Check size={16} /> Cliente presente
            </button>
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button bg-danger text-white hover:bg-danger/90 disabled:opacity-50 transition-colors text-sm font-medium"
              onClick={() => void onMarkPresence('no_show')}
              disabled={busy}
            >
              <X size={16} /> Não apareceu
            </button>
          </div>
        )}

        <div>
          <label className="label">Cliente</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Serviço</label>
            <select
              value={service}
              onChange={(e) => {
                const s = e.target.value as AppointmentService;
                setService(s);
                setDuration(SERVICE_DURATION[s]);
              }}
            >
              {(Object.keys(SERVICE_LABEL) as AppointmentService[]).map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="label">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">{formatDate(date)}</p>
        </div>

        {/* Slot grid: replaces manual time input when slots are available */}
        <div>
          <label className="label">Hora disponível</label>
          {loadingSlots ? (
            <div className="text-center py-6">
              <Spinner />
            </div>
          ) : slots.length === 0 ? (
            <div className="space-y-2">
              <Banner tone="warning">
                Sem horário definido para este dia. Escolhe a hora manualmente.
              </Banner>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
              {slots.map((s) => {
                // The current appointment's own slot should remain selectable
                // when editing, even though the server marks it as booked.
                const isSelfSlot =
                  isEditing &&
                  existing &&
                  isoDate(existing.date) === date &&
                  existing.startTime === s.time;
                const occupied = !s.available && !isSelfSlot;
                const selected = s.time === time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={occupied}
                    onClick={() => setTime(s.time)}
                    className={cn(
                      'h-9 rounded-button border text-sm transition-all',
                      selected
                        ? 'bg-brand text-white border-brand'
                        : occupied
                          ? 'bg-surface text-muted border-line line-through cursor-not-allowed'
                          : 'bg-white text-ink border-line hover:border-brand',
                    )}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status only on edit — created appointments default to 'pending' */}
        {isEditing && (
          <div>
            <label className="label">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            >
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
              <option value="no_show">Não compareceu</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">Notas (opcional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function AvailabilityModal({
  rules,
  unavailable,
  onClose,
  onSaved,
}: {
  rules: BarberAvailability[];
  unavailable: BarberUnavailable[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draftRules, setDraftRules] = useState<BarberAvailability[]>(rules);
  const [ranges, setRanges] = useState<BarberUnavailable[]>(unavailable);
  const [newRange, setNewRange] = useState({ dateFrom: '', dateTo: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [savingRange, setSavingRange] = useState(false);

  const upsertRule = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    slotDuration: number,
    isActive: boolean,
  ) => {
    const existing = draftRules.find((r) => r.dayOfWeek === dayOfWeek);
    if (existing && !existing.id.startsWith('temp-')) {
      await api.put(`/barber/availability/${existing.id}`, {
        startTime,
        endTime,
        slotDuration,
        isActive,
      });
    } else {
      await api.post('/barber/availability', {
        dayOfWeek,
        startTime,
        endTime,
        slotDuration,
        isActive,
      });
    }
  };

  const handleDayChange = (
    dayOfWeek: number,
    key: 'startTime' | 'endTime' | 'isActive' | 'slotDuration',
    value: string | boolean | number,
  ) => {
    setDraftRules((prev) => {
      const idx = prev.findIndex((r) => r.dayOfWeek === dayOfWeek);
      if (idx === -1) {
        const newRule: BarberAvailability = {
          id: `temp-${dayOfWeek}`,
          barberId: '',
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
          slotDuration: 30,
          isActive: true,
          ...{ [key]: value },
        };
        return [...prev, newRule];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const onSave = async () => {
    setBusy(true);
    try {
      for (const r of draftRules) {
        await upsertRule(r.dayOfWeek, r.startTime, r.endTime, r.slotDuration, r.isActive);
      }
      toast.success('Disponibilidade atualizada');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addRange = async () => {
    if (!newRange.dateFrom || !newRange.dateTo) {
      toast.error('Indica a data de início e fim');
      return;
    }
    if (newRange.dateFrom > newRange.dateTo) {
      toast.error('Data de início tem de ser anterior à de fim');
      return;
    }
    setSavingRange(true);
    try {
      const { data } = await api.post<{ range: BarberUnavailable }>(
        '/barber/availability/unavailable',
        {
          dateFrom: newRange.dateFrom,
          dateTo: newRange.dateTo,
          reason: newRange.reason || null,
        },
      );
      setRanges((prev) => [...prev, data.range]);
      setNewRange({ dateFrom: '', dateTo: '', reason: '' });
      toast.success('Período fechado adicionado');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingRange(false);
    }
  };

  const removeRange = async (id: string) => {
    setSavingRange(true);
    try {
      await api.delete(`/barber/availability/unavailable/${id}`);
      setRanges((prev) => prev.filter((r) => r.id !== id));
      toast.success('Período removido');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingRange(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Disponibilidade & dias fechados"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Fechar
          </button>
          <button className="btn-primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? <Spinner /> : 'Guardar disponibilidade'}
          </button>
        </>
      }
    >
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-ink mb-1">Horário semanal</h3>
          <p className="text-sm text-muted">Define os horários em que aceitas marcações.</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const r = draftRules.find((x) => x.dayOfWeek === dow);
            return (
              <div key={dow} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <label className="sm:col-span-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r?.isActive ?? false}
                    onChange={(e) => handleDayChange(dow, 'isActive', e.target.checked)}
                    className="!w-auto !h-auto"
                  />
                  {DAY_OF_WEEK_LABEL[dow]}
                </label>
                <input
                  type="time"
                  value={r?.startTime ?? '09:00'}
                  onChange={(e) => handleDayChange(dow, 'startTime', e.target.value)}
                  disabled={!r?.isActive}
                  className="sm:col-span-3 !h-9"
                />
                <span className="sm:col-span-1 text-center text-xs text-muted">até</span>
                <input
                  type="time"
                  value={r?.endTime ?? '18:00'}
                  onChange={(e) => handleDayChange(dow, 'endTime', e.target.value)}
                  disabled={!r?.isActive}
                  className="sm:col-span-3 !h-9"
                />
                <select
                  className="sm:col-span-2 !h-9"
                  value={r?.slotDuration ?? 30}
                  onChange={(e) => handleDayChange(dow, 'slotDuration', Number(e.target.value))}
                  disabled={!r?.isActive}
                  title="Duração de cada slot"
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 mt-6 pt-6 border-t border-line">
        <div className="flex items-start gap-2">
          <CalendarOff size={18} className="text-muted mt-0.5" />
          <div>
            <h3 className="font-semibold text-ink mb-1">Dias fechados</h3>
            <p className="text-sm text-muted">
              Adiciona períodos em que não aceitas marcações (férias, feriados, etc.).
            </p>
          </div>
        </div>

        {/* Existing ranges (future + ongoing only) */}
        <ul className="space-y-2">
          {ranges.length === 0 && (
            <li className="text-sm text-muted italic">Sem períodos fechados.</li>
          )}
          {ranges.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-button bg-surface border border-line"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium">
                  {formatDate(r.dateFrom)}
                  {r.dateFrom.slice(0, 10) !== r.dateTo.slice(0, 10) &&
                    ` — ${formatDate(r.dateTo)}`}
                </p>
                {r.reason && <p className="text-xs text-muted">{r.reason}</p>}
              </div>
              <button
                className="btn-ghost btn-sm !text-danger"
                onClick={() => void removeRange(r.id)}
                disabled={savingRange}
                aria-label="Remover período"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        {/* Add new range form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-2">
          <div className="sm:col-span-3">
            <label className="label">De</label>
            <input
              type="date"
              value={newRange.dateFrom}
              onChange={(e) => setNewRange((p) => ({ ...p, dateFrom: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Até</label>
            <input
              type="date"
              value={newRange.dateTo}
              onChange={(e) => setNewRange((p) => ({ ...p, dateTo: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Férias"
              value={newRange.reason}
              onChange={(e) => setNewRange((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="btn-outline w-full"
              onClick={() => void addRange()}
              disabled={savingRange}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>
      </section>
    </Modal>
  );
}
