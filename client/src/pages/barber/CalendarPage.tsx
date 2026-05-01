import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { addDays, isoDate, startOfWeek } from '@/lib/utils';
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
  Subscription,
} from '@/lib/types';

type ClientLite = Client & { subscriptions: Subscription[] };

export default function CalendarPage() {
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<BarberAvailability[]>([]);
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
      setAppointments(data.appointments);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const loadOnce = async () => {
    try {
      const [av, cl] = await Promise.all([
        // Server returns `{ rules, unavailable }` (not `{ availability }`).
        api.get<{ rules: BarberAvailability[]; unavailable: BarberUnavailable[] }>(
          '/barber/availability',
        ),
        api.get<{ clients: ClientLite[] }>('/barber/clients'),
      ]);
      setAvailability(av.data.rules ?? []);
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
          availability={availability}
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
  const [clientId, setClientId] = useState(existing?.clientId ?? clients[0]?.id ?? '');
  const [service, setService] = useState<AppointmentService>(existing?.service ?? 'haircut');
  const [date, setDate] = useState(slot.date);
  const [time, setTime] = useState(existing?.startTime ?? slot.time);
  const [duration, setDuration] = useState<number>(
    existing?.durationMinutes ?? SERVICE_DURATION[existing?.service ?? 'haircut'],
  );
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? 'confirmed');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      const payload = {
        clientId,
        service,
        date,
        startTime: time,
        durationMinutes: duration,
        status,
        notes: notes || undefined,
      };
      if (existing) {
        await api.put(`/barber/appointments/${existing.id}`, payload);
        toast.success('Marcação atualizada');
      } else {
        await api.post('/barber/appointments', payload);
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
      title={existing ? 'Editar marcação' : 'Nova marcação'}
      footer={
        <div className="flex w-full justify-between">
          {existing ? (
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Hora</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
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
        <div>
          <label className="label">Notas (opcional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function AvailabilityModal({
  availability,
  onClose,
  onSaved,
}: {
  availability: BarberAvailability[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [rules, setRules] = useState<BarberAvailability[]>(availability);
  const [busy, setBusy] = useState(false);

  const upsertRule = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isActive: boolean,
  ) => {
    const existing = rules.find((r) => r.dayOfWeek === dayOfWeek);
    if (existing) {
      await api.put(`/barber/availability/${existing.id}`, {
        startTime,
        endTime,
        isActive,
        slotDuration: existing.slotDuration,
      });
    } else {
      await api.post('/barber/availability', {
        dayOfWeek,
        startTime,
        endTime,
        slotDuration: 30,
        isActive,
      });
    }
  };

  const handleDayChange = (dayOfWeek: number, key: 'startTime' | 'endTime' | 'isActive', value: string | boolean) => {
    setRules((prev) => {
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
      for (const r of rules) {
        await upsertRule(r.dayOfWeek, r.startTime, r.endTime, r.isActive);
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

  return (
    <Modal
      open
      onClose={onClose}
      title="Disponibilidade semanal"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? <Spinner /> : 'Guardar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted mb-3">Define os horários em que aceitas marcações.</p>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const r = rules.find((x) => x.dayOfWeek === dow);
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
                className="sm:col-span-4 !h-9"
              />
              <span className="sm:col-span-1 text-center text-xs text-muted">até</span>
              <input
                type="time"
                value={r?.endTime ?? '18:00'}
                onChange={(e) => handleDayChange(dow, 'endTime', e.target.value)}
                disabled={!r?.isActive}
                className="sm:col-span-4 !h-9"
              />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
