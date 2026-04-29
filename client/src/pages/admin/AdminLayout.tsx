import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Tag,
  LifeBuoy,
  Activity,
  Settings,
  Home,
  UserPlus,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const TicketsPage = lazy(() => import('./TicketsPage'));
const LogsPage = lazy(() => import('./LogsPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

export default function AdminLayout() {
  return (
    <RoleShell
      title="Admin"
      navItems={[
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/admin/users', icon: UsersIcon, label: 'Utilizadores' },
        { to: '/admin/plans', icon: Tag, label: 'Planos' },
        { to: '/admin/tickets', icon: LifeBuoy, label: 'Tickets' },
        { to: '/admin/logs', icon: Activity, label: 'Auditoria' },
        { to: '/admin/settings', icon: Settings, label: 'Definições' },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/admin', icon: Home, label: 'Home' },
            { to: '/admin/users', icon: UsersIcon, label: 'Users' },
            { to: '/admin/users?new=1', icon: UserPlus, label: 'Add', primary: true },
            { to: '/admin/tickets', icon: LifeBuoy, label: 'Tickets' },
            { to: '/admin/settings', icon: Settings, label: 'Settings' },
          ]}
        />
      }
    >
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </RoleShell>
  );
}
