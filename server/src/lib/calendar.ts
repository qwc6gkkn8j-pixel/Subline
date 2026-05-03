// ────────────────────────────────────────────────────────────────────────────
// Calendar helpers — slot calculation for the booking flow.
//
// We store start/end times as "HH:MM" strings (24h) in BarberAvailability and
// Appointment. These helpers convert to/from minute offsets so we can do
// arithmetic safely.
// ────────────────────────────────────────────────────────────────────────────

export type TimeStr = string; // "HH:MM"

export function parseTime(t: TimeStr): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(minutes: number): TimeStr {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export interface AvailabilityRule {
  dayOfWeek: number;
  startTime: TimeStr;
  endTime: TimeStr;
  slotDuration: number;
  isActive: boolean;
  /** Optional mid-day break — slot grid skips overlaps. */
  breakStart?: TimeStr | null;
  breakEnd?: TimeStr | null;
}

export interface BookedRange {
  startTime: TimeStr;
  endTime: TimeStr;
}

export interface UnavailableRange {
  dateFrom: Date;
  dateTo: Date;
}

export interface SlotResult {
  time: TimeStr;
  available: boolean;
}

/**
 * Compute slot availability for one barber on one date.
 * Returns slots in chronological order with their availability flag.
 *
 * Behavior:
 *  - If the date is within an unavailable range → all slots false
 *  - If no active availability rule for this dayOfWeek → empty array
 *  - Otherwise → grid from startTime to endTime stepping by slotDuration,
 *    each slot marked false if it overlaps any booked range
 */
export function computeAvailableSlots(args: {
  date: Date;
  rules: AvailabilityRule[];
  booked: BookedRange[];
  unavailable: UnavailableRange[];
  slotDurationOverride?: number;
}): SlotResult[] {
  const dayOfWeek = args.date.getDay(); // 0 = Sunday

  // Check unavailable ranges (full-day blocks)
  const dateMs = new Date(args.date.toDateString()).getTime();
  const isBlocked = args.unavailable.some((u) => {
    const from = new Date(u.dateFrom.toDateString()).getTime();
    const to = new Date(u.dateTo.toDateString()).getTime();
    return dateMs >= from && dateMs <= to;
  });

  const rule = args.rules.find((r) => r.dayOfWeek === dayOfWeek && r.isActive);
  if (!rule) return [];

  const start = parseTime(rule.startTime);
  const end = parseTime(rule.endTime);
  const step = args.slotDurationOverride ?? rule.slotDuration ?? 30;

  const bookedMinutes = args.booked.map((b) => ({
    start: parseTime(b.startTime),
    end: parseTime(b.endTime),
  }));

  // Mid-day break — only applies when both breakStart and breakEnd are set
  // and form a non-empty interval inside the working day.
  const breakRange =
    rule.breakStart && rule.breakEnd
      ? (() => {
          const bStart = parseTime(rule.breakStart);
          const bEnd = parseTime(rule.breakEnd);
          return bEnd > bStart ? { start: bStart, end: bEnd } : null;
        })()
      : null;

  const slots: SlotResult[] = [];
  for (let t = start; t + step <= end; t += step) {
    const slotEnd = t + step;
    // Skip any slot that overlaps the configured break range entirely —
    // the slot just doesn't exist on the grid (better UX than greyed-out).
    if (breakRange && !(slotEnd <= breakRange.start || t >= breakRange.end)) {
      continue;
    }
    const overlaps = bookedMinutes.some(
      (b) => !(slotEnd <= b.start || t >= b.end),
    );
    slots.push({
      time: formatTime(t),
      available: !isBlocked && !overlaps,
    });
  }

  return slots;
}
