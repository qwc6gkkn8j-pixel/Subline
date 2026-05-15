import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.png';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 40, showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoImg}
        alt="Subline"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
      {showText && (
        <span className="font-bold tracking-[0.1em] text-ink text-lg leading-none">
          SUBLINE
        </span>
      )}
    </div>
  );
}
