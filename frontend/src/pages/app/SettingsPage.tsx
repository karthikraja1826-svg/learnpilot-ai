import { useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { LoadingState } from '../../components/ui/LoadingState';
import { AppearanceSection } from '../../components/settings/AppearanceSection';
import { NotificationPreferencesSection } from '../../components/settings/NotificationPreferencesSection';
import { AccountSection } from '../../components/settings/AccountSection';
import { StudyPreferencesSection } from '../../components/profile/StudyPreferencesSection';
import type { UpdateProfileInput } from '../../types/user';

export function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();

  const handleSave = useCallback(
    async (input: UpdateProfileInput) => {
      try {
        await updateProfile(input);
      } catch (err) {
        showToast(
          err instanceof ApiRequestError ? err.message : 'Could not save your changes. Please try again.',
          'error'
        );
        throw err;
      }
    },
    [updateProfile, showToast]
  );

  if (!profile) {
    return <LoadingState label="Loading your settings" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Settings</h1>
        <p className="text-secondary">Preferences for notifications, theme, and account.</p>
      </div>

      <AppearanceSection />
      <NotificationPreferencesSection profile={profile} onSave={handleSave} />
      <StudyPreferencesSection profile={profile} onSave={handleSave} />
      <AccountSection />
    </div>
  );
}
