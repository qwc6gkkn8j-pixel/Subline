import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { Role } from '@/lib/types';

const Login = lazy(() => import('@/pages/Login'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const BarberDashboard = lazy(() => import('@/pages/BarberDashboard'));
const ClientDashboard = lazy(() => import('@/pages/ClientDashboard'));
const StaffDashboard = lazy(() => import('@/pages/StaffDashboard'));

function rolePath(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'barber') return '/barber';
  if (role === 'staff') return '/staff/badge';
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

/**
 * Listens for deep links opened in the Capacitor native shell.
 *
 * When the Stripe Connect OAuth flow completes, the server redirects to:
 *   https://YOUR_DOMAIN/barber?stripe=connected
 *
 * On native, the OS fires an appUrlOpen event with this URL. We intercept it
 * and navigate React Router to the correct path so the barber dashboard can
 * detect the `?stripe=connected` query param and show a success toast.
 */
function CapacitorDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).Capacitor?.isNativePlatform?.()) return;

    let cleanup: (() => void) | undefined;

    void import('@capacitor/app').then(({ App: CapApp }) => {
      const listenerPromise = CapApp.addListener('appUrlOpen', ({ url }) => {
        try {
          const parsed = new URL(url);
          // Route the incoming URL path into React Router.
          // Examples:
          //   subline://barber?stripe=connected  →  /barber?stripe=connected
          //   https://app.subline.com/client/subscription?stripe=success  →  /client/subscription?stripe=success
          const destination = parsed.pathname + parsed.search;
          if (destination && destination !== '/') {
            navigate(destination, { replace: true });
          }
        } catch {
          // Malformed URL — ignore
        }
      });

      cleanup = () => {
        void listenerPromise.then((handle) => void handle.remove());
      };
    });

    return () => cleanup?.();
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<FullPageSpinner />}>
          <CapacitorDeepLinkHandler />
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
            <Route
              path="/staff/*"
              element={
                <RequireRole role="staff">
                  <StaffDashboard />
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
