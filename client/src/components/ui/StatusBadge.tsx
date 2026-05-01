import type { AppointmentStatus } from '@/lib/types';

const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pendente', className: 'badge-warning' },
  confirmed: { label: 'Confirmada', className: 'badge-brand' },
  completed: { label: 'Concluída', className: 'badge-success' },
  no_show: { label: 'Não compareceu', className: 'badge-danger' },
  cancelled: { label: 'Cancelada', className: 'badge-muted' },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

/**
 * Visual badge for an appointment status. Color coding:
 *  - pending → amarelo
 *  - confirmed → azul
 *  - completed → verde
 *  - no_show → vermelho
 *  - cancelled → cinzento
 */
export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const config = APPOINTMENT_STATUS_CONFIG[status] ?? APPOINTMENT_STATUS_CONFIG.pending;
  return <span className={config.className}>{config.label}</span>;
}

export const APPOINTMENT_STATUS_LABEL = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<AppointmentStatus, string>;
