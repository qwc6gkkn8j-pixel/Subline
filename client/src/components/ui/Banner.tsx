import type { ReactNode } from 'react';
import { AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface BannerProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  info: 'bg-brand/5 text-brand border-brand/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
};

const toneIcon: Record<Tone, typeof AlertCircle> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export function Banner({ tone = 'info', title, children, action, className }: BannerProps) {
  const Icon = toneIcon[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-card border px-4 py-3', toneClass[tone], className)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="text-sm leading-relaxed">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
