import { useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { AvatarUpload } from '../../components/profile/AvatarUpload';
import { PersonalInfoSection } from '../../components/profile/PersonalInfoSection';
import { AcademicInfoSection } from '../../components/profile/AcademicInfoSection';
import { StudyPreferencesSection } from '../../components/profile/StudyPreferencesSection';
import { GoalsSection } from '../../components/profile/GoalsSection';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingState } from '../../components/ui/LoadingState';
import type { UpdateProfileInput } from '../../types/user';

export function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();

  const handleSave = useCallback(
    async (input: UpdateProfileInput) => {
      try {
        await updateProfile(input);
        showToast('Profile updated.', 'success');
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
    return <LoadingState label="Loading your profile" />;
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Profile</h1>
        <p className="text-secondary">Your personal and academic information.</p>
      </div>

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <AvatarUpload />
        <div className="flex flex-col gap-1 sm:text-right">
          <span className="text-section-heading">{profile.name || 'Add your name'}</span>
          <span className="text-secondary">{profile.email}</span>
          {profile.bio && <span className="text-secondary max-w-sm">{profile.bio}</span>}
          <span className="text-caption">Member since {memberSince}</span>
        </div>
      </Card>

      <Tabs
        tabs={[
          {
            id: 'personal',
            label: 'Personal Information',
            content: <PersonalInfoSection profile={profile} onSave={handleSave} />,
          },
          {
            id: 'academic',
            label: 'Academic Information',
            content: <AcademicInfoSection profile={profile} onSave={handleSave} />,
          },
          {
            id: 'study-preferences',
            label: 'Study Preferences',
            content: <StudyPreferencesSection profile={profile} onSave={handleSave} />,
          },
          {
            id: 'goals',
            label: 'Goals and About',
            content: <GoalsSection profile={profile} onSave={handleSave} />,
          },
        ]}
      />
    </div>
  );
}
