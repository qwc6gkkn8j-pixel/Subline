import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 40, showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="subline-grad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#0080D0" />
            <stop offset="100%" stopColor="#003D7A" />
          </linearGradient>
        </defs>
        <path
          d="M16 8h32a8 8 0 0 1 8 8v32a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8z"
          fill="url(#subline-grad)"
        />
        <path
          d="M40 22c-1.6-2.4-4.4-3.6-7.5-3.6-4.6 0-7.5 2.6-7.5 6.2 0 8.4 16 4.6 16 13.6 0 4-3.6 7-9 7-4 0-7.4-1.6-9-4.6"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="font-bold tracking-wide text-ink text-lg leading-none">SUBLINE</span>
      )}
    </div>
  );
}
