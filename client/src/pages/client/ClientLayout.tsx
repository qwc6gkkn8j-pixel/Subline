import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Home,
  CreditCard,
  CalendarDays,
  MessageSquare,
  User as UserIcon,
  ShoppingBag,
  LifeBuoy,
  Compass,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const HomePage = lazy(() => import('./HomePage'));
const DiscoverPage = lazy(() => import('./DiscoverPage'));
const SubscriptionPage = lazy(() => import('./SubscriptionPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const ShopPage = lazy(() => import('./ShopPage'));
const SupportPage = lazy(() => import('./SupportPage'));

export default function ClientLayout() {
  const { t } = useTranslation('common');
  return (
    <RoleShell
      title={t('roles.client')}
      navItems={[
        { to: '/client', icon: Home, label: t('nav.home'), end: true },
        { to: '/client/discover', icon: Compass, label: t('nav.discover') },
        { to: '/client/subscription', icon: CreditCard, label: t('nav.subscription') },
        { to: '/client/calendar', icon: CalendarDays, label: t('nav.calendar') },
        { to: '/client/shop', icon: ShoppingBag, label: t('nav.shop') },
        { to: '/client/chat', icon: MessageSquare, label: t('nav.chat') },
        { to: '/client/support', icon: LifeBuoy, label: t('nav.support') },
        { to: '/client/profile', icon: UserIcon, label: t('nav.profile') },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/client', icon: Home, label: t('nav.home') },
            { to: '/client/discover', icon: Compass, label: t('nav.discover') },
            { to: '/client/calendar', icon: CalendarDays, label: t('nav.book'), primary: true },
            { to: '/client/chat', icon: MessageSquare, label: t('nav.chat') },
            { to: '/client/profile', icon: UserIcon, label: t('nav.profile') },
          ]}
        />
      }
    >
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
    </RoleShell>
  );
}
