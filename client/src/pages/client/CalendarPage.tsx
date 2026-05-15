import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Banner } from '@/components/ui/Banner';
import { useToast } from '@/components/ui/Toast';
import { AppointmentStatusBadge } from '@/components/ui/StatusBadge';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate, isoDate } from '@/lib/utils';
import {
  SERVICE_DURATION,
  SERVICE_LABEL,
} from '@/lib/types';
import type {
  Appointment,
  AppointmentService,
  Service,
  Slot,
} from '@/lib/types';
import { useTranslation } from 'react-i18next';

export default function CalendarPage() {
  const { t } = useTranslation('client');
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ appointments: Appointment[] }>('/client/appointments');
      setAppointments(data.appointments);
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

  const upcoming = appointments
    .filter((a) => new Date(a.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const past = appointments
    .filter((a) => new Date(a.date) < new Date(new Date().toDateString()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-ink">{t('calendar.title')}</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> {t('calendar.new_booking')}
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">{t('calendar.upcoming')}</h2>
            {upcoming.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={CalendarIcon}
                  title={t('calendar.no_appointments')}
                  description={t('calendar.no_upcoming_desc')}
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <AppointmentRow key={a.id} appt={a} onCancel={() => setCancelling(a)} canCancel />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                {t('calendar.past')}
              </h2>
              <ul className="space-y-3">
                {past.slice(0, 8).map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {creating && (
        <BookingModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            void load();
          }}
        />
      )}

      {cancelling && (
        <CancelAppointmentModal
          appointment={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => void load()}
        />
      )}
    </div>
  );
}

function AppointmentRow({
  appt,
  onCancel,
  canCancel,
}: {
  appt: Appointment;
  onCancel?: () => void;
  canCancel?: boolean;
}) {
  const { t } = useTranslation('client');
  return (
    <li className="card flex items-center gap-4">
      <div className="w-16 text-center shrink-0">
        <p className="text-xl font-bold text-ink">{appt.startTime}</p>
        <p className="text-[11px] text-muted uppercase">
          {formatDate(appt.date).split(',')[0]}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink">{SERVICE_LABEL[appt.service]}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <AppointmentStatusBadge status={appt.status} />
          <span className="text-xs text-muted">
            {appt.durationMinutes} min · {appt.barber?.name ?? t('calendar.professional_label')}
          </span>
        </div>
      </div>
      {canCancel && appt.status !== 'cancelled' && (
        <button
          className="btn-outline btn-sm !text-danger !border-danger/30 hover:!bg-danger/5"
          onClick={onCancel}
        >
          <X size={14} /> {t('calendar.cancel_booking')}
        </button>
      )}
    </li>
  );
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

function BookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation('client');
  const toast = useToast();
  const [date, setDate] = useState(isoDate(new Date(Date.now() + 24 * 3600 * 1000)));
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [service, setService] = useState<AppointmentService>('haircut');
  const [duration, setDuration] = useState<number>(SERVICE_DURATION.haircut);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffId, setStaffId] = useState<string>('');

  useEffect(() => {
    Promise.all([
      api
        .get<{ services: Service[] }>('/client/services')
        .then((r) => setServices(r.data.services))
        .catch(() => undefined),
      api
        .get<{ staff: StaffMember[] }>('/client/staff')
        .then((r) => setStaffMembers(r.data.staff))
        .catch(() => undefined),
    ]);
  }, []);

  const hasCatalog = services.length > 0;

  useEffect(() => {
    setLoadingSlots(true);
    setTime('');
    api
      .get<{ slots: Slot[] }>('/client/calendar/slots', {
        params: { date, durationMinutes: duration, staffId: staffId || undefined },
      })
      .then((r) => setSlots(r.data.slots))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoadingSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, duration, staffId]);

  const onCreate = async () => {
    if (!time) {
      toast.error(t('calendar.choose_time_error'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/client/appointments', {
        service,
        serviceId: serviceId || null,
        staffMemberId: staffId || null,
        date,
        startTime: time,
        durationMinutes: duration,
        notes: notes || undefined,
      });
      toast.success(t('calendar.booking_pending'));
      onCreated();
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
      title={t('calendar.new_booking')}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {t('common:cancel')}
          </button>
          <button className="btn-primary" onClick={() => void onCreate()} disabled={busy || !time}>
            {busy ? <Spinner /> : t('calendar.book_btn')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {staffMembers.length > 0 && (
          <div>
            <label className="label">{t('calendar.professional_optional')}</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">{t('calendar.any_professional')}</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>
        )}

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
                <option value="">— {t('calendar.choose_service')} —</option>
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
              title={serviceId ? t('calendar.service_label') : undefined}
            />
          </div>
        </div>

        <div>
          <label className="label">{t('calendar.date_label')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="label">{t('calendar.time_label')}</label>
          {loadingSlots ? (
            <div className="text-center py-6">
              <Spinner />
            </div>
          ) : slots.length === 0 ? (
            <Banner tone="warning">{t('calendar.no_slots')}</Banner>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={!s.available}
                  onClick={() => setTime(s.time)}
                  className={
                    'h-9 px-4 rounded-pill border text-[13px] font-medium transition-all ' +
                    (s.time === time
                      ? 'bg-brand text-white border-brand shadow-btn-brand'
                      : s.available
                        ? 'bg-card text-ink border-line hover:border-brand'
                        : 'text-[#C8C8C8] border-lineSoft line-through cursor-not-allowed')
                  }
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">{t('calendar.notes_label')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('calendar.notes_placeholder')}
          />
        </div>
      </div>
    </Modal>
  );
}

function CancelAppointmentModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('client');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onCancel = async () => {
    setBusy(true);
    try {
      await api.put(`/client/appointments/${appointment.id}/cancel`);
      toast.success(t('calendar.booking_cancelled'));
      onDone();
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
      title={t('calendar.cancel_title')}
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {t('calendar.keep_btn')}
          </button>
          <button className="btn-danger" onClick={() => void onCancel()} disabled={busy}>
            {busy ? <Spinner /> : t('calendar.cancel_booking')}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">
        {t('calendar.cancel_confirm_msg', { date: formatDate(appointment.date), time: appointment.startTime })}
      </p>
    </Modal>
  );
}
