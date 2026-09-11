import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingState } from '../ui/LoadingState';
import { DASHBOARD_PATH, ONBOARDING_PATH, hasCompletedOnboarding } from '../../utils/authRedirect';

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const onboardingComplete = hasCompletedOnboarding(profile);

  if (requireOnboarding && !onboardingComplete) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }

  if (!requireOnboarding && onboardingComplete) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  return <>{children}</>;
}
