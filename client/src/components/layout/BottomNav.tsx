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
      className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Min height 64px + generous touch targets for iOS/Android */}
      <ul className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + '/');
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 h-full">
              <Link
                to={item.to}
                className={cn(
                  // 44px minimum tap target (Apple HIG + Material guidelines)
                  'flex flex-col items-center justify-center gap-1 w-full h-full min-h-[44px] text-xs select-none',
                  active ? 'text-brand' : 'text-muted',
                  item.primary && 'relative',
                )}
              >
                {item.primary ? (
                  <span className="absolute -top-4 w-12 h-12 rounded-full bg-brand-gradient text-white shadow-card-lg flex items-center justify-center">
                    <Icon size={24} />
                  </span>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                    <span className="leading-none font-medium">{item.label}</span>
                  </>
                )}
                {item.primary && <span className="mt-7 leading-none font-medium">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
