import { useState } from 'react';
import { Toggle } from '../ui/Toggle';
import { Card } from '../ui/Card';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import type { NotificationPreferences, UpdateProfileInput, UserProfile } from '../../types/user';

interface NotificationPreferencesSectionProps {
  profile: UserProfile;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  studyReminders: true,
  assignmentReminders: true,
  examReminders: true,
  streakNotifications: true,
  studyReminderMinutesBefore: 10,
};

export function NotificationPreferencesSection({ profile, onSave }: NotificationPreferencesSectionProps) {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(profile.notificationPreferences ?? DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setIsSaving(true);
    try {
      await onSave({ notificationPreferences: { [key]: value } });
    } catch (err) {
      setPrefs(prefs);
      showToast(err instanceof ApiRequestError ? err.message : 'Could not save this preference.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-section-heading">Notifications</h2>
        <p className="text-secondary">Choose which reminders you'd like to receive.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body">Push notifications</p>
            <p className="text-caption">Master switch for all push alerts on this account.</p>
          </div>
          <Toggle checked={prefs.pushEnabled} onChange={(e) => handleToggle('pushEnabled', e.target.checked)} disabled={isSaving} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-body">Study reminders</p>
          <Toggle
            checked={prefs.studyReminders}
            onChange={(e) => handleToggle('studyReminders', e.target.checked)}
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-body">Assignment reminders</p>
          <Toggle
            checked={prefs.assignmentReminders}
            onChange={(e) => handleToggle('assignmentReminders', e.target.checked)}
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-body">Exam reminders</p>
          <Toggle
            checked={prefs.examReminders}
            onChange={(e) => handleToggle('examReminders', e.target.checked)}
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-body">Streak notifications</p>
          <Toggle
            checked={prefs.streakNotifications}
            onChange={(e) => handleToggle('streakNotifications', e.target.checked)}
            disabled={isSaving}
          />
        </div>
      </div>
    </Card>
  );
}
