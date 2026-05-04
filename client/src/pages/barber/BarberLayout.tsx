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
} from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';
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

/** Show a toast when the Stripe Connect OAuth flow completes. */
function StripeConnectFeedback() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const stripe = params.get('stripe');
    if (stripe === 'connected') {
      toast.success('Conta Stripe ligada com sucesso! ✅');
      navigate('/barber', { replace: true });
    } else if (stripe === 'error') {
      toast.error('Ocorreu um erro ao ligar a conta Stripe. Tenta novamente.');
      navigate('/barber', { replace: true });
    } else if (stripe === 'not_configured') {
      toast.error('Stripe ainda não configurado na plataforma.');
      navigate('/barber', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function BarberLayout() {
  return (
    <RoleShell
      title="Barbeiro"
      navItems={[
        { to: '/barber', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/barber/clients', icon: UsersIcon, label: 'Clientes' },
        { to: '/barber/staff', icon: UserCog, label: 'Staff' },
        { to: '/barber/calendar', icon: Calendar, label: 'Calendário' },
        { to: '/barber/plans', icon: Tag, label: 'Planos' },
        { to: '/barber/chat', icon: MessageSquare, label: 'Chat' },
        { to: '/barber/profile', icon: UserIcon, label: 'Perfil' },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/barber', icon: Home, label: 'Home' },
            { to: '/barber/clients', icon: UsersIcon, label: 'Clientes' },
            { to: '/barber/clients?new=1', icon: UserPlus, label: 'Add', primary: true },
            { to: '/barber/calendar', icon: Calendar, label: 'Agenda' },
            { to: '/barber/chat', icon: MessageSquare, label: 'Chat' },
          ]}
        />
      }
    >
      <StripeConnectFeedback />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/barber" replace />} />
        </Routes>
      </Suspense>
    </RoleShell>
  );
}
