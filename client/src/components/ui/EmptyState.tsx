import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-surface flex items-center justify-center text-muted">
          <Icon size={22} />
        </div>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
