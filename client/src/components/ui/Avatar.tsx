import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

const PALETTE = ['bg-brand', 'bg-accent', 'bg-success', 'bg-warning', 'bg-brand-dark'];

export function Avatar({ name, size = 40, className }: AvatarProps) {
  const idx = name.charCodeAt(0) % PALETTE.length;
  return (
    <div
      className={cn(
        'rounded-full text-white font-semibold flex items-center justify-center shrink-0',
        PALETTE[idx],
        className,
      )}
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials(name) || '?'}
    </div>
  );
}
