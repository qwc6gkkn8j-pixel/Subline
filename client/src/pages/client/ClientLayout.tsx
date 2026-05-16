import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { CLIENT_TABS, CLIENT_NAV } from '@/components/layout/MobileShell';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

const HomePage = lazy(() => import('./HomePage'));
const DiscoverPage = lazy(() => import('./DiscoverPage'));
const SubscriptionPage = lazy(() => import('./SubscriptionPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const ShopPage = lazy(() => import('./ShopPage'));
const SupportPage = lazy(() => import('./SupportPage'));

export default function ClientLayout() {
  return (
    <ResponsiveShell tabs={CLIENT_TABS} navItems={CLIENT_NAV}>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Routes>
      </Suspense>
    </ResponsiveShell>
  );
}
