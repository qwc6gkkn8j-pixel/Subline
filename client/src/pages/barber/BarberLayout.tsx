import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { BARBER_TABS, BARBER_NAV } from '@/components/layout/MobileShell';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

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
  return (
    <ResponsiveShell tabs={BARBER_TABS} navItems={BARBER_NAV}>
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
    </ResponsiveShell>
  );
}
