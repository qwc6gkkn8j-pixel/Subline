import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { C, FONT } from '@/design-system/tokens';
import { I } from '@/design-system/icons';
import { Icon, SublineMark } from '@/design-system/primitives';

export interface DesktopNavItem {
  label: string;
  icon: ReactNode;
  to: string;
  end?: boolean;
}

interface DesktopShellProps {
  navItems: DesktopNavItem[];
  children: ReactNode;
}

export function DesktopShell({ navItems, children }: DesktopShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.fullName?.split(' ')[0]?.[0] ?? '?').toUpperCase();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
        display: 'flex',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          background: C.bg,
          borderRight: `1px solid ${C.border}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px 24px',
            textDecoration: 'none',
            color: C.text,
          }}
        >
          <SublineMark size={32} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.18em' }}>SUBLINE</span>
        </Link>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const active = item.end
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(item.to + '/');
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: active ? C.surface : 'transparent',
                  color: active ? C.text : C.muted,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  fontFamily: FONT,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background .15s, color .15s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = C.surface;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon d={item.icon} size={18} stroke={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            borderRadius: 12,
            border: 'none',
            background: 'transparent',
            color: C.danger,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: 'pointer',
            textAlign: 'left',
            marginTop: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(226,75,74,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Icon d={I.logout} size={18} stroke={2} />
          Sair
        </button>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
            height: 72,
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: 520,
              height: 44,
              borderRadius: 999,
              background: C.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 18px',
            }}
          >
            <Icon d={I.search} size={18} color={C.muted} stroke={2} />
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
              Pesquisar barbeiros, serviços
            </span>
          </div>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: '6px 14px 6px 6px',
                cursor: 'pointer',
                fontFamily: FONT,
                color: C.text,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: C.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </span>
              <Icon d={I.chev} size={14} stroke={2} color={C.muted} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: C.bg,
                  borderRadius: 16,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
                  border: `1px solid ${C.border}`,
                  width: 240,
                  overflow: 'hidden',
                  zIndex: 40,
                }}
              >
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{user?.fullName}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user?.email}</div>
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.danger,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: FONT,
                    textAlign: 'left',
                  }}
                >
                  <Icon d={I.logout} size={16} stroke={2} />
                  Sair / Mudar conta
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '0', overflowY: 'auto' }}>
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '0',
              minHeight: '100%',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
