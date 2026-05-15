import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-lineSoft sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + '/');
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 h-full">
              <Link
                to={item.to}
                className="flex flex-col items-center justify-center gap-1 w-full h-full min-h-[44px] select-none transition-colors relative"
              >
                {item.primary ? (
                  <>
                    <span className="absolute -top-4 w-12 h-12 rounded-pill bg-ink text-white shadow-btn flex items-center justify-center">
                      <Icon size={24} />
                    </span>
                    <span className="mt-7 text-[10.5px] font-semibold leading-none text-faint">{item.label}</span>
                  </>
                ) : (
                  <>
                    {/* Black dot indicator above active icon */}
                    {active && (
                      <span className="absolute top-0.5 w-1 h-1 rounded-full bg-ink" />
                    )}
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={active ? 'text-brand' : 'text-faint'}
                    />
                    <span className={cn(
                      'text-[10.5px] leading-none',
                      active ? 'font-bold text-ink' : 'font-medium text-faint',
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
