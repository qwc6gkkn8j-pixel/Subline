import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
}

const PALETTE = ['bg-surface', 'bg-surface', 'bg-surface', 'bg-surface', 'bg-surface'];

export function Avatar({ name, size = 40, className, imageUrl }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const idx = name.charCodeAt(0) % PALETTE.length;
  return (
    <div
      className={cn(
        'rounded-full font-semibold flex items-center justify-center shrink-0 text-ink',
        PALETTE[idx],
        className,
      )}
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials(name) || '?'}
    </div>
  );
}
