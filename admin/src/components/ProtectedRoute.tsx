import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('adminAccessToken');
  const expiresAt = Number(localStorage.getItem('adminSessionExpiresAt'));
  // eslint-disable-next-line react-hooks/purity -- expiration check is a render-time side-effect guard
  const isExpired = !Number.isFinite(expiresAt) || expiresAt <= Date.now();

  if (!token || isExpired) {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminSessionExpiresAt');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
