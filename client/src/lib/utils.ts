import clsx, { type ClassValue } from 'clsx';

// Re-export the EU date formatters so existing call sites (formatDate,
// formatDateTime, formatRelative) automatically get DD/MM/YYYY format.
// New code should import from '@/lib/dateUtils' directly.
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelative,
  formatMonth,
  formatMonthShort,
  formatToday,
  formatWeekdayShort,
  formatWeekRange,
} from './dateUtils';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrency(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function isoDate(d: Date | string): string {
  const dd = typeof d === 'string' ? new Date(d) : d;
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function startOfWeek(d: Date, weekStartsOn = 1): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}
