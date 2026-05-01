// ─────────────────────────────────────────────────────────────────────────────
// Date / time formatting — EU format (DD/MM/YYYY, HH:MM, 24h)
//
// All date formatting in the app should go through this module. Avoid using
// `Date.toLocaleDateString` directly so the format stays consistent.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTHS_PT_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const WEEKDAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDate(input: Date | string | null | undefined): Date | null {
  if (input == null) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "DD/MM/YYYY" — primary date format for the UI. */
export function formatDate(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/** "HH:MM" — time-of-day in 24h format. */
export function formatTime(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** "DD/MM/YYYY HH:MM" — full date + time. */
export function formatDateTime(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** "Maio 2026" — month + year, full month name. */
export function formatMonth(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mai" — short month name (3 letters). */
export function formatMonthShort(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return MONTHS_PT_SHORT[d.getMonth()];
}

/** "Seg", "Ter", … */
export function formatWeekdayShort(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return WEEKDAYS_PT_SHORT[d.getDay()];
}

/** "DD/MM/YYYY — DD/MM/YYYY" — used in the calendar week header. */
export function formatWeekRange(start: Date, end: Date): string {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

/** "Hoje, DD/MM/YYYY" — used in "today" banners. */
export function formatToday(input: Date | string | null | undefined = new Date()): string {
  return `Hoje, ${formatDate(input)}`;
}

/** "agora mesmo", "há 5 min", "há 2 h", "há 3 d", or absolute "DD/MM/YYYY". */
export function formatRelative(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'agora mesmo';
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  return formatDate(d);
}
