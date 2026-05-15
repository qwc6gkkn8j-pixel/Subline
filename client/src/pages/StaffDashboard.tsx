import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  Home,
  Clock,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { FullPageSpinner } from '@/components/ui/Spinner';

const BadgePage = lazy(() => import('@/pages/staff/BadgePage'));
const CalendarPage = lazy(() => import('@/pages/staff/CalendarPage'));
const ProfilePage = lazy(() => import('@/pages/staff/ProfilePage'));

export default function StaffDashboard() {
  return (
    <RoleShell
      title="Staff"
      navItems={[
        { to: '/staff', icon: Home, label: 'Início', end: true },
        { to: '/staff/badge', icon: Clock, label: 'Ponto' },
        { to: '/staff/calendar', icon: Calendar, label: 'Calendário' },
        { to: '/staff/profile', icon: UserIcon, label: 'Perfil' },
      ]}
      bottomNav={
        <BottomNav
          items={[
            { to: '/staff', icon: Home, label: 'Home' },
            { to: '/staff/badge', icon: Clock, label: 'Ponto', primary: true },
            { to: '/staff/calendar', icon: Calendar, label: 'Calendário' },
            { to: '/staff/profile', icon: UserIcon, label: 'Perfil' },
          ]}
        />
      }
    >
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route index element={<BadgePage />} />
          <Route path="badge" element={<BadgePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/staff" replace />} />
        </Routes>
      </Suspense>
    </RoleShell>
  );
}
