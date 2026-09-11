import { useState } from 'react';
import { Textarea } from '../ui/Textarea';
import { EditableSection } from './EditableSection';
import { ProfileFieldGrid } from './ProfileFieldGrid';
import type { UpdateProfileInput, UserProfile } from '../../types/user';

interface GoalsSectionProps {
  profile: UserProfile;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

interface FormState {
  shortTermGoals: string;
  longTermGoals: string;
  improvementAreas: string;
  learningInterests: string;
  additionalInformation: string;
}

function toFormState(profile: UserProfile): FormState {
  return {
    shortTermGoals: profile.shortTermGoals ?? '',
    longTermGoals: profile.longTermGoals ?? '',
    improvementAreas: profile.improvementAreas ?? '',
    learningInterests: profile.learningInterests ?? '',
    additionalInformation: profile.additionalInformation ?? '',
  };
}

export function GoalsSection({ profile, onSave }: GoalsSectionProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => setForm(toFormState(profile));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        shortTermGoals: form.shortTermGoals.trim(),
        longTermGoals: form.longTermGoals.trim(),
        improvementAreas: form.improvementAreas.trim(),
        learningInterests: form.learningInterests.trim(),
        additionalInformation: form.additionalInformation.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditableSection
      title="Goals and About"
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={handleCancel}
      renderView={() => (
        <ProfileFieldGrid
          fields={[
            { label: 'Short-term goals', value: profile.shortTermGoals },
            { label: 'Long-term goals', value: profile.longTermGoals },
            { label: 'Areas to improve', value: profile.improvementAreas },
            { label: 'Learning interests', value: profile.learningInterests },
            { label: 'Additional information', value: profile.additionalInformation },
          ]}
        />
      )}
      renderEdit={() => (
        <div className="flex flex-col gap-5">
          <Textarea
            label="Short-term goals"
            value={form.shortTermGoals}
            onChange={(event) => setForm((current) => ({ ...current, shortTermGoals: event.target.value }))}
          />
          <Textarea
            label="Long-term goals"
            value={form.longTermGoals}
            onChange={(event) => setForm((current) => ({ ...current, longTermGoals: event.target.value }))}
          />
          <Textarea
            label="Areas to improve"
            value={form.improvementAreas}
            onChange={(event) => setForm((current) => ({ ...current, improvementAreas: event.target.value }))}
          />
          <Textarea
            label="Learning interests"
            placeholder="Topics or subjects you enjoy"
            value={form.learningInterests}
            onChange={(event) => setForm((current) => ({ ...current, learningInterests: event.target.value }))}
          />
          <Textarea
            label="Additional information"
            placeholder="Anything else worth knowing"
            value={form.additionalInformation}
            onChange={(event) => setForm((current) => ({ ...current, additionalInformation: event.target.value }))}
          />
        </div>
      )}
    />
  );
}
