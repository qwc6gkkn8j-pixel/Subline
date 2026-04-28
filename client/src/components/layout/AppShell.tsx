import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

interface AppShellProps {
  title: string;
  children: ReactNode;
  bottomNav?: ReactNode;
}

export function AppShell({ title, children, bottomNav }: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={36} />
          </Link>
          <h1 className="hidden sm:block text-lg font-semibold text-ink">{title}</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 hover:bg-surface rounded-button p-1 pr-2"
            >
              <Avatar name={user?.fullName ?? '?'} size={32} />
              <span className="hidden sm:inline text-sm font-medium text-ink max-w-[140px] truncate">
                {user?.fullName}
              </span>
              <ChevronDown size={16} className="text-muted" />
            </button>
            {open && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-line rounded-card shadow-card-lg overflow-hidden z-20">
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
        <div className="sm:hidden px-4 pb-3">
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-10">
        {children}
      </main>

      {bottomNav}
    </div>
  );
}
