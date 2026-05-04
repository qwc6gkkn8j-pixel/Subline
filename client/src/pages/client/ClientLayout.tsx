import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Home,
  CreditCard,
  CalendarDays,
  MessageSquare,
  User as UserIcon,
  ShoppingBag,
  LifeBuoy,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const HomePage = lazy(() => import('./HomePage'));
const SubscriptionPage = lazy(() => import('./SubscriptionPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const ShopPage = lazy(() => import('./ShopPage'));
const SupportPage = lazy(() => import('./SupportPage'));

export default function ClientLayout() {
  return (
    <RoleShell
      title="Cliente"
      navItems={[
        { to: '/client', icon: Home, label: 'Início', end: true },
        { to: '/client/subscription', icon: CreditCard, label: 'Subscrição' },
        { to: '/client/calendar', icon: CalendarDays, label: 'Calendário' },
        { to: '/client/shop', icon: ShoppingBag, label: 'Loja' },
        { to: '/client/chat', icon: MessageSquare, label: 'Chat' },
        { to: '/client/support', icon: LifeBuoy, label: 'Suporte' },
        { to: '/client/profile', icon: UserIcon, label: 'Perfil' },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/client', icon: Home, label: 'Início' },
            { to: '/client/subscription', icon: CreditCard, label: 'Plano' },
            { to: '/client/calendar', icon: CalendarDays, label: 'Marcar', primary: true },
            { to: '/client/chat', icon: MessageSquare, label: 'Chat' },
            { to: '/client/profile', icon: UserIcon, label: 'Perfil' },
          ]}
        />
      }
    >
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<HomePage />} />
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
