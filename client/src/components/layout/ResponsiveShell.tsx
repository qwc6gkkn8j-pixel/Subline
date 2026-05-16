import { useState, useEffect, type ReactNode } from 'react';
import { MobileShell, type MobileTab } from './MobileShell';
import { DesktopShell, type DesktopNavItem } from './DesktopShell';

const DESKTOP_BREAKPOINT = 1024;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : false,
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isDesktop;
}

interface ResponsiveShellProps {
  tabs: MobileTab[];
  navItems: DesktopNavItem[];
  children: ReactNode;
}

export function ResponsiveShell({ tabs, navItems, children }: ResponsiveShellProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <DesktopShell navItems={navItems}>{children}</DesktopShell>;
  }
  return <MobileShell tabs={tabs}>{children}</MobileShell>;
}
