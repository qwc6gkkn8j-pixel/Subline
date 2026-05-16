import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import type { Appointment } from '@/lib/types';

interface AppointmentsResp {
  appointments: Appointment[];
}

export default function CalendarPage() {
  const toast = useToast();
  const { t } = useTranslation('staff');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AppointmentsResp>('/staff/appointments', {
        params: {
          from: formatDateString(monthStart),
          to: formatDateString(monthEnd),
        },
      });
      setAppointments(data.appointments);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentDate]);

  const appointmentsByDate: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const dateStr = apt.date;
    if (!appointmentsByDate[dateStr]) {
      appointmentsByDate[dateStr] = [];
    }
    appointmentsByDate[dateStr].push(apt);
  }

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthDays = firstDay;

  const monthName = currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Calendar size={24} className="text-brand" />
        <h1 className="page-title">{t('calendar.title')}</h1>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
                  )
                }
                className="p-2 rounded-button hover:bg-surface"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-ink capitalize">{monthName}</h2>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
                  )
                }
                className="p-2 rounded-button hover:bg-surface"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
                <div key={day} className="text-center text-[13px] font-semibold text-muted uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Previous month filler */}
              {Array.from({ length: prevMonthDays }).map((_, i) => (
                <div key={`prev-${i}`} className="aspect-square rounded-button bg-surface" />
              ))}

              {/* Days of month */}
              {days.map((day) => {
                const dateStr = formatDateString(
                  new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                );
                const dayAppointments = appointmentsByDate[dateStr] || [];

                return (
                  <div
                    key={day}
                    className="aspect-square bg-surface rounded-button border border-lineSoft p-1 flex flex-col gap-0.5 overflow-hidden"
                  >
                    <div className="text-[13px] font-semibold text-ink">{day}</div>
                    <div className="flex-1 overflow-y-auto space-y-0.5">
                      {dayAppointments.slice(0, 2).map((apt) => (
                        <div key={apt.id} className="bg-brand text-white rounded-pill px-1 py-0.5 text-[10px] font-medium truncate">
                          {apt.startTime}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-[13px] text-muted">+{dayAppointments.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointments list */}
          {appointments.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4">{t('common:nav.calendar')}</h2>
              <div className="divide-y divide-lineSoft">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="card-title truncate">{apt.client?.name || 'Cliente'}</p>
                      <p className="text-[13px] text-muted">{new Date(apt.date).toLocaleDateString('pt-PT')} · {apt.durationMinutes} min</p>
                    </div>
                    <span className="text-[22px] font-bold text-brand shrink-0">{apt.startTime}</span>
                    <span
                      className={
                        apt.status === 'completed'
                          ? 'badge-success'
                          : apt.status === 'cancelled'
                          ? 'badge-danger'
                          : apt.status === 'confirmed'
                          ? 'badge-success'
                          : 'badge-warning'
                      }
                    >
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
