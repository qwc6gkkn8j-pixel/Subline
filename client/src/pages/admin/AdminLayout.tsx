import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { MobileShell, ADMIN_TABS } from '@/components/layout/MobileShell';

const DashboardPage = lazy(() => import('./DashboardPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const ProsPage = lazy(() => import('./ProsPage'));
const PaymentsPage = lazy(() => import('./PaymentsPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const TicketsPage = lazy(() => import('./TicketsPage'));
const LogsPage = lazy(() => import('./LogsPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

export default function AdminLayout() {
  return (
    <MobileShell tabs={ADMIN_TABS}>
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
    </MobileShell>
  );
}
