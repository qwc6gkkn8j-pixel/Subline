import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Calendar,
  Tag,
  MessageSquare,
  User as UserIcon,
  Home,
  UserPlus,
  UserCog,
  Scissors,
  ShoppingBag,
  LifeBuoy,
  Star,
} from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

const DashboardPage = lazy(() => import('./DashboardPage'));
const ClientsPage = lazy(() => import('./ClientsPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const StaffPage = lazy(() => import('./StaffPage'));
const ServicesPage = lazy(() => import('./ServicesPage'));
const ShopPage = lazy(() => import('./ShopPage'));
const SupportPage = lazy(() => import('./SupportPage'));
const ReviewsPage = lazy(() => import('./ReviewsPage'));

/** Show a toast when the Stripe Connect OAuth flow completes. */
function StripeConnectFeedback() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslation('common');

  useEffect(() => {
    const stripe = params.get('stripe');
    if (stripe === 'connected') {
      toast.success(t('stripe_toast.connected'));
      navigate('/barber', { replace: true });
    } else if (stripe === 'error') {
      toast.error(t('stripe_toast.error'));
      navigate('/barber', { replace: true });
    } else if (stripe === 'not_configured') {
      toast.error(t('stripe_toast.not_configured'));
      navigate('/barber', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function BarberLayout() {
  const { t } = useTranslation('common');
  return (
    <RoleShell
      title={t('roles.pro')}
      navItems={[
        { to: '/barber', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
        { to: '/barber/clients', icon: UsersIcon, label: t('nav.clients') },
        { to: '/barber/services', icon: Scissors, label: t('nav.services') },
        { to: '/barber/staff', icon: UserCog, label: t('nav.staff') },
        { to: '/barber/calendar', icon: Calendar, label: t('nav.calendar') },
        { to: '/barber/plans', icon: Tag, label: t('nav.plans') },
        { to: '/barber/reviews', icon: Star, label: t('nav.reviews') },
        { to: '/barber/shop', icon: ShoppingBag, label: t('nav.shop') },
        { to: '/barber/chat', icon: MessageSquare, label: t('nav.chat') },
        { to: '/barber/support', icon: LifeBuoy, label: t('nav.support') },
        { to: '/barber/profile', icon: UserIcon, label: t('nav.profile') },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/barber', icon: Home, label: t('nav.home') },
            { to: '/barber/clients', icon: UsersIcon, label: t('nav.clients') },
            { to: '/barber/clients?new=1', icon: UserPlus, label: t('nav.add'), primary: true },
            { to: '/barber/calendar', icon: Calendar, label: t('nav.calendar') },
            { to: '/barber/chat', icon: MessageSquare, label: t('nav.chat') },
          ]}
        />
      }
    >
      <StripeConnectFeedback />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/barber" replace />} />
        </Routes>
      </Suspense>
    </RoleShell>
  );
}
