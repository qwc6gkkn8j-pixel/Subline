import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, ChevronDown, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export interface NavLinkItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface RoleShellProps {
  title: string;
  navItems: NavLinkItem[];
  bottomNav?: ReactNode;
  children: ReactNode;
}

export function RoleShell({ title, navItems, bottomNav, children }: RoleShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-line sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-line">
          <Logo size={32} />
          <span className="font-bold text-ink">SUBLINE</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink hover:bg-surface',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 rounded-button"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-line">
          <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-button hover:bg-surface"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <Link to="/" className="lg:hidden flex items-center">
                <Logo size={32} />
              </Link>
              <h1 className="text-lg font-semibold text-ink truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 hover:bg-surface rounded-button p-1 pr-2"
                >
                  <Avatar name={user?.fullName ?? '?'} size={32} />
                  <span className="hidden sm:inline text-sm font-medium text-ink max-w-[140px] truncate">
                    {user?.fullName}
                  </span>
                  <ChevronDown size={16} className="text-muted" />
                </button>
                {profileOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30"
                      aria-label="Close menu"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-card shadow-card-lg overflow-hidden z-40">
                      <div className="px-4 py-3 border-b border-line">
                        <p className="text-sm font-medium text-ink truncate">{user?.fullName}</p>
                        <p className="text-xs text-muted truncate">{user?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-surface"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-card-lg flex flex-col">
              <div className="h-16 px-4 flex items-center justify-between border-b border-line">
                <div className="flex items-center gap-2">
                  <Logo size={28} />
                  <span className="font-bold text-ink">SUBLINE</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 rounded-button hover:bg-surface"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium',
                        isActive ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-surface',
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-line">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 rounded-button"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10" key={pathname}>
          {children}
        </main>

        {bottomNav}
      </div>
    </div>
  );
}
