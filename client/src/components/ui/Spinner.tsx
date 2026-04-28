import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-brand', className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface">
      <Spinner size={32} />
    </div>
  );
}
