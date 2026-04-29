import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, isoDate, startOfWeek } from '@/lib/utils';
import type { Appointment } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  weekStart: Date;
  onWeekChange: (d: Date) => void;
  appointments: Appointment[];
  /** Hour bounds (0-23) */
  startHour?: number;
  endHour?: number;
  /** Click on an appointment */
  onAppointmentClick?: (a: Appointment) => void;
  /** Click on an empty slot (date in YYYY-MM-DD, time in HH:MM) */
  onSlotClick?: (date: string, time: string) => void;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function CalendarView({
  weekStart,
  onWeekChange,
  appointments,
  startHour = 8,
  endHour = 20,
  onAppointmentClick,
  onSlotClick,
}: Props) {
  const days = useMemo(() => {
    const ws = startOfWeek(weekStart, 1);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [weekStart]);

  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  }, [startHour, endHour]);

  const apptByDay = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = isoDate(a.date);
      const list = m.get(key) ?? [];
      list.push(a);
      m.set(key, list);
    }
    return m;
  }, [appointments]);

  return (
    <div className="bg-white rounded-card border border-line overflow-hidden">
      {/* Header — week controls */}
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            className="p-2 rounded-button hover:bg-surface"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            className="p-2 rounded-button hover:bg-surface"
            aria-label="Semana seguinte"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(new Date())}
            className="btn-outline btn-sm ml-2"
          >
            Hoje
          </button>
        </div>
        <p className="text-sm font-medium text-ink">
          {days[0].toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} —{' '}
          {days[6].toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px] grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-line" />
          {days.map((d, i) => {
            const isToday = isoDate(d) === isoDate(new Date());
            return (
              <div
                key={isoDate(d)}
                className={cn(
                  'text-center border-b border-line py-2 text-xs',
                  isToday ? 'text-brand font-semibold' : 'text-muted',
                )}
              >
                <p className="uppercase tracking-wide">{DAY_LABELS[i]}</p>
                <p className="text-base text-ink">{d.getDate()}</p>
              </div>
            );
          })}

          {/* Hour rows */}
          {hours.map((h) => (
            <Row
              key={h}
              hour={h}
              days={days}
              apptByDay={apptByDay}
              onAppointmentClick={onAppointmentClick}
              onSlotClick={onSlotClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  hour,
  days,
  apptByDay,
  onAppointmentClick,
  onSlotClick,
}: {
  hour: number;
  days: Date[];
  apptByDay: Map<string, Appointment[]>;
  onAppointmentClick?: (a: Appointment) => void;
  onSlotClick?: (date: string, time: string) => void;
}) {
  const label = `${String(hour).padStart(2, '0')}:00`;
  return (
    <>
      <div className="border-b border-line border-r px-2 py-3 text-[11px] text-muted">{label}</div>
      {days.map((d) => {
        const key = isoDate(d);
        const all = apptByDay.get(key) ?? [];
        const inHour = all.filter((a) => Number(a.startTime.slice(0, 2)) === hour);
        return (
          <button
            key={key + label}
            type="button"
            onClick={() => onSlotClick?.(key, label)}
            className="border-b border-line border-r min-h-[64px] p-1 text-left hover:bg-brand/5 transition-colors"
          >
            <div className="space-y-1">
              {inHour.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick?.(a);
                  }}
                  className={cn(
                    'block w-full text-left rounded-button px-2 py-1 text-[11px] leading-tight shadow-sm',
                    a.status === 'cancelled'
                      ? 'bg-muted/20 text-muted line-through'
                      : a.status === 'pending'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-brand/15 text-brand',
                  )}
                >
                  <p className="font-semibold truncate">
                    {a.startTime} {a.client?.name ? `· ${a.client.name}` : ''}
                  </p>
                  <p className="truncate">{a.service}</p>
                </button>
              ))}
            </div>
          </button>
        );
      })}
    </>
  );
}
