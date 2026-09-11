import type { UserProfile } from '../types/user';

export const DASHBOARD_PATH = '/app/dashboard';
export const ONBOARDING_PATH = '/onboarding';

export function hasCompletedOnboarding(profile: UserProfile | null): boolean {
  return Boolean(profile?.onboardingCompleted);
}

export function getPostAuthPath(profile: UserProfile | null, isNewUser: boolean): string {
  if (isNewUser || !hasCompletedOnboarding(profile)) {
    return ONBOARDING_PATH;
  }
  return DASHBOARD_PATH;
}
