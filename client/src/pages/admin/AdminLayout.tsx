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
  Briefcase,
  CreditCard,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const ProsPage = lazy(() => import('./ProsPage'));
const PaymentsPage = lazy(() => import('./PaymentsPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const TicketsPage = lazy(() => import('./TicketsPage'));
const LogsPage = lazy(() => import('./LogsPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

export default function AdminLayout() {
  const { t } = useTranslation('common');
  return (
    <RoleShell
      title={t('roles.admin')}
      navItems={[
        { to: '/admin', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
        { to: '/admin/pros', icon: Briefcase, label: t('nav.pros') },
        { to: '/admin/users', icon: UsersIcon, label: t('nav.users') },
        { to: '/admin/payments', icon: CreditCard, label: t('nav.payments') },
        { to: '/admin/plans', icon: Tag, label: t('nav.plans') },
        { to: '/admin/tickets', icon: LifeBuoy, label: t('nav.tickets') },
        { to: '/admin/logs', icon: Activity, label: t('nav.audit') },
        { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/admin', icon: Home, label: t('nav.home') },
            { to: '/admin/pros', icon: Briefcase, label: t('nav.pros') },
            { to: '/admin/users?new=1', icon: UserPlus, label: t('nav.add'), primary: true },
            { to: '/admin/tickets', icon: LifeBuoy, label: t('nav.tickets') },
            { to: '/admin/payments', icon: CreditCard, label: t('nav.payments') },
          ]}
        />
      }
    >
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="pros" element={<ProsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
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
