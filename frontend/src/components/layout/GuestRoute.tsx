import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getPostAuthPath } from '../../utils/authRedirect';
import { LoadingState } from '../ui/LoadingState';

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getPostAuthPath(profile, false)} replace />;
  }

  return <>{children}</>;
}
