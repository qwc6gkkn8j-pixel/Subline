import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Calendar,
  Tag,
  MessageSquare,
  User as UserIcon,
  Home,
  UserPlus,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const DashboardPage = lazy(() => import('./DashboardPage'));
const ClientsPage = lazy(() => import('./ClientsPage'));
const CalendarPage = lazy(() => import('./CalendarPage'));
const PlansPage = lazy(() => import('./PlansPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));

export default function BarberLayout() {
  return (
    <RoleShell
      title="Barbeiro"
      navItems={[
        { to: '/barber', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/barber/clients', icon: UsersIcon, label: 'Clientes' },
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
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
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
