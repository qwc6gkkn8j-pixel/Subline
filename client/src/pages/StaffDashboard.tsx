import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FullPageSpinner } from '@/components/ui/Spinner';

const BadgePage = lazy(() => import('@/pages/staff/BadgePage'));

export default function StaffDashboard() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="badge" element={<BadgePage />} />
        <Route path="*" element={<Navigate to="badge" replace />} />
      </Routes>
    </Suspense>
  );
}
