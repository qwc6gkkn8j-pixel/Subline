import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { C, FONT } from '@/design-system/tokens';
import { I } from '@/design-system/icons';
import { TabBar } from '@/design-system/primitives';

export interface MobileTab {
  id: string;
  label: string;
  icon: ReactNode;
  to: string;
}

interface MobileShellProps {
  tabs: MobileTab[];
  children: ReactNode;
}

// Mobile-first shell. Renders the design-system Screen + TabBar.
export function MobileShell({ tabs, children }: MobileShellProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab =
    tabs.find((t) => pathname === t.to || pathname.startsWith(t.to + '/')) || tabs[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.surface,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: C.bg,
          color: C.text,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
        <TabBar
          active={activeTab.id}
          onChange={(id) => {
            const tab = tabs.find((t) => t.id === id);
            if (tab) navigate(tab.to);
          }}
          tabs={tabs}
        />
      </div>
    </div>
  );
}

// ── Tabs (mobile bottom nav) ─────────────────────────────────────────────────
export const CLIENT_TABS: MobileTab[] = [
  { id: 'home', label: 'Início', icon: I.home, to: '/client' },
  { id: 'cal', label: 'Marcações', icon: I.cal, to: '/client/calendar' },
  { id: 'plans', label: 'Plano', icon: I.card, to: '/client/subscription' },
  { id: 'shop', label: 'Loja', icon: I.bag, to: '/client/shop' },
  { id: 'profile', label: 'Conta', icon: I.user, to: '/client/profile' },
];

export const BARBER_TABS: MobileTab[] = [
  { id: 'home', label: 'Início', icon: I.home, to: '/barber' },
  { id: 'cal', label: 'Agenda', icon: I.cal, to: '/barber/calendar' },
  { id: 'clients', label: 'Clientes', icon: I.users, to: '/barber/clients' },
  { id: 'shop', label: 'Loja', icon: I.bag, to: '/barber/shop' },
  { id: 'profile', label: 'Conta', icon: I.user, to: '/barber/profile' },
];

export const ADMIN_TABS: MobileTab[] = [
  { id: 'home', label: 'Visão', icon: I.home, to: '/admin' },
  { id: 'pros', label: 'Pros', icon: I.scissors, to: '/admin/pros' },
  { id: 'users', label: 'Users', icon: I.users, to: '/admin/users' },
  { id: 'payments', label: 'Pagar', icon: I.card, to: '/admin/payments' },
  { id: 'profile', label: 'Conta', icon: I.cog, to: '/admin/settings' },
];

// ── Nav items (desktop sidebar, more comprehensive) ─────────────────────────
export const CLIENT_NAV = [
  { label: 'Início', icon: I.home, to: '/client', end: true },
  { label: 'Descobrir', icon: I.search, to: '/client/discover' },
  { label: 'Marcações', icon: I.cal, to: '/client/calendar' },
  { label: 'Subscrição', icon: I.card, to: '/client/subscription' },
  { label: 'Loja', icon: I.bag, to: '/client/shop' },
  { label: 'Mensagens', icon: I.chat, to: '/client/chat' },
  { label: 'Suporte', icon: I.help, to: '/client/support' },
  { label: 'Conta', icon: I.user, to: '/client/profile' },
];

export const BARBER_NAV = [
  { label: 'Painel', icon: I.home, to: '/barber', end: true },
  { label: 'Clientes', icon: I.users, to: '/barber/clients' },
  { label: 'Agenda', icon: I.cal, to: '/barber/calendar' },
  { label: 'Serviços', icon: I.scissors, to: '/barber/services' },
  { label: 'Staff', icon: I.user, to: '/barber/staff' },
  { label: 'Planos', icon: I.card, to: '/barber/plans' },
  { label: 'Avaliações', icon: I.star, to: '/barber/reviews' },
  { label: 'Loja', icon: I.bag, to: '/barber/shop' },
  { label: 'Mensagens', icon: I.chat, to: '/barber/chat' },
  { label: 'Suporte', icon: I.help, to: '/barber/support' },
  { label: 'Conta', icon: I.cog, to: '/barber/profile' },
];

export const ADMIN_NAV = [
  { label: 'Visão geral', icon: I.home, to: '/admin', end: true },
  { label: 'Profissionais', icon: I.scissors, to: '/admin/pros' },
  { label: 'Utilizadores', icon: I.users, to: '/admin/users' },
  { label: 'Pagamentos', icon: I.card, to: '/admin/payments' },
  { label: 'Planos', icon: I.bag, to: '/admin/plans' },
  { label: 'Tickets', icon: I.help, to: '/admin/tickets' },
  { label: 'Auditoria', icon: I.shield, to: '/admin/logs' },
  { label: 'Definições', icon: I.cog, to: '/admin/settings' },
];
