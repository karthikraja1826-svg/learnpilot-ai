import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { EditableSection } from './EditableSection';
import { ProfileFieldGrid } from './ProfileFieldGrid';
import type { UpdateProfileInput, UserProfile } from '../../types/user';

interface PersonalInfoSectionProps {
  profile: UserProfile;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

interface FormState {
  name: string;
  phone: string;
  dateOfBirth: string;
  bio: string;
}

function toFormState(profile: UserProfile): FormState {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    bio: profile.bio ?? '',
  };
}

export function PersonalInfoSection({ profile, onSave }: PersonalInfoSectionProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => {
    setForm(toFormState(profile));
    setNameError(undefined);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError('Full name is required.');
      return;
    }
    setNameError(undefined);
    setIsSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        bio: form.bio.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditableSection
      title="Personal Information"
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={handleCancel}
      renderView={() => (
        <ProfileFieldGrid
          fields={[
            { label: 'Full name', value: profile.name },
            { label: 'Email', value: profile.email },
            { label: 'Phone', value: profile.phone },
            { label: 'Date of birth', value: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : undefined },
            { label: 'Bio', value: profile.bio },
          ]}
        />
      )}
      renderEdit={() => (
        <div className="flex flex-col gap-5">
          <Input
            label="Full name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={nameError}
          />
          <Input label="Email" value={profile.email} disabled className="opacity-60" hint="Managed by your sign-in provider." />
          <Input
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            label="Date of birth (optional)"
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
          />
          <Textarea
            label="Bio (optional)"
            placeholder="A short line about yourself"
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
          />
        </div>
      )}
    />
  );
}
