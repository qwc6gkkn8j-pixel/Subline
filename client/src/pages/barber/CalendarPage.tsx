import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, CalendarOff, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  Service,
  Slot,
  Subscription,
} from '@/lib/types';

type ClientLite = Client & { subscriptions: Subscription[] };

export default function CalendarPage() {
  const toast = useToast();
  const { t } = useTranslation(['pro', 'common']);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<BarberAvailability[]>([]);
  const [unavailable, setUnavailable] = useState<BarberUnavailable[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<{ date: string; time: string } | null>(null);
  const [editingAvailability, setEditingAvailability] = useState(false);

  const loadAppointments = async () => {
    const from = isoDate(weekStart);
    const to = isoDate(addDays(weekStart, 6));
    try {
      const { data } = await api.get<{ appointments: Appointment[] }>('/pro/appointments', {
        params: { from, to },
      });
      setAppointments(data.appointments ?? []);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const loadOnce = async () => {
    try {
      const [av, cl, sv] = await Promise.all([
        // Server returns `{ rules, unavailable }`.
        api.get<{ rules: BarberAvailability[]; unavailable: BarberUnavailable[] }>(
          '/pro/availability',
        ),
        api.get<{ clients: ClientLite[] }>('/pro/clients'),
        api.get<{ services: Service[] }>('/pro/services'),
      ]);
      setAvailability(av.data.rules ?? []);
      setUnavailable(av.data.unavailable ?? []);
      setClients(cl.data.clients ?? []);
      setServices(sv.data.services ?? []);
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
        <h1 className="text-2xl font-bold text-ink mr-auto">{t('calendar.title')}</h1>
        <button className="btn-outline" onClick={() => setEditingAvailability(true)}>
          <Pencil size={16} /> {t('calendar.availability')}
        </button>
        <button
          className="btn-primary"
          onClick={() => setCreating({ date: isoDate(new Date()), time: '10:00' })}
        >
          <Plus size={16} /> {t('calendar.new_appointment')}
        </button>
      </div>

      {availability.length === 0 && (
        <Banner tone="info" title={t('calendar.no_schedule_title')}>
          {t('calendar.no_schedule_text')}{' '}
          <button className="underline" onClick={() => setEditingAvailability(true)}>
            {t('calendar.configure_now')}
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
          services={services}
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
  services,
  onClose,
  onSaved,
}: {
  slot: { date: string; time: string };
  existing?: Appointment;
  clients: ClientLite[];
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { t } = useTranslation(['pro', 'common']);
  const isEditing = Boolean(existing);
  const [clientId, setClientId] = useState(existing?.clientId ?? clients[0]?.id ?? '');
  // Catalog selection (F4) — when present, takes precedence over the legacy
  // service enum. "" means "no service from catalog → legacy enum + manual duration".
  const [serviceId, setServiceId] = useState<string>(existing?.serviceId ?? '');
  const [service, setService] = useState<AppointmentService>(existing?.service ?? 'haircut');
  const [date, setDate] = useState(slot.date);
  const [time, setTime] = useState(existing?.startTime ?? slot.time);
  const [duration, setDuration] = useState<number>(
    existing?.durationMinutes ?? SERVICE_DURATION[existing?.service ?? 'haircut'],
  );
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? 'pending');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const hasCatalog = services.length > 0;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reload available slots whenever the selected date changes.
  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    api
      .get<{ date: string; slots: Slot[] }>('/pro/calendar/slots', { params: { date } })
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
        // Send serviceId only when something is selected; the server uses it
        // to lock in duration + priceAtBooking from the catalog.
        serviceId: serviceId || null,
        date,
        startTime: time,
        durationMinutes: duration,
        notes: notes || undefined,
      };
      if (existing) {
        await api.put(`/pro/appointments/${existing.id}`, { ...base, status });
        toast.success(t('calendar.appointment_updated'));
      } else {
        // Don't send status on create — server defaults to 'pending'.
        await api.post('/pro/appointments', base);
        toast.success(t('calendar.appointment_created'));
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
      // Dedicated status route — auto-tracks the cut on the client's
      // active subscription when newStatus === 'completed'.
      await api.put(`/pro/appointments/${existing.id}/status`, {
        status: newStatus,
      });
      toast.success(
        newStatus === 'completed'
          ? t('calendar.marked_present')
          : t('calendar.marked_no_show'),
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
      await api.delete(`/pro/appointments/${existing.id}`);
      toast.success(t('calendar.appointment_removed'));
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
      title={isEditing ? t('calendar.edit_appointment') : t('calendar.new_appointment')}
      size="lg"
      footer={
        <div className="flex w-full justify-between">
          {isEditing ? (
            <button className="btn-danger btn-sm" onClick={() => void onDelete()} disabled={busy}>
              <Trash2 size={14} /> {t('calendar.remove')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              {t('common:cancel')}
            </button>
            <button className="btn-primary" onClick={() => void onSubmit()} disabled={busy}>
              {busy ? <Spinner /> : t('common:save')}
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
              <Check size={16} /> {t('calendar.client_present')}
            </button>
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button bg-danger text-white hover:bg-danger/90 disabled:opacity-50 transition-colors text-sm font-medium"
              onClick={() => void onMarkPresence('no_show')}
              disabled={busy}
            >
              <X size={16} /> {t('calendar.client_no_show')}
            </button>
          </div>
        )}

        <div>
          <label className="label">{t('calendar.client_label')}</label>
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
            <label className="label">{t('calendar.service_label')}</label>
            {hasCatalog ? (
              <select
                value={serviceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setServiceId(id);
                  if (id) {
                    const found = services.find((sv) => sv.id === id);
                    if (found) setDuration(found.durationMinutes);
                  }
                }}
              >
                <option value="">{t('calendar.service_choose')}</option>
                {services.map((sv) => (
                  <option key={sv.id} value={sv.id}>
                    {sv.name} · {sv.durationMinutes}min · {Number(sv.price).toFixed(2)}€
                  </option>
                ))}
              </select>
            ) : (
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
            )}
          </div>
          <div>
            <label className="label">{t('calendar.duration_label')}</label>
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={Boolean(serviceId)}
              title={serviceId ? t('calendar.duration_locked') : undefined}
            />
          </div>
        </div>

        <div>
          <label className="label">{t('calendar.date_label')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">{formatDate(date)}</p>
        </div>

        {/* Slot grid: replaces manual time input when slots are available */}
        <div>
          <label className="label">{t('calendar.time_available')}</label>
          {loadingSlots ? (
            <div className="text-center py-6">
              <Spinner />
            </div>
          ) : slots.length === 0 ? (
            <div className="space-y-2">
              <Banner tone="warning">
                {t('calendar.no_schedule_day')}
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
                      'h-9 px-4 rounded-pill border text-[13px] font-medium transition-all',
                      selected
                        ? 'bg-brand text-white border-brand shadow-btn-brand'
                        : occupied
                          ? 'text-[#C8C8C8] border-lineSoft line-through cursor-not-allowed'
                          : 'bg-card text-ink border-line hover:border-brand',
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
            <label className="label">{t('calendar.status_label')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            >
              <option value="pending">{t('common:status.pending')}</option>
              <option value="confirmed">{t('common:status.confirmed')}</option>
              <option value="completed">{t('common:status.completed')}</option>
              <option value="cancelled">{t('common:status.cancelled')}</option>
              <option value="no_show">{t('common:status.no_show')}</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">{t('calendar.notes_optional')}</label>
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
  const { t } = useTranslation(['pro', 'common']);
  const [draftRules, setDraftRules] = useState<BarberAvailability[]>(rules);
  const [ranges, setRanges] = useState<BarberUnavailable[]>(unavailable);
  const [newRange, setNewRange] = useState({ dateFrom: '', dateTo: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [savingRange, setSavingRange] = useState(false);

  const upsertRule = async (rule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    isActive: boolean;
  }) => {
    const existing = draftRules.find((r) => r.dayOfWeek === rule.dayOfWeek);
    if (existing && !existing.id.startsWith('temp-')) {
      await api.put(`/pro/availability/${existing.id}`, {
        startTime: rule.startTime,
        endTime: rule.endTime,
        breakStart: rule.breakStart,
        breakEnd: rule.breakEnd,
        isActive: rule.isActive,
      });
    } else {
      await api.post('/pro/availability', {
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        breakStart: rule.breakStart,
        breakEnd: rule.breakEnd,
        isActive: rule.isActive,
      });
    }
  };

  const handleDayChange = (
    dayOfWeek: number,
    key: 'startTime' | 'endTime' | 'isActive' | 'breakStart' | 'breakEnd',
    value: string | boolean | null,
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
          breakStart: null,
          breakEnd: null,
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

  const toggleBreak = (dayOfWeek: number, hasBreak: boolean) => {
    setDraftRules((prev) => {
      const idx = prev.findIndex((r) => r.dayOfWeek === dayOfWeek);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        breakStart: hasBreak ? next[idx].breakStart ?? '13:00' : null,
        breakEnd: hasBreak ? next[idx].breakEnd ?? '14:00' : null,
      };
      return next;
    });
  };

  const onSave = async () => {
    setBusy(true);
    try {
      for (const r of draftRules) {
        await upsertRule({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          breakStart: r.breakStart ?? null,
          breakEnd: r.breakEnd ?? null,
          isActive: r.isActive,
        });
      }
      toast.success(t('calendar.availability_updated'));
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
      toast.error(t('calendar.errors.date_range_required'));
      return;
    }
    if (newRange.dateFrom > newRange.dateTo) {
      toast.error(t('calendar.errors.date_range_invalid'));
      return;
    }
    setSavingRange(true);
    try {
      const { data } = await api.post<{ range: BarberUnavailable }>(
        '/pro/availability/unavailable',
        {
          dateFrom: newRange.dateFrom,
          dateTo: newRange.dateTo,
          reason: newRange.reason || null,
        },
      );
      setRanges((prev) => [...prev, data.range]);
      setNewRange({ dateFrom: '', dateTo: '', reason: '' });
      toast.success(t('calendar.closed_period_added'));
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
      await api.delete(`/pro/availability/unavailable/${id}`);
      setRanges((prev) => prev.filter((r) => r.id !== id));
      toast.success(t('calendar.period_removed'));
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
      title={t('calendar.availability_title')}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {t('common:close')}
          </button>
          <button className="btn-primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? <Spinner /> : t('calendar.save_availability')}
          </button>
        </>
      }
    >
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-ink mb-1">{t('calendar.weekly_schedule')}</h3>
          <p className="text-sm text-muted">{t('calendar.weekly_schedule_desc')}</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const r = draftRules.find((x) => x.dayOfWeek === dow);
            const hasBreak = Boolean(r?.breakStart && r?.breakEnd);
            return (
              <div key={dow} className="rounded-button border border-line bg-surface/40 p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <label className="sm:col-span-4 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r?.isActive ?? false}
                      onChange={(e) => handleDayChange(dow, 'isActive', e.target.checked)}
                      className="!w-auto !h-auto"
                    />
                    <span className="font-medium text-ink">{DAY_OF_WEEK_LABEL[dow]}</span>
                  </label>
                  <input
                    type="time"
                    value={r?.startTime ?? '09:00'}
                    onChange={(e) => handleDayChange(dow, 'startTime', e.target.value)}
                    disabled={!r?.isActive}
                    className="sm:col-span-3 !h-9"
                    aria-label={t('calendar.open_time')}
                  />
                  <span className="sm:col-span-1 text-center text-xs text-muted">{t('calendar.until')}</span>
                  <input
                    type="time"
                    value={r?.endTime ?? '18:00'}
                    onChange={(e) => handleDayChange(dow, 'endTime', e.target.value)}
                    disabled={!r?.isActive}
                    className="sm:col-span-3 !h-9"
                    aria-label={t('calendar.close_time')}
                  />
                </div>

                {r?.isActive && (
                  <div className="pl-6">
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={hasBreak}
                        onChange={(e) => toggleBreak(dow, e.target.checked)}
                        className="!w-auto !h-auto"
                      />
                      {t('calendar.lunch_break')}
                    </label>
                    {hasBreak && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center mt-2">
                        <span className="sm:col-span-3 text-xs text-muted">{t('calendar.no_bookings')}</span>
                        <input
                          type="time"
                          value={r.breakStart ?? '13:00'}
                          onChange={(e) => handleDayChange(dow, 'breakStart', e.target.value)}
                          className="sm:col-span-3 !h-9"
                          aria-label={t('calendar.break_start')}
                        />
                        <span className="sm:col-span-1 text-center text-xs text-muted">{t('calendar.until')}</span>
                        <input
                          type="time"
                          value={r.breakEnd ?? '14:00'}
                          onChange={(e) => handleDayChange(dow, 'breakEnd', e.target.value)}
                          className="sm:col-span-3 !h-9"
                          aria-label={t('calendar.break_end')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 mt-6 pt-6 border-t border-line">
        <div className="flex items-start gap-2">
          <CalendarOff size={18} className="text-muted mt-0.5" />
          <div>
            <h3 className="font-semibold text-ink mb-1">{t('calendar.closed_days')}</h3>
            <p className="text-sm text-muted">
              {t('calendar.closed_days_desc')}
            </p>
          </div>
        </div>

        {/* Existing ranges (future + ongoing only) */}
        <ul className="space-y-2">
          {ranges.length === 0 && (
            <li className="text-sm text-muted italic">{t('calendar.no_closed')}</li>
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
                aria-label={t('calendar.remove_period')}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        {/* Add new range form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-2">
          <div className="sm:col-span-3">
            <label className="label">{t('calendar.from')}</label>
            <input
              type="date"
              value={newRange.dateFrom}
              onChange={(e) => setNewRange((p) => ({ ...p, dateFrom: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-3">
            <label className="label">{t('calendar.to')}</label>
            <input
              type="date"
              value={newRange.dateTo}
              onChange={(e) => setNewRange((p) => ({ ...p, dateTo: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label">{t('calendar.reason_optional')}</label>
            <input
              type="text"
              placeholder={t('calendar.reason_placeholder')}
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
              <Plus size={14} /> {t('calendar.add')}
            </button>
          </div>
        </div>
      </section>
    </Modal>
  );
}
