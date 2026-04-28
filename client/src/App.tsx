import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, type ReactElement } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { Role } from '@/lib/types';

const Login = lazy(() => import('@/pages/Login'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const BarberDashboard = lazy(() => import('@/pages/BarberDashboard'));
const ClientDashboard = lazy(() => import('@/pages/ClientDashboard'));

function rolePath(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'barber') return '/barber';
  return '/client';
}

function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={rolePath(user.role)} replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={rolePath(user.role)} replace />;
}

function PublicOnly({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={rolePath(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/admin/*"
              element={
                <RequireRole role="admin">
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/barber/*"
              element={
                <RequireRole role="barber">
                  <BarberDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/client/*"
              element={
                <RequireRole role="client">
                  <ClientDashboard />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
