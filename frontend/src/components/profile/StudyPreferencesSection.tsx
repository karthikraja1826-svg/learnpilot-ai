import { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { EditableSection } from './EditableSection';
import { ProfileFieldGrid } from './ProfileFieldGrid';
import type { UpdateProfileInput, UserProfile } from '../../types/user';

const DAILY_TARGET_OPTIONS = ['1 hour', '2 hours', '3 hours', '4 hours', '5+ hours'];
const STUDY_PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const SESSION_DURATION_OPTIONS = ['25 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const BREAK_DURATION_OPTIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes'];

interface StudyPreferencesSectionProps {
  profile: UserProfile;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

interface FormState {
  dailyStudyTarget: string;
  preferredStudyPeriods: string[];
  preferredSessionDuration: string;
  breakDuration: string;
  timezone: string;
}

function toFormState(profile: UserProfile): FormState {
  return {
    dailyStudyTarget: profile.dailyStudyTarget ?? DAILY_TARGET_OPTIONS[1],
    preferredStudyPeriods: profile.preferredStudyPeriods ?? [],
    preferredSessionDuration: profile.preferredSessionDuration ?? SESSION_DURATION_OPTIONS[2],
    breakDuration: profile.breakDuration ?? BREAK_DURATION_OPTIONS[1],
    timezone: profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function StudyPreferencesSection({ profile, onSave }: StudyPreferencesSectionProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => setForm(toFormState(profile));

  const togglePeriod = (period: string) => {
    setForm((current) => ({
      ...current,
      preferredStudyPeriods: current.preferredStudyPeriods.includes(period)
        ? current.preferredStudyPeriods.filter((item) => item !== period)
        : [...current.preferredStudyPeriods, period],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        dailyStudyTarget: form.dailyStudyTarget,
        preferredStudyPeriods: form.preferredStudyPeriods,
        preferredSessionDuration: form.preferredSessionDuration,
        breakDuration: form.breakDuration,
        timezone: form.timezone.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditableSection
      title="Study Preferences"
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={handleCancel}
      renderView={() => (
        <ProfileFieldGrid
          fields={[
            { label: 'Daily study target', value: profile.dailyStudyTarget },
            {
              label: 'Preferred study periods',
              value: (profile.preferredStudyPeriods ?? []).length > 0 ? profile.preferredStudyPeriods!.join(', ') : undefined,
            },
            { label: 'Session duration', value: profile.preferredSessionDuration },
            { label: 'Break duration', value: profile.breakDuration },
            { label: 'Timezone', value: profile.timezone },
          ]}
        />
      )}
      renderEdit={() => (
        <div className="flex flex-col gap-5">
          <Select
            label="Daily study target"
            value={form.dailyStudyTarget}
            onChange={(event) => setForm((current) => ({ ...current, dailyStudyTarget: event.target.value }))}
          >
            {DAILY_TARGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-2">
            <span className="text-label">Preferred study periods</span>
            <div className="grid grid-cols-2 gap-3">
              {STUDY_PERIODS.map((period) => (
                <Checkbox
                  key={period}
                  label={period}
                  checked={form.preferredStudyPeriods.includes(period)}
                  onChange={() => togglePeriod(period)}
                />
              ))}
            </div>
          </div>

          <Select
            label="Session duration"
            value={form.preferredSessionDuration}
            onChange={(event) => setForm((current) => ({ ...current, preferredSessionDuration: event.target.value }))}
          >
            {SESSION_DURATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Select
            label="Break duration"
            value={form.breakDuration}
            onChange={(event) => setForm((current) => ({ ...current, breakDuration: event.target.value }))}
          >
            {BREAK_DURATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Input
            label="Timezone"
            value={form.timezone}
            onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
          />
        </div>
      )}
    />
  );
}
